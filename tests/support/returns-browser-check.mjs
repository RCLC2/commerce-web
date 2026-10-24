// Reproducible UI workflow using playwright-cli, the real Commerce API and local MySQL.
// The only replaced external boundary is the local Toss HTTP gateway.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const fixture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:13000";
const api = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:18082";
const cli =
  process.env.PLAYWRIGHT_CLI_PATH ??
  path.join(os.homedir(), ".codex/skills/playwright/scripts/playwright_cli.sh");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "returns-browser-"));
const output = path.resolve(process.env.E2E_OUTPUT_DIR ?? "output/playwright/returns-integration");
fs.mkdirSync(output, { recursive: true });
for (const file of ["failure.txt", "result.json"]) fs.rmSync(path.join(output, file), { force: true });
const result = [];
let openFormRefreshVerified = false;
let step = 0;
const buyerAddress = { receiver: "구매자 수거 담당", phone: "01087654321", zip_code: "04524", line1: "서울특별시 중구 수거 주소", line2: "201호", is_default: false };
const sellerAddress = { receiver: "판매자 반품 담당", phone: "01022222222", zip_code: "04790", line1: "서울특별시 성동구 반품센터", line2: "2층 검수실", is_default: false };
let buyerAddressID;
let sellerAddressID;
function asReturnAddress(address) {
  return { recipient_name: address.receiver, phone: address.phone, postal_code: address.zip_code, address: address.line1, address_detail: address.line2 };
}
function assertAddress(actual, expected, label) {
  for (const [field, value] of Object.entries(expected)) {
    if (actual?.[field] !== value) throw new Error(`${label}: ${field} snapshot mismatch`);
  }
}
async function prepareAddressBooks() {
  for (const [role, selected] of [["buyer", buyerAddress], ["seller", sellerAddress]]) {
    const existing = await data(role, "/api/v1/me/addresses");
    const home = { ...selected, receiver: `${role} 기본 주소`, line1: "서울특별시 강남구 기본 주소", is_default: true };
    if (!existing?.length) await data(role, "/api/v1/me/addresses", { method: "POST", body: JSON.stringify(home) });
    const saved = await data(role, "/api/v1/me/addresses", { method: "POST", body: JSON.stringify(selected) });
    const id = saved.id ?? saved.ID;
    if (!id) throw new Error(`${role} address ID missing`);
    if (role === "buyer") buyerAddressID = id;
    else sellerAddressID = id;
  }
}
const sessions = Object.fromEntries(
  ["buyer", "seller", "admin"].map((role) => [
    role,
    `returns-${fixture.marketID}-${role}`,
  ]),
);
function command(role, ...args) {
  return execFileSync(cli, ["--session", sessions[role], ...args], {
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 2 * 1024 * 1024,
  });
}
function browser(role, code) {
  const file = path.join(temporary, `step-${++step}.js`);
  fs.writeFileSync(file, `async(page)=>{${code}}`);
  try {
    const output = command(role, "run-code", "--filename", file);
    if (/^### Error/m.test(output)) throw new Error(output);
    return output;
  } catch (error) {
    throw new Error(
      `UI step ${step} (${role}) failed: ${error.stdout ?? error.message}`,
    );
  }
}
async function data(role, route, options = {}) {
  const response = await fetch(api + route, {
    ...options,
    headers: {
      Authorization: `Bearer ${fixture.accounts[role].token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error(`${route}: ${response.status} ${await response.text()}`);
  const body = await response.json();
  return body.data ?? body;
}
async function list(code) {
  return (
    (await data(
      "buyer",
      `/api/v1/orders/${encodeURIComponent(code)}/refunds`,
    )) ?? []
  );
}
function snapshot(role) {
  return command(role, "snapshot");
}
function login(role) {
  command(role, "open", `${base}/login`);
  snapshot(role);
  browser(
    role,
    `await page.getByRole('textbox',{name:'이메일'}).fill(${JSON.stringify(fixture.accounts[role].email)});await page.getByRole('textbox',{name:'비밀번호'}).fill(${JSON.stringify(fixture.accounts[role].password)});await page.getByRole('button',{name:'로그인',exact:true}).click();await page.waitForURL(url=>!url.pathname.includes('/login'));`,
  );
}
function openOrder(role, code) {
  browser(
    role,
    role === "buyer"
      ? `await page.goto(${JSON.stringify(`${base}/orders/${code}`)});await page.getByRole('region',{name:'반품 신청 및 내역',exact:true}).waitFor();`
      : `await page.goto(${JSON.stringify(`${base}/${role}/orders?q=${encodeURIComponent(code)}`)});await page.getByRole('cell',{name:${JSON.stringify(code)},exact:true}).click();await page.getByRole('region',{name:'반품·수거·검수 관리',exact:true}).waitFor();`,
  );
  snapshot(role);
}
function verifyOpenFormRefresh(scenario) {
  return `
    const dialog=page.getByRole('dialog',{name:/반품 신청/});
    const submit=dialog.getByRole('button',{name:'선택 상품 반품 신청',exact:true});
    await submit.waitFor();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='선택 상품 반품 신청')?.disabled);
    const routePattern=${JSON.stringify(`**/api/v1/orders/${scenario.orderCode}/refunds`)};
    await page.route(routePattern,route=>route.request().method()==='GET'?route.abort('failed'):route.continue());
    await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));
    const retry=dialog.getByRole('button',{name:'신청 가능 수량 다시 확인',exact:true});
    await retry.waitFor();
    if(!await submit.isDisabled())throw new Error('stale form remains submittable');
    await page.screenshot({path:${JSON.stringify(path.join(output, "open-form-refresh-failed.png"))},fullPage:true});
    const viewport=page.viewportSize();
    await page.setViewportSize({width:390,height:600});
    for(const locator of [dialog.getByRole('heading',{level:2}),retry,submit]) {
      const box=await locator.boundingBox();
      if(!box||box.y<0||box.y+box.height>600)throw new Error('mobile form action clipped');
    }
    const body=await dialog.getByRole('region',{name:'반품 신청 내용',exact:true}).boundingBox();
    if(!body||body.height<60)throw new Error('mobile form body has no usable space');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('mobile form horizontal overflow');
    await page.screenshot({path:${JSON.stringify(path.join(output, "open-form-refresh-failed-mobile.png"))}});
    await page.setViewportSize(viewport);

    await page.unroute(routePattern);
    await retry.click();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='선택 상품 반품 신청')?.disabled);
    if(await dialog.getByRole('combobox',{name:'주소록에서 선택',exact:true}).inputValue()!=='${buyerAddressID}')throw new Error('pickup selection lost on retry');
    if(await dialog.getByRole('spinbutton',{name:/반품 수량$/}).inputValue()!=='1')throw new Error('quantity lost on retry');
    if(await dialog.getByRole('combobox',{name:/반품 사유$/}).inputValue()!=='ITEM_DEFECTIVE')throw new Error('reason lost on retry');
  `;
}
async function request(scenario, count, reason) {
  console.log(`Request ${scenario.orderCode}: ${count}, ${reason}`);
  openOrder("buyer", scenario.orderCode);
  browser(
    "buyer",
    `await page.getByRole('button',{name:${JSON.stringify(fixture.marketName + " 반품 신청")},exact:true}).click();`,
  );
  snapshot("buyer");
  browser(
    "buyer",
    `await page.getByRole('checkbox',{name:${JSON.stringify(scenario.productName)},exact:false}).check();await page.getByRole('spinbutton',{name:/반품 수량$/}).fill(${JSON.stringify(String(count))});await page.getByRole('combobox',{name:/반품 사유$/}).selectOption(${JSON.stringify(reason)});await page.getByRole('combobox',{name:'주소록에서 선택',exact:true}).selectOption('${buyerAddressID}');${scenario === fixture.scenarios.partial && count === 1 ? verifyOpenFormRefresh(scenario) : ''}await page.getByRole('button',{name:'선택 상품 반품 신청',exact:true}).click();await page.getByRole('dialog',{name:/반품 신청/}).waitFor({state:'hidden'});`,
  );
  if (scenario === fixture.scenarios.partial && count === 1) openFormRefreshVerified = true;
  const rows = await list(scenario.orderCode);
  const latest = rows.at(-1);
  if (
    !latest ||
    latest.items[0].quantity !== count ||
    latest.items[0].reason !== reason
  )
    throw new Error("selected request did not persist");
  assertAddress(latest.pickup, asReturnAddress(buyerAddress), "buyer request");
  return latest;
}
async function receive(scenario, request, responsibility, restock) {
  console.log(`Collection / inspection ${request.id}`);
  if (request.status === "COMPLETED") return;
  openOrder("seller", scenario.orderCode);
  browser(
    "seller",
    `await page.getByRole('combobox',{name:'처리할 반품 요청',exact:true}).selectOption('${request.id}');`,
  );
  snapshot("seller");
  let collections =
    (await data(
      "seller",
      `/api/v1/orders/${scenario.orderCode}/return-collections`,
    )) ?? [];
  let collection = collections.find((c) =>
    c.items.some((i) => request.items.some((r) => r.id === i.refund_item_id)),
  );
  if (!collection) {
    let address;
    try {
      address = await data(
        "seller",
        `/api/v1/markets/${fixture.marketID}/return-address`,
      );
    } catch {}
    if (!address) {
      browser(
        "seller",
        `await page.getByText(${JSON.stringify(fixture.marketName + " 기본 반품 도착지 등록 필요")},{exact:true}).click();`,
      );
      snapshot("seller");
      browser(
        "seller",
        `await page.getByRole('combobox',{name:'내 주소록에서 선택',exact:true}).selectOption('${sellerAddressID}');await page.getByRole('button',{name:'기본 반품 도착지 저장',exact:true}).click();await page.getByRole('button',{name:'수거 정보 저장',exact:true}).waitFor();`,
      );
      snapshot("seller");
    }
    browser(
      "seller",
      `await page.getByRole('button',{name:'수거 정보 저장',exact:true}).click();await page.getByRole('textbox',{name:'수거 택배사',exact:true}).waitFor();`,
    );
    collections = await data(
      "seller",
      `/api/v1/orders/${scenario.orderCode}/return-collections`,
    );
    collection = collections.find((c) =>
      c.items.some((i) => request.items.some((r) => r.id === i.refund_item_id)),
    );
  }
  assertAddress(collection.pickup, asReturnAddress(buyerAddress), "collection pickup");
  assertAddress(collection.destination, asReturnAddress(sellerAddress), "collection destination");
  if (collection.status === "DRAFT") {
    snapshot("seller");
    browser(
      "seller",
      `await page.getByRole('textbox',{name:'수거 택배사',exact:true}).fill('CJ대한통운');await page.getByRole('textbox',{name:'수거 송장번호',exact:true}).fill('LOCAL-RETURNS-${request.id}');await page.getByRole('button',{name:'수거 접수 저장',exact:true}).click();await page.getByRole('button',{name:'수거 완료 확인',exact:true}).waitFor();`,
    );
    collection.status = "REQUESTED";
  }
  if (collection.status === "REQUESTED") {
    snapshot("seller");
    browser(
      "seller",
      `await page.getByRole('button',{name:'수거 완료 확인',exact:true}).click();await page.getByRole('button',{name:'수거 완료 확인 확정',exact:true}).click();await page.getByRole('button',{name:'반품 입고 확인',exact:true}).waitFor();`,
    );
    collection.status = "COLLECTED";
  }
  if (collection.status === "COLLECTED") {
    snapshot("seller");
    browser(
      "seller",
      `await page.getByRole('button',{name:'반품 입고 확인',exact:true}).click();await page.getByRole('button',{name:'반품 입고 확인 확정',exact:true}).click();await page.getByRole('button',{name:'검수 저장',exact:true}).waitFor();`,
    );
  }
  snapshot("seller");
  const inspections =
    (await data(
      "seller",
      `/api/v1/return-collections/${collection.id}/inspections`,
    )) ?? [];
  if (!inspections.length) {
    browser(
      "seller",
      `await page.getByRole('spinbutton',{name:'재판매 가능 수량',exact:true}).fill('${restock ? 1 : 0}');await page.getByRole('combobox',{name:'반품 비용 부담',exact:true}).selectOption('${responsibility}');await page.getByRole('button',{name:'검수 저장',exact:true}).click();await page.locator('summary').filter({hasText:'검수 완료 · 수령'}).waitFor();`,
    );
  }
  if (restock) {
    const savedInspections = await data(
      "seller",
      `/api/v1/return-collections/${collection.id}/inspections`,
    );
    if (savedInspections.some((record) => record.restocked_quantity > 0))
      return;
    snapshot("seller");
    browser(
      "seller",
      `await page.getByRole('spinbutton',{name:'재입고 수량',exact:true}).fill('1');await page.getByRole('button',{name:'선택 수량 재입고',exact:true}).click();await page.getByRole('button',{name:'재입고 확정',exact:true}).click();await page.getByText('이번 재입고 1개 · 누적 재입고 1개',{exact:true}).waitFor();`,
    );
  }
}
async function refund(scenario, request, expected, bank = false) {
  console.log(`Refund ${request.id}: ${expected}`);
  const current = (await list(scenario.orderCode)).find(
    (r) => r.id === request.id,
  );
  if (current.status === "COMPLETED") {
    if (current.amount !== expected)
      throw new Error("completed amount mismatch");
    const duplicate = await data(
      "admin",
      `/api/v1/refunds/${request.id}/execute`,
      { method: "POST", body: "{}" },
    );
    if (!duplicate.completed) throw new Error("duplicate completion missing");
    result.push({
      orderCode: scenario.orderCode,
      refundID: request.id,
      cash: expected,
      points: current.point_refund_amount,
      waived: current.shipping_fee_waived_amount,
    });
    return;
  }
  openOrder("admin", scenario.orderCode);
  browser(
    "admin",
    `await page.getByRole('combobox',{name:'처리할 반품 요청',exact:true}).selectOption('${request.id}');`,
  );
  snapshot("admin");
  if (bank) {
    browser(
      "admin",
      `await page.getByRole('combobox',{name:'은행',exact:true}).selectOption('90');await page.getByRole('textbox',{name:'계좌번호',exact:true}).fill('1234567890');await page.getByRole('textbox',{name:'예금주',exact:true}).fill('검증 구매자');`,
    );
  }
  browser(
    "admin",
    `const section=page.getByRole('region',{name:'환불 금액 안내',exact:true});await section.locator('strong').filter({hasText:'${expected.toLocaleString("ko-KR")}원'}).waitFor();await section.getByRole('button',{name:'검수한 수량 환불',exact:true}).click();`,
  );
  snapshot("admin");
  browser(
    "admin",
    `await page.getByRole('dialog',{name:'검수한 수량 환불',exact:true}).getByRole('button',{name:'환불 확정',exact:true}).click();await page.getByText(${JSON.stringify(bank ? "결제 취소가 접수되었습니다. 실제 계좌 입금 상태는 별도로 확인해주세요." : "이 요청의 환불이 완료되었습니다.")},{exact:true}).waitFor();`,
  );
  const persisted = (await list(scenario.orderCode)).find(
    (r) => r.id === request.id,
  );
  if (persisted.status !== "COMPLETED" || persisted.amount !== expected)
    throw new Error("refund did not persist expected amount");
  const duplicate = await data(
    "admin",
    `/api/v1/refunds/${request.id}/execute`,
    { method: "POST", body: "{}" },
  );
  if (!duplicate.completed)
    throw new Error("duplicate local completion missing");
  result.push({
    orderCode: scenario.orderCode,
    refundID: request.id,
    cash: expected,
    points: persisted.point_refund_amount,
    waived: persisted.shipping_fee_waived_amount,
  });
}
try {
  await prepareAddressBooks();
  for (const role of ["buyer", "seller", "admin"]) login(role);
  const partial = fixture.scenarios.partial;
  const initial =
    (await list(partial.orderCode))[0] ??
    (await request(partial, 1, "ITEM_DEFECTIVE"));
  await receive(partial, initial, "SELLER", true);
  await refund(partial, initial, 9667);
  if ((await list(partial.orderCode)).length === 1) {
    openOrder("buyer", partial.orderCode);
    browser(
      "buyer",
      `await page.getByRole('button',{name:${JSON.stringify(fixture.marketName + " 반품 신청")},exact:true}).click();await page.getByText('신청 가능한 수량 2개 · 주문 수량 3개',{exact:true}).waitFor();await page.getByRole('dialog',{name:/반품 신청/}).getByRole('button',{name:'대화상자 닫기',exact:true}).click();`,
    );
  }
  const remaining =
    (await list(partial.orderCode)).find(
      (r) => r.id !== initial.id && r.status !== "WITHDRAWN",
    ) ?? (await request(partial, 2, "CHANGE_OF_MIND"));
  await receive(partial, remaining, "BUYER", false);
  await refund(partial, remaining, 13333);
  const paid = fixture.scenarios.paid;
  const paidRequest =
    (await list(paid.orderCode))[0] ??
    (await request(paid, 1, "CHANGE_OF_MIND"));
  await receive(paid, paidRequest, "BUYER", false);
  await refund(paid, paidRequest, 17000);
  const short = fixture.scenarios.shortfall;
  const shortRequest =
    (await list(short.orderCode))[0] ??
    (await request(short, 1, "CHANGE_OF_MIND"));
  await receive(short, shortRequest, "BUYER", false);
  await refund(short, shortRequest, 0);
  const bank = fixture.scenarios.virtual;
  const bankRequest =
    (await list(bank.orderCode))[0] ??
    (await request(bank, 1, "ITEM_DEFECTIVE"));
  await receive(bank, bankRequest, "SELLER", false);
  await refund(bank, bankRequest, 7000, true);
  openOrder("buyer", fixture.scenarios.confirmed.orderCode);
  browser(
    "buyer",
    `await page.getByText('신청 가능한 남은 수량이 없습니다.',{exact:true}).waitFor();if(await page.getByRole('button',{name:/반품 신청$/}).count())throw new Error('confirmed product still has a return action');`,
  );
  const gateway = await (
    await fetch("http://127.0.0.1:18086/__test/results")
  ).json();
  for (const [name, count, balance] of [
    ["partial", 2, 6000],
    ["paid", 1, 6000],
    ["shortfall", 0, 4000],
    ["virtual", 1, 0],
  ]) {
    const scenario = fixture.scenarios[name];
    if (
      gateway.requests.filter((r) => r.paymentKey === scenario.paymentKey)
        .length !== count ||
      gateway.payments[scenario.paymentKey].balanceAmount !== balance
    )
      throw new Error(`${name} gateway count/balance mismatch`);
  }
  const product = await (
    await fetch(`${api}/api/v1/products/${partial.productID}`)
  ).json();
  if (
    product.product.options.find((option) => option.id === partial.optionID)
      .quantity !== 101
  )
    throw new Error("selected restock was duplicated or omitted");
  for (const [role, route] of [
    ["buyer", `/api/v1/orders/${partial.orderCode}/return-collections`],
    ["seller", `/api/v1/refunds/${initial.id}/execute`],
  ]) {
    const response = await fetch(api + route, {
      method: role === "seller" ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${fixture.accounts[role].token}`,
        "Content-Type": "application/json",
      },
      ...(role === "seller" ? { body: "{}" } : {}),
    });
    if (response.status !== 403)
      throw new Error(`${role} crossed staff/refund role boundary`);
  }
  openOrder("buyer", partial.orderCode);
  command("buyer", "resize", "390", "844");
  snapshot("buyer");
  browser(
    "buyer",
    `if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('mobile horizontal overflow');await page.screenshot({path:${JSON.stringify(path.join(output, "buyer-completed-mobile.png"))},fullPage:true});`,
  );
  fs.rmSync(path.join(output, "failure.txt"), { force: true });
  fs.writeFileSync(
    path.join(output, "result.json"),
    JSON.stringify(
      {
        passed: true,
        frontend: base,
        api,
        verifiedAt: new Date().toISOString(),
        paymentBoundary: "local HTTP test double",
        results: result,
        pgRequests: gateway.requests.length,
        selectedStock: 101,
        addressBooks: { buyer: true, seller: true, snapshotsVerified: true },
        openFormRefreshFailure: { verified: openFormRefreshVerified },
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: true, scenarios: result.length, output }),
  );
} catch (error) {
  fs.writeFileSync(
    path.join(output, "failure.txt"),
    String(error.stack ?? error),
  );
  throw error;
} finally {
  for (const role of ["buyer", "seller", "admin"]) {
    try { command(role, "close"); } catch {}
  }
  fs.rmSync(temporary, { recursive: true, force: true });
}

// Local HTTP boundary for the real Toss adapter. No browser/API business response is intercepted.
import http from "node:http";
import fs from "node:fs";
const fixture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const payments = new Map(
  Object.values(fixture.scenarios).map((o) => [
    o.paymentKey,
    {
      paymentKey: o.paymentKey,
      orderId: o.orderCode,
      totalAmount: o.amount,
      balanceAmount: o.amount,
      status: "DONE",
      method: o.method,
      easyPay: { provider: "카카오페이" },
      isPartialCancelable: true,
      cancels: [],
      cashReceipts: [],
    },
  ]),
);
const requests = [];
const keys = new Map();
http
  .createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/__test/results") {
      res.end(
        JSON.stringify({ requests, payments: Object.fromEntries(payments) }),
      );
      return;
    }
    const match = req.url.match(/^\/v1\/payments\/([^/]+)(\/cancel)?$/);
    const payment = payments.get(match?.[1]);
    if (!payment) {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          code: "NOT_FOUND_PAYMENT",
          message: "local fixture missing",
        }),
      );
      return;
    }
    if (req.method === "POST" && match[2]) {
      let body = "";
      for await (const chunk of req) body += chunk;
      const value = JSON.parse(body);
      const key = req.headers["idempotency-key"];
      if (
        !key ||
        !Number.isInteger(value.cancelAmount) ||
        value.cancelAmount <= 0
      ) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            code: "INVALID_REQUEST",
            message: "invalid local test request",
          }),
        );
        return;
      }
      if (payment.method === "가상계좌" && !value.refundReceiveAccount) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            code: "INVALID_REFUND_ACCOUNT",
            message: "refund account required",
          }),
        );
        return;
      }
      if (!keys.has(key)) {
        if (value.cancelAmount > payment.balanceAmount) {
          res.writeHead(400);
          res.end(
            JSON.stringify({
              code: "NOT_CANCELABLE_AMOUNT",
              message: "local balance exceeded",
            }),
          );
          return;
        }
        keys.set(key, true);
        payment.balanceAmount -= value.cancelAmount;
        payment.status =
          payment.balanceAmount === 0 ? "CANCELED" : "PARTIAL_CANCELED";
        payment.cancels.push({
          cancelAmount: value.cancelAmount,
          cancelReason: value.cancelReason,
          transactionKey: `ui-cancel-${requests.length + 1}`,
          cancelStatus: "DONE",
          canceledAt: new Date().toISOString(),
          refundableAmount: payment.balanceAmount,
          taxFreeAmount: 0,
        });
        requests.push({
          paymentKey: payment.paymentKey,
          amount: value.cancelAmount,
          key,
          hasRefundAccount: Boolean(value.refundReceiveAccount),
        });
      }
    }
    res.end(JSON.stringify(payment));
  })
  .listen(18086, "127.0.0.1");

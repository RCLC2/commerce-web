import type { Product } from "./types";

export function resolveProductDetailHtml(product: Product) {
  return product.detail_html ?? createDefaultProductDetailHtml(product);
}

function createDefaultProductDetailHtml(product: Product) {
  return `
    <div class="detail-band">
      <div class="detail-center">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
      </div>
    </div>
    <img src="${escapeHtml(product.image_url ?? "/images/fashion-placeholder.svg")}" alt="${escapeHtml(product.name)} 상세 이미지" />
    <div class="detail-band">
      <div class="detail-center">
        <h3>핏과 무드</h3>
        <p>${escapeHtml(product.name)}은 매일 입어도 부담 없는 실루엣을 기준으로 제작된 아이템입니다. 상체와 하체의 비율이 자연스럽게 보이도록 길이감과 폭을 조절했고, 단독 착용은 물론 기존 옷장 속 기본 아이템과도 쉽게 매치됩니다.</p>
        <p>출근, 등교, 주말 약속처럼 반복되는 일상 장면에서 활용도를 높이는 데 초점을 맞췄습니다. 과한 장식보다 소재감, 라인, 컬러의 균형으로 스타일을 완성하는 상품입니다.</p>
      </div>
    </div>
    <div class="detail-band" style="background:#f7f7f8">
      <div class="detail-center">
        <h3>소재와 착용감</h3>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px">
          <div style="background:#fff;padding:18px;border-radius:6px"><h4>두께감</h4><p>보통</p></div>
          <div style="background:#fff;padding:18px;border-radius:6px"><h4>신축성</h4><p>약간 있음</p></div>
          <div style="background:#fff;padding:18px;border-radius:6px"><h4>비침</h4><p>밝은 컬러 주의</p></div>
        </div>
      </div>
    </div>
    <div class="detail-band">
      <div class="detail-center">
        <h3>사이즈 가이드</h3>
        <table style="margin-top:18px">
          <thead>
            <tr>
              <th>옵션</th>
              <th>총장</th>
              <th>어깨/허리</th>
              <th>추천</th>
            </tr>
          </thead>
          <tbody>
            ${(product.options ?? []).map((option) => `
              <tr>
                <td>${escapeHtml(option.option_value)}</td>
                <td>기본</td>
                <td>여유</td>
                <td>정사이즈</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-band" style="background:#111;color:#fff">
      <div class="detail-center">
        <h3>배송 안내</h3>
        <p>배송 유형: ${product.shipping_type === "FREE" ? "무료배송" : "일반배송"}</p>
        <p>평균 출고일은 결제 완료 후 1-3영업일입니다. 마켓 재고 또는 외부몰 연동 상태에 따라 출고 일정이 달라질 수 있습니다.</p>
      </div>
    </div>
    <div class="detail-band">
      <div class="detail-center">
        <h3>교환 및 반품</h3>
        <p>상품 수령 후 교환/반품 가능 기간 내 접수할 수 있습니다. 착용 흔적, 오염, 택 제거, 구성품 누락이 있는 경우 처리가 제한될 수 있습니다.</p>
        <p>사용자 귀책 반품 배송비는 정산 정책에 따라 셀러의 물류 비용 보전 항목으로 처리됩니다.</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

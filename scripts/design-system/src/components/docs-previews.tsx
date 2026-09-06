"use client";

import { PackageCheck, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatus } from "@/components/ui/order-status";
import { FilterChip } from "@/components/ui/filter-chip";
import { Notice } from "@/components/ui/notice";
import styles from "./docs.module.css";

type ConsolePreviewProps = { kind: "seller" | "admin" };

function ConsoleStatus({ value }: { value: string }) {
  if (value === "결제 완료") return <OrderStatus status="PAID" />;
  if (value === "상품 준비 중") return <OrderStatus status="PREPARING" />;
  return <Badge tone={value === "확인 필요" || value === "승인 필요" ? "warning" : "positive"}>{value}</Badge>;
}

export function ConsolePreview({ kind }: ConsolePreviewProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const seller = kind === "seller";
  const rows = seller
    ? [["#240905-102", "린넨 셔츠 · M", "오늘 출고", "결제 완료"], ["#240905-098", "크롭 가디건 · S", "배송 준비", "상품 준비 중"], ["#240905-093", "라운드 니트 · L", "재고 확인", "확인 필요"]]
    : [["상품 노출", "Summer Sale", "검수 대기", "12건"], ["쿠폰 정책", "WELCOME-10", "적용 중", "1,248건"], ["권한 요청", "seller_park", "승인 필요", "1건"]];
  const visibleRows = needsReview ? rows.filter((row) => seller ? row[3] === "확인 필요" : row[2] !== "적용 중") : rows;
  const headers = seller ? ["주문", "상품", "다음 작업", "상태"] : ["대상", "이름", "상태", "영향"];
  const metrics = seller ? [["오늘 주문", "48"], ["출고 대기", "12"], ["재고 주의", "3"]] : [["검토 대기", "17"], ["고위험", "2"], ["오늘 완료", "29"]];

  return <section className="overflow-hidden rounded-surface border border-border-subtle bg-surface-raised" data-section={kind} aria-label={seller ? "셀러 주문 운영 예시" : "관리자 검토 예시"}>
    <div className={styles.consoleHeader}>
      <div className={styles.consoleTitle}><span>{seller ? <PackageCheck size={20} aria-hidden="true" /> : <ShieldAlert size={20} aria-hidden="true" />}</span><div><h3>{seller ? "주문 처리" : "운영 검토"}</h3><p>{visibleRows.length}개 항목</p></div></div>
      <Button size="sm" variant="secondary" className="min-h-11 sm:min-h-9" aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>필터</Button>
    </div>
    {filterOpen ? <div className="flex flex-wrap gap-2 border-b border-border-subtle px-5 py-4"><FilterChip selected={!needsReview} onClick={() => setNeedsReview(false)}>전체</FilterChip><FilterChip selected={needsReview} onClick={() => setNeedsReview(true)}>확인 필요</FilterChip></div> : null}
    <div className={styles.consoleMetrics}>{metrics.map(([label, value]) => <div key={label}><p>{label}</p><strong>{value}</strong></div>)}</div>
    <div className={styles.consoleTable} tabIndex={0} role="region" aria-label={seller ? "셀러 주문 표" : "관리자 검토 표"}>
      <table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row) => <tr key={row[1]}><td>{row[0]}</td><td className="font-medium">{row[1]}</td><td>{seller ? row[2] : <Badge tone={row[2] === "적용 중" ? "positive" : "warning"}>{row[2]}</Badge>}</td><td>{seller ? <ConsoleStatus value={row[3]} /> : row[3]}</td></tr>)}</tbody>
      </table>
    </div>
    <div className={styles.consoleRecords} aria-label={seller ? "셀러 주문 목록" : "관리자 검토 목록"}>
      {visibleRows.map((row) => <article className={styles.consoleRecord} key={row[1]}><div><h4>{row[1]}</h4>{seller ? <ConsoleStatus value={row[3]} /> : <Badge tone={row[2] === "적용 중" ? "positive" : "warning"}>{row[2]}</Badge>}</div><dl><div><dt>{headers[0]}</dt><dd>{row[0]}</dd></div><div><dt>{seller ? headers[2] : headers[3]}</dt><dd>{seller ? row[2] : row[3]}</dd></div></dl></article>)}
    </div>
    <div className={styles.consoleFooter} aria-live="polite">{visibleRows.length}개 항목 표시</div>
  </section>;
}

export function StateFlowPreview() {
  return <ol className={styles.stateFlow}>
    <li><strong>1. 입력 확인</strong><p>필수값과 입력 형식을 확인합니다.</p></li>
    <li><strong>2. 작업 실행</strong><p>진행 상태를 표시하고 중복 실행을 막습니다.</p></li>
    <li><strong>3. 결과 표시</strong><p>완료 내용이나 오류 해결 방법을 알립니다.</p></li>
  </ol>;
}

export function AlertPreview() {
  return <Notice tone="warning" title="재고 확인이 필요해요">주문 수량이 재고보다 많아요. 수량을 줄여주세요.</Notice>;
}

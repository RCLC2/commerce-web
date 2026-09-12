"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminLinks, AdminAuthRequired, useAdminToken } from "@/components/admin-console";
import { ConsoleHeader, ConsoleLayout, ConsoleSection, DataTable, StatusBadge, SummaryStrip } from "@/components/console-layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const links = [...adminLinks, { href: "/admin/notifications", label: "알림 발송" }];

export function AdminNotificationsPage() {
  const token = useAdminToken();
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<"MEMBER" | "SEGMENT">("SEGMENT");
  const [memberID, setMemberID] = useState("");
  const [segmentKey, setSegmentKey] = useState("ALL_ACTIVE");
  const [kind, setKind] = useState<"INFORMATION" | "MARKETING">("INFORMATION");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [destinationPath, setDestinationPath] = useState("");
  const [toastEnabled, setToastEnabled] = useState(false);
  const [toastExpiresAt, setToastExpiresAt] = useState("");
  const [selectedID, setSelectedID] = useState<number | null>(null);
  const campaigns = useQuery({ queryKey: ["admin-notification-campaigns"], queryFn: () => api.notificationCampaigns(token ?? ""), enabled: Boolean(token), meta: { consoleDataRole: "primary" } });
  const deliveries = useQuery({ queryKey: ["admin-notification-campaign-deliveries", selectedID], queryFn: () => api.notificationCampaignDeliveries(token ?? "", selectedID ?? 0), enabled: Boolean(token && selectedID) });
  const create = useMutation({ mutationFn: () => api.createNotificationCampaign(token ?? "", { target_type: targetType, ...(targetType === "MEMBER" ? { target_member_id: Number(memberID) } : { segment_key: segmentKey }), kind, title: title.trim(), body: body.trim(), destination_path: destinationPath.trim(), toast_enabled: toastEnabled, ...(kind === "MARKETING" ? { toast_expires_at: new Date(toastExpiresAt).toISOString() } : {}) }), onSuccess: (campaign) => { setSelectedID(campaign.id); setTitle(""); setBody(""); void queryClient.invalidateQueries({ queryKey: ["admin-notification-campaigns"] }); } });

  if (!token) return <AdminAuthRequired />;
  const items = campaigns.data?.items ?? [];
  const deliveryItems = deliveries.data?.items ?? [];
  const selected = items.find((item) => item.id === selectedID);
  const valid = title.trim() && body.trim() && (targetType === "MEMBER" ? Number(memberID) > 0 : segmentKey) && (kind !== "MARKETING" || toastExpiresAt);
  return <ConsoleLayout title="Admin" subtitle="플랫폼 운영 콘솔" links={links}>
    <ConsoleHeader title="알림 발송" description="세그먼트 작업은 저장 직후 Temporal 워크플로로 전달되며, Inbox와 수신 결과가 영속적으로 기록됩니다." />
    <ConsoleSection className="mt-5" title="새 알림 등록" description="마케팅 알림은 만료 시각과 수신 동의 정책을 반드시 적용합니다.">
      <div className="grid gap-3 lg:grid-cols-3"><select className="h-11 rounded-md border border-line bg-white px-3 text-sm font-bold" value={targetType} onChange={(event) => setTargetType(event.target.value as "MEMBER" | "SEGMENT")}><option value="SEGMENT">세그먼트</option><option value="MEMBER">개별 회원</option></select>{targetType === "MEMBER" ? <input className="h-11 rounded-md border border-line px-3 text-sm" type="number" min="1" value={memberID} onChange={(event) => setMemberID(event.target.value)} placeholder="회원 ID" /> : <select className="h-11 rounded-md border border-line bg-white px-3 text-sm" value={segmentKey} onChange={(event) => setSegmentKey(event.target.value)}><option value="ALL_ACTIVE">활성 회원 전체</option><option value="MARKETING_CONSENTED">마케팅 동의 회원</option></select>}<select className="h-11 rounded-md border border-line bg-white px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as "INFORMATION" | "MARKETING")}><option value="INFORMATION">정보 알림</option><option value="MARKETING">마케팅 알림</option></select></div>
      <div className="mt-3 grid gap-3"><input className="h-11 rounded-md border border-line px-3 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="알림 제목" /><textarea className="min-h-24 rounded-md border border-line p-3 text-sm" value={body} onChange={(event) => setBody(event.target.value)} placeholder="알림 본문" /><input className="h-11 rounded-md border border-line px-3 text-sm" value={destinationPath} onChange={(event) => setDestinationPath(event.target.value)} placeholder="이동 경로 (선택, 예: /orders)" /></div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={toastEnabled} onChange={(event) => setToastEnabled(event.target.checked)} /> 토스트 표시</label>{kind === "MARKETING" ? <input className="h-11 rounded-md border border-line px-3 text-sm" type="datetime-local" value={toastExpiresAt} onChange={(event) => setToastExpiresAt(event.target.value)} aria-label="마케팅 토스트 만료 시각" /> : null}<Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>{create.isPending ? "등록 중" : "발송 등록"}</Button></div>
    </ConsoleSection>
    <div className="mt-5">{selected ? <SummaryStrip items={[{ label: "후보", value: selected.candidate_count }, { label: "수신 성공", value: selected.delivered_count }, { label: "제외", value: selected.excluded_count }, { label: "실패", value: selected.failed_count }]} /> : null}</div>
    <ConsoleSection className="mt-5" title="최근 발송 세그먼트" description="행을 선택하면 회원별 수신 결과와 실패 사유를 볼 수 있습니다."><DataTable columns={["세그먼트", "대상", "상태", "진행", "작업"]} rows={items.map((item) => [`#${item.id}`, item.target_type === "MEMBER" ? `회원 #${item.target_member_id}` : item.segment_key ?? "세그먼트", <StatusBadge key="status" value={item.status} />, `${item.delivered_count} 성공 · ${item.excluded_count} 제외 · ${item.failed_count} 실패`, <Button key="detail" size="sm" variant="secondary" onClick={() => setSelectedID(item.id)}>결과 보기</Button>])} /></ConsoleSection>
    {selectedID ? <ConsoleSection className="mt-5" title={`세그먼트 #${selectedID} 수신 결과`} description="DELIVERED는 Inbox 생성 완료, SKIPPED/FAILED에는 사유가 기록됩니다."><DataTable columns={["회원", "상태", "Inbox", "시도", "사유", "처리 시각"]} rows={deliveryItems.map((item) => [`#${item.member_id}`, <StatusBadge key="status" value={item.status} />, item.inbox_id ? `#${item.inbox_id}` : "-", item.attempt_count, item.failure_code || item.failure_detail || "-", item.delivered_at ? new Date(item.delivered_at).toLocaleString("ko-KR") : item.failed_at ? new Date(item.failed_at).toLocaleString("ko-KR") : new Date(item.created_at).toLocaleString("ko-KR")])} /></ConsoleSection> : null}
  </ConsoleLayout>;
}

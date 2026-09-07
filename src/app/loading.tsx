import { LoadingState } from "@/components/ui/feedback";

export default function Loading() {
  return <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-16"><LoadingState label="화면을 불러오는 중입니다." /></main>;
}

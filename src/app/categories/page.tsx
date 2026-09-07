import { Suspense } from "react";
import { CategoryInformationPage } from "@/components/category-information-page";
import { LoadingState } from "@/components/ui/feedback";

export default function Categories() {
  return <Suspense fallback={<LoadingState label="카테고리를 불러오는 중입니다." />}><CategoryInformationPage /></Suspense>;
}

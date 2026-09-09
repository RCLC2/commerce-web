"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";

export function TabsDemo() {
  const [tab, setTab] = useState("description");

  return (
    <Tabs
      ariaLabel="상품 정보"
      value={tab}
      onValueChange={setTab}
      items={[
        {
          value: "description",
          label: "상품 설명",
          content: (
            <p className="text-sm">린넨 55%, 면 45% 소재의 셔츠입니다.</p>
          ),
        },
        {
          value: "delivery",
          label: "배송 안내",
          content: (
            <p className="text-sm">
              배송비는 무료이며, 출고 후 1–2일 내 도착합니다.
            </p>
          ),
        },
        { value: "reviews", label: "후기", disabled: true },
      ]}
    />
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ButtonDemo() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setSaved(true)}>저장</Button>
        <Button variant="secondary" onClick={() => setSaved(false)}>
          초기화
        </Button>
        <Button disabled>비활성</Button>
      </div>
      <p role="status" className="text-sm text-content-secondary">
        {saved ? "저장했어요." : ""}
      </p>
    </div>
  );
}

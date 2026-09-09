"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/overlay";

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        variant="secondary"
        onClick={() => {
          setDeleted(false);
          setOpen(true);
        }}
      >
        삭제 확인
      </Button>
      <p role="status" className="text-sm text-content-secondary">
        {deleted ? "저장된 상품을 삭제했어요." : ""}
      </p>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="상품을 삭제할까요?"
        description="저장된 상품 1개가 목록에서 삭제됩니다."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDeleted(true);
              setOpen(false);
            }}
          >
            삭제
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

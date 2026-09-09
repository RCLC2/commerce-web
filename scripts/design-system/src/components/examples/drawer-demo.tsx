"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/overlay";

export function DrawerDemo() {
  const [open, setOpen] = useState(false);
  return <><Button variant="secondary" onClick={() => setOpen(true)}>메뉴 열기</Button><Drawer open={open} onClose={() => setOpen(false)} title="메뉴"><div className="mt-4 grid gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>상품 둘러보기</Button><Button variant="ghost" onClick={() => setOpen(false)}>장바구니</Button></div></Drawer></>;
}

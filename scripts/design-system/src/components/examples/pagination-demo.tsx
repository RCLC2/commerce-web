"use client";
import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";

export function PaginationDemo() {
  const [page, setPage] = useState(1);
  return <Pagination page={page} totalPages={8} onChange={setPage} />;
}

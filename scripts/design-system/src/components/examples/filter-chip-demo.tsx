"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/filter-chip";

const products = [
  { name: "린넨 셔츠", freeShipping: true },
  { name: "코튼 티셔츠", freeShipping: false },
  { name: "라운드 니트", freeShipping: true },
];

export function FilterChipDemo() {
  const [freeShipping, setFreeShipping] = useState(false);
  const visible = products.filter(
    (product) => !freeShipping || product.freeShipping,
  );

  return (
    <div className="space-y-4">
      <FilterChip
        selected={freeShipping}
        onClick={() => setFreeShipping((value) => !value)}
      >
        무료배송
      </FilterChip>
      <p role="status" className="text-sm text-content-secondary">
        {visible.length}개 상품
      </p>
      <ul className="divide-y divide-border-subtle text-sm">
        {visible.map((product) => (
          <li key={product.name} className="flex justify-between gap-4 py-3">
            <span>{product.name}</span>
            <span className="text-content-secondary">
              {product.freeShipping ? "무료배송" : "배송비 3,000원"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

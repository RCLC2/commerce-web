"use client";

import { useId, useState } from "react";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";

const options = ["일반 배송", "문 앞에 놓아주세요", "배송 전에 연락해주세요"];

export function SelectDemo() {
  const id = useId();
  const [selected, setSelected] = useState(options[0]);

  return (
    <div className="max-w-md">
      <Field label="배송 요청" htmlFor={id}>
        <Select
          id={id}
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}

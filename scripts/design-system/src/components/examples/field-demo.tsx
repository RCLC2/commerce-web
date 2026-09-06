"use client";

import { useId, useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function FieldDemo() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="max-w-md">
      <Field
        label="이메일"
        htmlFor={id}
        hint="주문 안내를 받을 이메일입니다."
        error={error}
        required
      >
        <Input
          id={id}
          type="email"
          required
          value={email}
          placeholder="name@example.com"
          state={error ? "error" : "default"}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setEmail(event.target.value);
            setError("");
          }}
          onBlur={(event) =>
            setError(
              event.target.validity.valid ? "" : "이메일 형식을 확인해주세요.",
            )
          }
        />
      </Field>
    </div>
  );
}

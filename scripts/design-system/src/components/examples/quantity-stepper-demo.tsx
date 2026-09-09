"use client";

import { useState } from "react";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

export function QuantityStepperDemo() {
  const [quantity, setQuantity] = useState(1);

  return (
    <QuantityStepper
      value={quantity}
      min={1}
      max={5}
      onValueChange={setQuantity}
    />
  );
}

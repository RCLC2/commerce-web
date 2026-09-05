import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-4 text-sm font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--commerce-motion-normal)] ease-[var(--commerce-ease-out)] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45",
  {
    variants: {
      variant: {
        primary: "bg-button-primary text-button-primary-content shadow-[0_1px_2px_rgb(191_0_88_/_22%)] enabled:hover:-translate-y-px enabled:hover:bg-button-primary-hover enabled:hover:shadow-[0_6px_14px_rgb(201_0_92_/_30%)] enabled:active:translate-y-0 enabled:active:scale-[0.97] enabled:active:bg-button-primary-pressed focus-visible:outline-button-primary-focus focus-visible:outline-offset-[-3px]",
        secondary: "border border-button-secondary-border bg-button-secondary text-content-primary shadow-card enabled:hover:border-action-primary enabled:hover:bg-button-secondary-hover enabled:hover:text-action-primary enabled:active:scale-[0.98] enabled:active:bg-action-secondary",
        ghost: "text-content-primary enabled:hover:bg-action-secondary enabled:hover:text-action-primary enabled:active:scale-[0.98] enabled:active:bg-surface-subtle",
        danger: "bg-button-danger text-content-inverse enabled:hover:bg-button-danger-hover",
      },
      size: {
        sm: "min-h-9 rounded-[0.625rem] px-3 text-xs",
        md: "min-h-11 px-4",
        lg: "min-h-13 rounded-[0.875rem] px-5 text-base",
        icon: "h-11 min-h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const inputVariants = cva(
  "flex h-12 w-full rounded-control border border-border-interactive bg-surface-raised px-3.5 text-sm text-content-primary shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-content-tertiary hover:border-action-primary focus:border-action-primary focus:ring-4 focus:ring-action-primary/10 disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-subtle disabled:text-content-tertiary disabled:opacity-100",
  {
    variants: {
      state: {
        default: "",
        error: "border-status-negative focus:border-status-negative focus:ring-status-negative/10",
      },
    },
    defaultVariants: { state: "default" },
  },
);

export type InputProps = React.ComponentPropsWithoutRef<"input"> & VariantProps<typeof inputVariants>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, state, ...props }, ref) {
  return <input ref={ref} className={cn(inputVariants({ state }), className)} {...props} />;
});

export type TextareaProps = React.ComponentPropsWithoutRef<"textarea"> & VariantProps<typeof inputVariants>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, state, ...props }, ref) {
  return <textarea ref={ref} className={cn(inputVariants({ state }), "h-auto min-h-28 py-3", className)} {...props} />;
});

export type SelectProps = React.ComponentPropsWithoutRef<"select"> & VariantProps<typeof inputVariants>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, state, ...props }, ref) {
  return <select ref={ref} className={cn(inputVariants({ state }), className)} {...props} />;
});

"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./ui/feedback";

const FALLBACK_SRC = "/images/fashion-placeholder.svg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
};

export function SafeImage({ src, alt, className, fill, onError, onLoad, ...props }: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const [loadedSource, setLoadedSource] = useState<string>();
  const failed = Boolean(src && failedSource === src);
  const resolvedSrc = failed || !src ? FALLBACK_SRC : src;
  const isLoading = loadedSource !== resolvedSrc;

  return (
    <span className={cn("relative", fill ? "absolute inset-0 block" : "inline-grid")} aria-busy={isLoading}>
      {isLoading ? <span className="pointer-events-none absolute inset-0 z-10 grid place-items-center" aria-hidden="true"><LoadingSpinner className="size-[min(3rem,55%)]" /></span> : null}
      <Image
        {...props}
        key={resolvedSrc}
        src={resolvedSrc}
        alt={alt}
        fill={fill}
        className={cn(className, isLoading && "opacity-0")}
        onLoad={(event) => {
          setLoadedSource(resolvedSrc);
          onLoad?.(event);
        }}
        onError={(event) => {
          if (resolvedSrc !== FALLBACK_SRC) {
            setLoadedSource(undefined);
            setFailedSource(src ?? undefined);
          } else {
            setLoadedSource(FALLBACK_SRC);
          }
          onError?.(event);
        }}
      />
    </span>
  );
}

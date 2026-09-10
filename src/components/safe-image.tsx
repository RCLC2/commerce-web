"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK_SRC = "/images/fashion-placeholder.svg";

type SafeImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
};

export function SafeImage({ src, alt, ...props }: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const failed = Boolean(src && failedSource === src);
  const resolvedSrc = failed || !src ? FALLBACK_SRC : src;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      onError={() => {
        if (resolvedSrc !== FALLBACK_SRC) {
          setFailedSource(src ?? undefined);
        }
      }}
    />
  );
}

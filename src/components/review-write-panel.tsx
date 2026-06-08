"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type UploadedReviewImage = {
  mediaAssetID: number;
  previewURL: string;
  filename: string;
  width: number;
  height: number;
  contentType: string;
};

type ReviewWritePanelProps = {
  token: string;
  orderCode: string;
  lineItemID: number;
  productID: number;
  onSubmitted?: () => void;
};

const maxReviewImages = 5;
const maxReviewImageBytes = 10 * 1024 * 1024;
const maxReviewImageWidth = 8000;
const maxReviewImageHeight = 8000;
const supportedReviewImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ReviewWritePanel({ token, orderCode, lineItemID, productID, onSubmitted }: ReviewWritePanelProps) {
  const inputID = useId();
  const queryClient = useQueryClient();
  const previewURLsRef = useRef(new Set<string>());
  const [ratingX2, setRatingX2] = useState(10);
  const [content, setContent] = useState("");
  const [images, setImages] = useState<UploadedReviewImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const previewURLs = previewURLsRef.current;

    return () => {
      previewURLs.forEach((previewURL) => URL.revokeObjectURL(previewURL));
      previewURLs.clear();
    };
  }, []);

  const revokePreviewURL = (previewURL: string) => {
    URL.revokeObjectURL(previewURL);
    previewURLsRef.current.delete(previewURL);
  };

  const createReview = useMutation({
    mutationFn: () =>
      api.createOrderLineReview(token, orderCode, lineItemID, {
        rating_x2: ratingX2,
        content,
        images: images.map((image, index) => ({
          media_asset_id: image.mediaAssetID,
          sort_order: index + 1,
          is_representative: index === 0,
        })),
    }),
    onSuccess: async () => {
      images.forEach((image) => revokePreviewURL(image.previewURL));
      setImages([]);
      setContent("");
      setRatingX2(10);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderCode] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myReviews(token) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productReviews(productID) }),
      ]);
      onSubmitted?.();
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }
    setUploadError(null);
    const nextFiles = Array.from(files).slice(0, maxReviewImages - images.length);
    if (nextFiles.length !== files.length) {
      setUploadError("리뷰 이미지는 최대 5개까지 등록할 수 있습니다");
    }

    setIsUploading(true);
    try {
      const uploaded: UploadedReviewImage[] = [];
      for (const file of nextFiles) {
        const contentType = file.type.toLowerCase();
        if (!contentType.startsWith("image/")) {
          throw new Error("이미지 파일만 첨부할 수 있습니다");
        }
        if (!supportedReviewImageTypes.has(contentType)) {
          throw new Error("PNG, JPG, WEBP 이미지만 첨부할 수 있습니다");
        }
        if (file.size <= 0 || file.size > maxReviewImageBytes) {
          throw new Error("리뷰 이미지는 10MB 이하만 첨부할 수 있습니다");
        }
        const dimensions = await readImageDimensions(file);
        if (dimensions.width > maxReviewImageWidth || dimensions.height > maxReviewImageHeight) {
          throw new Error("리뷰 이미지는 8000x8000px 이하만 첨부할 수 있습니다");
        }
        const upload = await api.createReviewImageUpload(token, {
          filename: file.name,
          width: dimensions.width,
          height: dimensions.height,
          content_type: contentType,
          content_length: file.size,
        });
        await api.uploadReviewImageObject(upload, file);
        const asset = await api.completeReviewImageUpload(token, upload.id);
        const previewURL = URL.createObjectURL(file);
        previewURLsRef.current.add(previewURL);
        uploaded.push({
          mediaAssetID: asset.id,
          previewURL,
          filename: file.name,
          width: asset.width,
          height: asset.height,
          contentType: asset.content_type,
        });
      }
      setImages((current) => [...current, ...uploaded].slice(0, maxReviewImages));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (mediaAssetID: number) => {
    setImages((current) => {
      const target = current.find((image) => image.mediaAssetID === mediaAssetID);
      if (target) {
        revokePreviewURL(target.previewURL);
      }
      return current.filter((image) => image.mediaAssetID !== mediaAssetID);
    });
  };

  const canSubmit = content.trim().length > 0 && !isUploading && !createReview.isPending;

  return (
    <form
      className="mt-4 rounded-md border border-line bg-zinc-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          createReview.mutate();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">구매 리뷰 작성</p>
          <p className="mt-1 text-xs text-muted">상품을 사용한 느낌을 남겨주세요.</p>
        </div>
        <div className="flex items-center gap-1" aria-label="평점">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              className="rounded-md p-1 text-brand transition hover:bg-white"
              aria-label={`${score}점`}
              onClick={() => setRatingX2(score * 2)}
            >
              <Star size={20} className={cn(score * 2 <= ratingX2 && "fill-brand")} />
            </button>
          ))}
        </div>
      </div>

      <label htmlFor={`${inputID}-content`} className="sr-only">
        리뷰 내용
      </label>
      <textarea
        id={`${inputID}-content`}
        className="mt-3 min-h-28 w-full resize-none rounded-md border border-line bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-foreground"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="사이즈, 핏, 소재감이 어땠나요?"
      />

      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((image, index) => (
            <div key={image.mediaAssetID} className="relative aspect-square overflow-hidden rounded-md border border-line bg-white">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${image.previewURL})` }}
                role="img"
                aria-label={`첨부 이미지 ${index + 1}`}
              />
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-white">대표</span>
              ) : null}
              <button
                type="button"
                aria-label={`${image.filename} 제거`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow-sm"
                onClick={() => removeImage(image.mediaAssetID)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            id={inputID}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          <label
            htmlFor={inputID}
            className={cn(
              "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold transition hover:bg-zinc-50",
              (isUploading || images.length >= maxReviewImages) && "pointer-events-none opacity-45",
            )}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            사진 첨부
          </label>
          <span className="text-xs font-bold text-muted">{images.length}/5</span>
        </div>
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {createReview.isPending ? "등록 중" : "리뷰 등록"}
        </Button>
      </div>

      {uploadError ? <p className="mt-2 text-xs font-bold text-brand">{uploadError}</p> : null}
      {createReview.isError ? <p className="mt-2 text-xs font-bold text-brand">리뷰 등록에 실패했습니다.</p> : null}
      {createReview.isSuccess ? <p className="mt-2 text-xs font-bold text-foreground">리뷰가 등록되었습니다.</p> : null}
    </form>
  );
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 정보를 읽지 못했습니다"));
    };
    image.src = url;
  });
}

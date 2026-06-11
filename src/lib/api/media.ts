import { request } from "../api-client";
import type { ReviewImageAsset, ReviewImageUpload } from "../types";

export type ReviewImageUploadInput = {
  filename: string;
  width: number;
  height: number;
  content_type: string;
  content_length: number;
};

export const mediaApi = {
  createReviewImageUpload: (token: string, payload: ReviewImageUploadInput) =>
    request<ReviewImageUpload>("/api/v1/media/review-images/presign", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  completeReviewImageUpload: (token: string, assetID: number) =>
    request<ReviewImageAsset>(`/api/v1/media/review-images/${assetID}/complete`, {
      method: "POST",
      token,
    }),
  uploadReviewImageObject: async (upload: ReviewImageUpload, file: File) => {
    const headers = new Headers(upload.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", file.type);
    }

    const response = await fetch(upload.upload_url, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!response.ok) {
      throw new Error("이미지 업로드에 실패했습니다");
    }
  },
};

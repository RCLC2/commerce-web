import { request } from "../api-client";
import type { CreateReviewPayload, MediaAsset, Review, ReviewImageUpload, ReviewImageUploadRequest } from "../types";

const FORBIDDEN_UPLOAD_HEADERS = new Set(["host", "content-length"]);

function uploadHeaders(signedHeaders: Record<string, string>, contentType: string) {
  const headers = new Headers();

  Object.entries(signedHeaders).forEach(([key, value]) => {
    if (FORBIDDEN_UPLOAD_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", contentType);
  }

  return headers;
}

export const mediaApi = {
  createReviewImageUpload: (token: string, payload: ReviewImageUploadRequest) =>
    request<ReviewImageUpload>("/api/v1/media/review-images/presign", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  uploadReviewImageObject: async (upload: ReviewImageUpload, file: File) => {
    const response = await fetch(upload.upload_url, {
      method: "PUT",
      headers: uploadHeaders(upload.headers, file.type || upload.content_type),
      body: file,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Review image upload failed: ${response.status}`);
    }
  },
  completeReviewImageUpload: (token: string, s3Key: string) =>
    request<MediaAsset>("/api/v1/media/review-images/complete", {
      method: "POST",
      token,
      body: JSON.stringify({ s3_key: s3Key }),
    }),
  createOrderLineReview: (token: string, orderCode: string, lineItemID: number, payload: CreateReviewPayload) =>
    request<Review>(`/api/v1/orders/${orderCode}/items/${lineItemID}/reviews`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
};

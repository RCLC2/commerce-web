import { request } from "../api-client";
import type { MediaImageDomain, MediaImageUpload } from "../types";

export type ImageUploadInput = {
  domain?: MediaImageDomain;
  filename: string;
  content_type: string;
  size_bytes: number;
};

export const mediaApi = {
  createImageUpload: (token: string, payload: ImageUploadInput) =>
    request<MediaImageUpload>("/api/v1/media/images/presign", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  uploadImageObject: async (upload: MediaImageUpload, file: File) => {
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

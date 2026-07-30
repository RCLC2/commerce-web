import { z } from "zod";
import { requestParsed } from "../api-client";
import type { MediaImageDomain, MediaImageUpload } from "../types";

export type ImageUploadInput = {
  domain?: MediaImageDomain;
  filename: string;
  content_type: string;
  size_bytes: number;
};

const mediaImageUploadSchema = z.object({
  s3_key: z.string(),
  object_key: z.string().optional(),
  upload_url: z.string(),
  headers: z.record(z.string(), z.string()),
  expires_at: z.string(),
  content_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
});

export const mediaApi = {
  createImageUpload: (token: string, payload: ImageUploadInput) =>
    requestParsed(mediaImageUploadSchema, "/api/v1/media/images/presign", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    }),
  uploadImageObject: async (upload: MediaImageUpload, file: File) => {
    const headers = new Headers(upload.headers);
    if (!headers.has("Content-Type")) headers.set("Content-Type", file.type);
    const response = await fetch(upload.upload_url, { method: "PUT", headers, body: file });
    if (!response.ok) throw new Error("이미지 업로드에 실패했습니다");
  },
};

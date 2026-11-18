import { z } from "zod";
import { requestParsed, requestVoid } from "../api-client";

const faqSchema = z.object({
  id: z.number().int().positive(),
  question: z.string(),
  answer: z.string(),
  sequence: z.number().int().nonnegative(),
});

export type FAQ = z.infer<typeof faqSchema>;
export type FAQContent = Pick<FAQ, "question" | "answer">;

const adminFAQs = "/api/v1/admin/faqs";

export const faqApi = {
  listFAQs: (token: string, signal?: AbortSignal) =>
    requestParsed(z.array(faqSchema), "/api/v1/faqs", { token, signal }),
  adminFAQs: (token: string, signal?: AbortSignal) =>
    requestParsed(z.array(faqSchema), adminFAQs, { token, signal }),
  createFAQ: (token: string, content: FAQContent) =>
    requestParsed(faqSchema, adminFAQs, { token, method: "POST", body: JSON.stringify(content) }),
  updateFAQ: (token: string, id: number, content: FAQContent) =>
    requestParsed(faqSchema, `${adminFAQs}/${id}`, { token, method: "PUT", body: JSON.stringify(content) }),
  deleteFAQ: (token: string, id: number) =>
    requestVoid(`${adminFAQs}/${id}`, { token, method: "DELETE" }),
  reorderFAQs: (token: string, ids: number[]) =>
    requestVoid(`${adminFAQs}/reorder`, { token, method: "POST", body: JSON.stringify({ ids }) }),
};

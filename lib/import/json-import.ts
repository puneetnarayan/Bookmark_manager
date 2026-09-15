import { z } from "zod";
import { spaceSchema, collectionSchema, resourceSchema, tagSchema } from "@/lib/validation/schemas";

export const jsonImportSchema = z.object({
  exportedAt: z.string().optional(),
  version: z.number().optional(),
  spaces: z.array(spaceSchema).default([]),
  collections: z.array(collectionSchema).default([]),
  resources: z.array(resourceSchema).default([]),
  tags: z.array(tagSchema).default([]),
});

export type JsonImportPayload = z.infer<typeof jsonImportSchema>;

export function validateJsonImport(raw: unknown) {
  return jsonImportSchema.safeParse(raw);
}

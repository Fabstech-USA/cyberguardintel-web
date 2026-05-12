import { z } from "zod";

export const AiBaaTemplateInputSchema = z.object({
  vendorName: z.string().trim().min(1).max(200),
  vendorEmail: z.string().trim().email().max(320).nullable().optional(),
  services: z.string().trim().min(1).max(10_000),
  organizationName: z.string().trim().min(1).max(200),
  hipaaEntityType: z.string().trim().min(1).max(120),
  notes: z.string().trim().min(1).max(10_000).nullable().optional(),
});

export const AiBaaTemplateOutputSchema = z.object({
  document_title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(600),
  full_markdown: z.string().trim().min(1).max(40_000),
});

export type AiBaaTemplateOutput = z.infer<typeof AiBaaTemplateOutputSchema>;

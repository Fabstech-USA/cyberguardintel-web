import { IntegrationStatus } from "@/generated/prisma";
import { z } from "zod";

import {
  getCatalogEntry,
  isOAuthAuthMethod,
} from "@/lib/integration-catalog";

export const ConnectIntegrationSchema = z.object({
  type: z.string().min(1),
  displayName: z.string().min(1).optional(),
  credentials: z.record(z.string(), z.string()).refine(
    (value) => Object.keys(value).length > 0,
    "credentials must not be empty"
  ),
});

export const UpdateIntegrationStatusSchema = z.object({
  status: z.nativeEnum(IntegrationStatus),
});

export function validateConnectIntegrationBody(body: unknown):
  | { success: true; data: z.infer<typeof ConnectIntegrationSchema> }
  | { success: false; error: string } {
  const parsed = ConnectIntegrationSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  const entry = getCatalogEntry(parsed.data.type);
  if (!entry) {
    return { success: false, error: "Unknown integration type" };
  }
  if (!entry.connectable) {
    return { success: false, error: "Integration is not connectable yet" };
  }
  if (isOAuthAuthMethod(entry.authMethod)) {
    return {
      success: false,
      error: "This integration uses OAuth and cannot be connected via API key",
    };
  }

  return { success: true, data: parsed.data };
}

export function validateUpdateIntegrationStatusBody(body: unknown):
  | { success: true; data: z.infer<typeof UpdateIntegrationStatusSchema> }
  | { success: false; error: string } {
  const parsed = UpdateIntegrationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }
  return { success: true, data: parsed.data };
}

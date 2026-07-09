import { IntegrationStatus } from "@/generated/prisma";
import { z } from "zod";

import {
  isDemoIamIntegrationType,
  isDemoIntegrationType,
  isDemoIntegrationsEnabled,
} from "@/lib/demo-integrations";
import {
  getCatalogEntry,
  isOAuthAuthMethod,
} from "@/lib/integration-catalog";

const credentialsSchema = z.record(z.string(), z.string());

export const ConnectIntegrationSchema = z.object({
  type: z.string().min(1),
  displayName: z.string().min(1).optional(),
  credentials: credentialsSchema,
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

  const { type, credentials } = parsed.data;

  if (isDemoIntegrationType(type)) {
    if (!isDemoIntegrationsEnabled()) {
      return { success: false, error: "Demo integrations are not enabled" };
    }
    if (isDemoIamIntegrationType(type) && Object.keys(credentials).length === 0) {
      return { success: false, error: "credentials must not be empty" };
    }
    return { success: true, data: parsed.data };
  }

  const entry = getCatalogEntry(type);
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
  if (Object.keys(credentials).length === 0) {
    return { success: false, error: "credentials must not be empty" };
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

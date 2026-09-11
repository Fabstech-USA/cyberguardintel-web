import { z } from "zod";

/**
 * Shared between the /contact form (client) and /api/contact (server) so
 * validation rules and topic labels can never drift out of sync.
 */
export const CONTACT_TOPIC_VALUES = [
  "general",
  "sales",
  "support",
  "security",
] as const;

export type ContactTopic = (typeof CONTACT_TOPIC_VALUES)[number];

export const CONTACT_TOPICS: readonly { value: ContactTopic; label: string }[] = [
  { value: "general", label: "General question" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "security", label: "Security & compliance" },
];

export function contactTopicLabel(topic: ContactTopic): string {
  return CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? "General question";
}

export const ContactFormSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(200),
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  organization: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  topic: z.enum(CONTACT_TOPIC_VALUES).default("general"),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a bit more (at least 10 characters).")
    .max(5000, "Keep it under 5,000 characters."),
  /**
   * Honeypot: a real visitor never sees or fills this field (hidden from
   * sighted users and screen readers alike). Bots that auto-fill every input
   * on a form will populate it, which the API route treats as spam.
   */
  company_website: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});

export type ContactFormValues = z.infer<typeof ContactFormSchema>;

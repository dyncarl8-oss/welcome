import { z } from "zod";

// Creator Schema (for database documents with _id)
export const creatorSchema = z.object({
  _id: z.string(),
  whopUserId: z.string(),
  whopCompanyId: z.string(),
  messageTemplate: z.string().default("Hey {name}! Welcome! I wanted to reach out personally to let you know how excited I am to have you join us. This is a great community, and I think you're going to love it here. If you ever need anything or have questions, don't hesitate to ask. Glad you're here!"),
  audioFileUrl: z.string().nullable().optional(),
  fishAudioModelId: z.string().nullable().optional(),
  oauthAccessToken: z.string().nullable().optional(),
  oauthRefreshToken: z.string().nullable().optional(),
  tokenExpiresAt: z.date().nullable().optional(),
  isSetupComplete: z.boolean().default(false),
  isAutomationActive: z.boolean().default(true),
  credits: z.number().default(50),
  planType: z.enum(["free", "tier200", "unlimited"]).default("free"),
  whopPlanId: z.string().nullable().optional(),
  lastPurchaseDate: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertCreatorSchema = z.object({
  whopUserId: z.string(),
  whopCompanyId: z.string(),
  messageTemplate: z.string().default("Hey {name}! Welcome! I wanted to reach out personally to let you know how excited I am to have you join us. This is a great community, and I think you're going to love it here. If you ever need anything or have questions, don't hesitate to ask. Glad you're here!"),
  audioFileUrl: z.string().nullable().optional(),
  fishAudioModelId: z.string().nullable().optional(),
  oauthAccessToken: z.string().nullable().optional(),
  oauthRefreshToken: z.string().nullable().optional(),
  tokenExpiresAt: z.date().nullable().optional(),
  isSetupComplete: z.boolean().default(false),
  isAutomationActive: z.boolean().default(true),
  credits: z.number().default(50),
  planType: z.enum(["free", "tier200", "unlimited"]).default("free"),
  whopPlanId: z.string().nullable().optional(),
  lastPurchaseDate: z.date().nullable().optional(),
});

export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = z.infer<typeof creatorSchema>;

// Customer Schema (for database documents with _id)
export const customerSchema = z.object({
  _id: z.string(),
  creatorId: z.string(),
  whopUserId: z.string(),
  whopMemberId: z.string(),
  whopCompanyId: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  planName: z.string().nullable().optional(),
  joinedAt: z.date(),
  firstMessageSent: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const insertCustomerSchema = z.object({
  creatorId: z.string(),
  whopUserId: z.string(),
  whopMemberId: z.string(),
  whopCompanyId: z.string().nullable().optional(),
  name: z.string(),
  email: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  planName: z.string().nullable().optional(),
  joinedAt: z.date(),
  firstMessageSent: z.boolean().default(false),
  updatedAt: z.date().optional(),
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = z.infer<typeof customerSchema>;

// Audio Message Schema (for database documents with _id)
export const audioMessageSchema = z.object({
  _id: z.string(),
  customerId: z.string(),
  creatorId: z.string(),
  audioUrl: z.string().nullable().optional(),
  status: z.string().default("pending"),
  personalizedScript: z.string(),
  whopChatId: z.string().nullable().optional(),
  whopMessageId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  playCount: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable().optional(),
  sentAt: z.date().nullable().optional(),
  playedAt: z.date().nullable().optional(),
});

export const insertAudioMessageSchema = z.object({
  customerId: z.string(),
  creatorId: z.string(),
  audioUrl: z.string().nullable().optional(),
  status: z.string().default("pending"),
  personalizedScript: z.string(),
  whopChatId: z.string().nullable().optional(),
  whopMessageId: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  playCount: z.number().default(0),
  updatedAt: z.date().optional(),
  completedAt: z.date().nullable().optional(),
  sentAt: z.date().nullable().optional(),
  playedAt: z.date().nullable().optional(),
});

export type InsertAudioMessage = z.infer<typeof insertAudioMessageSchema>;
export type AudioMessage = z.infer<typeof audioMessageSchema>;

// Audio message status enum values
export const MESSAGE_STATUSES = {
  PENDING: "pending",           // Waiting to be generated
  GENERATING: "generating",     // Fish Audio is generating the audio
  COMPLETED: "completed",       // Audio generated successfully
  SENDING: "sending",           // Sending DM to customer
  SENT: "sent",                 // DM sent successfully
  DELIVERED: "delivered",       // Customer received the DM
  PLAYED: "played",             // Customer played the audio
  FAILED: "failed",             // Generation or sending failed
} as const;

// Placeholder types for message templates
export const TEMPLATE_PLACEHOLDERS = {
  NAME: "{name}",
  EMAIL: "{email}",
  USERNAME: "{username}",
  PLAN: "{plan}",
  DATE: "{date}",
} as const;

// Helper function to replace placeholders in message template
export function replacePlaceholders(
  template: string,
  data: {
    name?: string | null;
    email?: string | null;
    username?: string | null;
    planName?: string | null;
  }
): string {
  let result = template;
  result = result.replace(/{name}/g, data.name || "there");
  result = result.replace(/{email}/g, data.email || "");
  result = result.replace(/{username}/g, data.username || "");
  result = result.replace(/{plan}/g, data.planName || "our community");
  result = result.replace(/{date}/g, new Date().toLocaleDateString());
  return result;
}

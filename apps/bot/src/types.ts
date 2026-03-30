import { z } from "zod";

export const telegramUserSchema = z.object({
  id: z.number().int(),
  is_bot: z.boolean().optional(),
  first_name: z.string().min(1),
  username: z.string().optional().nullable()
});

export const telegramChatSchema = z.object({
  id: z.number().int(),
  type: z.enum(["private", "group", "supergroup", "channel"]),
  username: z.string().optional(),
  title: z.string().optional()
});

export const telegramMessageSchema = z.object({
  message_id: z.number().int(),
  text: z.string().optional(),
  from: telegramUserSchema.optional(),
  chat: telegramChatSchema
});

export const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: telegramMessageSchema.optional(),
  edited_message: telegramMessageSchema.optional()
});

export type TelegramChat = z.infer<typeof telegramChatSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

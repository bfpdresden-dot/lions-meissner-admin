import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  agenda: text("agenda"),
  date: timestamp("date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location").notNull(),
  maxParticipants: integer("max_participants"),
  isActive: boolean("is_active").notNull().default(true),
  isInternal: boolean("is_internal").notNull().default(false),
  programPdf: text("program_pdf"),
  programPdfPublic: boolean("program_pdf_public").notNull().default(true),
  reportText: text("report_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  birthday: text("birthday"),
  isActive: boolean("is_active").notNull().default(true),
  isMember: boolean("is_member").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  passwordHash: text("password_hash"),
  eventId: integer("event_id"),
  referredByMemberId: integer("referred_by_member_id"),
  confirmToken: text("confirm_token").unique(),
  confirmedAt: timestamp("confirmed_at"),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  guestCount: integer("guest_count").notNull().default(1),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settings.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  subscriberId: integer("subscriber_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const eventsRelations = relations(events, ({ many }) => ({
  subscribers: many(subscribers),
  registrations: many(registrations),
}));

export const subscribersRelations = relations(subscribers, ({ one }) => ({
  event: one(events, {
    fields: [subscribers.eventId],
    references: [events.id],
  }),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  event: one(events, {
    fields: [registrations.eventId],
    references: [events.id],
  }),
}));

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  maxVolunteers: integer("max_volunteers").notNull().default(1),
  note: text("note"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shiftSignups = pgTable("shift_signups", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull(),
  memberId: integer("member_id").notNull(),
  personCount: integer("person_count").notNull().default(1),
  signedUpAt: timestamp("signed_up_at").notNull().defaultNow(),
});

export type Shift = typeof shifts.$inferSelect;
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type ShiftSignup = typeof shiftSignups.$inferSelect;
export const insertShiftSignupSchema = createInsertSchema(shiftSignups).omit({ id: true, signedUpAt: true });
export type InsertShiftSignup = z.infer<typeof insertShiftSignupSchema>;

export const eventPhotos = pgTable("event_photos", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  filename: text("filename").notNull(),
  caption: text("caption"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export type EventPhoto = typeof eventPhotos.$inferSelect;
export const insertEventPhotoSchema = createInsertSchema(eventPhotos).omit({ id: true, uploadedAt: true });
export type InsertEventPhoto = z.infer<typeof insertEventPhotoSchema>;

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id"),
  subscriberId: integer("subscriber_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name").notNull(),
  subject: text("subject").notNull(),
  success: boolean("success").notNull().default(true),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export type EmailLog = typeof emailLogs.$inferSelect;

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  subscribedAt: true,
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

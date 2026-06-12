import {
  events,
  subscribers,
  registrations,
  passwordResetTokens,
  settings,
  eventPhotos,
  emailLogs,
  shifts,
  shiftSignups,
  type Event,
  type InsertEvent,
  type Subscriber,
  type InsertSubscriber,
  type Registration,
  type InsertRegistration,
  type PasswordResetToken,
  type Setting,
  type EventPhoto,
  type EmailLog,
  type Shift,
  type InsertShift,
  type ShiftSignup,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  getSubscribers(): Promise<Subscriber[]>;
  getMembers(): Promise<Subscriber[]>;
  getAdmins(): Promise<Subscriber[]>;
  getSubscriber(id: number): Promise<Subscriber | undefined>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  getSubscriberByConfirmToken(token: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: number, data: Partial<InsertSubscriber>): Promise<Subscriber | undefined>;
  deleteSubscriber(id: number): Promise<void>;

  getRegistrations(): Promise<Registration[]>;
  getRegistration(id: number): Promise<Registration | undefined>;
  getRegistrationsByEvent(eventId: number): Promise<Registration[]>;
  getRegistrationsByEmail(email: string): Promise<Registration[]>;
  getRegistrationByEmailAndEvent(email: string, eventId: number): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  updateRegistration(id: number, guestCount: number): Promise<Registration>;
  deleteRegistration(id: number): Promise<void>;
  getGuestCountByEvent(eventId: number): Promise<number>;
  getAllGuestCounts(): Promise<Record<number, number>>;

  createEmailLog(log: { eventId?: number; subscriberId?: number; recipientEmail: string; recipientName: string; subject: string; success: boolean }): Promise<void>;
  getEmailLogsByEvent(eventId: number): Promise<import("@shared/schema").EmailLog[]>;
  getEmailLogsBySubscriber(subscriberId: number): Promise<import("@shared/schema").EmailLog[]>;

  getEventPhotos(eventId: number): Promise<EventPhoto[]>;
  createEventPhoto(eventId: number, filename: string, caption?: string): Promise<EventPhoto>;
  deleteEventPhoto(id: number): Promise<EventPhoto | undefined>;

  createPasswordResetToken(subscriberId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  getSettings(): Promise<Record<string, string>>;
  setSetting(key: string, value: string): Promise<void>;
  setSettings(entries: Record<string, string>): Promise<void>;

  getShiftsByEvent(eventId: number): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, data: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: number): Promise<void>;

  getSignupsByShift(shiftId: number): Promise<ShiftSignup[]>;
  getSignupsByEvent(eventId: number): Promise<ShiftSignup[]>;
  createSignup(shiftId: number, memberId: number): Promise<ShiftSignup>;
  deleteSignup(id: number): Promise<void>;
  getSignup(shiftId: number, memberId: number): Promise<ShiftSignup | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.date);
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event | undefined> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated || undefined;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(registrations).where(eq(registrations.eventId, id));
    await db.delete(events).where(eq(events.id, id));
  }

  async getSubscribers(): Promise<Subscriber[]> {
    return db.select().from(subscribers);
  }

  async getMembers(): Promise<Subscriber[]> {
    return db.select().from(subscribers).where(eq(subscribers.isMember, true));
  }

  async getAdmins(): Promise<Subscriber[]> {
    return db.select().from(subscribers).where(eq(subscribers.isAdmin, true));
  }

  async getSubscriber(id: number): Promise<Subscriber | undefined> {
    const [sub] = await db.select().from(subscribers).where(eq(subscribers.id, id));
    return sub || undefined;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [sub] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    return sub || undefined;
  }

  async getSubscriberByConfirmToken(token: string): Promise<Subscriber | undefined> {
    const [sub] = await db.select().from(subscribers).where(eq(subscribers.confirmToken, token));
    return sub || undefined;
  }

  async createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber> {
    const [created] = await db.insert(subscribers).values(subscriber).returning();
    return created;
  }

  async updateSubscriber(id: number, data: Partial<InsertSubscriber>): Promise<Subscriber | undefined> {
    const [updated] = await db.update(subscribers).set(data).where(eq(subscribers.id, id)).returning();
    return updated || undefined;
  }

  async deleteSubscriber(id: number): Promise<void> {
    await db.delete(subscribers).where(eq(subscribers.id, id));
  }

  async getRegistrations(): Promise<Registration[]> {
    return db.select().from(registrations);
  }

  async getRegistration(id: number): Promise<Registration | undefined> {
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, id));
    return reg || undefined;
  }

  async getRegistrationsByEvent(eventId: number): Promise<Registration[]> {
    return db.select().from(registrations).where(eq(registrations.eventId, eventId));
  }

  async getRegistrationsByEmail(email: string): Promise<Registration[]> {
    return db.select().from(registrations).where(eq(registrations.email, email));
  }

  async getRegistrationByEmailAndEvent(email: string, eventId: number): Promise<Registration | undefined> {
    const [reg] = await db.select().from(registrations).where(
      and(eq(registrations.email, email), eq(registrations.eventId, eventId))
    );
    return reg || undefined;
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [created] = await db.insert(registrations).values(registration).returning();
    return created;
  }

  async updateRegistration(id: number, guestCount: number): Promise<Registration> {
    const [updated] = await db.update(registrations).set({ guestCount }).where(eq(registrations.id, id)).returning();
    return updated;
  }

  async deleteRegistration(id: number): Promise<void> {
    await db.delete(registrations).where(eq(registrations.id, id));
  }

  async getGuestCountByEvent(eventId: number): Promise<number> {
    const result = await db.select({
      total: sql<number>`coalesce(sum(${registrations.guestCount}), 0)`,
    }).from(registrations).where(eq(registrations.eventId, eventId));
    return Number(result[0]?.total || 0);
  }

  async getAllGuestCounts(): Promise<Record<number, number>> {
    const result = await db.select({
      eventId: registrations.eventId,
      total: sql<number>`coalesce(sum(${registrations.guestCount}), 0)`,
    }).from(registrations).groupBy(registrations.eventId);
    const counts: Record<number, number> = {};
    for (const row of result) {
      counts[row.eventId] = Number(row.total);
    }
    return counts;
  }

  async createEmailLog(log: { eventId?: number; subscriberId?: number; recipientEmail: string; recipientName: string; subject: string; success: boolean }): Promise<void> {
    await db.insert(emailLogs).values(log);
  }

  async getEmailLogsByEvent(eventId: number): Promise<EmailLog[]> {
    return db.select().from(emailLogs).where(eq(emailLogs.eventId, eventId)).orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsBySubscriber(subscriberId: number): Promise<EmailLog[]> {
    return db.select().from(emailLogs).where(eq(emailLogs.subscriberId, subscriberId)).orderBy(desc(emailLogs.sentAt));
  }

  async getEventPhotos(eventId: number): Promise<EventPhoto[]> {
    return db.select().from(eventPhotos).where(eq(eventPhotos.eventId, eventId)).orderBy(eventPhotos.uploadedAt);
  }

  async createEventPhoto(eventId: number, filename: string, caption?: string): Promise<EventPhoto> {
    const [created] = await db.insert(eventPhotos).values({ eventId, filename, caption }).returning();
    return created;
  }

  async deleteEventPhoto(id: number): Promise<EventPhoto | undefined> {
    const [deleted] = await db.delete(eventPhotos).where(eq(eventPhotos.id, id)).returning();
    return deleted || undefined;
  }

  async createPasswordResetToken(subscriberId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [created] = await db.insert(passwordResetTokens).values({ subscriberId, token, expiresAt }).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return row || undefined;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < now()`);
  }

  async getSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(settings);
    const result: Record<string, string> = {};
    for (const row of rows) result[row.key] = row.value;
    return result;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings).values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }

  async setSettings(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.setSetting(key, value);
    }
  }

  async getShiftsByEvent(eventId: number): Promise<Shift[]> {
    return db.select().from(shifts).where(eq(shifts.eventId, eventId)).orderBy(shifts.date, shifts.startTime);
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db.insert(shifts).values(shift).returning();
    return created;
  }

  async updateShift(id: number, data: Partial<InsertShift>): Promise<Shift | undefined> {
    const [updated] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
    return updated || undefined;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shiftSignups).where(eq(shiftSignups.shiftId, id));
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getSignupsByShift(shiftId: number): Promise<ShiftSignup[]> {
    return db.select().from(shiftSignups).where(eq(shiftSignups.shiftId, shiftId)).orderBy(shiftSignups.signedUpAt);
  }

  async getSignupsByEvent(eventId: number): Promise<ShiftSignup[]> {
    const eventShifts = await this.getShiftsByEvent(eventId);
    if (eventShifts.length === 0) return [];
    const shiftIds = eventShifts.map((s) => s.id);
    const all: ShiftSignup[] = [];
    for (const sid of shiftIds) {
      const rows = await db.select().from(shiftSignups).where(eq(shiftSignups.shiftId, sid));
      all.push(...rows);
    }
    return all;
  }

  async createSignup(shiftId: number, memberId: number): Promise<ShiftSignup> {
    const [created] = await db.insert(shiftSignups).values({ shiftId, memberId }).returning();
    return created;
  }

  async deleteSignup(id: number): Promise<void> {
    await db.delete(shiftSignups).where(eq(shiftSignups.id, id));
  }

  async getSignup(shiftId: number, memberId: number): Promise<ShiftSignup | undefined> {
    const [row] = await db.select().from(shiftSignups).where(
      and(eq(shiftSignups.shiftId, shiftId), eq(shiftSignups.memberId, memberId))
    );
    return row || undefined;
  }
}

export const storage = new DatabaseStorage();

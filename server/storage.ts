import {
  events,
  subscribers,
  registrations,
  type Event,
  type InsertEvent,
  type Subscriber,
  type InsertSubscriber,
  type Registration,
  type InsertRegistration,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<void>;

  getSubscribers(): Promise<Subscriber[]>;
  getSubscriber(id: number): Promise<Subscriber | undefined>;
  getSubscriberByEmail(email: string): Promise<Subscriber | undefined>;
  createSubscriber(subscriber: InsertSubscriber): Promise<Subscriber>;
  updateSubscriber(id: number, data: Partial<InsertSubscriber>): Promise<Subscriber | undefined>;
  deleteSubscriber(id: number): Promise<void>;

  getRegistrations(): Promise<Registration[]>;
  getRegistrationsByEvent(eventId: number): Promise<Registration[]>;
  getRegistrationByEmailAndEvent(email: string, eventId: number): Promise<Registration | undefined>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  deleteRegistration(id: number): Promise<void>;
  getGuestCountByEvent(eventId: number): Promise<number>;
  getAllGuestCounts(): Promise<Record<number, number>>;
}

export class DatabaseStorage implements IStorage {
  async getEvents(): Promise<Event[]> {
    return db.select().from(events);
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

  async getSubscriber(id: number): Promise<Subscriber | undefined> {
    const [sub] = await db.select().from(subscribers).where(eq(subscribers.id, id));
    return sub || undefined;
  }

  async getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
    const [sub] = await db.select().from(subscribers).where(eq(subscribers.email, email));
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

  async getRegistrationsByEvent(eventId: number): Promise<Registration[]> {
    return db.select().from(registrations).where(eq(registrations.eventId, eventId));
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
}

export const storage = new DatabaseStorage();

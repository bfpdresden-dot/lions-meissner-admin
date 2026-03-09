import {
  events,
  subscribers,
  type Event,
  type InsertEvent,
  type Subscriber,
  type InsertSubscriber,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertSubscriberSchema, insertRegistrationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    const event = await storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    res.json(event);
  });

  app.post("/api/events", async (req, res) => {
    const body = { ...req.body };
    if (typeof body.date === "string") {
      body.date = new Date(body.date);
    }
    const parsed = insertEventSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const event = await storage.createEvent(parsed.data);
    res.status(201).json(event);
  });

  app.patch("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    const body = { ...req.body };
    if (typeof body.date === "string") {
      body.date = new Date(body.date);
    }
    const event = await storage.updateEvent(id, body);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    res.json(event);
  });

  app.delete("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    await storage.deleteEvent(id);
    res.status(204).send();
  });

  app.get("/api/subscribers", async (_req, res) => {
    const subs = await storage.getSubscribers();
    res.json(subs);
  });

  app.patch("/api/subscribers/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    const sub = await storage.updateSubscriber(id, req.body);
    if (!sub) return res.status(404).json({ error: "Abonnent nicht gefunden" });
    res.json(sub);
  });

  app.delete("/api/subscribers/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    await storage.deleteSubscriber(id);
    res.status(204).send();
  });

  app.get("/api/members", async (_req, res) => {
    const members = await storage.getMembers();
    res.json(members);
  });

  app.get("/api/members/export", async (_req, res) => {
    const members = await storage.getMembers();
    const header = "Vorname;Nachname;E-Mail;Telefon;Status;Mitglied seit\n";
    const rows = members.map((m) =>
      `${m.firstName};${m.lastName};${m.email};${m.phone || ""};${m.isActive ? "Aktiv" : "Inaktiv"};${new Date(m.subscribedAt).toLocaleDateString("de-DE")}`
    ).join("\n");
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=mitglieder.csv");
    res.send(bom + header + rows);
  });

  app.get("/api/subscribers/export", async (_req, res) => {
    const subs = await storage.getSubscribers();
    const header = "Vorname;Nachname;E-Mail;Telefon;Status;Anmeldedatum\n";
    const rows = subs.map((s) =>
      `${s.firstName};${s.lastName};${s.email};${s.phone || ""};${s.isActive ? "Aktiv" : "Inaktiv"};${new Date(s.subscribedAt).toLocaleDateString("de-DE")}`
    ).join("\n");
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=abonnenten.csv");
    res.send(bom + header + rows);
  });

  app.post("/api/subscribe", async (req, res) => {
    const { email, firstName, lastName, phone, eventId } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Alle Felder sind erforderlich" });
    }
    const existing = await storage.getSubscriberByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "E-Mail bereits registriert" });
    }
    if (eventId) {
      const event = await storage.getEvent(eventId);
      if (!event || !event.isActive) {
        return res.status(404).json({ error: "Veranstaltung nicht gefunden oder inaktiv" });
      }
    }
    const subscriber = await storage.createSubscriber({
      email,
      firstName,
      lastName,
      phone: phone || null,
      eventId: eventId || null,
      isActive: true,
    });
    res.status(201).json(subscriber);
  });

  app.get("/api/registrations", async (_req, res) => {
    const regs = await storage.getRegistrations();
    res.json(regs);
  });

  app.get("/api/registrations/event/:eventId", async (req, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    const regs = await storage.getRegistrationsByEvent(eventId);
    res.json(regs);
  });

  app.get("/api/registrations/counts", async (_req, res) => {
    const counts = await storage.getAllGuestCounts();
    res.json(counts);
  });

  const registrationInputSchema = insertRegistrationSchema.extend({
    guestCount: z.number().int().min(1, "Mindestens 1 Person").max(20, "Maximal 20 Personen").default(1),
    eventId: z.number().int().positive(),
    firstName: z.string().min(1, "Vorname ist erforderlich"),
    lastName: z.string().min(1, "Nachname ist erforderlich"),
    email: z.string().email("Ung\u00fcltige E-Mail-Adresse"),
  });

  app.post("/api/registrations", async (req, res) => {
    const parsed = registrationInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map(i => i.message).join(", ") });
    }
    const { eventId, firstName, lastName, email, phone, guestCount } = parsed.data;
    const event = await storage.getEvent(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: "Veranstaltung nicht gefunden oder inaktiv" });
    }
    const existing = await storage.getRegistrationByEmailAndEvent(email, eventId);
    if (existing) {
      return res.status(409).json({ error: "Sie sind bereits f\u00fcr diese Veranstaltung angemeldet" });
    }
    if (event.maxParticipants) {
      const currentCount = await storage.getGuestCountByEvent(eventId);
      const requestedGuests = guestCount || 1;
      if (currentCount + requestedGuests > event.maxParticipants) {
        return res.status(400).json({ error: "Die maximale Teilnehmerzahl w\u00fcrde \u00fcberschritten" });
      }
    }
    const registration = await storage.createRegistration({
      eventId,
      firstName,
      lastName,
      email,
      phone: phone || null,
      guestCount: guestCount || 1,
    });
    res.status(201).json(registration);
  });

  app.delete("/api/registrations/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    await storage.deleteRegistration(id);
    res.status(204).send();
  });

  app.get("/api/registrations/export/:eventId", async (req, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: "Ung\u00fcltige ID" });
    const event = await storage.getEvent(eventId);
    const regs = await storage.getRegistrationsByEvent(eventId);
    const header = "Vorname;Nachname;E-Mail;Telefon;Anzahl G\u00e4ste;Anmeldedatum\n";
    const rows = regs.map((r) =>
      `${r.firstName};${r.lastName};${r.email};${r.phone || ""};${r.guestCount};${new Date(r.registeredAt).toLocaleDateString("de-DE")}`
    ).join("\n");
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=gaeste_${event?.title || eventId}.csv`);
    res.send(bom + header + rows);
  });

  return httpServer;
}

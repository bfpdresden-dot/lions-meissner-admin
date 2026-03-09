import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEventSchema, insertSubscriberSchema } from "@shared/schema";

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

  app.get("/api/subscribers/export", async (_req, res) => {
    const subs = await storage.getSubscribers();
    const header = "Vorname;Nachname;E-Mail;Status;Anmeldedatum\n";
    const rows = subs.map((s) =>
      `${s.firstName};${s.lastName};${s.email};${s.isActive ? "Aktiv" : "Inaktiv"};${new Date(s.subscribedAt).toLocaleDateString("de-DE")}`
    ).join("\n");
    const bom = "\uFEFF";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=abonnenten.csv");
    res.send(bom + header + rows);
  });

  app.post("/api/subscribe", async (req, res) => {
    const { email, firstName, lastName, eventId } = req.body;
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
      eventId: eventId || null,
      isActive: true,
    });
    res.status(201).json(subscriber);
  });

  return httpServer;
}

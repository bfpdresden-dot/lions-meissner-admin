import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertEventSchema, insertSubscriberSchema, insertRegistrationSchema } from "@shared/schema";
import { requireAdmin, hasAnyAdmin } from "./auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth ─────────────────────────────────────────────────────────────────

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      const noAdmin = !(await hasAnyAdmin());
      return res.json({ authenticated: false, setupRequired: noAdmin });
    }
    const sub = await storage.getSubscriber(req.session.userId);
    if (!sub || !sub.isAdmin) {
      req.session.destroy(() => {});
      return res.json({ authenticated: false, setupRequired: false });
    }
    res.json({
      authenticated: true,
      user: { id: sub.id, firstName: sub.firstName, lastName: sub.lastName, email: sub.email },
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
    }
    const sub = await storage.getSubscriberByEmail(email.trim().toLowerCase());
    if (!sub || !sub.isAdmin || !sub.passwordHash) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }
    const valid = await bcrypt.compare(password, sub.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }
    req.session.userId = sub.id;
    req.session.isAdmin = true;
    res.json({ ok: true, user: { id: sub.id, firstName: sub.firstName, lastName: sub.lastName, email: sub.email } });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  // First-time setup: set password for an admin when no admins exist yet
  app.post("/api/auth/setup", async (req, res) => {
    const adminExists = await hasAnyAdmin();
    if (adminExists) {
      return res.status(403).json({ error: "Setup bereits abgeschlossen" });
    }
    const { memberId, password } = req.body;
    if (!memberId || !password || password.length < 6) {
      return res.status(400).json({ error: "Mitglied-ID und Passwort (min. 6 Zeichen) erforderlich" });
    }
    const sub = await storage.getSubscriber(memberId);
    if (!sub || !sub.isMember) {
      return res.status(404).json({ error: "Mitglied nicht gefunden" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await storage.updateSubscriber(memberId, { isAdmin: true, passwordHash });
    res.json({ ok: true });
  });

  // Set / update admin password (requires existing admin session OR setup mode)
  app.post("/api/members/:id/set-password", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const adminExists = await hasAnyAdmin();
    if (adminExists && !req.session?.isAdmin) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben" });
    }
    const sub = await storage.getSubscriber(id);
    if (!sub) return res.status(404).json({ error: "Mitglied nicht gefunden" });
    const passwordHash = await bcrypt.hash(password, 10);
    await storage.updateSubscriber(id, { isAdmin: true, passwordHash });
    res.json({ ok: true });
  });

  // Remove admin role
  app.post("/api/members/:id/remove-admin", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    // Prevent removing the last admin
    const admins = await storage.getAdmins();
    if (admins.length <= 1 && admins[0]?.id === id) {
      return res.status(400).json({ error: "Letzter Admin kann nicht entfernt werden" });
    }
    await storage.updateSubscriber(id, { isAdmin: false, passwordHash: null });
    res.json({ ok: true });
  });

  // ── Events ───────────────────────────────────────────────────────────────

  app.get("/api/events", async (_req, res) => {
    const events = await storage.getEvents();
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const event = await storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    res.json(event);
  });

  app.post("/api/events", requireAdmin, async (req, res) => {
    const body = { ...req.body };
    if (typeof body.date === "string") body.date = new Date(body.date);
    const parsed = insertEventSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const event = await storage.createEvent(parsed.data);
    res.status(201).json(event);
  });

  app.patch("/api/events/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const body = { ...req.body };
    if (typeof body.date === "string") body.date = new Date(body.date);
    const event = await storage.updateEvent(id, body);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    res.json(event);
  });

  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    await storage.deleteEvent(id);
    res.status(204).send();
  });

  // ── Subscribers ──────────────────────────────────────────────────────────

  app.get("/api/subscribers", requireAdmin, async (_req, res) => {
    const subs = await storage.getSubscribers();
    res.json(subs);
  });

  app.patch("/api/subscribers/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const sub = await storage.updateSubscriber(id, req.body);
    if (!sub) return res.status(404).json({ error: "Abonnent nicht gefunden" });
    res.json(sub);
  });

  app.delete("/api/subscribers/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    await storage.deleteSubscriber(id);
    res.status(204).send();
  });

  app.get("/api/members", async (req, res) => {
    const adminOk = req.session?.isAdmin;
    const setupMode = !(await hasAnyAdmin());
    if (!adminOk && !setupMode) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    const members = await storage.getMembers();
    res.json(members);
  });

  app.get("/api/members/export", requireAdmin, async (_req, res) => {
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

  app.get("/api/subscribers/export", requireAdmin, async (_req, res) => {
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

  // Public subscribe (no auth needed)
  app.post("/api/subscribe", async (req, res) => {
    const { email, firstName, lastName, phone, eventId, isMember } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Alle Felder sind erforderlich" });
    }
    const existing = await storage.getSubscriberByEmail(email);
    if (existing) return res.status(409).json({ error: "E-Mail bereits registriert" });
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
      isMember: isMember || false,
    });
    res.status(201).json(subscriber);
  });

  // ── Registrations ────────────────────────────────────────────────────────

  app.get("/api/registrations", requireAdmin, async (_req, res) => {
    const regs = await storage.getRegistrations();
    res.json(regs);
  });

  app.get("/api/registrations/event/:eventId", requireAdmin, async (req, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: "Ungültige ID" });
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
    email: z.string().email("Ungültige E-Mail-Adresse"),
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
      return res.status(409).json({ error: "Sie sind bereits für diese Veranstaltung angemeldet" });
    }
    if (event.maxParticipants) {
      const currentCount = await storage.getGuestCountByEvent(eventId);
      if (currentCount + (guestCount || 1) > event.maxParticipants) {
        return res.status(400).json({ error: "Die maximale Teilnehmerzahl würde überschritten" });
      }
    }
    const registration = await storage.createRegistration({
      eventId, firstName, lastName, email,
      phone: phone || null,
      guestCount: guestCount || 1,
    });
    res.status(201).json(registration);
  });

  app.delete("/api/registrations/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    await storage.deleteRegistration(id);
    res.status(204).send();
  });

  app.get("/api/registrations/export/:eventId", requireAdmin, async (req, res) => {
    const eventId = parseInt(req.params.eventId, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: "Ungültige ID" });
    const event = await storage.getEvent(eventId);
    const regs = await storage.getRegistrationsByEvent(eventId);
    const header = "Vorname;Nachname;E-Mail;Telefon;Anzahl Gäste;Anmeldedatum\n";
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

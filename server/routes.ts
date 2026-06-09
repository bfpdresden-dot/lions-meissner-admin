import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { insertEventSchema, insertSubscriberSchema, insertRegistrationSchema } from "@shared/schema";
import { requireAdmin, hasAnyAdmin } from "./auth";
import { sendPasswordResetEmail, sendCustomEmail, sendOptInEmail } from "./email";
import { z } from "zod";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

async function pushToExternalServer(localFilePath: string, originalName: string, mimeType: string): Promise<string | null> {
  const extUrl = process.env.WEBSERVER_UPLOAD_URL;
  const extKey = process.env.WEBSERVER_UPLOAD_KEY;
  if (!extUrl || !extKey) return null;
  const fileBuffer = fs.readFileSync(localFilePath);
  const boundary = "----LionsUpload" + Date.now().toString(16);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${originalName}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  const res = await fetch(`${extUrl}?key=${encodeURIComponent(extKey)}`, {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`External upload failed: ${res.status}`);
  const data = await res.json() as { url?: string; error?: string };
  if (!data.url) throw new Error(data.error || "No URL returned");
  fs.unlinkSync(localFilePath);
  // Sanitize URL: extract clean base + /uploads/filename in case PHP script
  // returned a malformed URL when the secret key contained special chars
  const urlMatch = data.url.match(/\/uploads\/([^?#]+)$/);
  if (urlMatch) {
    const extUrl2 = process.env.WEBSERVER_UPLOAD_URL!;
    const base = new URL(extUrl2).origin;
    return `${base}/uploads/${urlMatch[1]}`;
  }
  return data.url;
}

async function deleteFromStorage(filenameOrUrl: string): Promise<void> {
  if (filenameOrUrl.startsWith("http://") || filenameOrUrl.startsWith("https://")) {
    const extUrl = process.env.WEBSERVER_UPLOAD_URL;
    const extKey = process.env.WEBSERVER_UPLOAD_KEY;
    if (extUrl && extKey) {
      const body = new URLSearchParams({ url: filenameOrUrl });
      await fetch(`${extUrl}?action=delete&key=${encodeURIComponent(extKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }).catch(() => {});
    }
  } else {
    const file = path.join(uploadsDir, filenameOrUrl);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype === "application/pdf");
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `photo-${unique}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype));
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Serve uploaded files
  const express = await import("express");
  app.use("/uploads", express.default.static(uploadsDir));

  // PDF upload for event
  app.post("/api/events/:id/upload-pdf", requireAdmin, pdfUpload.single("pdf"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    if (!req.file) return res.status(400).json({ error: "Keine PDF-Datei" });
    const event = await storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    if ((event as any).programPdf) await deleteFromStorage((event as any).programPdf);
    const externalUrl = await pushToExternalServer(req.file.path, req.file.originalname, "application/pdf").catch(() => null);
    const stored = externalUrl ?? req.file.filename;
    const updated = await storage.updateEvent(id, { programPdf: stored } as any);
    res.json(updated);
  });

  // Delete PDF for event
  app.delete("/api/events/:id/pdf", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const event = await storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    if ((event as any).programPdf) await deleteFromStorage((event as any).programPdf);
    const updated = await storage.updateEvent(id, { programPdf: null, programPdfPublic: true } as any);
    res.json(updated);
  });

  // ── Event Photos ─────────────────────────────────────────────────────────

  // List photos for event (public)
  app.get("/api/events/:id/photos", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const photos = await storage.getEventPhotos(id);
    res.json(photos);
  });

  // Upload photos for event (admin, up to 20 at once)
  app.post("/api/events/:id/photos", requireAdmin, imageUpload.array("photos", 20), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const event = await storage.getEvent(id);
    if (!event) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "Keine Bilddateien" });
    }
    const caption = typeof req.body.caption === "string" ? req.body.caption : undefined;
    const saved = await Promise.all(
      req.files.map(async (f) => {
        const externalUrl = await pushToExternalServer(f.path, f.originalname, f.mimetype).catch(() => null);
        return storage.createEventPhoto(id, externalUrl ?? f.filename, caption);
      })
    );
    res.json(saved);
  });

  // Delete a photo (admin)
  app.delete("/api/events/photos/:photoId", requireAdmin, async (req, res) => {
    const photoId = parseInt(req.params.photoId, 10);
    if (isNaN(photoId)) return res.status(400).json({ error: "Ungültige ID" });
    const deleted = await storage.deleteEventPhoto(photoId);
    if (!deleted) return res.status(404).json({ error: "Foto nicht gefunden" });
    await deleteFromStorage(deleted.filename);
    res.json({ ok: true });
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  app.get("/api/auth/me", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
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
    req.session.save((err) => {
      if (err) {
        console.error("[login] session.save error:", err);
        return res.status(500).json({ error: "Sitzungsfehler" });
      }
      res.json({ ok: true, user: { id: sub.id, firstName: sub.firstName, lastName: sub.lastName, email: sub.email } });
    });
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

  // First-time setup: create the very first admin account in one step
  app.post("/api/auth/first-setup", async (req, res) => {
    const adminExists = await hasAnyAdmin();
    if (adminExists) {
      return res.status(403).json({ error: "Setup bereits abgeschlossen" });
    }
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password || password.length < 6) {
      return res.status(400).json({ error: "Alle Felder sind erforderlich (Passwort min. 6 Zeichen)" });
    }
    const existing = await storage.getSubscriberByEmail(email.trim().toLowerCase());
    if (existing) {
      // Upgrade existing subscriber to admin
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateSubscriber(existing.id, { isAdmin: true, isMember: true, passwordHash });
      return res.json({ ok: true });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await storage.createSubscriber({
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
      phone: null,
      eventId: null,
      isActive: true,
      isMember: true,
      isAdmin: true,
      passwordHash,
    });
    res.status(201).json({ ok: true });
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

  // Set portal password for any subscriber/member (does NOT grant admin rights)
  app.post("/api/subscribers/:id/set-portal-password", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben" });
    }
    const sub = await storage.getSubscriber(id);
    if (!sub) return res.status(404).json({ error: "Person nicht gefunden" });
    const passwordHash = await bcrypt.hash(password, 10);
    await storage.updateSubscriber(id, { passwordHash });
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

  app.get("/api/events", async (req, res) => {
    const all = await storage.getEvents();
    // Public route: hide internal events unless admin session
    if (req.session?.isAdmin) return res.json(all);
    res.json(all.filter((e) => !e.isInternal));
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

  app.post("/api/events/:id/copy", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const source = await storage.getEvent(id);
    if (!source) return res.status(404).json({ error: "Veranstaltung nicht gefunden" });
    const { id: _id, createdAt: _c, ...rest } = source;
    const copy = await storage.createEvent({
      ...rest,
      title: `${source.title} (Kopie)`,
      isActive: false,
    });
    res.status(201).json(copy);
  });

  app.delete("/api/events/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    await storage.deleteEvent(id);
    res.status(204).send();
  });

  // ── Settings ─────────────────────────────────────────────────────────────

  app.get("/api/settings", requireAdmin, async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s);
  });

  app.patch("/api/settings", requireAdmin, async (req, res) => {
    const entries = req.body as Record<string, string>;
    if (typeof entries !== "object" || Array.isArray(entries)) {
      return res.status(400).json({ error: "Ungültiges Format" });
    }
    await storage.setSettings(entries);
    const updated = await storage.getSettings();
    res.json(updated);
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

  app.post("/api/members", async (req, res) => {
    const adminOk = req.session?.isAdmin;
    const setupMode = !(await hasAnyAdmin());
    if (!adminOk && !setupMode) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    const { email, firstName, lastName, phone, password } = req.body;
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: "Alle Felder sind erforderlich" });
    }
    const existing = await storage.getSubscriberByEmail(email);
    if (existing) return res.status(409).json({ error: "E-Mail bereits registriert" });
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const member = await storage.createSubscriber({
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
      phone: phone || null,
      eventId: null,
      isActive: true,
      isMember: true,
      passwordHash,
    });
    res.status(201).json(member);
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

  app.post("/api/ai/generate-email", requireAdmin, async (req, res) => {
    const schema = z.object({
      prompt: z.string().min(1),
      subject: z.string().optional(),
      style: z.enum(["formell", "freundlich", "kollegial", "locker"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Ungültige Eingabe" });

    const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY nicht konfiguriert" });


    let settings: any = {};
    try { settings = await storage.getSettings(); } catch {}
    const clubName = settings.clubName || "Lions Club Meißner Land";

    // Get the logged-in admin's full name for the signature
    let senderName = settings.senderName || "";
    try {
      const adminSub = await storage.getSubscriber((req.session as any).userId);
      if (adminSub) senderName = `${adminSub.firstName} ${adminSub.lastName}`.trim();
    } catch {}

    const styleInstructions: Record<string, string> = {
      formell:    "Schreibe sehr formell und höflich (Siezen). Anrede: 'Sehr geehrte/r {{Vorname}},' oder 'Sehr geehrtes Mitglied,'.",
      freundlich: "Schreibe freundlich und warm, aber dennoch respektvoll (Siezen). Anrede: 'Guten Tag {{Vorname}},'.",
      kollegial:  "Schreibe kollegial und unkompliziert (Duzen). Anrede: 'Hallo {{Vorname}},'.",
      locker:     "Schreibe locker, herzlich und persönlich (Duzen). Anrede: 'Hey {{Vorname}},' oder 'Liebe/r {{Vorname}},'.",
    };
    const chosenStyle = parsed.data.style ?? "formell";
    const styleInstruction = styleInstructions[chosenStyle];

    const systemPrompt = `Du bist ein hilfreicher Assistent für den ${clubName}.
Schreibe E-Mail-Texte auf Deutsch.
${styleInstruction}
Nutze {{Vorname}} als Platzhalter für die persönliche Anrede.
Gib NUR den E-Mail-Text zurück, ohne Betreff, ohne Erklärungen, ohne Anführungszeichen.
${senderName ? `Verwende als Absendername in der Grußformel: "${senderName}" (also z.B. "Mit freundlichen Grüßen,\n${senderName}").` : "Verwende KEINEN Platzhalter wie [Ihr Name] in der Grußformel — lasse den Namen weg oder schreibe nur den Club-Namen."}

WICHTIG: Der Nutzer gibt dir eine Beschreibung dessen, was die E-Mail enthalten oder erreichen soll (z.B. eine konkrete Bitte, eine Aufgabe, eine Ankündigung). Baue diesen Inhalt vollständig und deutlich in den E-Mail-Text ein. Wenn der Nutzer z.B. schreibt "Hilfe beim Aufbau unseres Standes", dann formuliere im E-Mail-Text eine freundliche aber klare Bitte an den Empfänger, beim Aufbau des Standes zu helfen.`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://lions-meissnerland.replit.app",
          "X-Title": clubName,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: parsed.data.prompt + (parsed.data.subject ? `\n\nBetreff: ${parsed.data.subject}` : "") },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("OpenRouter error:", errText);
        let detail = "";
        try { detail = JSON.parse(errText)?.error?.message || ""; } catch {}
        return res.status(500).json({ error: `KI-Anfrage fehlgeschlagen${detail ? ": " + detail : ""}` });
      }

      const data = await response.json() as any;
      const text = data.choices?.[0]?.message?.content || "";
      return res.json({ text });
    } catch (err: any) {
      console.error("OpenRouter error:", err);
      return res.status(500).json({ error: err.message || "Fehler bei der KI-Generierung" });
    }
  });

  app.post("/api/members/send-email", requireAdmin, async (req, res) => {
    const schema = z.object({
      memberIds: z.array(z.number()).optional(),
      subject: z.string().min(1),
      body: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Ungültige Eingabe" });

    const { memberIds, subject, body } = parsed.data;
    const allMembers = await storage.getMembers();
    const targets = memberIds && memberIds.length > 0
      ? allMembers.filter((m) => memberIds.includes(m.id) && m.isActive)
      : allMembers.filter((m) => m.isActive);

    if (targets.length === 0) return res.status(400).json({ error: "Keine Empfänger gefunden" });

    try {
      const recipients = targets.map((m) => ({ email: m.email, firstName: m.firstName }));
      const result = await sendCustomEmail(recipients, subject, body);
      return res.json(result);
    } catch (err: any) {
      console.error("Send email error:", err);
      return res.status(500).json({ error: err.message || "E-Mail konnte nicht gesendet werden." });
    }
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

  // ── Portal (Subscriber/Member personal area) ─────────────────────────────

  app.post("/api/portal/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
    }
    const sub = await storage.getSubscriberByEmail(email.trim().toLowerCase());
    if (!sub || !sub.passwordHash) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten oder kein Portal-Konto vorhanden" });
    }
    const valid = await bcrypt.compare(password, sub.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }
    if (!sub.isActive) {
      return res.status(403).json({ error: "Ihr Konto ist deaktiviert" });
    }
    req.session.subscriberId = sub.id;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: "Sitzungsfehler" });
      res.json({
        ok: true,
        subscriber: { id: sub.id, firstName: sub.firstName, lastName: sub.lastName, email: sub.email, isMember: sub.isMember },
      });
    });
  });

  app.post("/api/portal/logout", (req, res) => {
    delete (req.session as any).subscriberId;
    req.session.save(() => res.json({ ok: true }));
  });

  // Passwort vergessen: E-Mail anfordern
  app.post("/api/portal/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "E-Mail erforderlich" });
    // Always respond with success to prevent email enumeration
    const sub = await storage.getSubscriberByEmail(email.trim().toLowerCase());
    if (!sub || !sub.passwordHash) {
      return res.json({ ok: true });
    }
    await storage.deleteExpiredPasswordResetTokens();
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await storage.createPasswordResetToken(sub.id, token, expiresAt);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    try {
      await sendPasswordResetEmail(sub.email, sub.firstName, token, baseUrl);
    } catch (err) {
      console.error("SendGrid error:", err);
      return res.status(500).json({ error: "E-Mail konnte nicht gesendet werden. Bitte kontaktieren Sie den Administrator." });
    }
    res.json({ ok: true });
  });

  // Passwort zurücksetzen: Token prüfen + neues Passwort speichern
  app.post("/api/portal/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: "Token und Passwort (min. 6 Zeichen) erforderlich" });
    }
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) return res.status(400).json({ error: "Ungültiger Reset-Link" });
    if (resetToken.usedAt) return res.status(400).json({ error: "Dieser Link wurde bereits verwendet" });
    if (new Date() > resetToken.expiresAt) return res.status(400).json({ error: "Der Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen an." });
    const passwordHash = await bcrypt.hash(password, 10);
    await storage.updateSubscriber(resetToken.subscriberId, { passwordHash });
    await storage.markPasswordResetTokenUsed(resetToken.id);
    res.json({ ok: true });
  });

  app.get("/api/portal/me", async (req, res) => {
    if (!req.session?.subscriberId) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const sub = await storage.getSubscriber(req.session.subscriberId);
    if (!sub) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Konto nicht gefunden" });
    }
    res.json({
      id: sub.id, firstName: sub.firstName, lastName: sub.lastName,
      email: sub.email, phone: sub.phone, birthday: sub.birthday,
      isMember: sub.isMember, isActive: sub.isActive, subscribedAt: sub.subscribedAt,
    });
  });

  app.patch("/api/portal/me", async (req, res) => {
    if (!req.session?.subscriberId) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const { firstName, lastName, phone, birthday, currentPassword, newPassword } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "Vorname und Nachname sind erforderlich" });
    }
    const updates: Record<string, any> = {
      firstName,
      lastName,
      phone: phone || null,
      birthday: birthday || null,
    };
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Aktuelles Passwort ist erforderlich" });
      }
      const sub = await storage.getSubscriber(req.session.subscriberId);
      const valid = await bcrypt.compare(currentPassword, sub?.passwordHash || "");
      if (!valid) {
        return res.status(401).json({ error: "Aktuelles Passwort ist falsch" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Neues Passwort muss mindestens 6 Zeichen haben" });
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    const updated = await storage.updateSubscriber(req.session.subscriberId, updates);
    if (!updated) return res.status(404).json({ error: "Konto nicht gefunden" });
    res.json({
      id: updated.id, firstName: updated.firstName, lastName: updated.lastName,
      email: updated.email, phone: updated.phone, birthday: updated.birthday,
      isMember: updated.isMember, isActive: updated.isActive, subscribedAt: updated.subscribedAt,
    });
  });

  app.get("/api/portal/events", async (req, res) => {
    if (!req.session?.subscriberId) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const all = await storage.getEvents();
    res.json(all.filter((e) => e.isInternal && e.isActive));
  });

  app.get("/api/birthdays", async (req, res) => {
    const isAdmin = req.session?.isAdmin;
    const isPortalMember = !!req.session?.subscriberId;
    if (!isAdmin && !isPortalMember) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const members = await storage.getMembers();
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();

    const birthdays = members
      .filter((m) => m.birthday && m.isActive)
      .map((m) => {
        const bday = new Date(m.birthday!);
        let thisYear = new Date(currentYear, bday.getMonth(), bday.getDate());
        // if already passed this year, show next year
        let nextBirthday = thisYear < now
          ? new Date(currentYear + 1, bday.getMonth(), bday.getDate())
          : thisYear;
        const daysUntil = Math.round((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          birthday: m.birthday,
          nextBirthday: nextBirthday.toISOString().split("T")[0],
          daysUntil,
        };
      })
      .filter((b) => b.daysUntil <= 183)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    res.json(birthdays);
  });

  app.get("/api/portal/registrations", async (req, res) => {
    if (!req.session?.subscriberId) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const sub = await storage.getSubscriber(req.session.subscriberId);
    if (!sub) return res.status(401).json({ error: "Konto nicht gefunden" });
    const regs = await storage.getRegistrationsByEmail(sub.email);
    const enriched = await Promise.all(
      regs.map(async (r) => {
        const event = await storage.getEvent(r.eventId);
        return { ...r, event: event || null };
      })
    );
    res.json(enriched);
  });

  // Public subscribe (no auth needed)
  // Public: get member name for referral subscribe page
  app.get("/api/member-ref/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Ungültige ID" });
    const member = await storage.getSubscriber(id);
    if (!member || !member.isMember || !member.isActive) {
      return res.status(404).json({ error: "Mitglied nicht gefunden" });
    }
    res.json({ id: member.id, firstName: member.firstName, lastName: member.lastName });
  });

  app.post("/api/subscribe", async (req, res) => {
    const { email, firstName, lastName, phone, eventId, referredByMemberId, isMember, password } = req.body;
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
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const confirmToken = crypto.randomBytes(32).toString("hex");
    const subscriber = await storage.createSubscriber({
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
      phone: phone || null,
      eventId: eventId || null,
      referredByMemberId: referredByMemberId || null,
      isActive: false,
      isMember: isMember || false,
      passwordHash,
      confirmToken,
    });

    // Send double opt-in email (fire and forget — don't block response on email failure)
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    sendOptInEmail(email.trim().toLowerCase(), firstName, confirmToken, baseUrl).catch((err) => {
      console.error("[opt-in email]", err.message);
    });

    res.status(201).json({ pending: true, id: subscriber.id });
  });

  app.get("/api/subscribe/confirm/:token", async (req, res) => {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: "Kein Token angegeben" });
    const subscriber = await storage.getSubscriberByConfirmToken(token);
    if (!subscriber) return res.status(404).json({ error: "Ungültiger oder bereits verwendeter Bestätigungslink" });
    await storage.updateSubscriber(subscriber.id, {
      isActive: true,
      confirmedAt: new Date(),
      confirmToken: null,
    } as any);
    res.json({ ok: true, firstName: subscriber.firstName });
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

  // ── Robots.txt (dynamic so Sitemap: uses canonical absolute URL) ─────────

  app.get("/robots.txt", (req, res) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const base = `${proto}://${host}`;

    const body = [
      "User-agent: *",
      "Allow: /veranstaltungen",
      "Allow: /datenschutz",
      "Allow: /subscribe/",
      "Allow: /sitemap.xml",
      "Allow: /llms.txt",
      "Disallow: /api/",
      "",
      "User-agent: GPTBot",
      "Allow: /veranstaltungen",
      "Allow: /datenschutz",
      "Allow: /subscribe/",
      "",
      "User-agent: ClaudeBot",
      "Allow: /veranstaltungen",
      "Allow: /datenschutz",
      "Allow: /subscribe/",
      "",
      "User-agent: PerplexityBot",
      "Allow: /veranstaltungen",
      "Allow: /datenschutz",
      "Allow: /subscribe/",
      "",
      `Sitemap: ${base}/sitemap.xml`,
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(body);
  });

  // ── Sitemap ──────────────────────────────────────────────────────────────

  app.get("/sitemap.xml", async (req, res) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const base = `${proto}://${host}`;

    const staticUrls = [
      { loc: "/veranstaltungen", priority: "1.0", changefreq: "daily" },
      { loc: "/datenschutz", priority: "0.3", changefreq: "yearly" },
    ];

    let eventUrls: { loc: string; lastmod: string; priority: string }[] = [];
    let memberUrls: { loc: string; lastmod: string; priority: string }[] = [];

    try {
      const evts = await storage.getEvents();
      eventUrls = evts
        .filter((e) => e.isActive)
        .map((e) => ({
          loc: `/subscribe/${e.id}`,
          lastmod: new Date(e.createdAt).toISOString().split("T")[0],
          priority: "0.8",
        }));
    } catch {
      // DB unavailable; omit event URLs
    }

    try {
      const members = await storage.getMembers();
      const today = new Date().toISOString().split("T")[0];
      memberUrls = members
        .filter((m) => m.isActive)
        .map((m) => ({
          loc: `/subscribe/member/${m.id}`,
          lastmod: new Date(m.subscribedAt).toISOString().split("T")[0],
          priority: "0.7",
        }));
    } catch {
      // DB unavailable; omit member URLs
    }

    const today = new Date().toISOString().split("T")[0];

    function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string) {
      return `  <url>\n    <loc>${base}${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    }

    const urlXml = [
      ...staticUrls.map((u) => urlEntry(u.loc, today, u.changefreq, u.priority)),
      ...eventUrls.map((u) => urlEntry(u.loc, u.lastmod, "weekly", u.priority)),
      ...memberUrls.map((u) => urlEntry(u.loc, u.lastmod, "monthly", u.priority)),
    ].join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlXml}\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  return httpServer;
}

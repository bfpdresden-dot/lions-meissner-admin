import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Calendar, MapPin, Users, User, Pencil, Trash2, Eye, Download, Printer, Copy, Lock, Cake, FileText, X, Globe, ShieldCheck, Camera, Trash, Sparkles, Loader2, CalendarPlus, UserPlus, Bell, ClipboardList, Clock, Check, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Event, InsertEvent, Registration, EventPhoto, Subscriber, EmailLog, Shift } from "@shared/schema";
import { insertEventSchema } from "@shared/schema";

interface ShiftMemberPublic { id: number; firstName: string; lastName: string; }
interface ShiftSignupWithMember { id: number; shiftId: number; memberId: number; signedUpAt: string; member: ShiftMemberPublic | null; }
interface ShiftWithSignups extends Shift { signups: ShiftSignupWithMember[]; }

function fileUrl(filenameOrUrl: string): string {
  if (!filenameOrUrl) return "";
  if (filenameOrUrl.startsWith("http://") || filenameOrUrl.startsWith("https://")) return filenameOrUrl;
  return `/uploads/${filenameOrUrl}`;
}

function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function googleCalUrl(ev: { title: string; date: string | Date; endDate?: string | Date | null; description?: string | null; location: string }): string {
  const fmt = (d: string | Date) => format(new Date(d), "yyyyMMdd'T'HHmmss");
  const start = fmt(ev.date);
  const end = ev.endDate ? fmt(ev.endDate) : start;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${start}/${end}&details=${encodeURIComponent(ev.description || "")}&location=${encodeURIComponent(ev.location)}`;
}
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const eventFormSchema = z.object({
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  description: z.string().min(5, "Beschreibung muss mindestens 5 Zeichen haben"),
  agenda: z.string().optional(),
  location: z.string().min(2, "Ort muss mindestens 2 Zeichen haben"),
  date: z.string().min(1, "Datum ist erforderlich"),
  endDate: z.string().optional(),
  maxParticipants: z.string().default(""),
  isActive: z.boolean().default(true),
  isInternal: z.boolean().default(false),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function EventsPage() {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewGuestsEventId, setViewGuestsEventId] = useState<number | null>(null);
  const [pdfDialogEventId, setPdfDialogEventId] = useState<number | null>(null);
  const [detailEventId, setDetailEventId] = useState<number | null>(null);
  const [photoDialogEventId, setPhotoDialogEventId] = useState<number | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [shiftPlanEventId, setShiftPlanEventId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiEventName, setAiEventName] = useState("");
  const [aiEventDate, setAiEventDate] = useState("");
  const [aiPrefilledValues, setAiPrefilledValues] = useState<Partial<EventFormValues> | null>(null);
  const [addMemberSelected, setAddMemberSelected] = useState<string>("");
  const { toast } = useToast();

  const { data: allMembers } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
    enabled: viewGuestsEventId !== null,
  });

  const notifyMutation = useMutation({
    mutationFn: (eventId: number) => apiRequest("POST", `/api/events/${eventId}/notify`, {}),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: `✉️ ${data.sent} von ${data.total} E-Mails versendet${data.failed > 0 ? ` (${data.failed} fehlgeschlagen)` : ""}` });
    },
    onError: () => toast({ title: "Fehler beim Versenden", variant: "destructive" }),
  });

  const updateRegCountMutation = useMutation({
    mutationFn: ({ id, guestCount }: { id: number; guestCount: number }) =>
      apiRequest("PATCH", `/api/registrations/${id}`, { guestCount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/event", viewGuestsEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const addMemberMutation = useMutation({
    mutationFn: async (member: Subscriber) => {
      const res = await apiRequest("POST", "/api/registrations", {
        eventId: viewGuestsEventId,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone || "",
        guestCount: 1,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Fehler"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/event", viewGuestsEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      setAddMemberSelected("");
      toast({ title: "Mitglied angemeldet" });
    },
    onError: (err: Error) => toast({ title: "Fehler", description: err.message, variant: "destructive" }),
  });

  const aiMutation = useMutation({
    mutationFn: async ({ name, date }: { name: string; date: string }) => {
      const res = await apiRequest("POST", "/api/ai/fill-event", { eventName: name, date });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "KI-Fehler"); }
      return res.json() as Promise<{ title: string; description: string; location: string; agenda: string; date: string; endDate: string }>;
    },
    onSuccess: (data) => {
      // Use user-entered date first, fall back to AI-suggested date
      const resolvedDate = aiEventDate || data.date || "";
      const resolvedEndDate = data.endDate || "";
      setAiPrefilledValues({
        title: data.title || aiEventName,
        description: data.description || "",
        location: data.location || "",
        agenda: data.agenda || "",
        date: resolvedDate,
        endDate: resolvedEndDate,
      });
      setAiDialogOpen(false);
      setIsCreateOpen(true);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      let hint = msg;
      if (msg.includes("No endpoints found") || msg.includes("endpoints")) {
        hint = `Modell nicht gefunden. Bitte in den Einstellungen ein gültiges Modell eintragen (z.B. "google/gemini-2.0-flash-exp:free" oder "openai/gpt-4o-mini").`;
      } else if (msg.includes("OPENROUTER_API_KEY")) {
        hint = "OpenRouter API-Schlüssel fehlt. Bitte in den Server-Einstellungen konfigurieren.";
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        hint = "KI-Anfrage-Limit erreicht. Bitte kurz warten und erneut versuchen.";
      } else if (msg.includes("kein gültiges JSON")) {
        hint = "Die KI hat keine verwertbare Antwort geliefert. Bitte erneut versuchen.";
      }
      toast({ title: "KI-Assistent", description: hint, variant: "destructive" });
    },
  });

  const handlePdfUpload = async (eventId: number, file: File) => {
    setPdfUploading(true);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await fetch(`/api/events/${eventId}/upload-pdf`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "PDF hochgeladen" });
    } catch {
      toast({ title: "Fehler beim Upload", variant: "destructive" });
    } finally {
      setPdfUploading(false);
    }
  };

  const deletePdfMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}/pdf`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "PDF entfernt" });
    },
  });

  const togglePdfPublicMutation = useMutation({
    mutationFn: ({ id, pub }: { id: number; pub: boolean }) =>
      apiRequest("PATCH", `/api/events/${id}`, { programPdfPublic: pub }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events"] }),
  });

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: guestCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/registrations/counts"],
  });

  type BirthdayEntry = { id: number; name: string; birthday: string; nextBirthday: string; daysUntil: number };
  const { data: birthdays } = useQuery<BirthdayEntry[]>({
    queryKey: ["/api/birthdays"],
  });

  const viewGuestsEvent = events?.find((e) => e.id === viewGuestsEventId);

  const { data: eventGuests } = useQuery<Registration[]>({
    queryKey: ["/api/registrations/event", viewGuestsEventId],
    enabled: viewGuestsEventId !== null,
  });

  const { data: emailLogEntries } = useQuery<EmailLog[]>({
    queryKey: ["/api/events", detailEventId, "email-logs"],
    queryFn: () => fetch(`/api/events/${detailEventId}/email-logs`).then((r) => r.json()),
    enabled: detailEventId !== null,
  });

  const { data: eventPhotos, refetch: refetchPhotos } = useQuery<EventPhoto[]>({
    queryKey: ["/api/events", photoDialogEventId, "photos"],
    queryFn: () => fetch(`/api/events/${photoDialogEventId}/photos`).then((r) => r.json()),
    enabled: photoDialogEventId !== null,
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => apiRequest("DELETE", `/api/events/photos/${photoId}`),
    onSuccess: () => {
      refetchPhotos();
      toast({ title: "Foto gelöscht" });
    },
  });

  const handlePhotoUpload = async (eventId: number, files: FileList) => {
    setPhotoUploading(true);
    try {
      const form = new FormData();
      for (let i = 0; i < files.length; i++) form.append("photos", files[i]);
      const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload fehlgeschlagen");
      refetchPhotos();
      toast({ title: `${files.length} Foto${files.length > 1 ? "s" : ""} hochgeladen` });
    } catch {
      toast({ title: "Fehler beim Upload", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const getGuestCount = (eventId: number) => {
    if (!guestCounts) return 0;
    return guestCounts[String(eventId)] || 0;
  };

  const handleExportGuests = async (eventId: number) => {
    try {
      const res = await fetch(`/api/registrations/export/${eventId}`);
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gaeste_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  };

  const handlePrintQR = (event: Event) => {
    const subscribeUrl = `${window.location.origin}/subscribe/${event.id}`;
    const eventDate = format(new Date(event.date), "dd. MMMM yyyy, HH:mm", { locale: de });

    const svgEl = document.getElementById(`qr-hidden-${event.id}`)?.querySelector("svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Anmeldeflyer – ${event.title}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 210mm;
      height: 297mm;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #1a2744;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
    }
    .header {
      width: 100%;
      background: #1a2744;
      color: #fff;
      padding: 12mm 20mm 8mm;
      text-align: center;
    }
    .club-name {
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 2mm;
    }
    .header-subtitle {
      font-size: 11pt;
      color: #c8951a;
      font-weight: 600;
    }
    .body {
      flex: 1;
      width: 100%;
      padding: 8mm 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6mm;
    }
    .event-box {
      width: 100%;
      border: 2px solid #c8951a;
      border-radius: 6px;
      padding: 5mm 10mm;
      text-align: center;
    }
    .event-title {
      font-size: 18pt;
      font-weight: 700;
      color: #1a2744;
      margin-bottom: 3mm;
    }
    .event-meta {
      font-size: 11pt;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 8mm;
      flex-wrap: wrap;
    }
    .event-meta span { display: flex; align-items: center; gap: 2mm; }
    .cta {
      font-size: 14pt;
      font-weight: 600;
      color: #1a2744;
      text-align: center;
    }
    .qr-wrapper {
      padding: 4mm;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
    }
    .qr-wrapper svg { display: block; width: 62mm; height: 62mm; }
    .scan-hint {
      font-size: 10pt;
      color: #888;
      text-align: center;
    }
    .url {
      font-size: 8pt;
      color: #bbb;
      font-family: monospace;
      word-break: break-all;
      text-align: center;
    }
    .footer {
      width: 100%;
      background: #f5f5f5;
      border-top: 1px solid #e5e7eb;
      padding: 4mm 20mm;
      text-align: center;
      font-size: 9pt;
      color: #999;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="club-name">Lions Club Mei&szlig;ner Land</div>
    <div class="header-subtitle">Wir sind f&uuml;reinander da</div>
  </div>

  <div class="body">
    <div class="event-box">
      <div class="event-title">${event.title}</div>
      <div class="event-meta">
        <span>&#128197; ${eventDate} Uhr</span>
        <span>&#128205; ${event.location}</span>
        ${event.maxParticipants ? `<span>&#128101; Max. ${event.maxParticipants} Teilnehmer</span>` : ""}
      </div>
    </div>

    <div class="cta">Newsletter abonnieren &amp; dabei sein!</div>
    <div class="cta" style="font-size:13pt; font-weight:400; color:#555;">
      Scannen Sie den QR-Code mit Ihrem Smartphone
    </div>

    <div class="qr-wrapper">${svgData}</div>

    <div class="scan-hint">
      Nach dem Scan gelangen Sie direkt zur Anmeldung f&uuml;r<br>
      <strong>${event.title}</strong>
    </div>
    <div class="url">${subscribeUrl}</div>
  </div>

  <div class="footer">
    Sebastian Schreiber &nbsp;&bull;&nbsp; Seestra&szlig;e 18e, 01640 Coswig &nbsp;&bull;&nbsp;
    Tel: 0172 340 85 43 &nbsp;&bull;&nbsp; schreiber1988@gmx.net
  </div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const deleteRegMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/registrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/event", viewGuestsEventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      toast({ title: "G\u00e4st gel\u00f6scht" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsCreateOpen(false);
      toast({ title: "Veranstaltung erstellt", description: "Die Veranstaltung wurde erfolgreich erstellt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
      toast({ title: "Veranstaltung aktualisiert", description: "Die Veranstaltung wurde erfolgreich aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Veranstaltung gel\u00f6scht", description: "Die Veranstaltung wurde erfolgreich gel\u00f6scht." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/events/${id}/copy`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Veranstaltung kopiert", description: "Eine Kopie wurde als inaktiver Entwurf erstellt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const now = new Date();
  const displayedEvents = showPast
    ? sortedEvents
    : sortedEvents.filter((e) => {
        const end = (e as any).endDate ? new Date((e as any).endDate) : new Date(e.date);
        return end >= now;
      });
  const pastCount = sortedEvents.length - sortedEvents.filter((e) => {
    const end = (e as any).endDate ? new Date((e as any).endDate) : new Date(e.date);
    return end >= now;
  }).length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-events-title">Veranstaltungen</h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Club-Veranstaltungen</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {pastCount > 0 && (
              <Button
                variant={showPast ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowPast((v) => !v)}
                data-testid="button-toggle-past-events"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {showPast ? "Vergangene ausblenden" : `Vergangene anzeigen (${pastCount})`}
              </Button>
            )}
            {/* AI Assistant Dialog */}
            <Dialog open={aiDialogOpen} onOpenChange={(o) => { setAiDialogOpen(o); if (!o) aiMutation.reset(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-ai-fill-event">
                  <Sparkles className="h-4 w-4 mr-2 text-violet-500" />
                  KI-Assistent
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    Veranstaltung mit KI ausfüllen
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Geben Sie den Namen und das Datum ein — die KI sucht nach Informationen und füllt das Formular automatisch aus.
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Veranstaltungsname *</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="z.B. Stadtfest Meißen 2026"
                      value={aiEventName}
                      onChange={(e) => setAiEventName(e.target.value)}
                      data-testid="input-ai-event-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Datum & Uhrzeit (optional)</label>
                    <input
                      type="datetime-local"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={aiEventDate}
                      onChange={(e) => setAiEventDate(e.target.value)}
                      data-testid="input-ai-event-date"
                    />
                  </div>
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    disabled={!aiEventName.trim() || aiMutation.isPending}
                    onClick={() => aiMutation.mutate({ name: aiEventName.trim(), date: aiEventDate })}
                    data-testid="button-ai-fill-submit"
                  >
                    {aiMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />KI sucht…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Formular ausfüllen</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) setAiPrefilledValues(null); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-event">
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Veranstaltung
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {aiPrefilledValues ? (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-500" />Neue Veranstaltung (KI-Vorschlag)</span>
                    ) : "Neue Veranstaltung erstellen"}
                  </DialogTitle>
                </DialogHeader>
                <EventForm
                  defaultValues={aiPrefilledValues ?? undefined}
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Birthdays section */}
        {birthdays && birthdays.length > 0 && (
          <Card className="border-pink-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-pink-700 text-base">
                <Cake className="h-5 w-5" />
                Geburtstage der Mitglieder
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Nächste Geburtstage — berechnet aus den Mitgliederdaten
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {birthdays.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 gap-4" data-testid={`birthday-row-${b.id}`}>
                    <div className="flex items-center gap-3">
                      <Cake className="h-4 w-4 text-pink-400 shrink-0" />
                      <span className="font-medium text-sm">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {format(new Date(b.nextBirthday + "T12:00:00"), "dd. MMMM", { locale: de })}
                        {" · "}
                        {new Date(b.birthday + "T12:00:00").toLocaleDateString("de-DE", { year: "numeric" }).replace(/\.\d{4}$/, (m) => m)}
                      </span>
                      {b.daysUntil === 0 ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-pink-100 text-pink-700">
                          Heute 🎂
                        </span>
                      ) : b.daysUntil <= 7 ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                          in {b.daysUntil} {b.daysUntil === 1 ? "Tag" : "Tagen"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">in {b.daysUntil} Tagen</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">Keine Veranstaltungen</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihre erste Veranstaltung, um loszulegen.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-event-empty">
                <Plus className="h-4 w-4 mr-2" />
                Erste Veranstaltung erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayedEvents.map((event) => {
              const isPast = new Date(event.date) < new Date();
              return (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardContent className="p-5">
                    {/* Hidden QR code for print extraction */}
                    <div
                      id={`qr-hidden-${event.id}`}
                      style={{ position: "absolute", left: "-9999px", top: 0 }}
                      aria-hidden="true"
                    >
                      <QRCodeSVG
                        value={`${window.location.origin}/subscribe/${event.id}`}
                        size={280}
                        level="H"
                        fgColor="#1a2744"
                      />
                    </div>

                    <div className="space-y-2">
                      {/* Buttons — eigene Zeile, ganz oben rechtsbündig */}
                      <div className="flex justify-end">
                      <div className="flex items-center gap-0.5 flex-wrap justify-end max-w-full">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setShiftPlanEventId(event.id)}
                          data-testid={`button-shiftplan-${event.id}`}
                          title="Schichtplan verwalten"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPdfDialogEventId(event.id)}
                          data-testid={`button-pdf-${event.id}`}
                          title="Programm-PDF verwalten"
                          className={(event as any).programPdf ? "text-primary" : ""}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePrintQR(event)}
                          data-testid={`button-print-qr-${event.id}`}
                          title="Anmeldeflyer drucken (DIN A4)"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPhotoDialogEventId(event.id)}
                          data-testid={`button-photos-${event.id}`}
                          title="Fotos verwalten"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDetailEventId(event.id)}
                          data-testid={`button-detail-event-${event.id}`}
                          title="Details anzeigen"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewGuestsEventId(event.id)}
                          data-testid={`button-view-guests-${event.id}`}
                          title="G&auml;steliste anzeigen"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Dialog
                          open={editingEvent?.id === event.id}
                          onOpenChange={(open) => !open && setEditingEvent(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingEvent(event)}
                              data-testid={`button-edit-event-${event.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Veranstaltung bearbeiten</DialogTitle>
                            </DialogHeader>
                            {editingEvent && (
                              <EventForm
                                defaultValues={{
                                  title: editingEvent.title,
                                  description: editingEvent.description,
                                  date: format(new Date(editingEvent.date), "yyyy-MM-dd'T'HH:mm"),
                                  endDate: (editingEvent as any).endDate
                                    ? format(new Date((editingEvent as any).endDate), "yyyy-MM-dd'T'HH:mm")
                                    : "",
                                  location: editingEvent.location,
                                  maxParticipants: editingEvent.maxParticipants?.toString() ?? "",
                                  isActive: editingEvent.isActive,
                                  agenda: (editingEvent as any).agenda ?? "",
                  isInternal: (editingEvent as any).isInternal ?? false,
                                }}
                                onSubmit={(data) =>
                                  updateMutation.mutate({ id: editingEvent.id, data })
                                }
                                isPending={updateMutation.isPending}
                                submitLabel="Speichern"
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyMutation.mutate(event.id)}
                          disabled={copyMutation.isPending}
                          data-testid={`button-copy-event-${event.id}`}
                          title="Veranstaltung kopieren"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={notifyMutation.isPending}
                              data-testid={`button-notify-event-${event.id}`}
                              title="Abonnenten benachrichtigen"
                            >
                              {notifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Abonnenten benachrichtigen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Alle aktiven Newsletter-Abonnenten erhalten eine Einladungs-E-Mail zur Veranstaltung &quot;{event.title}&quot;.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => notifyMutation.mutate(event.id)}
                                data-testid={`button-confirm-notify-${event.id}`}
                              >
                                E-Mails versenden
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-event-${event.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Veranstaltung l&ouml;schen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                M&ouml;chten Sie die Veranstaltung &quot;{event.title}&quot; wirklich l&ouml;schen?
                                Diese Aktion kann nicht r&uuml;ckg&auml;ngig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(event.id)}
                                data-testid={`button-confirm-delete-event-${event.id}`}
                              >
                                L&ouml;schen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      </div>{/* end buttons row */}

                      {/* Titel + Badges — volle Breite */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <Badge variant={event.isActive ? "default" : "secondary"}>
                          {event.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                        {(event as any).isInternal && (
                          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                            <Lock className="h-3 w-3" />
                            Intern
                          </Badge>
                        )}
                        {isPast && (
                          <Badge variant="secondary">Vergangen</Badge>
                        )}
                      </div>

                      {/* Beschreibung + Metadaten — volle Breite */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(event.date), "dd. MMMM yyyy, HH:mm", { locale: de })}
                          {(event as any).endDate && (
                            <> – {format(new Date((event as any).endDate), "HH:mm", { locale: de })}</>
                          )} Uhr
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <a href={mapsUrl(event.location)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">{event.location}</a>
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium">{getGuestCount(event.id)}</span> G&auml;ste
                          {event.maxParticipants && (
                            <span> / {event.maxParticipants} max.</span>
                          )}
                        </span>
                      </div>
                    </div>{/* end space-y-2 */}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={viewGuestsEventId !== null} onOpenChange={(open) => !open && setViewGuestsEventId(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-4">
                <span>G&auml;steliste: {viewGuestsEvent?.title}</span>
                {viewGuestsEventId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportGuests(viewGuestsEventId)}
                    data-testid="button-export-guests"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    CSV
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {eventGuests && eventGuests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead className="text-right">Personen</TableHead>
                    <TableHead className="text-right">Datum</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventGuests.map((reg) => (
                    <TableRow key={reg.id} data-testid={`row-guest-${reg.id}`}>
                      <TableCell className="font-medium">{reg.firstName} {reg.lastName}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>{reg.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <input
                          type="number"
                          min={1}
                          defaultValue={reg.guestCount}
                          className="w-14 text-right border rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val !== reg.guestCount) {
                              updateRegCountMutation.mutate({ id: reg.id, guestCount: val });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          data-testid={`input-guestcount-${reg.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {format(new Date(reg.registeredAt), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-delete-guest-${reg.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Anmeldung l&ouml;schen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Soll die Anmeldung von {reg.firstName} {reg.lastName} gel&ouml;scht werden?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteRegMutation.mutate(reg.id)}
                              >
                                L&ouml;schen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Noch keine Anmeldungen f&uuml;r diese Veranstaltung.</p>
              </div>
            )}
            {eventGuests && eventGuests.length > 0 && (
              <div className="text-sm text-muted-foreground text-right pt-2 border-t">
                Gesamt: <span className="font-medium">{eventGuests.reduce((sum, r) => sum + r.guestCount, 0)}</span> Personen
                ({eventGuests.length} {eventGuests.length === 1 ? "Anmeldung" : "Anmeldungen"})
              </div>
            )}

            {/* Add member section */}
            {(() => {
              const registeredEmails = new Set((eventGuests || []).map((r) => r.email.toLowerCase()));
              const unregistered = (allMembers || []).filter((m) => !registeredEmails.has(m.email.toLowerCase()));
              const selectedMember = unregistered.find((m) => String(m.id) === addMemberSelected);
              return (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <UserPlus className="h-4 w-4" />
                    Mitglied anmelden
                  </p>
                  <div className="flex gap-2">
                    <Select value={addMemberSelected} onValueChange={setAddMemberSelected}>
                      <SelectTrigger className="flex-1" data-testid="select-add-member">
                        <SelectValue placeholder={unregistered.length === 0 ? "Alle Mitglieder angemeldet" : "Mitglied auswählen…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {unregistered.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.firstName} {m.lastName} — {m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      disabled={!selectedMember || addMemberMutation.isPending}
                      onClick={() => selectedMember && addMemberMutation.mutate(selectedMember)}
                      data-testid="button-add-member"
                    >
                      {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Photo management dialog */}
        {photoDialogEventId !== null && (() => {
          const ev = events?.find((e) => e.id === photoDialogEventId);
          if (!ev) return null;
          return (
            <Dialog open onOpenChange={(open) => !open && setPhotoDialogEventId(null)}>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Fotos — {ev.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handlePhotoUpload(photoDialogEventId, e.target.files);
                        }
                      }}
                    />
                    <Button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="w-full"
                      variant="outline"
                      data-testid="button-upload-photos"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {photoUploading ? "Wird hochgeladen…" : "Fotos hochladen (mehrere möglich)"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center">JPG, PNG, WebP, GIF · max. 15 MB pro Datei</p>
                  </div>

                  {eventPhotos && eventPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {eventPhotos.map((photo) => (
                        <div key={photo.id} className="relative group rounded-md overflow-hidden border aspect-square">
                          <img
                            src={fileUrl(photo.filename)}
                            alt={photo.caption || "Event-Foto"}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => deletePhotoMutation.mutate(photo.id)}
                              disabled={deletePhotoMutation.isPending}
                              data-testid={`button-delete-photo-${photo.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8 border rounded-md">
                      Noch keine Fotos hochgeladen.
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Event details dialog */}
        {detailEventId !== null && (() => {
          const ev = events?.find((e) => e.id === detailEventId);
          if (!ev) return null;
          const guestCount = getGuestCount(ev.id);
          return (
            <Dialog open onOpenChange={(open) => !open && setDetailEventId(null)}>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    {ev.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>
                        {format(new Date(ev.date), "EEEE, dd. MMMM yyyy", { locale: de })},{" "}
                        {format(new Date(ev.date), "HH:mm", { locale: de })}
                        {(ev as any).endDate ? ` – ${format(new Date((ev as any).endDate), "HH:mm", { locale: de })}` : ""} Uhr
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <a href={mapsUrl(ev.location)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">{ev.location}</a>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Users className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>
                        {guestCount} Teilnehmer angemeldet
                        {ev.maxParticipants && <> · Max. {ev.maxParticipants} Personen</>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      <Badge variant={ev.isActive ? "default" : "secondary"}>
                        {ev.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                      {(ev as any).isInternal && (
                        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                          <Lock className="h-3 w-3" />
                          Intern
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Beschreibung</p>
                    <p className="leading-relaxed whitespace-pre-wrap">{ev.description}</p>
                  </div>

                  {(ev as any).agenda && (
                    <div className="border-t pt-3 space-y-1">
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Tagesordnung</p>
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed">{(ev as any).agenda}</pre>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={googleCalUrl(ev)} target="_blank" rel="noopener noreferrer" data-testid={`button-gcal-detail-${ev.id}`}>
                        <CalendarPlus className="h-4 w-4 mr-2 text-blue-500" />
                        Zu Google Kalender hinzufügen
                      </a>
                    </Button>
                  </div>

                  {(ev as any).programPdf && (
                    <div className="border-t pt-3">
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <a href={fileUrl((ev as any).programPdf)} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          Programm-PDF öffnen
                          {!(ev as any).programPdfPublic && (
                            <Badge variant="outline" className="ml-2 text-xs">Nur intern</Badge>
                          )}
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* E-Mail-Protokoll */}
                  {emailLogEntries && emailLogEntries.length > 0 && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5" />
                        Versand-Protokoll ({emailLogEntries.length} E-Mails)
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {emailLogEntries.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                            <span className={log.success ? "text-foreground" : "text-destructive line-through"}>
                              {log.recipientName} — {log.recipientEmail}
                            </span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {format(new Date(log.sentAt), "dd.MM.yy HH:mm", { locale: de })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* PDF management dialog */}
        {pdfDialogEventId !== null && (() => {
          const pdfEvent = events?.find((e) => e.id === pdfDialogEventId);
          if (!pdfEvent) return null;
          const currentPdf = (pdfEvent as any).programPdf as string | null;
          const isPublic = (pdfEvent as any).programPdfPublic as boolean;
          return (
            <Dialog open onOpenChange={(open) => !open && setPdfDialogEventId(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Programm-PDF — {pdfEvent.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  {currentPdf ? (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`/uploads/${currentPdf}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary flex items-center gap-1.5 hover:underline min-w-0 truncate"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          {currentPdf.replace(/^\d+-\d+-/, "")}
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive shrink-0"
                          onClick={() => deletePdfMutation.mutate(pdfEvent.id)}
                          disabled={deletePdfMutation.isPending}
                          title="PDF entfernen"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t">
                        <Button
                          size="sm"
                          variant={isPublic ? "default" : "outline"}
                          className="flex-1 gap-1.5"
                          onClick={() => togglePdfPublicMutation.mutate({ id: pdfEvent.id, pub: true })}
                        >
                          <Globe className="h-3.5 w-3.5" />
                          Öffentlich
                        </Button>
                        <Button
                          size="sm"
                          variant={!isPublic ? "default" : "outline"}
                          className="flex-1 gap-1.5"
                          onClick={() => togglePdfPublicMutation.mutate({ id: pdfEvent.id, pub: false })}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Nur Mitglieder
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Noch kein PDF hochgeladen.</p>
                  )}
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {currentPdf ? "PDF ersetzen" : "PDF hochladen"}
                    </Label>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(pdfEvent.id, file);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={pdfUploading}
                      onClick={() => pdfInputRef.current?.click()}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {pdfUploading ? "Wird hochgeladen…" : "PDF-Datei auswählen"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5">Maximal 10 MB · Nur PDF-Dateien</p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {shiftPlanEventId !== null && (() => {
          const spEvent = events?.find((e) => e.id === shiftPlanEventId);
          if (!spEvent) return null;
          return (
            <ShiftPlanAdminDialog
              event={spEvent}
              onClose={() => setShiftPlanEventId(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}

interface ShiftFormState { title: string; date: string; startTime: string; endTime: string; maxVolunteers: string; note: string; }

function ShiftFormFields({ val, onChange, onSubmit, onCancel, isPending }: {
  val: ShiftFormState;
  onChange: (v: ShiftFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Bezeichnung *</Label>
          <Input value={val.title} onChange={(e) => onChange({ ...val, title: e.target.value })}
            placeholder="z.B. Aufbau, Grillen, Abbau" data-testid="input-shift-title" />
        </div>
        <div>
          <Label className="text-xs">Datum *</Label>
          <Input type="date" value={val.date} onChange={(e) => onChange({ ...val, date: e.target.value })}
            data-testid="input-shift-date" />
        </div>
        <div>
          <Label className="text-xs">Mindestanzahl *</Label>
          <Input type="number" min="1" max="50" value={val.maxVolunteers}
            onChange={(e) => onChange({ ...val, maxVolunteers: e.target.value })}
            data-testid="input-shift-max" />
        </div>
        <div>
          <Label className="text-xs">Von *</Label>
          <Input type="time" value={val.startTime} onChange={(e) => onChange({ ...val, startTime: e.target.value })}
            data-testid="input-shift-start" />
        </div>
        <div>
          <Label className="text-xs">Bis *</Label>
          <Input type="time" value={val.endTime} onChange={(e) => onChange({ ...val, endTime: e.target.value })}
            data-testid="input-shift-end" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Hinweis (optional)</Label>
          <Input value={val.note} onChange={(e) => onChange({ ...val, note: e.target.value })}
            placeholder="z.B. Bitte Schürze mitbringen" data-testid="input-shift-note" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Abbrechen</Button>
        <Button size="sm" disabled={isPending || !val.title || !val.date || !val.startTime || !val.endTime}
          onClick={onSubmit} className="bg-[#1a3a5c]" data-testid="button-save-shift">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}

function makeDefaultShiftForm(event: Event): ShiftFormState {
  const d = new Date(event.date);
  const date = format(d, "yyyy-MM-dd");
  const startTime = format(d, "HH:mm");
  const endTime = (event as any).endDate ? format(new Date((event as any).endDate), "HH:mm") : "";
  return { title: event.title, date, startTime, endTime, maxVolunteers: "2", note: "" };
}

function ShiftPlanAdminDialog({ event, onClose }: { event: Event; onClose: () => void }) {
  const { toast } = useToast();
  const [editingShift, setEditingShift] = useState<ShiftWithSignups | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShiftFormState>(() => makeDefaultShiftForm(event));

  const { data: shifts, isLoading } = useQuery<ShiftWithSignups[]>({
    queryKey: ["/api/events", event.id, "shifts"],
    queryFn: () => fetch(`/api/events/${event.id}/shifts`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: ShiftFormState) => apiRequest("POST", `/api/events/${event.id}/shifts`, {
      ...data, maxVolunteers: parseInt(data.maxVolunteers) || 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "shifts"] });
      setShowForm(false);
      setForm(makeDefaultShiftForm(event));
      toast({ title: "Schicht erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftFormState }) =>
      apiRequest("PATCH", `/api/shifts/${id}`, { ...data, maxVolunteers: parseInt(data.maxVolunteers) || 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "shifts"] });
      setEditingShift(null);
      toast({ title: "Schicht gespeichert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "shifts"] });
      toast({ title: "Schicht gelöscht" });
    },
  });

  const removeSignupMutation = useMutation({
    mutationFn: (signupId: number) => apiRequest("DELETE", `/api/shifts/signups/${signupId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "shifts"] }),
  });

  const publicUrl = `${window.location.origin}/schichtplan/${event.id}`;

  const byDate: Record<string, ShiftWithSignups[]> = {};
  for (const s of shifts || []) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  const sortedDates = Object.keys(byDate).sort();


  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#1a3a5c]" />
            Schichtplan — {event.title}
          </DialogTitle>
        </DialogHeader>

        {/* Share link */}
        <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2 border">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">{publicUrl}</span>
          <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs gap-1"
            data-testid="button-copy-shift-link"
            onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link kopiert!" }); }}>
            <Copy className="h-3 w-3" /> Kopieren
          </Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">Diesen Link per WhatsApp teilen — Mitglieder können sich direkt eintragen.</p>

        {/* Add shift button */}
        {!showForm && !editingShift && (
          <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setShowForm(true)}
            data-testid="button-add-shift">
            <Plus className="h-4 w-4" /> Neue Schicht
          </Button>
        )}

        {/* New shift form */}
        {showForm && (
          <ShiftFormFields
            val={form} onChange={setForm}
            onSubmit={() => createMutation.mutate(form)}
            onCancel={() => setShowForm(false)}
            isPending={createMutation.isPending}
          />
        )}

        {/* Shifts list */}
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#1a3a5c]" /></div>
        ) : sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Noch keine Schichten. Klicke auf „Neue Schicht" um anzufangen.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-[#c8a84b]" />
                  <p className="text-xs font-semibold text-[#1a3a5c] uppercase tracking-wide">
                    {format(new Date(date + "T12:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })}
                  </p>
                </div>
                {byDate[date].map((shift) => (
                  <div key={shift.id} className="border rounded-lg p-3" data-testid={`admin-shift-${shift.id}`}>
                    {editingShift?.id === shift.id ? (
                      <ShiftFormFields
                        val={form} onChange={setForm}
                        onSubmit={() => updateMutation.mutate({ id: shift.id, data: form })}
                        onCancel={() => setEditingShift(null)}
                        isPending={updateMutation.isPending}
                      />
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{shift.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {shift.startTime} – {shift.endTime} Uhr · mind. {shift.maxVolunteers} Person{shift.maxVolunteers !== 1 ? "en" : ""}
                            </p>
                            {shift.note && <p className="text-xs text-muted-foreground italic mt-0.5">{shift.note}</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              data-testid={`button-edit-shift-${shift.id}`}
                              onClick={() => { setEditingShift(shift); setShowForm(false); setForm({ title: shift.title, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, maxVolunteers: shift.maxVolunteers.toString(), note: shift.note || "" }); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                              data-testid={`button-delete-shift-${shift.id}`}
                              onClick={() => deleteMutation.mutate(shift.id)}
                              disabled={deleteMutation.isPending}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Signups */}
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Eingetragen: {shift.signups.length}/{shift.maxVolunteers}
                            {shift.signups.length >= shift.maxVolunteers
                              ? <span className="ml-1 text-green-600 font-medium">· Ziel erreicht ✓</span>
                              : <span className="ml-1 text-red-500 font-medium">· {shift.maxVolunteers - shift.signups.length} fehlen noch</span>
                            }
                          </p>
                          {shift.signups.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Noch niemand eingetragen</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {shift.signups.map((sg) => (
                                <span key={sg.id} className="inline-flex items-center gap-1 text-xs bg-[#1a3a5c]/10 text-[#1a3a5c] px-2 py-0.5 rounded-full">
                                  {sg.member ? `${sg.member.firstName} ${sg.member.lastName}` : "Unbekannt"}
                                  <button
                                    className="hover:text-red-600 ml-0.5"
                                    onClick={() => removeSignupMutation.mutate(sg.id)}
                                    data-testid={`button-remove-signup-${sg.id}`}
                                    title="Eintragung entfernen"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = "Erstellen",
}: {
  defaultValues?: Partial<EventFormValues>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      agenda: defaultValues?.agenda || "",
      date: defaultValues?.date || "",
      endDate: defaultValues?.endDate || "",
      location: defaultValues?.location || "",
      maxParticipants: defaultValues?.maxParticipants || "",
      isActive: defaultValues?.isActive ?? true,
      isInternal: defaultValues?.isInternal ?? false,
    },
  });

  const watchedDate = form.watch("date");
  useEffect(() => {
    if (watchedDate && !form.getValues("endDate")) {
      form.setValue("endDate", watchedDate);
    }
  }, [watchedDate]);

  const handleSubmit = (values: EventFormValues) => {
    const parsed = values.maxParticipants ? parseInt(values.maxParticipants, 10) : null;
    const payload = {
      ...values,
      date: new Date(values.date).toISOString(),
      endDate: values.endDate ? new Date(values.endDate).toISOString() : null,
      maxParticipants: parsed && !isNaN(parsed) ? parsed : null,
    };
    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titel</FormLabel>
              <FormControl>
                <Input {...field} placeholder="z.B. Sommerfest 2026" data-testid="input-event-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Beschreiben Sie die Veranstaltung..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-event-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beginn (Datum & Zeit)</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" data-testid="input-event-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ende (optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" data-testid="input-event-end-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ort</FormLabel>
              <FormControl>
                <Input {...field} placeholder="z.B. Vereinshaus" data-testid="input-event-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max. Teilnehmer (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="Unbegrenzt"
                    value={field.value ?? ""}
                    data-testid="input-event-max-participants"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-end">
                <FormLabel>Aktiv</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-event-active"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="isInternal"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 rounded-md border p-3 bg-amber-50/50">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-event-internal"
                />
              </FormControl>
              <div>
                <FormLabel className="text-sm font-medium cursor-pointer">
                  Interne Veranstaltung
                </FormLabel>
                <p className="text-xs text-muted-foreground">
                  Nur für angemeldete Mitglieder sichtbar – nicht öffentlich
                </p>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="agenda"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                Tagesordnung
                <span className="text-xs font-normal text-muted-foreground">(nur im Mitglieder-Portal sichtbar)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder={"1. Begrüßung\n2. Bericht des Präsidenten\n3. Verschiedenes"}
                  className="resize-none font-mono text-sm"
                  rows={5}
                  data-testid="input-event-agenda"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-event">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

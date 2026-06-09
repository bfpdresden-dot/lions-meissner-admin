import { useState } from "react";
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
import { Plus, Calendar, MapPin, Users, Pencil, Trash2, Eye, Download, Printer, Copy, Lock, Cake } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import type { Event, InsertEvent, Registration } from "@shared/schema";
import { insertEventSchema } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const eventFormSchema = z.object({
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  description: z.string().min(5, "Beschreibung muss mindestens 5 Zeichen haben"),
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
  const { toast } = useToast();

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
      min-height: 297mm;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #1a2744;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .header {
      width: 100%;
      background: #1a2744;
      color: #fff;
      padding: 20mm 20mm 12mm;
      text-align: center;
    }
    .club-name {
      font-size: 28pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 3mm;
    }
    .header-subtitle {
      font-size: 13pt;
      color: #c8951a;
      font-weight: 600;
    }
    .body {
      flex: 1;
      width: 100%;
      padding: 14mm 20mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10mm;
    }
    .event-box {
      width: 100%;
      border: 2px solid #c8951a;
      border-radius: 6px;
      padding: 8mm 10mm;
      text-align: center;
    }
    .event-title {
      font-size: 22pt;
      font-weight: 700;
      color: #1a2744;
      margin-bottom: 4mm;
    }
    .event-meta {
      font-size: 12pt;
      color: #555;
      display: flex;
      justify-content: center;
      gap: 10mm;
      flex-wrap: wrap;
    }
    .event-meta span { display: flex; align-items: center; gap: 2mm; }
    .cta {
      font-size: 16pt;
      font-weight: 600;
      color: #1a2744;
      text-align: center;
    }
    .qr-wrapper {
      padding: 6mm;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
    }
    .qr-wrapper svg { display: block; width: 70mm; height: 70mm; }
    .scan-hint {
      font-size: 11pt;
      color: #888;
      text-align: center;
    }
    .url {
      font-size: 9pt;
      color: #bbb;
      font-family: monospace;
      word-break: break-all;
      text-align: center;
    }
    .footer {
      width: 100%;
      background: #f5f5f5;
      border-top: 1px solid #e5e7eb;
      padding: 6mm 20mm;
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-events-title">Veranstaltungen</h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Club-Veranstaltungen</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" />
                Neue Veranstaltung
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Neue Veranstaltung erstellen</DialogTitle>
              </DialogHeader>
              <EventForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
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
        ) : sortedEvents.length === 0 ? (
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
            {sortedEvents.map((event) => {
              const isPast = new Date(event.date) < new Date();
              return (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardContent className="p-5">
                    <div className="space-y-2">
                      {/* Top row: title + badges + action buttons */}
                      <div className="flex items-start justify-between gap-2">
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

                      <div className="flex items-center gap-1 shrink-0">
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
                          onClick={() => setViewGuestsEventId(event.id)}
                          data-testid={`button-view-guests-${event.id}`}
                          title="G&auml;steliste anzeigen"
                        >
                          <Eye className="h-4 w-4" />
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
                          <DialogContent className="sm:max-w-lg">
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
                      </div>{/* end top row */}

                      {/* Full-width content */}
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
                          {event.location}
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
                      <TableCell className="text-right">{reg.guestCount}</TableCell>
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
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
      date: defaultValues?.date || "",
      endDate: defaultValues?.endDate || "",
      location: defaultValues?.location || "",
      maxParticipants: defaultValues?.maxParticipants || "",
      isActive: defaultValues?.isActive ?? true,
      isInternal: defaultValues?.isInternal ?? false,
    },
  });

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
        <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-event">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, Plus, Pencil, Trash2, X, Clock, Users, Check,
  Calendar, MapPin, Copy, Link2, UserPlus, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { Event } from "@shared/schema";

interface ShiftMember { id: number; firstName: string; lastName: string; }
interface ShiftSignup { id: number; shiftId: number; memberId: number; signedUpAt: string; member: ShiftMember | null; }
interface ShiftWithSignups {
  id: number; eventId: number; title: string; date: string;
  startTime: string; endTime: string; maxVolunteers: number;
  note: string | null; signups: ShiftSignup[];
}
interface ShiftForm { title: string; date: string; startTime: string; endTime: string; maxVolunteers: string; note: string; }

function makeDefault(event: Event): ShiftForm {
  const d = new Date(event.date);
  return {
    title: event.title,
    date: format(d, "yyyy-MM-dd"),
    startTime: format(d, "HH:mm"),
    endTime: (event as any).endDate ? format(new Date((event as any).endDate), "HH:mm") : "",
    maxVolunteers: "2",
    note: "",
  };
}

function ShiftFormRow({ val, onChange, onSubmit, onCancel, isPending }: {
  val: ShiftForm; onChange: (v: ShiftForm) => void;
  onSubmit: () => void; onCancel: () => void; isPending: boolean;
}) {
  const set = (key: keyof ShiftForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...val, [key]: e.target.value });
  return (
    <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Bezeichnung</label>
          <Input value={val.title} onChange={set("title")} placeholder="z.B. Kasse, Einlass, Bar" className="h-8 text-sm" data-testid="input-shift-title" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Datum</label>
          <Input type="date" value={val.date} onChange={set("date")} className="h-8 text-sm" data-testid="input-shift-date" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Max. Personen</label>
          <Input type="number" min="1" value={val.maxVolunteers} onChange={set("maxVolunteers")} className="h-8 text-sm" data-testid="input-shift-max" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Von</label>
          <Input type="time" value={val.startTime} onChange={set("startTime")} className="h-8 text-sm" data-testid="input-shift-start" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
          <Input type="time" value={val.endTime} onChange={set("endTime")} className="h-8 text-sm" data-testid="input-shift-end" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Hinweis (optional)</label>
          <Input value={val.note} onChange={set("note")} placeholder="Kurze Notiz…" className="h-8 text-sm" data-testid="input-shift-note" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isPending} data-testid="button-shift-save">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ShiftCard({ shift, eventId, members }: {
  shift: ShiftWithSignups; eventId: number;
  members: ShiftMember[];
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [form, setForm] = useState<ShiftForm>({
    title: shift.title, date: shift.date, startTime: shift.startTime,
    endTime: shift.endTime, maxVolunteers: shift.maxVolunteers.toString(), note: shift.note || "",
  });

  const updateMutation = useMutation({
    mutationFn: (data: ShiftForm) => apiRequest("PATCH", `/api/shifts/${shift.id}`, {
      ...data, maxVolunteers: parseInt(data.maxVolunteers) || 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "shifts"] });
      setEditing(false);
      toast({ title: "Schicht gespeichert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/shifts/${shift.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "shifts"] });
      toast({ title: "Schicht gelöscht" });
    },
  });

  const removeSignupMutation = useMutation({
    mutationFn: (signupId: number) => apiRequest("DELETE", `/api/shifts/signups/${signupId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "shifts"] }),
  });

  const addSignupMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetch(`/api/shifts/${shift.id}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "shifts"] });
      setSelectedMemberId("");
      setAddingMember(false);
      toast({ title: "Mitglied eingetragen" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const filled = shift.signups.length >= shift.maxVolunteers;
  const availableMembers = members.filter((m) => !shift.signups.some((s) => s.memberId === m.id));

  if (editing) {
    return (
      <ShiftFormRow
        val={form} onChange={setForm}
        onSubmit={() => updateMutation.mutate(form)}
        onCancel={() => setEditing(false)}
        isPending={updateMutation.isPending}
      />
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2" data-testid={`admin-shift-${shift.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{shift.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {shift.startTime} – {shift.endTime} Uhr
          </p>
          {shift.note && <p className="text-xs text-muted-foreground italic mt-0.5">{shift.note}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className={`text-xs ${filled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
            <Users className="h-3 w-3 mr-1" />
            {shift.signups.length}/{shift.maxVolunteers}
          </Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} data-testid={`button-edit-shift-${shift.id}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid={`button-delete-shift-${shift.id}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="pt-2 border-t space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Eingetragen: {shift.signups.length}/{shift.maxVolunteers}
          {filled
            ? <span className="ml-1 text-green-600 font-medium">· Ziel erreicht ✓</span>
            : <span className="ml-1 text-orange-500 font-medium">· {shift.maxVolunteers - shift.signups.length} fehlen noch</span>
          }
        </p>

        {shift.signups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shift.signups.map((sg) => (
              <span key={sg.id} className="inline-flex items-center gap-1 text-xs bg-[#1a3a5c]/10 text-[#1a3a5c] px-2 py-0.5 rounded-full font-medium">
                {sg.member ? `${sg.member.firstName} ${sg.member.lastName}` : "Unbekannt"}
                <button className="hover:text-red-600 ml-0.5" onClick={() => removeSignupMutation.mutate(sg.id)} data-testid={`button-remove-signup-${sg.id}`} title="Entfernen">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {!addingMember ? (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 mt-1" onClick={() => setAddingMember(true)} disabled={availableMembers.length === 0} data-testid={`button-add-member-${shift.id}`}>
            <UserPlus className="h-3.5 w-3.5" />
            Mitglied eintragen
          </Button>
        ) : (
          <div className="flex gap-2 items-center mt-1">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="h-7 text-xs flex-1" data-testid={`select-member-${shift.id}`}>
                <SelectValue placeholder="Mitglied wählen…" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.sort((a, b) => a.lastName.localeCompare(b.lastName)).map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()} data-testid={`option-member-${m.id}`}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 text-xs" disabled={!selectedMemberId || addSignupMutation.isPending} onClick={() => addSignupMutation.mutate(parseInt(selectedMemberId))} data-testid="button-confirm-add-member">
              {addSignupMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingMember(false); setSelectedMemberId(""); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventShiftPanel({ event }: { event: Event }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShiftForm>(() => makeDefault(event));

  const { data: shifts, isLoading } = useQuery<ShiftWithSignups[]>({
    queryKey: ["/api/events", event.id, "shifts"],
    queryFn: () => fetch(`/api/events/${event.id}/shifts`).then((r) => r.json()),
  });

  const { data: members = [] } = useQuery<ShiftMember[]>({
    queryKey: ["/api/members/public"],
    queryFn: () => fetch("/api/members/public").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: ShiftForm) => apiRequest("POST", `/api/events/${event.id}/shifts`, {
      ...data, maxVolunteers: parseInt(data.maxVolunteers) || 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "shifts"] });
      setShowForm(false);
      setForm(makeDefault(event));
      toast({ title: "Schicht erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const byDate: Record<string, ShiftWithSignups[]> = {};
  for (const s of shifts || []) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  const sortedDates = Object.keys(byDate).sort();
  const publicUrl = `${window.location.origin}/schichtplan/${event.id}`;

  const totalSignups = (shifts || []).reduce((sum, s) => sum + s.signups.length, 0);
  const totalNeeded = (shifts || []).reduce((sum, s) => sum + s.maxVolunteers, 0);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2 border">
        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1">{publicUrl}</span>
        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs gap-1" data-testid="button-copy-shift-link"
          onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link kopiert!" }); }}>
          <Copy className="h-3 w-3" /> Kopieren
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : sortedDates.length === 0 && !showForm ? (
        <div className="text-center py-10 text-muted-foreground border rounded-lg">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Noch keine Schichten geplant.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#c8a84b]" />
                <p className="text-xs font-semibold text-[#1a3a5c] uppercase tracking-wide">
                  {format(parseISO(date), "EEEE, dd. MMMM yyyy", { locale: de })}
                </p>
              </div>
              {byDate[date].map((shift) => (
                <ShiftCard key={shift.id} shift={shift} eventId={event.id} members={members} />
              ))}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <ShiftFormRow
          val={form} onChange={setForm}
          onSubmit={() => createMutation.mutate(form)}
          onCancel={() => setShowForm(false)}
          isPending={createMutation.isPending}
        />
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)} data-testid="button-add-shift">
          <Plus className="h-4 w-4" /> Neue Schicht
        </Button>
      )}

      {(shifts || []).length > 0 && (
        <div className="text-xs text-muted-foreground pt-1 border-t">
          Gesamt: {totalSignups}/{totalNeeded} Personen eingetragen
          {totalSignups >= totalNeeded
            ? <span className="ml-1 text-green-600 font-medium">· Vollständig besetzt ✓</span>
            : <span className="ml-1 text-orange-500 font-medium">· {totalNeeded - totalSignups} fehlen noch</span>
          }
        </div>
      )}
    </div>
  );
}

export default function AdminSchichtplanPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const activeEvents = events.filter((e) => e.isActive);
  const selectedEvent = activeEvents.find((e) => e.id.toString() === selectedEventId);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="h-5 w-5 text-[#1a3a5c]" />
          <h1 className="text-lg font-semibold">Schichtplan</h1>
        </div>
        <p className="text-sm text-muted-foreground">Schichten planen und Mitglieder einteilen</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {eventsLoading ? (
          <Skeleton className="h-10 w-full max-w-sm" />
        ) : activeEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine aktiven Veranstaltungen vorhanden.</p>
        ) : (
          <>
            <div className="max-w-sm">
              <label className="text-sm font-medium mb-1.5 block">Veranstaltung auswählen</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId} data-testid="select-event">
                <SelectTrigger data-testid="select-trigger-event">
                  <SelectValue placeholder="Veranstaltung wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {activeEvents
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((ev) => (
                      <SelectItem key={ev.id} value={ev.id.toString()} data-testid={`option-event-${ev.id}`}>
                        {format(new Date(ev.date), "dd.MM.yy", { locale: de })} · {ev.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEvent && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-[#1a3a5c]" />
                    {selectedEvent.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(selectedEvent.date), "dd. MMMM yyyy", { locale: de })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedEvent.location}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <EventShiftPanel event={selectedEvent} />
                </CardContent>
              </Card>
            )}

            {!selectedEventId && (
              <div>
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Alle Veranstaltungen</h2>
                <div className="space-y-2">
                  {activeEvents
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((ev) => (
                      <div key={ev.id} className="border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedEventId(expandedEventId === ev.id ? null : ev.id)}
                          data-testid={`button-expand-event-${ev.id}`}
                        >
                          <div>
                            <p className="font-medium text-sm">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ev.date), "dd. MMMM yyyy", { locale: de })} · {ev.location}
                            </p>
                          </div>
                          {expandedEventId === ev.id
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>
                        {expandedEventId === ev.id && (
                          <div className="px-4 pb-4 border-t bg-muted/10">
                            <EventShiftPanel event={ev} />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

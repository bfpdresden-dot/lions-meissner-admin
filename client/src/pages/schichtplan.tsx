import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Clock, Users, Check, X, CalendarDays, MapPin, ClipboardList } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { Event } from "@shared/schema";

interface ShiftMember { id: number; firstName: string; lastName: string; }
interface ShiftSignupWithMember { id: number; shiftId: number; memberId: number; signedUpAt: string; member: ShiftMember | null; }
interface ShiftWithSignups {
  id: number; eventId: number; title: string; date: string;
  startTime: string; endTime: string; maxVolunteers: number;
  note: string | null; signups: ShiftSignupWithMember[];
}

export default function SchichtplanPage({ eventId }: { eventId: string }) {
  const id = parseInt(eventId, 10);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ["/api/events", id],
    queryFn: () => fetch(`/api/events/${id}`).then((r) => r.json()),
    enabled: !isNaN(id),
  });

  const { data: shifts, isLoading: shiftsLoading } = useQuery<ShiftWithSignups[]>({
    queryKey: ["/api/events", id, "shifts"],
    queryFn: () => fetch(`/api/events/${id}/shifts`).then((r) => r.json()),
    enabled: !isNaN(id),
    refetchInterval: 15000,
  });

  const { data: members } = useQuery<{ id: number; firstName: string; lastName: string }[]>({
    queryKey: ["/api/members/public"],
    queryFn: () => fetch("/api/members/public").then((r) => r.json()),
    enabled: !isNaN(id),
  });

  const signupMutation = useMutation({
    mutationFn: async ({ shiftId, memberId }: { shiftId: number; memberId: number }) => {
      const res = await fetch(`/api/shifts/${shiftId}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", id, "shifts"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (signupId: number) => {
      const res = await fetch(`/api/shifts/signups/${signupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/events", id, "shifts"] }),
  });

  if (isNaN(id)) return <ErrorPage message="Ungültige Veranstaltungs-ID" />;
  if (eventLoading || shiftsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a3a5c]" />
      </div>
    );
  }
  if (!event) return <ErrorPage message="Veranstaltung nicht gefunden" />;

  const selectedMember = members?.find((m) => m.id.toString() === selectedMemberId);

  // Group shifts by date
  const byDate: Record<string, ShiftWithSignups[]> = {};
  for (const s of shifts || []) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }
  const sortedDates = Object.keys(byDate).sort();

  const isSignedUpAnywhere = selectedMemberId
    ? shifts?.some((s) => s.signups.some((sg) => sg.memberId.toString() === selectedMemberId))
    : false;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-[#1a3a5c] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#c8a84b] overflow-hidden shrink-0">
              <img src="/images/lions-logo.png" alt="Lions" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-[#c8a84b] text-xs tracking-widest uppercase font-semibold">Lions Club Meißner Land</p>
              <p className="text-white/70 text-xs italic">We Serve</p>
            </div>
          </div>
          <div className="flex items-start gap-2 mb-3">
            <ClipboardList className="h-5 w-5 text-[#c8a84b] mt-0.5 shrink-0" />
            <h1 className="text-xl font-bold leading-snug">Schichtplan: {event.title}</h1>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(new Date(event.date), "dd. MMMM yyyy", { locale: de })}
              {event.endDate && ` – ${format(new Date(event.endDate), "dd. MMMM yyyy", { locale: de })}`}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          </div>
        </div>
        <div className="h-[3px] bg-[#c8a84b]" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Member selector */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <p className="text-sm font-semibold text-[#1a3a5c] mb-1">Wer bist du?</p>
          <p className="text-xs text-muted-foreground mb-3">Wähle deinen Namen, um dich in Schichten einzutragen oder auszutragen.</p>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId} data-testid="select-member">
            <SelectTrigger className="w-full" data-testid="select-trigger-member">
              <SelectValue placeholder="Name auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {(members || [])
                .sort((a, b) => a.firstName.localeCompare(b.firstName))
                .map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()} data-testid={`option-member-${m.id}`}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {selectedMember && (
            <p className="text-xs text-[#1a3a5c] mt-2 font-medium">
              Hallo, {selectedMember.firstName}! Klicke auf eine Schicht um dich ein- oder auszutragen.
            </p>
          )}
        </div>

        {/* Shifts by date */}
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">Noch keine Schichten geplant.</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#c8a84b]" />
                <h2 className="font-bold text-[#1a3a5c] text-sm">
                  {format(parseISO(date), "EEEE, dd. MMMM yyyy", { locale: de })}
                </h2>
              </div>

              {byDate[date].map((shift) => {
                const mySignup = selectedMemberId
                  ? shift.signups.find((sg) => sg.memberId.toString() === selectedMemberId)
                  : undefined;
                const isFull = shift.signups.length >= shift.maxVolunteers;
                const canSignup = selectedMemberId && !mySignup && !isFull;
                const isPending = signupMutation.isPending || cancelMutation.isPending;

                return (
                  <div
                    key={shift.id}
                    data-testid={`shift-card-${shift.id}`}
                    className={`bg-white rounded-lg border shadow-sm p-4 transition-all ${mySignup ? "border-green-300 bg-green-50/50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-[#1a3a5c]">{shift.title}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          {shift.startTime} – {shift.endTime} Uhr
                        </p>
                        {shift.note && <p className="text-xs text-muted-foreground mt-1 italic">{shift.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant={isFull ? "destructive" : "secondary"}
                          className={`text-xs ${!isFull ? "bg-[#1a3a5c]/10 text-[#1a3a5c]" : ""}`}
                          data-testid={`badge-capacity-${shift.id}`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {shift.signups.length}/{shift.maxVolunteers}
                        </Badge>
                        {isFull && !mySignup && (
                          <p className="text-xs text-red-500 mt-1 font-medium">Belegt</p>
                        )}
                      </div>
                    </div>

                    {/* Signup list */}
                    {shift.signups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {shift.signups.map((sg) => (
                          <span
                            key={sg.id}
                            data-testid={`signup-name-${sg.id}`}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                              sg.memberId.toString() === selectedMemberId
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-[#1a3a5c]/10 text-[#1a3a5c]"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                            {sg.member ? `${sg.member.firstName} ${sg.member.lastName}` : "Unbekannt"}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    {selectedMemberId && (
                      mySignup ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50"
                          disabled={isPending}
                          onClick={() => cancelMutation.mutate(mySignup.id)}
                          data-testid={`button-cancel-${shift.id}`}
                        >
                          {cancelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <X className="h-3.5 w-3.5 mr-1" />}
                          Austragen
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white"
                          disabled={!canSignup || isPending}
                          onClick={() => signupMutation.mutate({ shiftId: shift.id, memberId: parseInt(selectedMemberId) })}
                          data-testid={`button-signup-${shift.id}`}
                        >
                          {signupMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                          {isFull ? "Schicht ist voll" : "Eintragen"}
                        </Button>
                      )
                    )}
                    {!selectedMemberId && (
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        Bitte zuerst deinen Namen auswählen
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Summary for selected member */}
        {selectedMember && isSignedUpAnywhere && (
          <div className="bg-[#1a3a5c] rounded-lg p-4 text-white text-sm">
            <p className="font-semibold mb-1">Deine Schichten, {selectedMember.firstName}:</p>
            {shifts?.filter((s) => s.signups.some((sg) => sg.memberId.toString() === selectedMemberId))
              .map((s) => (
                <p key={s.id} className="text-white/80 text-xs">
                  • {format(parseISO(s.date), "EE dd.MM.", { locale: de })} {s.startTime}–{s.endTime}: {s.title}
                </p>
              ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          © {new Date().getFullYear()} Lions Club Meißner Land
        </p>
      </div>
    </div>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
      <div className="text-center">
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

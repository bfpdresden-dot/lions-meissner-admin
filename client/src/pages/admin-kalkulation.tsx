import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, Wallet, FileText, Users } from "lucide-react";
import type { Event, Subscriber } from "@shared/schema";

interface KalkulationItem {
  id: number;
  eventId: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  createdAt: string;
}

interface ShiftSignup {
  id: number;
  shiftId: number;
  memberId: number;
  personCount: number;
}

interface Shift {
  id: number;
  eventId: number;
  title: string;
}

function formatEuro(amount: number) {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function parseEuroInput(value: string): number {
  return parseFloat(value.replace(",", ".")) || 0;
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function generatePdf(simple: boolean, {
  event, items, members, signups, shifts, ertrag, totalIncome, totalExpenses,
}: {
  event: Event;
  items: KalkulationItem[];
  members: Subscriber[];
  signups: ShiftSignup[];
  shifts: Shift[];
  ertrag: number;
  totalIncome: number;
  totalExpenses: number;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const navy = [26, 58, 92] as [number, number, number];
  const gold = [200, 168, 75] as [number, number, number];
  const green = [22, 101, 52] as [number, number, number];
  const red = [185, 28, 28] as [number, number, number];

  // Header
  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Lions Club Meißner Land", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(simple ? "Gewinnrechnung" : "Gewinnrechnung mit Mitgliederabrechnung", 14, 19);
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.text(`Erstellt am ${formatDate(new Date())}`, 14, 25);

  doc.setTextColor(0, 0, 0);
  let y = 36;

  // Veranstaltung
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(event.title, 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`${formatDate(event.date)} · ${event.location}`, 14, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Einnahmen
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("Einnahmen", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const income = items.filter(i => i.type === "income");
  for (const item of income) {
    doc.setFontSize(9);
    doc.text(item.description, 18, y);
    doc.text(formatEuro(item.amount), 196, y, { align: "right" });
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...green);
  doc.text("Einnahmen gesamt", 18, y);
  doc.text(formatEuro(totalIncome), 196, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Ausgaben
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("Ausgaben", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const expenses = items.filter(i => i.type === "expense");
  for (const item of expenses) {
    doc.setFontSize(9);
    doc.text(item.description, 18, y);
    doc.text(formatEuro(item.amount), 196, y, { align: "right" });
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...red);
  doc.text("Ausgaben gesamt", 18, y);
  doc.text(formatEuro(totalExpenses), 196, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Trennlinie + Ertrag
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.6);
  doc.line(14, y - 3, 196, y - 3);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(ertrag >= 0 ? green[0] : red[0], ertrag >= 0 ? green[1] : red[1], ertrag >= 0 ? green[2] : red[2]);
  doc.text("Ertrag", 14, y + 3);
  doc.text((ertrag >= 0 ? "+" : "") + formatEuro(ertrag), 196, y + 3, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 14;

  if (!simple) {
    // Teilnehmende Mitglieder aus Schichtplan
    const memberIdsInEvent = new Set(signups.map(s => s.memberId));
    const participatingMembers = members.filter(m => memberIdsInEvent.has(m.id));
    const count = participatingMembers.length;
    const anteil = count > 0 ? ertrag / count : 0;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.text("Mitgliederabrechnung", 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Ertrag ${formatEuro(ertrag)} ÷ ${count} Mitglieder = ${formatEuro(anteil)} je Person`, 14, y);
    y += 7;

    doc.setTextColor(0, 0, 0);
    // Tabellenkopf
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(240, 242, 245);
    doc.rect(14, y - 4, 182, 6, "F");
    doc.text("Name", 16, y);
    doc.text("Anteil", 196, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");

    for (const m of participatingMembers) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${m.lastName}, ${m.firstName}`, 16, y);
      doc.text(formatEuro(anteil), 196, y, { align: "right" });
      y += 5;
    }

    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.text(`Gesamt: ${count} Mitglieder`, 16, y);
    doc.text(formatEuro(anteil * count), 196, y, { align: "right" });
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Lions Club Meißner Land · Seite ${i} von ${pageCount}`, 14, 290);
  }

  const filename = simple
    ? `Gewinnrechnung_${event.title.replace(/\s+/g, "_")}.pdf`
    : `Gewinnrechnung_Mitglieder_${event.title.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

export default function AdminKalkulationPage() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [pdfLoading, setPdfLoading] = useState<"simple" | "extended" | null>(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<KalkulationItem[]>({
    queryKey: ["/api/kalkulation", selectedEventId],
    enabled: selectedEventId !== null,
  });

  const { data: members = [] } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  // shifts-with-signups for this event (existing endpoint)
  const { data: shiftsWithSignups = [] } = useQuery<(Shift & { signups: (ShiftSignup & { member: { id: number; firstName: string; lastName: string } | null })[] })[]>({
    queryKey: ["/api/events", selectedEventId, "shifts"],
    enabled: selectedEventId !== null,
  });

  // flatten signups from all shifts
  const signupsForEvent: ShiftSignup[] = shiftsWithSignups.flatMap((s) => s.signups.map((su) => ({ ...su })));

  const saveErtrageMutation = useMutation({
    mutationFn: (data: { eventId: number; eventTitle: string; eventDate: string; entries: { memberId: number; amount: number }[] }) =>
      apiRequest("POST", "/api/member-ertraege/save-event", data),
    onError: () => toast({ title: "Fehler", description: "Erträge konnten nicht gespeichert werden.", variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: (data: { eventId: number; type: "income" | "expense"; description: string; amount: number }) =>
      apiRequest("POST", "/api/kalkulation", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kalkulation", selectedEventId] });
      setNewDescription("");
      setNewAmount("");
    },
    onError: () => toast({ title: "Fehler", description: "Eintrag konnte nicht gespeichert werden.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, description, amount }: { id: number; description: string; amount: number }) =>
      apiRequest("PATCH", `/api/kalkulation/${id}`, { description, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kalkulation", selectedEventId] });
      setEditingId(null);
    },
    onError: () => toast({ title: "Fehler", description: "Eintrag konnte nicht aktualisiert werden.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/kalkulation/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/kalkulation", selectedEventId] }),
    onError: () => toast({ title: "Fehler", description: "Eintrag konnte nicht gelöscht werden.", variant: "destructive" }),
  });

  function handleAdd(type: "income" | "expense") {
    if (!selectedEventId || !newDescription.trim() || !newAmount) return;
    const amount = parseEuroInput(newAmount);
    if (amount <= 0) {
      toast({ title: "Ungültiger Betrag", description: "Bitte einen positiven Betrag eingeben.", variant: "destructive" });
      return;
    }
    addMutation.mutate({ eventId: selectedEventId, type, description: newDescription.trim(), amount });
  }

  function startEdit(item: KalkulationItem) {
    setEditingId(item.id);
    setEditDescription(item.description);
    setEditAmount(item.amount.toString().replace(".", ","));
  }

  function saveEdit() {
    if (!editingId || !editDescription.trim() || !editAmount) return;
    const amount = parseEuroInput(editAmount);
    if (amount <= 0) return;
    updateMutation.mutate({ id: editingId, description: editDescription.trim(), amount });
  }

  const income = items.filter((i) => i.type === "income");
  const expenses = items.filter((i) => i.type === "expense");
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, i) => s + i.amount, 0);
  const ertrag = totalIncome - totalExpenses;

  // Teilnehmende Mitglieder aus Schichtplan (dedupliziert)
  const memberIdsInEvent = new Set(signupsForEvent.map((s) => s.memberId));
  const participatingMembers = members.filter((m) => memberIdsInEvent.has(m.id));
  const anteilJeMitglied = participatingMembers.length > 0 ? ertrag / participatingMembers.length : 0;

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const activeEvents = events.filter((e) => e.isActive);

  async function handlePdf(simple: boolean) {
    if (!selectedEvent) return;
    setPdfLoading(simple ? "simple" : "extended");
    try {
      if (!simple) {
        // Erträge in DB speichern
        await saveErtrageMutation.mutateAsync({
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          eventDate: selectedEvent.date.toString(),
          entries: participatingMembers.map((m) => ({
            memberId: m.id,
            amount: anteilJeMitglied,
          })),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/member-ertraege"] });
        toast({ title: "Erträge gespeichert", description: `${participatingMembers.length} Mitglieder wurden abgerechnet.` });
      }
      await generatePdf(simple, {
        event: selectedEvent,
        items,
        members,
        signups: signupsForEvent,
        shifts: shiftsForEvent,
        ertrag,
        totalIncome,
        totalExpenses,
      });
    } catch {
      toast({ title: "PDF-Fehler", description: "PDF konnte nicht erstellt werden.", variant: "destructive" });
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f0f2f5]">
      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a3a5c]">Kalkulation</h1>
          <p className="text-sm text-muted-foreground mt-1">Einnahmen und Ausgaben pro Veranstaltung erfassen</p>
        </div>

        {/* Event-Auswahl */}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <Label className="text-sm font-semibold text-[#1a3a5c] mb-2 block">Veranstaltung auswählen</Label>
          {eventsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#1a3a5c]" />
          ) : (
            <Select
              value={selectedEventId?.toString() ?? ""}
              onValueChange={(v) => setSelectedEventId(parseInt(v))}
            >
              <SelectTrigger data-testid="select-event-kalkulation" className="w-full max-w-sm">
                <SelectValue placeholder="Veranstaltung wählen..." />
              </SelectTrigger>
              <SelectContent>
                {activeEvents.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()} data-testid={`option-event-${e.id}`}>
                    {e.title}
                  </SelectItem>
                ))}
                {activeEvents.length === 0 && (
                  <SelectItem value="none" disabled>Keine aktiven Veranstaltungen</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedEventId && (
          <>
            {/* Eingabe-Bereich */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <h2 className="text-sm font-semibold text-[#1a3a5c] mb-3">Neuer Eintrag</h2>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Beschreibung"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="flex-1 min-w-40"
                  data-testid="input-kalkulation-description"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd("income")}
                />
                <Input
                  placeholder="Betrag in €"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-36"
                  data-testid="input-kalkulation-amount"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd("income")}
                />
                <Button
                  onClick={() => handleAdd("income")}
                  disabled={addMutation.isPending || !newDescription.trim() || !newAmount}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  data-testid="button-add-income"
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Einnahme
                </Button>
                <Button
                  onClick={() => handleAdd("expense")}
                  disabled={addMutation.isPending || !newDescription.trim() || !newAmount}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5"
                  data-testid="button-add-expense"
                >
                  {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
                  Ausgabe
                </Button>
              </div>
            </div>

            {/* Listen */}
            {itemsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a3a5c]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Einnahmen */}
                <div className="bg-white rounded-lg border border-green-200 shadow-sm overflow-hidden">
                  <div className="bg-green-50 border-b border-green-200 px-4 py-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-700" />
                    <h2 className="font-semibold text-green-800 text-sm">Einnahmen</h2>
                  </div>
                  <div className="divide-y">
                    {income.length === 0 && (
                      <p className="text-sm text-muted-foreground p-4 text-center">Keine Einnahmen erfasst</p>
                    )}
                    {income.map((item) => (
                      <div key={item.id} className="px-4 py-2.5" data-testid={`row-income-${item.id}`}>
                        {editingId === item.id ? (
                          <div className="flex gap-2 items-center flex-wrap">
                            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="flex-1 h-8 text-sm min-w-24" data-testid="input-edit-description" />
                            <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-28 h-8 text-sm" data-testid="input-edit-amount" />
                            <Button size="sm" onClick={saveEdit} className="h-8 text-xs" data-testid="button-save-edit">
                              {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs" data-testid="button-cancel-edit">Abbrechen</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm cursor-pointer hover:underline" onClick={() => startEdit(item)} data-testid={`text-income-description-${item.id}`}>{item.description}</span>
                            <span className="text-sm font-semibold text-green-700 shrink-0" data-testid={`text-income-amount-${item.id}`}>{formatEuro(item.amount)}</span>
                            <button onClick={() => deleteMutation.mutate(item.id)} className="text-muted-foreground hover:text-red-600 transition-colors shrink-0" data-testid={`button-delete-income-${item.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-green-50 border-t border-green-200 px-4 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-green-700 font-medium">Gesamt</span>
                    <span className="text-sm font-bold text-green-800" data-testid="text-total-income">{formatEuro(totalIncome)}</span>
                  </div>
                </div>

                {/* Ausgaben */}
                <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
                  <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-700" />
                    <h2 className="font-semibold text-red-800 text-sm">Ausgaben</h2>
                  </div>
                  <div className="divide-y">
                    {expenses.length === 0 && (
                      <p className="text-sm text-muted-foreground p-4 text-center">Keine Ausgaben erfasst</p>
                    )}
                    {expenses.map((item) => (
                      <div key={item.id} className="px-4 py-2.5" data-testid={`row-expense-${item.id}`}>
                        {editingId === item.id ? (
                          <div className="flex gap-2 items-center flex-wrap">
                            <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="flex-1 h-8 text-sm min-w-24" data-testid="input-edit-description" />
                            <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-28 h-8 text-sm" data-testid="input-edit-amount" />
                            <Button size="sm" onClick={saveEdit} className="h-8 text-xs" data-testid="button-save-edit">
                              {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs" data-testid="button-cancel-edit">Abbrechen</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 text-sm cursor-pointer hover:underline" onClick={() => startEdit(item)} data-testid={`text-expense-description-${item.id}`}>{item.description}</span>
                            <span className="text-sm font-semibold text-red-700 shrink-0" data-testid={`text-expense-amount-${item.id}`}>{formatEuro(item.amount)}</span>
                            <button onClick={() => deleteMutation.mutate(item.id)} className="text-muted-foreground hover:text-red-600 transition-colors shrink-0" data-testid={`button-delete-expense-${item.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-red-50 border-t border-red-200 px-4 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-red-700 font-medium">Gesamt</span>
                    <span className="text-sm font-bold text-red-800" data-testid="text-total-expenses">{formatEuro(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Zusammenfassung */}
            {!itemsLoading && (
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-[#1a3a5c]/5 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#1a3a5c]" />
                  <h2 className="font-semibold text-[#1a3a5c] text-sm">Zusammenfassung</h2>
                </div>
                <div className="divide-y">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground">Einnahmen</span>
                    <span className="text-sm font-semibold text-green-700" data-testid="summary-income">{formatEuro(totalIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-muted-foreground">Ausgaben</span>
                    <span className="text-sm font-semibold text-red-700" data-testid="summary-expenses">{formatEuro(totalExpenses)}</span>
                  </div>
                  <div className={`flex justify-between items-center px-4 py-3 ${ertrag >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <span className={`text-sm font-bold ${ertrag >= 0 ? "text-green-800" : "text-red-800"}`}>Ertrag</span>
                    <span className={`text-base font-bold ${ertrag >= 0 ? "text-green-800" : "text-red-800"}`} data-testid="summary-ertrag">
                      {ertrag >= 0 ? "+" : ""}{formatEuro(ertrag)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mitgliedervorschau (nur wenn Schichtplan-Teilnehmer vorhanden) */}
            {!itemsLoading && participatingMembers.length > 0 && (
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-[#1a3a5c]/5 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#1a3a5c]" />
                  <h2 className="font-semibold text-[#1a3a5c] text-sm">Mitgliederanteil (Vorschau)</h2>
                  <span className="text-xs text-muted-foreground ml-auto">{participatingMembers.length} Mitglieder · je {formatEuro(anteilJeMitglied)}</span>
                </div>
                <div className="divide-y max-h-48 overflow-y-auto">
                  {participatingMembers.map((m) => (
                    <div key={m.id} className="flex justify-between items-center px-4 py-2" data-testid={`row-member-anteil-${m.id}`}>
                      <span className="text-sm">{m.lastName}, {m.firstName}</span>
                      <span className="text-sm font-semibold text-[#1a3a5c]">{formatEuro(anteilJeMitglied)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PDF-Buttons */}
            {!itemsLoading && items.length > 0 && (
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <h2 className="text-sm font-semibold text-[#1a3a5c] mb-3">PDF-Auswertungen</h2>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => handlePdf(true)}
                    disabled={pdfLoading !== null}
                    className="gap-2 border-[#1a3a5c] text-[#1a3a5c] hover:bg-[#1a3a5c]/5"
                    data-testid="button-pdf-simple"
                  >
                    {pdfLoading === "simple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Gewinnrechnung (PDF)
                  </Button>
                  <Button
                    onClick={() => handlePdf(false)}
                    disabled={pdfLoading !== null || participatingMembers.length === 0}
                    className="gap-2 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white"
                    data-testid="button-pdf-extended"
                    title={participatingMembers.length === 0 ? "Keine Schichtplan-Teilnehmer gefunden" : ""}
                  >
                    {pdfLoading === "extended" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                    Mit Mitgliederabrechnung (PDF)
                  </Button>
                  {participatingMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground self-center">Kein Schichtplan für diese Veranstaltung oder keine Anmeldungen vorhanden.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

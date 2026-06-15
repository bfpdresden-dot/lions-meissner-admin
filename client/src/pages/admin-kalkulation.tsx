import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Minus, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { Event } from "@shared/schema";

interface KalkulationItem {
  id: number;
  eventId: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  createdAt: string;
}

function formatEuro(amount: number) {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function parseEuroInput(value: string): number {
  return parseFloat(value.replace(",", ".")) || 0;
}

export default function AdminKalkulationPage() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<KalkulationItem[]>({
    queryKey: ["/api/kalkulation", selectedEventId],
    enabled: selectedEventId !== null,
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

  const activeEvents = events.filter((e) => e.isActive);

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
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="flex-1 h-8 text-sm min-w-24"
                              data-testid="input-edit-description"
                            />
                            <Input
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-28 h-8 text-sm"
                              data-testid="input-edit-amount"
                            />
                            <Button size="sm" onClick={saveEdit} className="h-8 text-xs" data-testid="button-save-edit">
                              {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs" data-testid="button-cancel-edit">
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className="flex-1 text-sm cursor-pointer hover:underline"
                              onClick={() => startEdit(item)}
                              data-testid={`text-income-description-${item.id}`}
                            >
                              {item.description}
                            </span>
                            <span className="text-sm font-semibold text-green-700 shrink-0" data-testid={`text-income-amount-${item.id}`}>
                              {formatEuro(item.amount)}
                            </span>
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                              data-testid={`button-delete-income-${item.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
                            <Input
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="flex-1 h-8 text-sm min-w-24"
                              data-testid="input-edit-description"
                            />
                            <Input
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-28 h-8 text-sm"
                              data-testid="input-edit-amount"
                            />
                            <Button size="sm" onClick={saveEdit} className="h-8 text-xs" data-testid="button-save-edit">
                              {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Speichern"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs" data-testid="button-cancel-edit">
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className="flex-1 text-sm cursor-pointer hover:underline"
                              onClick={() => startEdit(item)}
                              data-testid={`text-expense-description-${item.id}`}
                            >
                              {item.description}
                            </span>
                            <span className="text-sm font-semibold text-red-700 shrink-0" data-testid={`text-expense-amount-${item.id}`}>
                              {formatEuro(item.amount)}
                            </span>
                            <button
                              onClick={() => deleteMutation.mutate(item.id)}
                              className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                              data-testid={`button-delete-expense-${item.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
          </>
        )}
      </div>
    </div>
  );
}

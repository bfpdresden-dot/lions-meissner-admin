import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Trophy, Medal } from "lucide-react";
import type { Subscriber } from "@shared/schema";

interface MemberErtrag {
  id: number;
  memberId: number;
  eventId: number;
  amount: number;
  eventDate: string;
  eventTitle: string;
}

interface GroupedErtrag {
  memberId: number;
  totalAmount: number;
}

function formatEuro(amount: number) {
  return amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function printHitlistePdf(
  ranked: { member: Subscriber; total: number; details: MemberErtrag[] }[]
) {
  const grandTotal = ranked.reduce((s, r) => s + r.total, 0);

  const rows = ranked.map((r, i) => {
    const detailRows = r.details.map(d =>
      `<tr class="detail-row"><td></td><td class="detail">${formatDate(d.eventDate)} &ndash; ${d.eventTitle}</td><td></td><td class="amount detail">${formatEuro(d.amount)}</td></tr>`
    ).join("");
    return `
    <tr class="member-row${i === 0 ? " rank1" : i === 1 ? " rank2" : i === 2 ? " rank3" : ""}">
      <td class="rank">${i + 1}.</td>
      <td>${r.member.lastName}, ${r.member.firstName}</td>
      <td class="center">${r.details.length} VA</td>
      <td class="amount">${formatEuro(r.total)}</td>
    </tr>
    ${detailRows}`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Mitglieder-Ertrag-Statistik – Lions Club Meißner Land</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #222; padding: 20mm 18mm; }
  .header { background: #1a3a5c; color: white; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; }
  .header h1 { font-size: 15pt; margin-bottom: 3px; }
  .header p { font-size: 9pt; opacity: 0.85; }
  .header .date { color: #c8a84b; font-size: 8pt; margin-top: 4px; }
  h2 { font-size: 11pt; color: #1a3a5c; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f2f5; text-align: left; padding: 5px 8px; font-size: 9pt; border-bottom: 2px solid #cbd5e1; }
  th.amount, th.center { text-align: right; }
  th.center { text-align: center; }
  td { padding: 5px 8px; font-size: 10pt; border-bottom: 1px solid #f1f5f9; }
  td.amount { text-align: right; white-space: nowrap; font-weight: 600; color: #166534; }
  td.center { text-align: center; color: #666; }
  td.rank { color: #888; font-size: 9pt; width: 30px; }
  tr.rank1 td { background: #fffbeb; font-weight: bold; }
  tr.rank2 td { background: #f8fafc; }
  tr.rank3 td { background: #fff7ed; }
  tr.detail-row td { padding: 2px 8px; border-bottom: none; }
  td.detail { font-size: 8.5pt; color: #666; padding-left: 28px; }
  td.detail.amount { font-size: 8.5pt; font-weight: normal; color: #888; }
  .totals { margin-top: 12px; border-top: 2px solid #1a3a5c; padding-top: 8px; display: flex; justify-content: space-between; }
  .totals span { font-size: 11pt; font-weight: bold; color: #1a3a5c; }
  .totals span.amount { color: #166534; }
  .footer { margin-top: 24px; font-size: 8pt; color: #999; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; }
  @media print { body { padding: 10mm 14mm; } }
</style>
</head>
<body>
<div class="header">
  <h1>Lions Club Meißner Land</h1>
  <p>Mitglieder-Ertrag-Statistik &mdash; Hitliste</p>
  <div class="date">Erstellt am ${formatDate(new Date())}</div>
</div>

<h2>Ertrag je Mitglied (sortiert nach Gesamtbetrag)</h2>
<table>
  <thead>
    <tr>
      <th style="width:30px">#</th>
      <th>Name</th>
      <th class="center" style="width:80px">Veranst.</th>
      <th class="amount" style="width:110px">Gesamtertrag</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="totals">
  <span>Gesamtausschüttung (${ranked.length} Mitglieder)</span>
  <span class="amount">${formatEuro(grandTotal)}</span>
</div>

<div class="footer">Lions Club Meißner Land &mdash; Interne Auswertung</div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) throw new Error("Popup blocked");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

export default function AdminStatistikPage() {
  const { toast } = useToast();

  const { data: members = [], isLoading: membersLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  const { data: grouped = [], isLoading: groupedLoading } = useQuery<GroupedErtrag[]>({
    queryKey: ["/api/member-ertraege/grouped"],
  });

  // Für jeden Mitglied die Detaildaten laden wäre zu viele Requests —
  // stattdessen alle Einzelerträge über einen aggregierten Endpoint.
  // Wir zeigen in der Tabelle die Summen + ein Drill-down bei Klick.
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);

  const { data: memberDetails = [], isLoading: detailsLoading } = useQuery<MemberErtrag[]>({
    queryKey: ["/api/member-ertraege", expandedMemberId],
    enabled: expandedMemberId !== null,
  });

  const isLoading = membersLoading || groupedLoading;

  // Ranglist aufbauen
  const ranked = grouped
    .map((g) => {
      const member = members.find((m) => m.id === g.memberId);
      return member ? { member, total: g.totalAmount } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.total - a!.total) as { member: Subscriber; total: number }[];

  const grandTotal = ranked.reduce((s, r) => s + r.total, 0);

  async function handlePdf() {
    if (ranked.length === 0) return;
    try {
      // Alle Detaildaten laden
      const allDetails: { member: Subscriber; total: number; details: MemberErtrag[] }[] = [];
      for (const r of ranked) {
        const res = await fetch(`/api/member-ertraege/${r.member.id}`, { credentials: "include" });
        const details: MemberErtrag[] = await res.json();
        allDetails.push({ ...r, details });
      }
      printHitlistePdf(allDetails);
    } catch {
      toast({ title: "PDF-Fehler", description: "Statistik-PDF konnte nicht erstellt werden.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[#f0f2f5]">
      <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1a3a5c]">Statistik</h1>
            <p className="text-sm text-muted-foreground mt-1">Ertragshitliste aller Mitglieder über alle Veranstaltungen</p>
          </div>
          {ranked.length > 0 && (
            <Button
              onClick={handlePdf}
              className="gap-2 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 text-white"
              data-testid="button-pdf-hitliste"
            >
              <FileText className="h-4 w-4" />
              Statistik als PDF
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1a3a5c]" />
          </div>
        ) : ranked.length === 0 ? (
          <div className="bg-white rounded-lg border shadow-sm p-10 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">Noch keine Erträge erfasst.</p>
            <p className="text-xs text-muted-foreground mt-1">Erstelle zuerst in der Kalkulation ein „Erweitertes PDF" für eine Veranstaltung.</p>
          </div>
        ) : (
          <>
            {/* Gesamt-Info */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a5c]" data-testid="stat-members-count">{ranked.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Mitglieder</p>
              </div>
              <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-green-700" data-testid="stat-grand-total">{formatEuro(grandTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">Gesamtausschüttung</p>
              </div>
              <div className="bg-white rounded-lg border shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-[#c8a84b]" data-testid="stat-avg">{formatEuro(ranked.length > 0 ? grandTotal / ranked.length : 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Ø je Mitglied</p>
              </div>
            </div>

            {/* Hitliste */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b bg-[#1a3a5c]/5 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#1a3a5c]" />
                <h2 className="font-semibold text-[#1a3a5c] text-sm">Hitliste</h2>
              </div>
              <div className="divide-y">
                {ranked.map((r, i) => {
                  const isExpanded = expandedMemberId === r.member.id;
                  return (
                    <div key={r.member.id} data-testid={`row-hitliste-${r.member.id}`}>
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                        onClick={() => setExpandedMemberId(isExpanded ? null : r.member.id)}
                        data-testid={`button-expand-${r.member.id}`}
                      >
                        {/* Rang-Badge */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          i === 0 ? "bg-yellow-400 text-yellow-900" :
                          i === 1 ? "bg-gray-300 text-gray-700" :
                          i === 2 ? "bg-amber-600 text-white" :
                          "bg-[#1a3a5c]/10 text-[#1a3a5c]"
                        }`}>
                          {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1a3a5c]">{r.member.lastName}, {r.member.firstName}</p>
                          <p className="text-xs text-muted-foreground">
                            {grouped.find(g => g.memberId === r.member.id) ? "klicken für Details" : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-green-700 shrink-0" data-testid={`text-total-${r.member.id}`}>
                          {formatEuro(r.total)}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {/* Detail-Aufklapper */}
                      {isExpanded && (
                        <div className="bg-muted/20 px-4 pb-3 pt-1 border-t">
                          {detailsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground my-2" />
                          ) : memberDetails.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">Keine Detaildaten</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground">
                                  <th className="text-left py-1 font-medium">Datum</th>
                                  <th className="text-left py-1 font-medium">Veranstaltung</th>
                                  <th className="text-right py-1 font-medium">Betrag</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {memberDetails.map((d) => (
                                  <tr key={d.id} data-testid={`detail-row-${d.id}`}>
                                    <td className="py-1.5 text-muted-foreground">{formatDate(d.eventDate)}</td>
                                    <td className="py-1.5">{d.eventTitle}</td>
                                    <td className="py-1.5 text-right font-semibold text-green-700">{formatEuro(d.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t">
                                  <td colSpan={2} className="pt-2 font-semibold text-[#1a3a5c]">Gesamt</td>
                                  <td className="pt-2 text-right font-bold text-green-700">{formatEuro(r.total)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fußzeile Gesamtsumme */}
              <div className="bg-[#1a3a5c]/5 border-t px-4 py-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-[#1a3a5c]">Gesamtausschüttung</span>
                <span className="text-sm font-bold text-green-700" data-testid="text-grand-total-footer">{formatEuro(grandTotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


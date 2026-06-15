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

async function generateHitlistePdf(
  ranked: { member: Subscriber; total: number; details: MemberErtrag[] }[]
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const navy = [26, 58, 92] as [number, number, number];
  const gold = [200, 168, 75] as [number, number, number];

  // Header
  doc.setFillColor(...navy);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("Lions Club Meißner Land", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Mitglieder-Ertrags-Statistik", 14, 19);
  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.text(`Erstellt am ${formatDate(new Date())}`, 14, 25);
  doc.setTextColor(0, 0, 0);

  let y = 36;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  doc.text("Hitliste — Ertrag je Mitglied", 14, y);
  y += 8;

  // Tabellenheader
  doc.setFontSize(8);
  doc.setFillColor(240, 242, 245);
  doc.rect(14, y - 4, 182, 6, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Rang", 16, y);
  doc.text("Name", 30, y);
  doc.text("Veranstaltungen", 120, y);
  doc.text("Gesamtertrag", 196, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "normal");

  for (let i = 0; i < ranked.length; i++) {
    const { member, total, details } = ranked[i];
    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    const rankStr = `${i + 1}.`;
    const nameStr = `${member.lastName}, ${member.firstName}`;
    const vaCount = `${details.length} VA`;
    const totalStr = formatEuro(total);

    doc.setFontSize(8.5);
    if (i === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");

    doc.text(rankStr, 16, y);
    doc.text(nameStr, 30, y);
    doc.text(vaCount, 120, y);
    doc.text(totalStr, 196, y, { align: "right" });
    y += 5;

    // Detailzeilen je Veranstaltung
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    for (const d of details) {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
      }
      doc.text(`${formatDate(d.eventDate)}  ${d.eventTitle}`, 32, y);
      doc.text(formatEuro(d.amount), 196, y, { align: "right" });
      y += 4;
    }
    doc.setTextColor(0, 0, 0);
    y += 2;
  }

  // Gesamtsumme
  const grandTotal = ranked.reduce((s, r) => s + r.total, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navy);
  if (y > 275) { doc.addPage(); y = 20; }
  doc.line(14, y, 196, y);
  y += 5;
  doc.text(`Gesamtausschüttung: ${formatEuro(grandTotal)}`, 14, y);
  doc.text(`${ranked.length} Mitglieder`, 196, y, { align: "right" });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Lions Club Meißner Land · Seite ${i} von ${pageCount}`, 14, 290);
  }

  doc.save("Mitglieder_Ertrag_Statistik.pdf");
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
      await generateHitlistePdf(allDetails);
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


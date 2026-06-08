import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Download, QrCode, Printer, Info } from "lucide-react";
import type { Event } from "@shared/schema";

export default function QRCodesPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const activeEvents = events?.filter((e) => e.isActive) || [];
  const selectedEvent = events?.find((e) => e.id.toString() === selectedEventId);

  const subscribeUrl = selectedEventId
    ? `${window.location.origin}/subscribe/${selectedEventId}`
    : "";

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 600, 600);
      ctx.drawImage(img, 0, 0, 600, 600);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-code-${selectedEvent?.title || "newsletter"}.png`;
      a.click();
    };
    img.src = url;
  };

  const handlePrint = () => {
    if (!qrRef.current || !selectedEvent) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    const eventDate = new Date(selectedEvent.date);
    const dateStr = eventDate.toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });
    const timeStr = eventDate.toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-Code - ${selectedEvent.title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 32px 24px;
              font-family: system-ui, sans-serif;
              color: #1a2744;
              background: #fff;
            }
            .logo-row {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 6px;
            }
            h1 { font-size: 26px; margin: 0 0 2px; text-align: center; }
            .club-sub { font-size: 13px; color: #999; margin-bottom: 28px; letter-spacing: 0.04em; }
            .event-box {
              border: 2px solid #c8951a;
              border-radius: 10px;
              padding: 20px 28px;
              max-width: 480px;
              width: 100%;
              margin-bottom: 24px;
              text-align: center;
            }
            .event-title { font-size: 22px; font-weight: 700; color: #1a2744; margin-bottom: 14px; }
            .detail-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
              font-size: 15px;
              color: #444;
              margin-bottom: 8px;
            }
            .detail-icon { color: #c8951a; font-size: 16px; }
            .divider { border: none; border-top: 1px solid #eee; margin: 14px 0; }
            .description {
              font-size: 14px;
              color: #555;
              line-height: 1.65;
              text-align: center;
            }
            .qr-section { text-align: center; margin-bottom: 8px; }
            .qr-label {
              font-size: 14px;
              font-weight: 600;
              color: #c8951a;
              margin-bottom: 12px;
              letter-spacing: 0.03em;
              text-transform: uppercase;
            }
            .qr { width: 240px; height: 240px; }
            .scan-hint { font-size: 13px; color: #888; margin-top: 10px; }
            .footer {
              margin-top: 28px;
              font-size: 12px;
              color: #bbb;
              text-align: center;
              border-top: 1px solid #eee;
              padding-top: 16px;
              width: 100%;
              max-width: 480px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Lions Club Mei\u00dfner Land</h1>
          <div class="club-sub">We Serve</div>

          <div class="event-box">
            <div class="event-title">${selectedEvent.title}</div>
            <div class="detail-row">
              <span class="detail-icon">&#128197;</span>
              <span>${dateStr}, ${timeStr} Uhr</span>
            </div>
            <div class="detail-row">
              <span class="detail-icon">&#128205;</span>
              <span>${selectedEvent.location}</span>
            </div>
            ${selectedEvent.maxParticipants ? `
            <div class="detail-row">
              <span class="detail-icon">&#128101;</span>
              <span>Max. ${selectedEvent.maxParticipants} Teilnehmer</span>
            </div>` : ""}
            ${selectedEvent.description ? `
            <hr class="divider" />
            <div class="description">${selectedEvent.description}</div>` : ""}
          </div>

          <div class="qr-section">
            <div class="qr-label">Newsletter anmelden</div>
            <div class="qr">${svgData}</div>
            <div class="scan-hint">QR-Code mit dem Smartphone scannen</div>
          </div>

          <div class="footer">
            Sebastian Schreiber &nbsp;&bull;&nbsp; Seestra\u00dfe 18e, 01640 Coswig &nbsp;&bull;&nbsp;
            Tel: 0172&nbsp;340&nbsp;85&nbsp;43 &nbsp;&bull;&nbsp; schreiber1988@gmx.net
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-qrcodes-title">QR-Codes</h1>
          <p className="text-muted-foreground mt-1">
            Generieren Sie QR-Codes f&uuml;r Newsletter-Anmeldungen bei Veranstaltungen
          </p>
        </div>

        <div className="p-4 rounded-md bg-muted/50 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>
              W&auml;hlen Sie eine Veranstaltung aus und generieren Sie einen QR-Code.
              Besucher scannen den Code mit ihrem Smartphone und gelangen direkt zur Newsletter-Anmeldung.
              Die Anmeldung wird automatisch der jeweiligen Veranstaltung zugeordnet.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QR-Code Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-sm">
              <label className="text-sm font-medium mb-2 block">Veranstaltung ausw&auml;hlen</label>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : activeEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine aktiven Veranstaltungen vorhanden. Erstellen Sie zuerst eine Veranstaltung.
                </p>
              ) : (
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-event-qr">
                    <SelectValue placeholder="Veranstaltung w&auml;hlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedEventId ? (
              <div className="flex flex-col items-center space-y-6">
                <div className="p-2 rounded-md bg-muted/30 text-center">
                  <p className="text-sm font-medium">{selectedEvent?.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Besucher werden zu folgender Seite weitergeleitet:
                  </p>
                  <p className="text-xs text-primary mt-1 break-all font-mono">{subscribeUrl}</p>
                </div>

                <div
                  ref={qrRef}
                  className="p-8 bg-white rounded-md border"
                  data-testid="qr-code-display"
                >
                  <QRCodeSVG
                    value={subscribeUrl}
                    size={280}
                    level="H"
                    includeMargin={false}
                    fgColor="#1a2744"
                  />
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button onClick={handleDownload} data-testid="button-download-qr">
                    <Download className="h-4 w-4 mr-2" />
                    Als PNG herunterladen
                  </Button>
                  <Button variant="secondary" onClick={handlePrint} data-testid="button-print-qr">
                    <Printer className="h-4 w-4 mr-2" />
                    Druckversion
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <QrCode className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">
                  W&auml;hlen Sie eine Veranstaltung, um einen QR-Code zu generieren
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

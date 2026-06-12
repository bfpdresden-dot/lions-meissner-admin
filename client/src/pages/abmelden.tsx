import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AbmeldenPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "notfound">("loading");
  const [firstName, setFirstName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setStatus("error"); setErrorMsg("Kein Token angegeben."); return; }

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) {
          setFirstName(data.firstName || "");
          setStatus("success");
        } else if (!ok && data.error?.includes("nicht gefunden")) {
          setStatus("notfound");
        } else {
          setErrorMsg(data.error || "Ein Fehler ist aufgetreten.");
          setStatus("error");
        }
      })
      .catch(() => { setStatus("error"); setErrorMsg("Verbindungsfehler."); });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#1a3a5c] px-8 py-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-[#c8a84b] mx-auto mb-3 overflow-hidden">
              <img src="/images/lions-logo.png" alt="Lions Club" className="w-full h-full object-cover" />
            </div>
            <p className="text-white font-bold text-lg">Lions Club Meißner Land</p>
            <p className="text-[#c8a84b] text-xs tracking-widest uppercase italic mt-1">We Serve</p>
          </div>
          <div className="h-[3px] bg-[#c8a84b]" />

          <div className="bg-white px-8 py-10 text-center">
            {status === "loading" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 text-[#1a3a5c] animate-spin" />
                <p className="text-muted-foreground text-sm">Wird verarbeitet…</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1a3a5c] mb-2">
                    {firstName ? `Tschüss, ${firstName}!` : "Abgemeldet"}
                  </h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sie wurden erfolgreich vom Newsletter abgemeldet und erhalten
                    keine weiteren E-Mails vom Lions Club Meißner Land.
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm" className="mt-2" data-testid="button-back-to-events">
                    Zur Veranstaltungsseite
                  </Button>
                </Link>
              </div>
            )}

            {status === "notfound" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
                  <MailX className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1a3a5c] mb-2">Nicht gefunden</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Diese E-Mail-Adresse ist nicht als Abonnent registriert oder
                    wurde bereits abgemeldet.
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1a3a5c] mb-2">Fehler</h1>
                  <p className="text-sm text-muted-foreground">{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Lions Club Meißner Land
        </p>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function SubscribeConfirmPage({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`/api/subscribe/confirm/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setFirstName(data.firstName || "");
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Bestätigung wird verarbeitet…</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" data-testid="icon-confirm-success" />
              </div>
              <h1 className="text-xl font-semibold mb-2">
                {firstName ? `Willkommen, ${firstName}!` : "Anmeldung bestätigt!"}
              </h1>
              <p className="text-muted-foreground max-w-xs">
                Ihre E-Mail-Adresse wurde erfolgreich bestätigt. Sie erhalten ab sofort unseren Newsletter.
              </p>
              <a href="/veranstaltungen" className="mt-6">
                <Button data-testid="button-confirm-events">Zu den Veranstaltungen</Button>
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" data-testid="icon-confirm-error" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Link ungültig</h1>
              <p className="text-muted-foreground max-w-xs">
                Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.
                Bitte melden Sie sich erneut an oder kontaktieren Sie uns.
              </p>
              <a href="/veranstaltungen" className="mt-6">
                <Button variant="secondary" data-testid="button-confirm-back">Zur Startseite</Button>
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

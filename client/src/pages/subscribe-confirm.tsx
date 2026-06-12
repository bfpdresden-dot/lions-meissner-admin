import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, Lock, Eye, EyeOff } from "lucide-react";

export default function SubscribeConfirmPage({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "form" | "submitting" | "success" | "error">("loading");
  const [firstName, setFirstName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch(`/api/subscribe/confirm/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setFirstName(data.firstName || "");
          setStatus("form");
        } else {
          setErrorMsg(data.error || "Ungültiger Link");
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function handleSubmit() {
    if (password && password.length < 8) {
      setValidationError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    if (password && password !== passwordConfirm) {
      setValidationError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setValidationError("");
    setStatus("submitting");
    try {
      const res = await fetch(`/api/subscribe/confirm/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(password ? { password } : {}),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("success");
      } else {
        setErrorMsg(data.error || "Fehler bei der Bestätigung");
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-10">

          {status === "loading" && (
            <div className="flex flex-col items-center text-center py-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Link wird geprüft…</p>
            </div>
          )}

          {status === "form" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-xl font-semibold">
                  Willkommen{firstName ? `, ${firstName}` : ""}!
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Bitte bestätigen Sie Ihre Anmeldung. Optional können Sie gleich ein Passwort für den Mitgliederbereich anlegen.
                </p>
              </div>

              <div className="space-y-3 bg-muted/40 rounded-lg p-4 border">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Passwort anlegen <span className="text-muted-foreground font-normal">(optional)</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs">Passwort (min. 8 Zeichen)</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Passwort eingeben…"
                      className="pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPw(!showPw)}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {password && (
                  <div className="space-y-1">
                    <Label htmlFor="password-confirm" className="text-xs">Passwort wiederholen</Label>
                    <Input
                      id="password-confirm"
                      type={showPw ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Passwort wiederholen…"
                      data-testid="input-password-confirm"
                    />
                  </div>
                )}
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mit einem Passwort können Sie sich später im Mitgliederbereich anmelden. Sie können es auch jederzeit später vergeben.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                data-testid="button-confirm-submit"
              >
                Anmeldung bestätigen{password ? " & Passwort speichern" : ""}
              </Button>
            </div>
          )}

          {status === "submitting" && (
            <div className="flex flex-col items-center text-center py-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Wird gespeichert…</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" data-testid="icon-confirm-success" />
              </div>
              <h1 className="text-xl font-semibold">
                {firstName ? `Herzlich willkommen, ${firstName}!` : "Anmeldung bestätigt!"}
              </h1>
              <p className="text-muted-foreground max-w-xs text-sm">
                Ihre E-Mail-Adresse wurde bestätigt. Sie erhalten ab sofort unseren Newsletter.
              </p>
              <a href="/" className="mt-2">
                <Button data-testid="button-confirm-events">Zu den Veranstaltungen</Button>
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" data-testid="icon-confirm-error" />
              </div>
              <h1 className="text-xl font-semibold">Link ungültig</h1>
              <p className="text-muted-foreground max-w-xs text-sm">
                {errorMsg || "Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet. Bitte melden Sie sich erneut an oder kontaktieren Sie uns."}
              </p>
              <a href="/" className="mt-2">
                <Button variant="secondary" data-testid="button-confirm-back">Zur Startseite</Button>
              </a>
            </div>
          )}

        </CardContent>
      </Card>
    </main>
  );
}

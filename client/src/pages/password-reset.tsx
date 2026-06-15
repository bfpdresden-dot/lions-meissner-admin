import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
});

const resetSchema = z
  .object({
    password: z.string().min(6, "Mindestens 6 Zeichen"),
    passwordConfirm: z.string().min(1, "Passwort bestätigen"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

type ForgotValues = z.infer<typeof forgotSchema>;
type ResetValues = z.infer<typeof resetSchema>;

function ForgotPasswordForm() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotValues) => {
      const res = await apiRequest("POST", "/api/portal/forgot-password", data);
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-semibold">E-Mail gesendet</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Falls ein Konto mit dieser E-Mail-Adresse existiert, haben Sie eine
          Nachricht mit einem Reset-Link erhalten.
        </p>
        <p className="text-muted-foreground text-sm">Der Link ist 1 Stunde gültig.</p>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left w-full max-w-xs mx-auto">
          <p className="text-xs font-semibold text-amber-800 mb-1">📬 E-Mail nicht angekommen?</p>
          <p className="text-xs text-amber-700">
            Bitte prüfen Sie Ihren <strong>Spam- oder Junk-Ordner</strong> – Reset-E-Mails landen dort manchmal automatisch.
          </p>
          <p className="text-xs text-amber-700 mt-1">
            💡 <strong>Tipp:</strong> Fügen Sie den Absender als <strong>VIP / Kontakt</strong> hinzu, damit künftige E-Mails direkt im Posteingang erscheinen.
          </p>
        </div>
        <Link href="/mein-bereich">
          <Button variant="outline" className="mt-2" data-testid="link-back-to-login">
            Zurück zur Anmeldung
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum Zurücksetzen
          Ihres Passworts.
        </p>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail-Adresse</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="ihre@email.de"
                  autoComplete="email"
                  data-testid="input-forgot-email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
          data-testid="button-send-reset"
        >
          {mutation.isPending ? "Wird gesendet..." : "Reset-Link anfordern"}
        </Button>
        <div className="text-center">
          <Link href="/mein-bereich">
            <Button variant="link" size="sm" className="text-muted-foreground">
              Zurück zur Anmeldung
            </Button>
          </Link>
        </div>
      </form>
    </Form>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [done, setDone] = useState(false);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ResetValues) => {
      const res = await apiRequest("POST", "/api/portal/reset-password", {
        token,
        password: data.password,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Fehler beim Zurücksetzen");
      return body;
    },
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate("/mein-bereich"), 3000);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-semibold">Passwort geändert</h2>
        <p className="text-muted-foreground text-sm">
          Ihr Passwort wurde erfolgreich gesetzt. Sie werden zur Anmeldung weitergeleitet…
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vergeben Sie jetzt ein neues Passwort für Ihren Mitgliederbereich.
        </p>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neues Passwort</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  autoComplete="new-password"
                  data-testid="input-new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passwordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort bestätigen</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Passwort wiederholen"
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isPending}
          data-testid="button-set-password"
        >
          {mutation.isPending ? "Wird gespeichert..." : "Neues Passwort speichern"}
        </Button>
      </form>
    </Form>
  );
}

function InvalidToken() {
  return (
    <div className="text-center space-y-4 py-4">
      <AlertCircle className="h-14 w-14 text-destructive mx-auto" />
      <h2 className="text-xl font-semibold">Ungültiger Link</h2>
      <p className="text-muted-foreground text-sm">
        Dieser Reset-Link ist ungültig oder fehlt. Bitte fordern Sie einen neuen an.
      </p>
      <Link href="/passwort-reset">
        <Button variant="outline" data-testid="link-request-new">
          Neuen Link anfordern
        </Button>
      </Link>
    </div>
  );
}

export default function PasswordResetPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    setChecked(true);
  }, []);

  if (!checked) return null;

  const hasToken = token && token.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {hasToken ? "Neues Passwort vergeben" : "Passwort vergessen"}
          </h1>
          <p className="text-blue-200 text-sm mt-1">Lions Club Meißner Land</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {hasToken ? "Passwort zurücksetzen" : "Passwort zurücksetzen"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasToken ? (
              <ResetPasswordForm token={token} />
            ) : (
              <ForgotPasswordForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

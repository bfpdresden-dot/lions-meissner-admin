import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useLogin } from "@/hooks/use-auth";
import { Link } from "wouter";
import { LogIn, ShieldAlert, Users } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben"),
  password: z.string().min(1, "Passwort erforderlich"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage({ setupRequired }: { setupRequired?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const loginMutation = useLogin();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    loginMutation.mutate(data, {
      onError: (err: Error) => {
        setError(err.message.includes("401") ? "Ungültige Anmeldedaten" : err.message);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/images/lions-logo.png"
            alt="Lions Club Logo"
            className="h-16 w-16 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold">Lions Club Meißner Land</h1>
            <p className="text-muted-foreground text-sm mt-1">Admin-Bereich</p>
          </div>
        </div>

        {setupRequired && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Noch kein Admin eingerichtet</p>
              <p>
                Öffnen Sie die App ohne Login und richten Sie im Bereich <strong>Mitglieder</strong> einen
                Admin-Account ein. Danach ist der Login erforderlich.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 text-sm">
          <Users className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Mitglieder-Login</p>
            <p>
              Wenn Sie Mitglied sind, gelangen Sie hier zu Ihrem persönlichen Bereich:{" "}
              <Link href="/mein-bereich" className="underline font-medium hover:text-blue-600">
                Zum Mitglieder-Portal →
              </Link>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anmelden</CardTitle>
            <CardDescription>Nur für berechtigte Administratoren</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail-Adresse</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@beispiel.de"
                          autoComplete="email"
                          data-testid="input-login-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          autoComplete="current-password"
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-login-error">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login-submit"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {loginMutation.isPending ? "Wird angemeldet..." : "Anmelden"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

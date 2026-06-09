import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle2, Mail, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { z } from "zod";

const subscribeFormSchema = z.object({
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  phone: z.string().optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: "Bitte stimmen Sie der Datenschutzerklärung zu.",
  }),
});

type SubscribeFormValues = z.infer<typeof subscribeFormSchema>;

type MemberRef = { id: number; firstName: string; lastName: string };

export default function SubscribeMemberPage({ memberId }: { memberId: string }) {
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const prev = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const prevCanonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    document.title = "Newsletter anmelden | Lions Club Meißner Land";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Newsletter des Lions Club Meißner Land abonnieren und keine Veranstaltung verpassen.");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.origin + window.location.pathname);
    return () => {
      document.title = prev;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", prevCanonical);
    };
  }, []);

  const { data: member, isLoading, error } = useQuery<MemberRef>({
    queryKey: ["/api/member-ref", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/member-ref/${memberId}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeFormValues) => {
      const res = await apiRequest("POST", "/api/subscribe", {
        ...data,
        referredByMemberId: parseInt(memberId, 10),
      });
      return res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const form = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeFormSchema),
    defaultValues: { email: "", firstName: "", lastName: "", phone: "", consent: false },
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error || !member) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <h1 className="text-lg font-semibold mb-1">Link ungültig</h1>
            <p className="text-muted-foreground">Dieser QR-Code ist nicht mehr gültig.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Erfolgreich angemeldet!</h1>
            <p className="text-muted-foreground max-w-xs">
              Vielen Dank für Ihre Anmeldung zum Newsletter des Lions Club Meißner Land.
            </p>
            <a href="/veranstaltungen" className="mt-6">
              <Button variant="secondary" data-testid="button-back-events">
                Zu den Veranstaltungen
              </Button>
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <img
              src="/images/lions-logo.png"
              alt="Lions Club Logo"
              className="h-14 w-14 object-contain"
            />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Lions Club Meißner Land</p>
          <h1 className="text-xl font-semibold leading-none tracking-tight mt-1">Newsletter abonnieren</h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-3 rounded-md bg-muted/50 flex items-center gap-2 justify-center">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm">
              Empfohlen von{" "}
              <span className="font-medium">{member.firstName} {member.lastName}</span>
            </p>
          </div>

          {subscribeMutation.error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
              {subscribeMutation.error.message.includes("409")
                ? "Diese E-Mail-Adresse ist bereits registriert."
                : "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."}
            </div>
          )}

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => subscribeMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vorname</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Max" data-testid="input-subscribe-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachname</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Mustermann" data-testid="input-subscribe-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        placeholder="max.mustermann@beispiel.de"
                        data-testid="input-subscribe-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefonnummer (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="0123 456789"
                        data-testid="input-subscribe-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-consent"
                        />
                      </FormControl>
                      <div className="text-sm leading-relaxed">
                        Ich stimme zu, dass meine personenbezogenen Daten (Name, E-Mail,
                        Telefon) zur Newsletter-Zusendung und Veranstaltungsorganisation
                        des Lions Club Meißner Land verarbeitet werden. Diese Einwilligung
                        kann ich jederzeit widerrufen. Weitere Informationen in der{" "}
                        <Link href="/datenschutz" className="underline text-foreground hover:text-primary">
                          Datenschutzerklärung
                        </Link>
                        . *
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={subscribeMutation.isPending}
                data-testid="button-subscribe"
              >
                {subscribeMutation.isPending ? "Wird angemeldet..." : "Newsletter abonnieren"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            * Pflichtfeld. Sie können sich jederzeit wieder abmelden.
          </p>

          <div className="border-t pt-4 space-y-1 text-xs text-center text-muted-foreground">
            <p>Lions Club Meißner Land · Sebastian Schreiber</p>
            <p>Seestraße 18e, 01640 Coswig</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

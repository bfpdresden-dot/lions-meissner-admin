import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CheckCircle2, Mail } from "lucide-react";
import type { Event } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const subscribeFormSchema = z.object({
  email: z.string().email("Bitte geben Sie eine g\u00fcltige E-Mail-Adresse ein"),
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
});

type SubscribeFormValues = z.infer<typeof subscribeFormSchema>;

export default function SubscribePage({ eventId }: { eventId: string }) {
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: event, isLoading, error } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeFormValues) => {
      const res = await apiRequest("POST", "/api/subscribe", {
        ...data,
        eventId: parseInt(eventId, 10),
      });
      return res.json();
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
  });

  const form = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-1">Veranstaltung nicht gefunden</h3>
            <p className="text-muted-foreground">
              Diese Veranstaltung existiert nicht oder ist nicht mehr aktiv.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Erfolgreich angemeldet!</h3>
            <p className="text-muted-foreground max-w-xs">
              Vielen Dank f&uuml;r Ihre Anmeldung zum Newsletter des Lions Club Mei&szlig;ner Land.
            </p>
            <a href="/veranstaltungen" className="mt-6">
              <Button variant="secondary" data-testid="button-back-events">
                Zur&uuml;ck zu den Veranstaltungen
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <img
              src="/images/lions-logo.png"
              alt="Lions Club Logo"
              className="h-14 w-14 object-contain"
              data-testid="img-subscribe-logo"
            />
          </div>
          <CardTitle className="text-xl">Lions Club Mei&szlig;ner Land</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Newsletter abonnieren</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-3 rounded-md bg-muted/50 text-center">
            <p className="text-sm font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(event.date), "dd. MMMM yyyy", { locale: de })} &middot; {event.location}
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
              <Button
                type="submit"
                className="w-full"
                disabled={subscribeMutation.isPending}
                data-testid="button-subscribe"
              >
                {subscribeMutation.isPending
                  ? "Wird angemeldet..."
                  : "Newsletter abonnieren"}
              </Button>
            </form>
          </Form>

          <p className="text-xs text-center text-muted-foreground">
            Sie k&ouml;nnen sich jederzeit wieder abmelden. Wir geben Ihre Daten nicht an Dritte weiter.
          </p>

          <div className="border-t pt-4 space-y-1 text-xs text-center text-muted-foreground">
            <p>Lions Club Mei&szlig;ner Land &middot; Sebastian Schreiber</p>
            <p>Seestra&szlig;e 18e, 01640 Coswig</p>
            <p>
              <a href="tel:01723408543" className="hover:underline" data-testid="link-subscribe-phone">0172 340 85 43</a>
              {" "}&middot;{" "}
              <a href="mailto:schreiber1988@gmx.net" className="hover:underline" data-testid="link-subscribe-email">schreiber1988@gmx.net</a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

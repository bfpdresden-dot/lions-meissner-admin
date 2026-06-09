import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Users, CheckCircle2, UserPlus, Mail, User, Zap, FileText } from "lucide-react";
import { toSafeJsonLd } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";
import { Link } from "wouter";

type PortalSubscriber = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
};

const registerFormSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  phone: z.string().optional(),
  guestCount: z.string().default("1"),
  consent: z.boolean().refine((v) => v === true, {
    message: "Bitte stimmen Sie der Datenschutzerklärung zu.",
  }),
});

const subscribeFormSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Bitte geben Sie eine gültige E-Mail-Adresse ein"),
  phone: z.string().optional(),
  password: z.string().optional().or(z.literal("")),
  passwordConfirm: z.string().optional().or(z.literal("")),
  consent: z.boolean().refine((v) => v === true, {
    message: "Bitte stimmen Sie der Datenschutzerklärung zu.",
  }),
}).refine((d) => !d.password || d.password.length >= 6, {
  message: "Mindestens 6 Zeichen",
  path: ["password"],
}).refine((d) => !d.password || d.password === d.passwordConfirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["passwordConfirm"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;
type SubscribeFormValues = z.infer<typeof subscribeFormSchema>;

export default function PublicEventsPage() {
  useEffect(() => {
    const prev = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const prevCanonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    document.title = "Veranstaltungen | Lions Club Meißner Land";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Aktuelle Veranstaltungen des Lions Club Meißner Land – jetzt entdecken und anmelden.");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.origin + "/veranstaltungen");
    return () => {
      document.title = prev;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", prevCanonical);
    };
  }, []);

  const [registerEventId, setRegisterEventId] = useState<number | null>(null);
  const [successEvent, setSuccessEvent] = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [quickGuestCount, setQuickGuestCount] = useState("1");
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: guestCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/registrations/counts"],
  });

  const { data: portalSubscriber } = useQuery<PortalSubscriber | undefined>({
    queryKey: ["/api/portal/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
    throwOnError: false,
    select: (data: any) => data?.id ? (data as PortalSubscriber) : undefined,
  });

  const { data: myRegistrations } = useQuery<{ eventId: number }[]>({
    queryKey: ["/api/portal/registrations"],
    enabled: !!portalSubscriber,
    retry: false,
    staleTime: 1000 * 60,
    select: (data: any[]) => data.map((r) => ({ eventId: r.eventId })),
  });

  const isAlreadyRegistered = (eventId: number) =>
    !!portalSubscriber && (myRegistrations || []).some((r) => r.eventId === eventId);

  const upcomingEvents = (events || [])
    .filter((e) => e.isActive && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const registerEvent = events?.find((e) => e.id === registerEventId);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues & { eventId: number }) => {
      const res = await apiRequest("POST", "/api/registrations", {
        ...data,
        guestCount: parseInt(data.guestCount, 10),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      setSuccessEvent(registerEvent?.title || "");
      setRegisterEventId(null);
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("409")) {
        toast({ title: "Bereits angemeldet", description: "Sie sind bereits für diese Veranstaltung registriert.", variant: "destructive" });
      } else if (msg.includes("maximale")) {
        toast({ title: "Ausgebucht", description: "Die maximale Teilnehmerzahl wurde erreicht.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: "Die Anmeldung konnte nicht durchgeführt werden.", variant: "destructive" });
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (data: SubscribeFormValues) => {
      const { passwordConfirm, ...payload } = data;
      const res = await apiRequest("POST", "/api/subscribe", {
        ...payload,
        password: payload.password || undefined,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setSubscribeSuccess(!!variables.password);
      subscribeForm.reset();
    },
    onError: (error: Error) => {
      if (error.message.includes("409")) {
        toast({ title: "Bereits registriert", description: "Diese E-Mail-Adresse ist bereits für den Newsletter angemeldet.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: "Die Anmeldung konnte nicht durchgeführt werden.", variant: "destructive" });
      }
    },
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      guestCount: "1",
      consent: false,
    },
  });

  const subscribeForm = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", password: "", passwordConfirm: "", consent: false },
  });

  const handleOpenRegister = (eventId: number) => {
    setSuccessEvent(null);
    setQuickGuestCount("1");
    if (portalSubscriber) {
      form.reset({
        firstName: portalSubscriber.firstName,
        lastName: portalSubscriber.lastName,
        email: portalSubscriber.email,
        phone: portalSubscriber.phone || "",
        guestCount: "1",
        consent: false,
      });
    } else {
      form.reset({ firstName: "", lastName: "", email: "", phone: "", guestCount: "1", consent: false });
    }
    setRegisterEventId(eventId);
  };

  const quickRegisterMutation = useMutation({
    mutationFn: async ({ eventId, guestCount }: { eventId: number; guestCount: number }) => {
      if (!portalSubscriber) throw new Error("Nicht angemeldet");
      const res = await apiRequest("POST", "/api/registrations", {
        eventId,
        firstName: portalSubscriber.firstName,
        lastName: portalSubscriber.lastName,
        email: portalSubscriber.email,
        phone: portalSubscriber.phone || "",
        guestCount,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      setSuccessEvent(registerEvent?.title || "");
      setRegisterEventId(null);
    },
    onError: (error: Error) => {
      const msg = error.message;
      if (msg.includes("409")) {
        toast({ title: "Bereits angemeldet", description: "Sie sind bereits für diese Veranstaltung registriert.", variant: "destructive" });
      } else if (msg.includes("maximale")) {
        toast({ title: "Ausgebucht", description: "Die maximale Teilnehmerzahl wurde erreicht.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: "Die Anmeldung konnte nicht durchgeführt werden.", variant: "destructive" });
      }
    },
  });

  const handleOpenSubscribe = () => {
    subscribeForm.reset();
    setSubscribeSuccess(false);
    setShowSubscribe(true);
  };

  const getGuestCount = (eventId: number) => {
    if (!guestCounts) return 0;
    return guestCounts[String(eventId)] || 0;
  };

  const getSpotsLeft = (event: Event) => {
    if (!event.maxParticipants) return null;
    const current = getGuestCount(event.id);
    return Math.max(0, event.maxParticipants - current);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-gradient-to-br from-[hsl(220,40%,15%)] to-[hsl(220,50%,22%)] text-white">
        <div className="absolute inset-0 opacity-20">
          <img src="/images/hero-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
          <img
            src="/images/lions-logo.png"
            alt="Lions Club Logo"
            className="h-20 w-20 mx-auto mb-6 object-contain"
            data-testid="img-public-logo"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-public-title">
            Lions Club Mei&szlig;ner Land
          </h1>
          <p className="text-lg opacity-80 mb-8">Unsere Veranstaltungen</p>
          <div className="flex items-center gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={handleOpenSubscribe}
              data-testid="button-open-subscribe"
            >
              <Mail className="h-4 w-4 mr-2" />
              Newsletter abonnieren
            </Button>
            <Link href="/mein-bereich">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                data-testid="link-mein-bereich"
              >
                <User className="h-4 w-4 mr-2" />
                Mein Bereich
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Derzeit keine anstehenden Veranstaltungen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map((event) => {
              const guests = getGuestCount(event.id);
              const spotsLeft = getSpotsLeft(event);
              const isFull = spotsLeft !== null && spotsLeft <= 0;

              return (
                <div key={event.id}>
                  <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                      __html: toSafeJsonLd({
                        '@context': 'https://schema.org',
                        '@type': 'Event',
                        name: event.title,
                        description: event.description,
                        startDate: event.date,
                        location: {
                          '@type': 'Place',
                          name: event.location,
                        },
                        organizer: {
                          '@type': 'Organization',
                          name: 'Lions Club Meißner Land',
                        },
                      }),
                    }}
                  />
                <Card data-testid={`card-public-event-${event.id}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xl font-semibold">{event.title}</h3>
                            {isFull && <Badge variant="destructive">Ausgebucht</Badge>}
                          </div>
                          <p className="text-muted-foreground">{event.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap pt-1">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(event.date), "EEEE, dd. MMMM yyyy", { locale: de })}, {format(new Date(event.date), "HH:mm", { locale: de })}{(event as any).endDate ? ` – ${format(new Date((event as any).endDate), "HH:mm", { locale: de })}` : ""} Uhr
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 self-start">
                          {format(new Date(event.date), "dd. MMM", { locale: de })}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t flex-wrap">
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className="flex items-center gap-1.5" data-testid={`text-guests-${event.id}`}>
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{guests}</span>
                            <span className="text-muted-foreground">
                              {guests === 1 ? "Gast" : "Gäste"} angemeldet
                            </span>
                          </span>
                          {event.maxParticipants && spotsLeft !== null && !isFull && (
                            <span className="text-muted-foreground">
                              ({spotsLeft} {spotsLeft === 1 ? "Platz" : "Plätze"} frei)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(event as any).programPdf && (event as any).programPdfPublic && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              data-testid={`button-pdf-download-${event.id}`}
                            >
                              <a href={`/uploads/${(event as any).programPdf}`} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4 mr-1.5" />
                                Programm
                              </a>
                            </Button>
                          )}
                          <Button
                            onClick={() => handleOpenRegister(event.id)}
                            disabled={isFull || isAlreadyRegistered(event.id)}
                            variant={isAlreadyRegistered(event.id) ? "secondary" : "default"}
                            data-testid={`button-register-${event.id}`}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            {isFull ? "Ausgebucht" : isAlreadyRegistered(event.id) ? "Bereits angemeldet" : "Anmelden"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Newsletter sign-up banner */}
        <div className="mt-10 rounded-xl bg-muted/50 border p-8 text-center">
          <Mail className="h-10 w-10 mx-auto mb-3 text-primary opacity-80" />
          <h2 className="text-lg font-semibold mb-1">Bleiben Sie informiert</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Melden Sie sich für unseren Newsletter an und erhalten Sie Einladungen zu zukünftigen Veranstaltungen.
          </p>
          <Button onClick={handleOpenSubscribe} data-testid="button-subscribe-banner">
            <Mail className="h-4 w-4 mr-2" />
            Jetzt anmelden
          </Button>
        </div>

        {/* Event registration success dialog */}
        {successEvent && (
          <Dialog open={!!successEvent} onOpenChange={() => setSuccessEvent(null)}>
            <DialogContent className="sm:max-w-sm">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Erfolgreich angemeldet!</h3>
                <p className="text-sm text-muted-foreground">
                  Sie sind jetzt für &quot;{successEvent}&quot; registriert.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Event registration dialog */}
        <Dialog open={registerEventId !== null && !successEvent} onOpenChange={(open) => !open && setRegisterEventId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Anmeldung: {registerEvent?.title}</DialogTitle>
            </DialogHeader>
            {registerEvent && (
              <div className="space-y-4">
                <div className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="font-medium">{registerEvent.title}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {format(new Date(registerEvent.date), "EEEE, dd. MMMM yyyy", { locale: de })}, {format(new Date(registerEvent.date), "HH:mm", { locale: de })}{(registerEvent as any).endDate ? ` – ${format(new Date((registerEvent as any).endDate), "HH:mm", { locale: de })}` : ""} Uhr &middot; {registerEvent.location}
                  </p>
                </div>

                {portalSubscriber ? (
                  /* ── Quick-register for logged-in members ── */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                      <User className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">
                          {portalSubscriber.firstName} {portalSubscriber.lastName}
                        </p>
                        <p className="text-muted-foreground">{portalSubscriber.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Anzahl Personen (inkl. Sie)</label>
                      <Select value={quickGuestCount} onValueChange={setQuickGuestCount}>
                        <SelectTrigger data-testid="select-quick-guest-count">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} {n === 1 ? "Person" : "Personen"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full"
                      disabled={quickRegisterMutation.isPending}
                      onClick={() =>
                        quickRegisterMutation.mutate({
                          eventId: registerEventId!,
                          guestCount: parseInt(quickGuestCount, 10),
                        })
                      }
                      data-testid="button-quick-register"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {quickRegisterMutation.isPending ? "Wird angemeldet..." : "Jetzt verbindlich anmelden"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      Mit der Anmeldung stimmen Sie der Verarbeitung Ihrer Daten gemäß{" "}
                      <Link href="/datenschutz" className="underline hover:text-foreground" target="_blank">
                        Datenschutzerklärung
                      </Link>{" "}
                      zu.
                    </p>
                  </div>
                ) : (
                  /* ── Full form for guests ── */
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((values) =>
                        registerMutation.mutate({ ...values, eventId: registerEventId! })
                      )}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vorname *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Max" data-testid="input-reg-firstname" />
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
                              <FormLabel>Nachname *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Mustermann" data-testid="input-reg-lastname" />
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
                            <FormLabel>E-Mail-Adresse *</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="max@beispiel.de" data-testid="input-reg-email" />
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
                              <Input {...field} type="tel" placeholder="0123 456789" data-testid="input-reg-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guestCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Anzahl Personen (inkl. Sie)</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger data-testid="select-guest-count">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <SelectItem key={n} value={n.toString()}>
                                      {n} {n === 1 ? "Person" : "Personen"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                                  data-testid="checkbox-reg-consent"
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                Ich stimme zu, dass meine Daten zur Veranstaltungsanmeldung verarbeitet
                                werden (Art. 6 Abs. 1 lit. a DSGVO). Weitere Infos in der{" "}
                                <Link href="/datenschutz" className="underline hover:text-foreground" target="_blank">
                                  Datenschutzerklärung
                                </Link>. *
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                        data-testid="button-submit-registration"
                      >
                        {registerMutation.isPending ? "Wird angemeldet..." : "Verbindlich anmelden"}
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Newsletter subscribe dialog */}
        <Dialog open={showSubscribe} onOpenChange={(open) => { setShowSubscribe(open); if (!open) setSubscribeSuccess(false); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Newsletter abonnieren</DialogTitle>
            </DialogHeader>
            {subscribeSuccess ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Erfolgreich angemeldet!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sie erhalten künftig Einladungen zu unseren Veranstaltungen.<br />
                  Mit Ihrem Passwort können Sie sich jetzt unter{" "}
                  <Link href="/mein-bereich" onClick={() => setShowSubscribe(false)} className="underline font-medium text-foreground">
                    Mein Bereich
                  </Link>{" "}
                  anmelden.
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowSubscribe(false)} variant="outline" data-testid="button-subscribe-close">Schließen</Button>
                  <Link href="/mein-bereich">
                    <Button onClick={() => setShowSubscribe(false)} data-testid="button-go-to-portal">
                      <User className="h-4 w-4 mr-2" />
                      Mein Bereich
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Form {...subscribeForm}>
                <form
                  onSubmit={subscribeForm.handleSubmit((values) => subscribeMutation.mutate(values))}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Tragen Sie sich ein und bleiben Sie über kommende Veranstaltungen des Lions Club Meißner Land informiert.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={subscribeForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vorname *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Max" data-testid="input-sub-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={subscribeForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nachname *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Mustermann" data-testid="input-sub-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={subscribeForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail-Adresse *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="max@beispiel.de" data-testid="input-sub-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={subscribeForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefonnummer (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" placeholder="0123 456789" data-testid="input-sub-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Passwort für &quot;Mein Bereich&quot; (optional)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mit einem Passwort können Sie sich unter <strong>/mein-bereich</strong> anmelden und Ihre Anmeldungen einsehen.
                      </p>
                    </div>
                    <FormField
                      control={subscribeForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort (min. 6 Zeichen)</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" autoComplete="new-password" data-testid="input-sub-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={subscribeForm.control}
                      name="passwordConfirm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passwort bestätigen</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" autoComplete="new-password" data-testid="input-sub-password-confirm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={subscribeForm.control}
                    name="consent"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sub-consent"
                            />
                          </FormControl>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            Ich stimme zu, dass meine Daten zur Newsletter-Zusendung und
                            Veranstaltungsorganisation verarbeitet werden (Art. 6 Abs. 1 lit. a DSGVO).
                            Weitere Infos in der{" "}
                            <Link href="/datenschutz" className="underline hover:text-foreground" target="_blank">
                              Datenschutzerklärung
                            </Link>. *
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
                    data-testid="button-submit-subscribe"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {subscribeMutation.isPending ? "Wird angemeldet..." : "Newsletter abonnieren"}
                  </Button>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>

        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Lions Club Mei&szlig;ner Land</p>
          <p>Sebastian Schreiber &middot; Seestra&szlig;e 18e, 01640 Coswig</p>
          <p>
            <a href="tel:01723408543" className="hover:underline">0172 340 85 43</a>
            {" "}&middot;{" "}
            <a href="mailto:schreiber1988@gmx.net" className="hover:underline">schreiber1988@gmx.net</a>
          </p>
          <p className="pt-1">
            <Link href="/datenschutz" className="hover:underline">Datenschutzerklärung</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

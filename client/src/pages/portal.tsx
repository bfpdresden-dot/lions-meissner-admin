import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  User,
  LogIn,
  LogOut,
  Pencil,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Shield,
  ChevronLeft,
  KeyRound,
  Lock,
  Cake,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
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
  birthday: string | null;
  isMember: boolean;
  isActive: boolean;
  subscribedAt: string;
};

type InternalEvent = {
  id: number;
  title: string;
  date: string;
  endDate: string | null;
  location: string;
  description: string;
  agenda: string | null;
  maxParticipants: number | null;
};

type PortalRegistration = {
  id: number;
  eventId: number;
  guestCount: number;
  registeredAt: string;
  event: { id: number; title: string; date: string; location: string } | null;
};

const loginSchema = z.object({
  email: z.string().email("Gültige E-Mail erforderlich"),
  password: z.string().min(1, "Passwort erforderlich"),
});

const profileSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  newPasswordConfirm: z.string().optional(),
}).refine((d) => !d.newPassword || d.newPassword.length >= 6, {
  message: "Mindestens 6 Zeichen",
  path: ["newPassword"],
}).refine((d) => !d.newPassword || d.newPassword === d.newPasswordConfirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["newPasswordConfirm"],
});

type LoginValues = z.infer<typeof loginSchema>;
type ProfileValues = z.infer<typeof profileSchema>;

export default function PortalPage() {
  useEffect(() => {
    const prev = document.title;
    const prevDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    const prevCanonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
    document.title = "Mein Bereich | Lions Club Meißner Land";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "Ihr persönlicher Bereich beim Lions Club Meißner Land – Anmeldungen und Newsletter verwalten.");
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", window.location.origin + "/mein-bereich");
    return () => {
      document.title = prev;
      document.querySelector('meta[name="description"]')?.setAttribute("content", prevDesc);
      document.querySelector('link[rel="canonical"]')?.setAttribute("href", prevCanonical);
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();

  const { data: subscriber, isLoading, isError } = useQuery<PortalSubscriber>({
    queryKey: ["/api/portal/me"],
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { data: registrations, isLoading: regsLoading } = useQuery<PortalRegistration[]>({
    queryKey: ["/api/portal/registrations"],
    enabled: !!subscriber,
    retry: false,
    staleTime: 1000 * 60,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const res = await apiRequest("POST", "/api/portal/login", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/registrations"] });
    },
    onError: (err: Error) => {
      const msg = err.message.includes("401") || err.message.includes("403")
        ? "Ungültige Anmeldedaten oder kein Portal-Konto vorhanden"
        : err.message;
      loginForm.setError("root", { message: msg });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/portal/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/portal/me"], undefined);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/me"] });
      queryClient.removeQueries({ queryKey: ["/api/portal/registrations"] });
      setIsEditing(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileValues) => {
      const payload: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        birthday: data.birthday || "",
      };
      if (data.newPassword) {
        payload.currentPassword = data.currentPassword || "";
        payload.newPassword = data.newPassword;
      }
      const res = await apiRequest("PATCH", "/api/portal/me", payload);
      return res.json();
    },
    onSuccess: (updated: PortalSubscriber) => {
      queryClient.setQueryData(["/api/portal/me"], updated);
      setIsEditing(false);
      setShowPasswordChange(false);
      toast({ title: "Daten gespeichert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: subscriber?.firstName || "",
      lastName: subscriber?.lastName || "",
      phone: subscriber?.phone || "",
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  const { data: internalEvents } = useQuery<InternalEvent[]>({
    queryKey: ["/api/portal/events"],
    enabled: !!subscriber,
    retry: false,
    staleTime: 1000 * 60,
  });

  type BirthdayEntry = { id: number; name: string; birthday: string; nextBirthday: string; daysUntil: number };
  const { data: birthdays } = useQuery<BirthdayEntry[]>({
    queryKey: ["/api/birthdays"],
    enabled: !!subscriber,
    retry: false,
    staleTime: 1000 * 60,
  });

  const startEdit = () => {
    profileForm.reset({
      firstName: subscriber?.firstName || "",
      lastName: subscriber?.lastName || "",
      phone: subscriber?.phone || "",
      birthday: subscriber?.birthday || "",
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    });
    setShowPasswordChange(false);
    setIsEditing(true);
  };

  const upcomingRegs = (registrations || []).filter(
    (r) => r.event && new Date(r.event.date) >= new Date()
  ).sort((a, b) => new Date(a.event!.date).getTime() - new Date(b.event!.date).getTime());

  const pastRegs = (registrations || []).filter(
    (r) => !r.event || new Date(r.event.date) < new Date()
  ).sort((a, b) => new Date(b.event?.date || b.registeredAt).getTime() - new Date(a.event?.date || a.registeredAt).getTime());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-[hsl(220,40%,15%)] to-[hsl(220,50%,22%)] text-white">
        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col items-center text-center gap-4">
          <img src="/images/lions-logo.png" alt="Lions Club Logo" className="h-14 w-14 object-contain" />
          <div>
            <h1 className="text-2xl font-bold">Mein Bereich</h1>
            <p className="text-sm opacity-75 mt-0.5">Lions Club Meißner Land</p>
          </div>
          <Link href="/veranstaltungen">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück zu den Veranstaltungen
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !subscriber || isError ? (
          /* ── Login form ── */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Anmelden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Melden Sie sich mit der E-Mail-Adresse und dem Passwort an, das Sie bei der Newsletter-Anmeldung vergeben haben.
              </p>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit((v) => loginMutation.mutate(v))} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-Mail-Adresse</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" autoComplete="email" data-testid="input-portal-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passwort</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="current-password" data-testid="input-portal-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {loginForm.formState.errors.root && (
                    <p className="text-sm text-destructive" data-testid="text-portal-error">
                      {loginForm.formState.errors.root.message}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-portal-login">
                    <LogIn className="h-4 w-4 mr-2" />
                    {loginMutation.isPending ? "Wird angemeldet..." : "Anmelden"}
                  </Button>
                  <div className="text-center">
                    <Link href="/passwort-reset">
                      <Button variant="link" size="sm" className="text-muted-foreground text-xs h-auto p-0" data-testid="link-forgot-password">
                        Passwort vergessen?
                      </Button>
                    </Link>
                  </div>
                </form>
              </Form>
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Noch kein Konto?{" "}
                <Link href="/veranstaltungen" className="underline hover:text-foreground">
                  Melden Sie sich für den Newsletter an
                </Link>{" "}
                und vergeben Sie dabei ein Passwort.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* ── Logged in ── */
          <>
            {/* Profile card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Mein Profil
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {subscriber.isMember && (
                      <Badge className="bg-[hsl(220,40%,25%)] text-white gap-1">
                        <Shield className="h-3 w-3" />
                        Mitglied
                      </Badge>
                    )}
                    {!isEditing && (
                      <Button variant="outline" size="sm" onClick={startEdit} data-testid="button-edit-profile">
                        <Pencil className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      data-testid="button-portal-logout"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Abmelden
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vorname</FormLabel>
                              <FormControl><Input {...field} data-testid="input-profile-firstname" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nachname</FormLabel>
                              <FormControl><Input {...field} data-testid="input-profile-lastname" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormItem>
                        <FormLabel>E-Mail-Adresse</FormLabel>
                        <Input value={subscriber.email} disabled className="bg-muted" />
                      </FormItem>
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefon (optional)</FormLabel>
                            <FormControl><Input {...field} type="tel" data-testid="input-profile-phone" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="birthday"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geburtstag (optional)</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-profile-birthday" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!showPasswordChange ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasswordChange(true)}
                          data-testid="button-show-password-change"
                        >
                          <KeyRound className="h-4 w-4 mr-1" />
                          Passwort ändern
                        </Button>
                      ) : (
                        <div className="space-y-3 border rounded-md p-4 bg-muted/30">
                          <p className="text-sm font-medium">Passwort ändern</p>
                          <FormField
                            control={profileForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aktuelles Passwort</FormLabel>
                                <FormControl><Input {...field} type="password" data-testid="input-current-password" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Neues Passwort</FormLabel>
                                <FormControl><Input {...field} type="password" data-testid="input-new-password" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="newPasswordConfirm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Neues Passwort wiederholen</FormLabel>
                                <FormControl><Input {...field} type="password" data-testid="input-new-password-confirm" /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-profile">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {updateMutation.isPending ? "Wird gespeichert..." : "Speichern"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setShowPasswordChange(false); }}>
                          Abbrechen
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <dl className="space-y-3 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-28 text-muted-foreground shrink-0">Name</dt>
                      <dd className="font-medium" data-testid="text-profile-name">{subscriber.firstName} {subscriber.lastName}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 text-muted-foreground shrink-0">E-Mail</dt>
                      <dd data-testid="text-profile-email">{subscriber.email}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 text-muted-foreground shrink-0">Telefon</dt>
                      <dd data-testid="text-profile-phone">{subscriber.phone || <span className="text-muted-foreground italic">nicht angegeben</span>}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 text-muted-foreground shrink-0">Geburtstag</dt>
                      <dd data-testid="text-profile-birthday">
                        {subscriber.birthday
                          ? format(new Date(subscriber.birthday), "dd. MMMM", { locale: de })
                          : <span className="text-muted-foreground italic">nicht angegeben</span>}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 text-muted-foreground shrink-0">Dabei seit</dt>
                      <dd>{format(new Date(subscriber.subscribedAt), "dd. MMMM yyyy", { locale: de })}</dd>
                    </div>
                  </dl>
                )}
              </CardContent>
            </Card>

            {/* Birthdays card */}
            {birthdays && birthdays.length > 0 && (
              <Card className="border-pink-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-pink-700 text-base">
                    <Cake className="h-5 w-5" />
                    Geburtstage
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Nächste Geburtstage der Mitglieder</p>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {birthdays.map((b) => (
                      <div key={b.id} className="flex items-center justify-between py-2.5 gap-3" data-testid={`portal-birthday-${b.id}`}>
                        <div className="flex items-center gap-2">
                          <Cake className="h-4 w-4 text-pink-400 shrink-0" />
                          <span className="text-sm font-medium">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(b.nextBirthday + "T12:00:00"), "dd. MMMM", { locale: de })}</span>
                          {b.daysUntil === 0 ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-pink-100 text-pink-700">Heute 🎂</span>
                          ) : b.daysUntil <= 7 ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                              in {b.daysUntil} {b.daysUntil === 1 ? "Tag" : "Tagen"}
                            </span>
                          ) : (
                            <span className="text-xs opacity-50">in {b.daysUntil} Tagen</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal events card — only shown when there are internal events */}
            {internalEvents && internalEvents.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Lock className="h-5 w-5" />
                    Interne Veranstaltungen
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Nur für Mitglieder sichtbar</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...internalEvents]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((ev) => (
                        <div key={ev.id} className="rounded-md border border-amber-100 bg-amber-50/40 p-3 space-y-1" data-testid={`internal-event-${ev.id}`}>
                          <p className="font-medium text-sm">{ev.title}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(ev.date), "dd. MMMM yyyy, HH:mm", { locale: de })}
                              {ev.endDate && <> – {format(new Date(ev.endDate), "HH:mm", { locale: de })}</>} Uhr
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </span>
                            {ev.maxParticipants && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Max. {ev.maxParticipants} Personen
                              </span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{ev.description}</p>
                          )}
                          {ev.agenda && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <p className="text-xs font-semibold text-amber-800 mb-1">Tagesordnung</p>
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{ev.agenda}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Registrations card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Meine Veranstaltungsanmeldungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {regsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (registrations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Sie sind noch für keine Veranstaltung angemeldet.{" "}
                    <Link href="/veranstaltungen" className="underline hover:text-foreground">
                      Veranstaltungen ansehen
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-4">
                    {upcomingRegs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bevorstehend</p>
                        <div className="space-y-2">
                          {upcomingRegs.map((r) => (
                            <div key={r.id} className="flex items-start gap-3 p-3 rounded-md border bg-primary/5" data-testid={`reg-upcoming-${r.id}`}>
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{r.event?.title}</p>
                                {r.event && (
                                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(new Date(r.event.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {r.event.location}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                                <Users className="h-3 w-3" />
                                {r.guestCount} {r.guestCount === 1 ? "Person" : "Personen"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pastRegs.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vergangene</p>
                        <div className="space-y-2">
                          {pastRegs.map((r) => (
                            <div key={r.id} className="flex items-start gap-3 p-3 rounded-md border text-muted-foreground" data-testid={`reg-past-${r.id}`}>
                              <Calendar className="h-5 w-5 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground">{r.event?.title || "Veranstaltung nicht mehr verfügbar"}</p>
                                {r.event && (
                                  <p className="text-xs mt-0.5">
                                    {format(new Date(r.event.date), "dd. MMMM yyyy", { locale: de })} · {r.event.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Personal QR code card — only for members */}
            {subscriber.isMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode className="h-5 w-5" />
                    Mein Empfehlungs-QR-Code
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Teilen Sie diesen Code, um neue Newsletter-Abonnenten zu gewinnen.
                    Neue Anmeldungen werden Ihnen zugeordnet.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-xl border">
                    <QRCodeSVG
                      value={`${window.location.origin}/subscribe/member/${subscriber.id}`}
                      size={180}
                      level="M"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center break-all px-2">
                    {window.location.origin}/subscribe/member/{subscriber.id}
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/subscribe/member/${subscriber.id}`
                      );
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    data-testid="button-copy-referral-link"
                  >
                    {linkCopied ? (
                      <><Check className="h-4 w-4 mr-2 text-green-600" />Link kopiert!</>
                    ) : (
                      <><Copy className="h-4 w-4 mr-2" />Link kopieren</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

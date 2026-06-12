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
  FileText,
  Phone,
  Mail as MailIcon,
  Search,
  X,
  Send,
  Lightbulb,
  Zap,
  Minus,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

function fileUrl(filenameOrUrl: string): string {
  if (!filenameOrUrl) return "";
  if (filenameOrUrl.startsWith("http://") || filenameOrUrl.startsWith("https://")) return filenameOrUrl;
  return `/uploads/${filenameOrUrl}`;
}

function mapsUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
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
  programPdf: string | null;
  programPdfPublic: boolean;
  maxParticipants: number | null;
};

type PortalMember = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  birthday: string | null;
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
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<PortalMember | null>(null);
  // Quick register
  const [quickGuestCounts, setQuickGuestCounts] = useState<Record<number, number>>({});
  const [quickRegistered, setQuickRegistered] = useState<Set<number>>(new Set());
  // Contact form
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  // Proposal form
  const [proposalTitle, setProposalTitle] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [proposalCategory, setProposalCategory] = useState("");
  const [proposalSent, setProposalSent] = useState(false);
  const [proposalSending, setProposalSending] = useState(false);
  // KI-E-Mail (members only)
  const [memberEmailRecipient, setMemberEmailRecipient] = useState<"all" | string>("all");
  const [memberEmailSubject, setMemberEmailSubject] = useState("");
  const [memberEmailBody, setMemberEmailBody] = useState("");
  const [memberEmailSent, setMemberEmailSent] = useState(false);
  const [memberEmailSending, setMemberEmailSending] = useState(false);
  const [memberAiOpen, setMemberAiOpen] = useState(false);
  const [memberAiPrompt, setMemberAiPrompt] = useState("");
  const [memberAiStyle, setMemberAiStyle] = useState("kollegial");
  const [memberAiLoading, setMemberAiLoading] = useState(false);
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

  const { data: publicEvents } = useQuery<{ id: number; title: string; date: string; endDate: string | null; location: string; maxParticipants: number | null; isActive: boolean }[]>({
    queryKey: ["/api/events"],
    enabled: !!subscriber,
    staleTime: 1000 * 60,
  });

  const { data: guestCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/registrations/counts"],
    enabled: !!subscriber,
    staleTime: 1000 * 60,
  });

  const { data: internalEvents } = useQuery<InternalEvent[]>({
    queryKey: ["/api/portal/events"],
    enabled: !!subscriber,
    retry: false,
    staleTime: 1000 * 60,
  });

  const { data: portalMembers } = useQuery<PortalMember[]>({
    queryKey: ["/api/portal/members"],
    enabled: !!subscriber?.isMember,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  type BirthdayEntry = { id: number; name: string; birthday: string; nextBirthday: string; daysUntil: number };
  const { data: birthdays } = useQuery<BirthdayEntry[]>({
    queryKey: ["/api/birthdays"],
    enabled: !!subscriber,
    retry: false,
    staleTime: 1000 * 60,
  });

  const quickRegisterMutation = useMutation({
    mutationFn: async ({ eventId, guestCount }: { eventId: number; guestCount: number }) => {
      if (!subscriber) throw new Error("Nicht angemeldet");
      const res = await apiRequest("POST", "/api/registrations", {
        eventId,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        email: subscriber.email,
        phone: subscriber.phone || "",
        guestCount,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/registrations"] });
      setQuickRegistered((prev) => new Set([...prev, vars.eventId]));
      toast({ title: "Erfolgreich angemeldet!" });
    },
    onError: (err: Error) => {
      if (err.message.includes("409")) {
        toast({ title: "Bereits angemeldet", description: "Sie sind schon für diese Veranstaltung registriert.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: "Anmeldung nicht möglich.", variant: "destructive" });
      }
    },
  });

  const handleMemberAiGenerate = async () => {
    if (!memberAiPrompt.trim()) return;
    setMemberAiLoading(true);
    try {
      const res = await apiRequest("POST", "/api/portal/generate-email", {
        prompt: memberAiPrompt,
        subject: memberEmailSubject,
        style: memberAiStyle,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      setMemberEmailBody(data.text);
      setMemberAiOpen(false);
    } catch (err: any) {
      toast({ title: "KI-Fehler", description: err.message, variant: "destructive" });
    } finally {
      setMemberAiLoading(false);
    }
  };

  const handleMemberEmailSend = async () => {
    if (!memberEmailSubject.trim() || !memberEmailBody.trim()) {
      toast({ title: "Bitte Betreff und Nachricht ausfüllen", variant: "destructive" });
      return;
    }
    setMemberEmailSending(true);
    try {
      const payload: { subject: string; body: string; memberIds?: number[] } = {
        subject: memberEmailSubject,
        body: memberEmailBody,
      };
      if (memberEmailRecipient !== "all") {
        payload.memberIds = [parseInt(memberEmailRecipient, 10)];
      }
      await apiRequest("POST", "/api/portal/send-member-email", payload);
      setMemberEmailSent(true);
      setMemberEmailSubject("");
      setMemberEmailBody("");
      setMemberAiPrompt("");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message || "E-Mail konnte nicht gesendet werden.", variant: "destructive" });
    } finally {
      setMemberEmailSending(false);
    }
  };

  const handleContact = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast({ title: "Bitte Betreff und Nachricht ausfüllen", variant: "destructive" });
      return;
    }
    setContactSending(true);
    try {
      await apiRequest("POST", "/api/portal/contact", { subject: contactSubject, message: contactMessage });
      setContactSent(true);
      setContactSubject("");
      setContactMessage("");
    } catch {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    } finally {
      setContactSending(false);
    }
  };

  const handleProposal = async () => {
    if (!proposalTitle.trim() || !proposalDescription.trim()) {
      toast({ title: "Bitte Titel und Beschreibung ausfüllen", variant: "destructive" });
      return;
    }
    setProposalSending(true);
    try {
      await apiRequest("POST", "/api/portal/proposal", { title: proposalTitle, description: proposalDescription, category: proposalCategory });
      setProposalSent(true);
      setProposalTitle("");
      setProposalDescription("");
      setProposalCategory("");
    } catch {
      toast({ title: "Fehler", description: "Vorschlag konnte nicht gesendet werden.", variant: "destructive" });
    } finally {
      setProposalSending(false);
    }
  };

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
          <Link href="/">
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
                <Link href="/" className="underline hover:text-foreground">
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
                              <a href={mapsUrl(ev.location)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">{ev.location}</a>
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
                          {ev.programPdf && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <a
                                href={fileUrl(ev.programPdf ?? "")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Programm herunterladen (PDF)
                              </a>
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
                    <Link href="/" className="underline hover:text-foreground">
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
                                      <a href={mapsUrl(r.event.location)} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">{r.event.location}</a>
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

            {/* ── 1-Klick-Anmeldung ── */}
            {(() => {
              const registeredEventIds = new Set((registrations || []).map((r) => r.eventId));
              const upcoming = (publicEvents || [])
                .filter((e) => e.isActive && new Date(e.date) >= new Date())
                .filter((e) => !registeredEventIds.has(e.id) && !quickRegistered.has(e.id))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              if (!upcoming.length) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-5 w-5 text-amber-500" />
                      1-Klick-Anmeldung
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Ihre Daten sind bereits hinterlegt — einfach Personenzahl wählen und anmelden.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcoming.map((ev) => {
                      const taken = guestCounts?.[String(ev.id)] ?? 0;
                      const spotsLeft = ev.maxParticipants ? ev.maxParticipants - taken : null;
                      const isFull = spotsLeft !== null && spotsLeft <= 0;
                      const count = quickGuestCounts[ev.id] ?? 1;
                      return (
                        <div key={ev.id} className="rounded-md border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-testid={`quick-reg-${ev.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{ev.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3 shrink-0" />
                              {format(new Date(ev.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                              <span className="mx-1">·</span>
                              <MapPin className="h-3 w-3 shrink-0" />
                              {ev.location}
                            </p>
                            {spotsLeft !== null && (
                              <p className="text-xs mt-0.5">
                                {isFull
                                  ? <span className="text-destructive font-medium">Ausgebucht</span>
                                  : <span className="text-muted-foreground">{spotsLeft} {spotsLeft === 1 ? "Platz" : "Plätze"} frei</span>}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center border rounded-md overflow-hidden">
                              <button
                                className="px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                onClick={() => setQuickGuestCounts((p) => ({ ...p, [ev.id]: Math.max(1, count - 1) }))}
                                disabled={count <= 1}
                                data-testid={`button-qr-dec-${ev.id}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="px-3 text-sm font-medium select-none w-8 text-center">{count}</span>
                              <button
                                className="px-2 py-1.5 hover:bg-muted transition-colors disabled:opacity-40"
                                onClick={() => setQuickGuestCounts((p) => ({ ...p, [ev.id]: Math.min(10, count + 1) }))}
                                disabled={count >= 10}
                                data-testid={`button-qr-inc-${ev.id}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => quickRegisterMutation.mutate({ eventId: ev.id, guestCount: count })}
                              disabled={isFull || quickRegisterMutation.isPending}
                              data-testid={`button-quick-reg-${ev.id}`}
                            >
                              <Zap className="h-3.5 w-3.5 mr-1.5" />
                              {isFull ? "Ausgebucht" : "Anmelden"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Persönlicher Empfehlungs-QR-Code (alle Abonnenten) ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode className="h-5 w-5" />
                  Mein Empfehlungs-QR-Code
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Teilen Sie diesen Link, damit Freunde den Newsletter abonnieren — neue Anmeldungen werden Ihnen zugeordnet.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl border">
                  <QRCodeSVG
                    value={`${window.location.origin}/subscribe/member/${subscriber.id}`}
                    size={160}
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
                    navigator.clipboard.writeText(`${window.location.origin}/subscribe/member/${subscriber.id}`);
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

            {/* ── E-Mail an Club ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MailIcon className="h-5 w-5" />
                  E-Mail an den Club schreiben
                </CardTitle>
                <p className="text-xs text-muted-foreground">Ihre Nachricht wird direkt an die Clubleitung weitergeleitet.</p>
              </CardHeader>
              <CardContent>
                {contactSent ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-medium">Nachricht gesendet!</p>
                    <p className="text-sm text-muted-foreground">Die Clubleitung wird sich bei Ihnen melden.</p>
                    <Button variant="outline" size="sm" onClick={() => setContactSent(false)} data-testid="button-contact-reset">
                      Weitere Nachricht schreiben
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Betreff</label>
                      <Input
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="z.B. Frage zur Veranstaltung"
                        data-testid="input-contact-subject"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nachricht</label>
                      <Textarea
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Ihre Nachricht..."
                        rows={4}
                        data-testid="textarea-contact-message"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleContact}
                      disabled={contactSending || !contactSubject.trim() || !contactMessage.trim()}
                      data-testid="button-contact-send"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {contactSending ? "Wird gesendet..." : "Nachricht senden"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Projektvorschlag ── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Projektvorschlag einreichen
                </CardTitle>
                <p className="text-xs text-muted-foreground">Haben Sie eine Idee für ein Lions-Projekt oder eine Aktion? Teilen Sie sie mit uns!</p>
              </CardHeader>
              <CardContent>
                {proposalSent ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-medium">Vorschlag eingereicht!</p>
                    <p className="text-sm text-muted-foreground">Vielen Dank für Ihre Idee. Wir werden sie im Club besprechen.</p>
                    <Button variant="outline" size="sm" onClick={() => setProposalSent(false)} data-testid="button-proposal-reset">
                      Weiteren Vorschlag einreichen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Projekttitel *</label>
                      <Input
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                        placeholder="z.B. Schulbücher für Kinder in der Region"
                        data-testid="input-proposal-title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Kategorie (optional)</label>
                      <Input
                        value={proposalCategory}
                        onChange={(e) => setProposalCategory(e.target.value)}
                        placeholder="z.B. Bildung, Soziales, Umwelt, Gesundheit..."
                        data-testid="input-proposal-category"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Beschreibung *</label>
                      <Textarea
                        value={proposalDescription}
                        onChange={(e) => setProposalDescription(e.target.value)}
                        placeholder="Beschreiben Sie Ihre Idee: Was soll erreicht werden? Wer profitiert davon? Wie könnte es umgesetzt werden?"
                        rows={5}
                        data-testid="textarea-proposal-description"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleProposal}
                      disabled={proposalSending || !proposalTitle.trim() || !proposalDescription.trim()}
                      data-testid="button-proposal-submit"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      {proposalSending ? "Wird eingereicht..." : "Vorschlag einreichen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── KI-E-Mail an Mitglieder (nur für Mitglieder) ── */}
            {subscriber.isMember && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    E-Mail an Mitglieder schreiben
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Mit KI-Unterstützung — nur für Mitglieder</p>
                </CardHeader>
                <CardContent>
                  {memberEmailSent ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                      <p className="font-medium">E-Mail gesendet!</p>
                      <p className="text-sm text-muted-foreground">Ihre Nachricht wurde erfolgreich zugestellt.</p>
                      <Button variant="outline" size="sm" onClick={() => { setMemberEmailSent(false); setMemberEmailRecipient("all"); }} data-testid="button-member-email-reset">
                        Weitere E-Mail schreiben
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Recipient */}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Empfänger</label>
                        <Select value={memberEmailRecipient} onValueChange={setMemberEmailRecipient}>
                          <SelectTrigger data-testid="select-member-email-recipient">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Alle Mitglieder</SelectItem>
                            {(portalMembers || [])
                              .filter((m) => m.id !== subscriber.id)
                              .map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {m.firstName} {m.lastName}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* AI assistant panel */}
                      <div className="rounded-lg border border-violet-200 bg-violet-50/50">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-violet-700"
                          onClick={() => setMemberAiOpen((v) => !v)}
                          data-testid="button-toggle-member-ai"
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            KI-Assistent — Text generieren lassen
                          </span>
                          {memberAiOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {memberAiOpen && (
                          <div className="px-3 pb-3 space-y-2 border-t border-violet-200 pt-3">
                            <p className="text-xs text-muted-foreground">
                              Beschreiben Sie kurz, was die E-Mail enthalten soll — die KI erstellt den Text auf Deutsch.
                            </p>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Schreibstil</label>
                              <Select value={memberAiStyle} onValueChange={setMemberAiStyle}>
                                <SelectTrigger className="h-8 text-xs" data-testid="select-member-ai-style">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="formell">Formell (per Sie)</SelectItem>
                                  <SelectItem value="freundlich">Freundlich (per Sie)</SelectItem>
                                  <SelectItem value="kollegial">Kollegial (per Du)</SelectItem>
                                  <SelectItem value="locker">Locker &amp; herzlich (per Du)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Textarea
                              placeholder="z.B. Einladung zum nächsten Treffen mit Bitte um Rückmeldung"
                              value={memberAiPrompt}
                              onChange={(e) => setMemberAiPrompt(e.target.value)}
                              rows={3}
                              data-testid="textarea-member-ai-prompt"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full"
                              disabled={!memberAiPrompt.trim() || memberAiLoading}
                              onClick={handleMemberAiGenerate}
                              data-testid="button-member-ai-generate"
                            >
                              {memberAiLoading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generiere…</>
                              ) : (
                                <><Sparkles className="h-4 w-4 mr-2" />Text generieren</>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Subject + body */}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Betreff</label>
                        <Input
                          value={memberEmailSubject}
                          onChange={(e) => setMemberEmailSubject(e.target.value)}
                          placeholder="z.B. Einladung zur nächsten Clubveranstaltung"
                          data-testid="input-member-email-subject"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Nachricht</label>
                        <Textarea
                          value={memberEmailBody}
                          onChange={(e) => setMemberEmailBody(e.target.value)}
                          placeholder={"Hallo {{Vorname}},\n\n..."}
                          rows={7}
                          data-testid="textarea-member-email-body"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Tipp: <code className="bg-muted px-1 rounded">{"{{Vorname}}"}</code> wird automatisch durch den Vornamen ersetzt.
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleMemberEmailSend}
                        disabled={memberEmailSending || !memberEmailSubject.trim() || !memberEmailBody.trim()}
                        data-testid="button-member-email-send"
                      >
                        {memberEmailSending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Wird gesendet…</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />E-Mail senden</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Member directory — only for members */}
            {subscriber.isMember && portalMembers && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5" />
                    Mitgliederliste
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Nur für Mitglieder sichtbar</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Name suchen…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-9 pr-9 h-9 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      data-testid="input-member-search"
                    />
                    {memberSearch && (
                      <button onClick={() => setMemberSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {/* List */}
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {portalMembers
                      .filter((m) =>
                        `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMember(m)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                          data-testid={`button-member-${m.id}`}
                        >
                          <div className="h-9 w-9 rounded-full bg-[#1a3a5c]/10 flex items-center justify-center shrink-0 text-[#1a3a5c] font-semibold text-sm">
                            {m.firstName[0]}{m.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{m.firstName} {m.lastName}</p>
                            {m.phone && <p className="text-xs text-muted-foreground truncate">{m.phone}</p>}
                          </div>
                          {m.phone && <Phone className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </button>
                      ))
                    }
                    {portalMembers.filter((m) =>
                      `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Kein Mitglied gefunden</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{portalMembers.length} Mitglieder gesamt</p>
                </CardContent>
              </Card>
            )}

            {/* Member detail dialog */}
            {selectedMember && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setSelectedMember(null)}>
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-[#1a3a5c]/10 flex items-center justify-center text-[#1a3a5c] font-bold text-xl shrink-0">
                      {selectedMember.firstName[0]}{selectedMember.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-lg leading-tight">{selectedMember.firstName} {selectedMember.lastName}</p>
                      <Badge className="mt-1 bg-[#1a3a5c] text-white text-xs hover:bg-[#1a3a5c]">
                        <Shield className="h-3 w-3 mr-1" />Mitglied
                      </Badge>
                    </div>
                  </div>

                  {/* Contact rows */}
                  <div className="rounded-lg border divide-y text-sm">
                    {selectedMember.phone ? (
                      <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground mb-2">Telefon</p>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${selectedMember.phone}`}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#1a3a5c] text-white text-sm font-medium hover:bg-[#1a3a5c]/90 transition-colors"
                            data-testid={`link-call-${selectedMember.id}`}
                          >
                            <Phone className="h-4 w-4" />
                            Anrufen
                          </a>
                          <a
                            href={`https://wa.me/${selectedMember.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                            data-testid={`link-whatsapp-member-${selectedMember.id}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">{selectedMember.phone}</p>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-muted-foreground italic text-sm">Keine Telefonnummer hinterlegt</div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <MailIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedMember.email}`} className="text-sm text-[#1a3a5c] hover:underline truncate">{selectedMember.email}</a>
                    </div>
                    {selectedMember.birthday && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Cake className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm">{format(new Date(selectedMember.birthday), "dd. MMMM yyyy", { locale: de })}</span>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => setSelectedMember(null)} data-testid="button-close-member-detail">
                    Schließen
                  </Button>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

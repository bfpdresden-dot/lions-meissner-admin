import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Download, Trash2, UserX, UserCheck, Star, KeyRound, Pencil, UserPlus, Clock, Send, Sparkles, ChevronDown, ChevronUp, User, Phone, Calendar, Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Subscriber, Event, EmailLog } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const portalPasswordSchema = z
  .object({
    password: z.string().min(6, "Mindestens 6 Zeichen"),
    passwordConfirm: z.string().min(1, "Passwort bestätigen"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });
type PortalPasswordValues = z.infer<typeof portalPasswordSchema>;

const editSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  phone: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

export default function SubscribersPage() {
  const [portalPasswordSub, setPortalPasswordSub] = useState<Subscriber | null>(null);
  const [editSub, setEditSub] = useState<Subscriber | null>(null);
  const [journalSub, setJournalSub] = useState<Subscriber | null>(null);
  const [detailSub, setDetailSub] = useState<Subscriber | null>(null);
  const [emailTarget, setEmailTarget] = useState<Subscriber | "all" | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("formell");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEventId, setAiEventId] = useState("none");
  const { toast } = useToast();

  const { data: subscribers, isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: members } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Status aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isActive: true, confirmToken: null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Abonnent aktiviert", description: "Person erscheint jetzt in der Abonnentenliste." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditValues }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      setEditSub(null);
      toast({ title: "Daten aktualisiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const memberMutation = useMutation({
    mutationFn: async ({ id, isMember }: { id: number; isMember: boolean }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isMember });
      return res.json();
    },
    onSuccess: (_data, { isMember }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: isMember ? "Als Mitglied markiert" : "Mitglied-Status entfernt",
        description: isMember ? "Person erscheint nun in der Mitgliederliste." : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const setPortalPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("POST", `/api/subscribers/${id}/set-portal-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      setPortalPasswordSub(null);
      toast({ title: "Portal-Passwort gesetzt", description: "Person kann sich jetzt unter /mein-bereich anmelden." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subscribers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Eintrag gelöscht" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const { data: journalLogs, isLoading: journalLoading } = useQuery<EmailLog[]>({
    queryKey: ["/api/subscribers", journalSub?.id, "email-logs"],
    enabled: journalSub !== null,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ subscriberIds, subject, body }: { subscriberIds?: number[]; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/subscribers/send-email", { subscriberIds, subject, body });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Senden");
      }
      return res.json() as Promise<{ sent: number; failed: number }>;
    },
    onSuccess: (data) => {
      toast({
        title: "E-Mail gesendet",
        description: `${data.sent} erfolgreich${data.failed > 0 ? `, ${data.failed} fehlgeschlagen` : ""}`,
      });
      setEmailTarget(null);
      setEmailSubject("");
      setEmailBody("");
      setAiOpen(false);
      setAiPrompt("");
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      const res = await fetch("/api/subscribers/export");
      if (!res.ok) throw new Error("Export fehlgeschlagen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `abonnenten_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export erfolgreich", description: "CSV-Datei wurde heruntergeladen." });
    } catch {
      toast({ title: "Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  };

  const getSource = (sub: Subscriber) => {
    if (sub.eventId && events) {
      const event = events.find((e) => e.id === sub.eventId);
      return event?.title || "-";
    }
    if ((sub as any).referredByMemberId && members) {
      const member = members.find((m) => m.id === (sub as any).referredByMemberId);
      if (member) return `${member.firstName} ${member.lastName}`;
    }
    return "-";
  };

  const allSorted = [...(subscribers || [])].sort(
    (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
  );

  // Active confirmed subscribers
  const confirmedSubscribers = allSorted.filter((s) => s.isActive);

  // Pending: not yet active (opt-in pending OR event-only registrations)
  const pendingSubscribers = allSorted.filter((s) => !s.isActive);

  const pendingCount = pendingSubscribers.length;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-subscribers-title">Abonnenten</h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Newsletter-Abonnenten</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={!confirmedSubscribers.length}
              data-testid="button-export-subscribers"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setEmailTarget("all"); setEmailSubject(""); setEmailBody(""); setAiOpen(false); setAiPrompt(""); }}
              disabled={!confirmedSubscribers.length}
              data-testid="button-email-all-subscribers"
            >
              <Mail className="h-4 w-4 mr-2" />
              E-Mail an alle
            </Button>
          </div>
        </div>

        <Tabs defaultValue="subscribers">
          <TabsList>
            <TabsTrigger value="subscribers" data-testid="tab-subscribers">
              Abonnenten
              {confirmedSubscribers.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{confirmedSubscribers.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Registrierung
              {pendingCount > 0 && (
                <Badge variant="outline" className="ml-2 text-xs border-amber-400 text-amber-600 bg-amber-50">{pendingCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Abonnenten Tab ── */}
          <TabsContent value="subscribers" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : confirmedSubscribers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">Keine Abonnenten</h3>
                  <p className="text-muted-foreground">Erstellen Sie einen QR-Code für eine Veranstaltung, um Newsletter-Abonnenten zu gewinnen.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Quelle</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Mitglied</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {confirmedSubscribers.map((sub) => (
                        <TableRow key={sub.id} data-testid={`row-subscriber-${sub.id}`}>
                          <TableCell className="font-medium">
                            <button
                              className="hover:underline text-left focus:outline-none text-[#1a3a5c]"
                              onClick={() => setDetailSub(sub)}
                              data-testid={`button-detail-${sub.id}`}
                            >
                              {sub.firstName} {sub.lastName}
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{sub.email}</TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{getSource(sub)}</span></TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(sub.subscribedAt), "dd.MM.yyyy", { locale: de })}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => memberMutation.mutate({ id: sub.id, isMember: !sub.isMember })}
                              title={sub.isMember ? "Mitglied-Status entfernen" : "Als Mitglied markieren"}
                              data-testid={`button-member-${sub.id}`}
                              className="p-1 rounded hover:bg-muted transition-colors"
                            >
                              <Star className={`h-4 w-4 transition-colors ${sub.isMember ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => { setEmailTarget(sub); setEmailSubject(""); setEmailBody(""); setAiOpen(false); setAiPrompt(""); }} title="E-Mail senden" data-testid={`button-email-subscriber-${sub.id}`}>
                                <Mail className="h-4 w-4" />
                              </Button>
                              {/* Portal password */}
                              <Dialog open={portalPasswordSub?.id === sub.id} onOpenChange={(open) => !open && setPortalPasswordSub(null)}>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => setPortalPasswordSub(sub)} title={sub.passwordHash ? "Portal-Passwort ändern" : "Portal-Passwort vergeben"} data-testid={`button-portal-password-sub-${sub.id}`}>
                                    <KeyRound className={`h-4 w-4 ${sub.passwordHash ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Portal-Passwort für {sub.firstName} {sub.lastName}</DialogTitle>
                                  </DialogHeader>
                                  <p className="text-sm text-muted-foreground">Person kann sich damit unter <strong>/mein-bereich</strong> anmelden.</p>
                                  {portalPasswordSub?.id === sub.id && (
                                    <PortalPasswordForm onSubmit={(data) => setPortalPasswordMutation.mutate({ id: sub.id, password: data.password })} isPending={setPortalPasswordMutation.isPending} />
                                  )}
                                </DialogContent>
                              </Dialog>

                              <Button size="icon" variant="ghost" onClick={() => toggleMutation.mutate({ id: sub.id, isActive: false })} title="Deaktivieren" data-testid={`button-toggle-subscriber-${sub.id}`}>
                                <UserX className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-delete-subscriber-${sub.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Abonnent löschen?</AlertDialogTitle>
                                    <AlertDialogDescription>Möchten Sie {sub.firstName} {sub.lastName} wirklich löschen?</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(sub.id)}>Löschen</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Registrierung Tab ── */}
          <TabsContent value="pending" className="mt-4">
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : pendingSubscribers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-1">Keine ausstehenden Registrierungen</h3>
                  <p className="text-muted-foreground">Alle Registrierungen wurden bestätigt oder es gibt keine neuen Anmeldungen.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Personen die sich für eine Veranstaltung angemeldet haben oder den Opt-in-Link noch nicht bestätigt haben. Mit <strong>Aktivieren</strong> werden Sie direkt als Abonnent aufgenommen.
                </p>
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Quelle</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingSubscribers.map((sub) => (
                          <TableRow key={sub.id} data-testid={`row-pending-${sub.id}`}>
                            <TableCell className="font-medium">{sub.firstName} {sub.lastName}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{sub.email}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{sub.phone || "–"}</TableCell>
                            <TableCell><span className="text-sm text-muted-foreground">{getSource(sub)}</span></TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(sub.subscribedAt), "dd.MM.yyyy", { locale: de })}
                            </TableCell>
                            <TableCell>
                              {(sub as any).confirmToken ? (
                                <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 whitespace-nowrap">Opt-in ausstehend</Badge>
                              ) : (
                                <Badge variant="secondary">Inaktiv</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Edit */}
                                <Dialog open={editSub?.id === sub.id} onOpenChange={(open) => !open && setEditSub(null)}>
                                  <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => setEditSub(sub)} title="Bearbeiten" data-testid={`button-edit-pending-${sub.id}`}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Daten bearbeiten</DialogTitle>
                                    </DialogHeader>
                                    {editSub?.id === sub.id && (
                                      <EditForm
                                        sub={sub}
                                        onSubmit={(data) => editMutation.mutate({ id: sub.id, data })}
                                        isPending={editMutation.isPending}
                                      />
                                    )}
                                  </DialogContent>
                                </Dialog>

                                {/* Activate */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => activateMutation.mutate(sub.id)}
                                  title="Als Abonnent aktivieren"
                                  data-testid={`button-activate-pending-${sub.id}`}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>

                                {/* Delete */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" data-testid={`button-delete-pending-${sub.id}`}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                                      <AlertDialogDescription>Möchten Sie {sub.firstName} {sub.lastName} wirklich löschen?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteMutation.mutate(sub.id)}>Löschen</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit dialog (shared state) */}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailSub !== null} onOpenChange={(open) => !open && setDetailSub(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#1a3a5c]" />
              {detailSub?.firstName} {detailSub?.lastName}
            </DialogTitle>
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4 pt-1">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {detailSub.isActive
                  ? <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-100">Aktiv</Badge>
                  : <Badge variant="secondary">Inaktiv</Badge>
                }
                {detailSub.isMember && (
                  <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-100">
                    <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />Mitglied
                  </Badge>
                )}
                {(detailSub as any).isAdmin && (
                  <Badge className="bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-100">
                    <Shield className="h-3 w-3 mr-1" />Administrator
                  </Badge>
                )}
                {detailSub.passwordHash && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                    <Lock className="h-3 w-3 mr-1" />Portal-Zugang
                  </Badge>
                )}
              </div>

              {/* Data rows */}
              <div className="rounded-lg border divide-y text-sm">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">E-Mail</p>
                    <p className="font-medium">{detailSub.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefon</p>
                    {detailSub.phone
                      ? <div className="flex items-center gap-2 flex-wrap">
                          <a href={`tel:${detailSub.phone}`} className="font-medium text-[#1a3a5c] hover:underline">{detailSub.phone}</a>
                          <a
                            href={`https://wa.me/${detailSub.phone.replace(/[^0-9+]/g, "").replace(/^\+/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium"
                            data-testid={`link-whatsapp-${detailSub.id}`}
                          >
                            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </a>
                        </div>
                      : <span className="text-muted-foreground italic">nicht angegeben</span>
                    }
                  </div>
                </div>
                {(detailSub as any).birthday && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Geburtstag</p>
                      <p className="font-medium">{format(new Date((detailSub as any).birthday), "dd. MMMM yyyy", { locale: de })}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Angemeldet am</p>
                    <p className="font-medium">{format(new Date(detailSub.subscribedAt), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}</p>
                  </div>
                </div>
                {getSource(detailSub) !== "-" && (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quelle</p>
                      <p className="font-medium">{getSource(detailSub)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setDetailSub(null); setEmailTarget(detailSub); setEmailSubject(""); setEmailBody(""); setAiOpen(false); setAiPrompt(""); }}
                  data-testid={`button-detail-email-${detailSub.id}`}
                >
                  <Mail className="h-4 w-4 mr-2" />E-Mail senden
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setDetailSub(null); setEditSub(detailSub); }}
                    data-testid={`button-detail-edit-${detailSub.id}`}
                  >
                    <Pencil className="h-4 w-4 mr-2" />Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setDetailSub(null); setJournalSub(detailSub); }}
                    data-testid={`button-detail-journal-${detailSub.id}`}
                  >
                    <Clock className="h-4 w-4 mr-2" />E-Mail-Journal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Journal Dialog */}
      <Dialog open={journalSub !== null} onOpenChange={(open) => !open && setJournalSub(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-Mail-Journal: {journalSub?.firstName} {journalSub?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-sm text-muted-foreground">{journalSub?.email}</p>
            {journalLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !journalLogs || journalLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Mail className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
                <p className="text-sm font-medium">Noch keine E-Mails gesendet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  E-Mails die über „E-Mail senden" verschickt werden, erscheinen hier.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {journalLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-md border p-3 text-sm ${log.success ? "border-border bg-muted/30" : "border-red-200 bg-red-50"}`}
                    data-testid={`journal-entry-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{log.subject}</p>
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${log.success ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {log.success ? "Gesendet" : "Fehlgeschlagen"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.sentAt), "dd. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                    </p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {journalLogs.length} {journalLogs.length === 1 ? "E-Mail" : "E-Mails"} insgesamt
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* E-Mail Dialog */}
      <Dialog open={emailTarget !== null} onOpenChange={(open) => !open && setEmailTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {emailTarget === "all"
                ? `E-Mail an alle Abonnenten (${confirmedSubscribers.length} aktiv)`
                : emailTarget
                ? `E-Mail an ${(emailTarget as Subscriber).firstName} ${(emailTarget as Subscriber).lastName}`
                : "E-Mail senden"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {/* KI-Assistent */}
            <div className="rounded-lg border border-primary/30 bg-primary/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-primary"
                onClick={() => setAiOpen((v) => !v)}
                data-testid="button-toggle-ai-sub"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  KI-Assistent — Text generieren lassen
                </span>
                {aiOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {aiOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-primary/20 pt-3">
                  <p className="text-xs text-muted-foreground">
                    Beschreiben Sie kurz, was die E-Mail enthalten soll — die KI erstellt den Text auf Deutsch.
                  </p>
                  {events && events.filter((e) => new Date(e.date) >= new Date()).length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Veranstaltungsbezug (optional)</label>
                      <Select value={aiEventId} onValueChange={(val) => {
                        setAiEventId(val);
                        if (val && val !== "none") {
                          const ev = events.find((e) => String(e.id) === val);
                          if (ev && !emailSubject.trim()) setEmailSubject(`Einladung: ${ev.title}`);
                        }
                      }}>
                        <SelectTrigger className="h-8 text-xs" data-testid="select-ai-event-sub">
                          <SelectValue placeholder="Veranstaltung auswählen…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein Bezug</SelectItem>
                          {events.filter((e) => new Date(e.date) >= new Date()).map((ev) => (
                            <SelectItem key={ev.id} value={String(ev.id)}>
                              {format(new Date(ev.date), "dd.MM.yy", { locale: de })} · {ev.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Schreibstil</label>
                    <Select value={aiStyle} onValueChange={setAiStyle}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-ai-style-sub">
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
                    placeholder="z.B. Einladung mit Bitte um Rückmeldung bis zum 5. Juli"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    data-testid="input-ai-prompt-sub"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!aiPrompt.trim() || aiLoading}
                    onClick={async () => {
                      const selectedEvent = aiEventId && aiEventId !== "none"
                        ? events?.find((e) => String(e.id) === aiEventId)
                        : null;
                      const eventContext = selectedEvent
                        ? `\n\nVeranstaltungsdetails:\n- Titel: ${selectedEvent.title}\n- Datum: ${format(new Date(selectedEvent.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr\n- Ort: ${selectedEvent.location}${selectedEvent.description ? `\n- Beschreibung: ${selectedEvent.description}` : ""}`
                        : "";
                      setAiLoading(true);
                      try {
                        const res = await fetch("/api/ai/generate-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ prompt: aiPrompt + eventContext, subject: emailSubject, style: aiStyle }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Fehler");
                        setEmailBody(data.text);
                        setAiOpen(false);
                      } catch (err: any) {
                        toast({ title: "KI-Fehler", description: err.message, variant: "destructive" });
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    data-testid="button-ai-generate-sub"
                  >
                    {aiLoading ? (
                      <><Sparkles className="h-4 w-4 mr-2 animate-pulse" />Generiere…</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Text generieren</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Betreff</label>
              <Input
                placeholder="z.B. Einladung zur nächsten Veranstaltung"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                data-testid="input-email-subject-sub"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nachricht</label>
              <Textarea
                placeholder={"Guten Tag {{Vorname}},\n\n..."}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                data-testid="input-email-body-sub"
              />
              <p className="text-xs text-muted-foreground">
                Tipp: <code className="bg-muted px-1 rounded">{"{{Vorname}}"}</code> wird automatisch durch den Vornamen des Abonnenten ersetzt.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending}
              onClick={() => {
                const ids = emailTarget === "all"
                  ? undefined
                  : [(emailTarget as Subscriber).id];
                sendEmailMutation.mutate({ subscriberIds: ids, subject: emailSubject, body: emailBody });
              }}
              data-testid="button-send-email-sub"
            >
              {sendEmailMutation.isPending ? (
                "Wird gesendet..."
              ) : (
                <><Send className="h-4 w-4 mr-2" />E-Mail senden</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditForm({
  sub,
  onSubmit,
  isPending,
}: {
  sub: Subscriber;
  onSubmit: (data: EditValues) => void;
  isPending: boolean;
}) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: sub.firstName,
      lastName: sub.lastName,
      email: sub.email,
      phone: sub.phone || "",
    },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem>
              <FormLabel>Vorname</FormLabel>
              <FormControl><Input data-testid="input-edit-firstname" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem>
              <FormLabel>Nachname</FormLabel>
              <FormControl><Input data-testid="input-edit-lastname" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>E-Mail</FormLabel>
            <FormControl><Input type="email" data-testid="input-edit-email" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Telefon <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
            <FormControl><Input type="tel" data-testid="input-edit-phone" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-edit">
          {isPending ? "Wird gespeichert..." : "Speichern"}
        </Button>
      </form>
    </Form>
  );
}

function PortalPasswordForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: PortalPasswordValues) => void;
  isPending: boolean;
}) {
  const form = useForm<PortalPasswordValues>({
    resolver: zodResolver(portalPasswordSchema),
    defaultValues: { password: "", passwordConfirm: "" },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel>Neues Passwort</FormLabel>
            <FormControl><Input type="password" placeholder="Mindestens 6 Zeichen" data-testid="input-portal-password" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="passwordConfirm" render={({ field }) => (
          <FormItem>
            <FormLabel>Passwort bestätigen</FormLabel>
            <FormControl><Input type="password" placeholder="Passwort wiederholen" data-testid="input-portal-password-confirm" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-portal-password">
          {isPending ? "Wird gespeichert..." : "Portal-Passwort speichern"}
        </Button>
      </form>
    </Form>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Users,
  Download,
  Trash2,
  Plus,
  UserX,
  UserCheck,
  Pencil,
  Shield,
  ShieldOff,
  KeyRound,
  ShieldAlert,
  QrCode,
  Mail,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Subscriber, Event } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const memberFormSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben"),
  phone: z.string().optional(),
  birthday: z.string().optional(),
});

const passwordFormSchema = z.object({
  password: z.string().min(6, "Mindestens 6 Zeichen"),
  passwordConfirm: z.string().min(1, "Bitte wiederholen"),
}).refine((d) => d.password === d.passwordConfirm, {
  message: "Passwörter stimmen nicht überein",
  path: ["passwordConfirm"],
});

type MemberFormValues = z.infer<typeof memberFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function MembersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Subscriber | null>(null);
  const [passwordMember, setPasswordMember] = useState<Subscriber | null>(null);
  const [portalPasswordMember, setPortalPasswordMember] = useState<Subscriber | null>(null);
  const [qrMember, setQrMember] = useState<Subscriber | null>(null);
  // Email dialog: null = closed, "all" = all members, Subscriber = single member
  const [emailTarget, setEmailTarget] = useState<Subscriber | "all" | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEventId, setAiEventId] = useState<string>("");
  const { toast } = useToast();
  const { data: auth } = useAuth();

  const { data: members, isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  const { data: events } = useQuery<Event[]>({ queryKey: ["/api/events"] });
  const upcomingEvents = (events || [])
    .filter((e) => e.isActive && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const hasAdmins = members?.some((m) => m.isAdmin) ?? false;
  const setupMode = auth?.setupRequired ?? false;

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormValues) => {
      const res = await apiRequest("POST", "/api/members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      setIsCreateOpen(false);
      toast({ title: "Mitglied hinzugefügt" });
    },
    onError: (error: Error) => {
      if (error.message.includes("409")) {
        toast({ title: "Fehler", description: "Diese E-Mail-Adresse ist bereits registriert.", variant: "destructive" });
      } else {
        toast({ title: "Fehler", description: error.message, variant: "destructive" });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MemberFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      setEditingMember(null);
      toast({ title: "Mitglied aktualisiert" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Status aktualisiert" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isMember: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Aus Mitgliederliste entfernt" });
    },
  });

  const setPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("POST", `/api/members/${id}/set-password`, { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setPasswordMember(null);
      toast({ title: "Passwort gesetzt", description: "Admin-Zugang wurde eingerichtet." });
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
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      setPortalPasswordMember(null);
      toast({ title: "Portal-Passwort gesetzt", description: "Das Mitglied kann sich jetzt unter /mein-bereich anmelden." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/members/${id}/remove-admin`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Admin-Berechtigung entfernt" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ memberIds, subject, body }: { memberIds?: number[]; subject: string; body: string }) => {
      const res = await apiRequest("POST", "/api/members/send-email", { memberIds, subject, body });
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
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      const res = await fetch("/api/members/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mitglieder_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  };

  const sortedMembers = [...(members || [])].sort((a, b) =>
    a.lastName.localeCompare(b.lastName, "de")
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-members-title">Mitglieder</h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie die Mitglieder und Admin-Berechtigungen
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={!members?.length}
              data-testid="button-export-members"
            >
              <Download className="h-4 w-4 mr-2" />
              CSV Export
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setEmailTarget("all"); setEmailSubject(""); setEmailBody(""); }}
              disabled={!members?.length}
              data-testid="button-email-all-members"
            >
              <Mail className="h-4 w-4 mr-2" />
              E-Mail an alle
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-member">
                  <Plus className="h-4 w-4 mr-2" />
                  Mitglied hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Neues Mitglied hinzufügen</DialogTitle>
                </DialogHeader>
                <MemberForm
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {setupMode && !hasAdmins && (
          <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Noch kein Admin eingerichtet</p>
              <p>
                Fügen Sie ein Mitglied hinzu und klicken Sie auf <strong>Admin einrichten</strong> (Schild-Symbol),
                um dem Mitglied ein Passwort zu vergeben. Danach ist für den Admin-Bereich ein Login erforderlich.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : sortedMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">Keine Mitglieder</h3>
              <p className="text-muted-foreground mb-4">
                Fügen Sie Mitglieder direkt hinzu oder markieren Sie Abonnenten als Mitglied.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-add-member-empty">
                <Plus className="h-4 w-4 mr-2" />
                Erstes Mitglied hinzufügen
              </Button>
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
                    <TableHead>Telefon</TableHead>
                    <TableHead>Geburtstag</TableHead>
                    <TableHead>Seit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMembers.map((member) => (
                    <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.phone || <span className="opacity-40">–</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {member.birthday
                          ? format(new Date(member.birthday), "dd.MM.yyyy", { locale: de })
                          : <span className="opacity-40">–</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(member.subscribedAt), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.isAdmin ? (
                          <Badge
                            variant="outline"
                            className="border-blue-300 text-blue-700 dark:text-blue-400 gap-1"
                            data-testid={`badge-admin-${member.id}`}
                          >
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40 text-sm">–</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEmailTarget(member); setEmailSubject(""); setEmailBody(""); }}
                            title="E-Mail senden"
                            data-testid={`button-email-member-${member.id}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: member.id, isActive: !member.isActive })
                            }
                            title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                            data-testid={`button-toggle-member-${member.id}`}
                          >
                            {member.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>

                          {/* QR Code */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setQrMember(member)}
                            title="Persönlicher QR-Code"
                            data-testid={`button-qr-member-${member.id}`}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>

                          {/* Edit */}
                          <Dialog
                            open={editingMember?.id === member.id}
                            onOpenChange={(open) => !open && setEditingMember(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingMember(member)}
                                data-testid={`button-edit-member-${member.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Mitglied bearbeiten</DialogTitle>
                              </DialogHeader>
                              {editingMember && (
                                <MemberForm
                                  defaultValues={{
                                    firstName: editingMember.firstName,
                                    lastName: editingMember.lastName,
                                    email: editingMember.email,
                                    phone: editingMember.phone || "",
                                    birthday: editingMember.birthday || "",
                                  }}
                                  onSubmit={(data) => updateMutation.mutate({ id: editingMember.id, data })}
                                  isPending={updateMutation.isPending}
                                  submitLabel="Speichern"
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Portal password */}
                          <Dialog
                            open={portalPasswordMember?.id === member.id}
                            onOpenChange={(open) => !open && setPortalPasswordMember(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPortalPasswordMember(member)}
                                title={member.passwordHash ? "Portal-Passwort ändern" : "Portal-Passwort vergeben"}
                                data-testid={`button-portal-password-${member.id}`}
                              >
                                <KeyRound className={`h-4 w-4 ${member.passwordHash ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  Portal-Passwort für {member.firstName} {member.lastName}
                                </DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-muted-foreground">
                                Das Mitglied kann sich damit unter <strong>/mein-bereich</strong> anmelden — ohne Admin-Rechte.
                              </p>
                              {portalPasswordMember && (
                                <PasswordForm
                                  onSubmit={(data) =>
                                    setPortalPasswordMutation.mutate({ id: member.id, password: data.password })
                                  }
                                  isPending={setPortalPasswordMutation.isPending}
                                  submitLabel="Portal-Passwort speichern"
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Admin: set password / manage */}
                          <Dialog
                            open={passwordMember?.id === member.id}
                            onOpenChange={(open) => !open && setPasswordMember(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPasswordMember(member)}
                                title={member.isAdmin ? "Admin-Passwort ändern" : "Admin einrichten"}
                                data-testid={`button-admin-${member.id}`}
                              >
                                {member.isAdmin ? (
                                  <KeyRound className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>
                                  {member.isAdmin ? "Admin-Passwort ändern" : "Admin-Berechtigung einrichten"}
                                </DialogTitle>
                              </DialogHeader>
                              <p className="text-sm text-muted-foreground">
                                {member.isAdmin
                                  ? `Neues Passwort für ${member.firstName} ${member.lastName} festlegen.`
                                  : `${member.firstName} ${member.lastName} erhält vollen Zugriff auf den Admin-Bereich.`}
                              </p>
                              <PasswordForm
                                onSubmit={(data) =>
                                  setPasswordMutation.mutate({ id: member.id, password: data.password })
                                }
                                isPending={setPasswordMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>

                          {/* Remove admin role */}
                          {member.isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Admin-Berechtigung entfernen"
                                  data-testid={`button-remove-admin-${member.id}`}
                                >
                                  <ShieldOff className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Admin-Berechtigung entfernen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {member.firstName} {member.lastName} verliert den Zugang zum Admin-Bereich.
                                    Das Mitglied bleibt erhalten.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removeAdminMutation.mutate(member.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Entfernen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {/* Remove from member list */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Aus Mitgliederliste entfernen"
                                data-testid={`button-remove-member-${member.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.firstName} {member.lastName} wird aus der Mitgliederliste entfernt,
                                  bleibt aber als Abonnent erhalten.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeMemberMutation.mutate(member.id)}>
                                  Entfernen
                                </AlertDialogAction>
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
            <div className="px-4 py-3 border-t text-sm text-muted-foreground flex items-center gap-4">
              <span>{sortedMembers.length} {sortedMembers.length === 1 ? "Mitglied" : "Mitglieder"} gesamt</span>
              {hasAdmins && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  {sortedMembers.filter((m) => m.isAdmin).length} Admin{sortedMembers.filter((m) => m.isAdmin).length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog
        open={emailTarget !== null}
        onOpenChange={(open) => { if (!open) { setEmailTarget(null); setEmailSubject(""); setEmailBody(""); setAiPrompt(""); setAiOpen(false); setAiEventId(""); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {emailTarget === "all"
                ? `E-Mail an alle Mitglieder (${sortedMembers.filter((m) => m.isActive).length} aktiv)`
                : emailTarget
                ? `E-Mail an ${(emailTarget as Subscriber).firstName} ${(emailTarget as Subscriber).lastName}`
                : "E-Mail senden"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {/* AI assistant panel */}
            <div className="rounded-lg border border-primary/30 bg-primary/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-primary"
                onClick={() => setAiOpen((v) => !v)}
                data-testid="button-toggle-ai"
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

                  {/* Event context dropdown */}
                  {upcomingEvents.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Veranstaltungsbezug (optional)</label>
                      <Select
                        value={aiEventId}
                        onValueChange={(val) => {
                          setAiEventId(val);
                          if (val && val !== "none") {
                            const ev = upcomingEvents.find((e) => String(e.id) === val);
                            if (ev && !emailSubject.trim()) {
                              setEmailSubject(`Einladung: ${ev.title}`);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid="select-ai-event">
                          <SelectValue placeholder="Veranstaltung auswählen…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein Bezug</SelectItem>
                          {upcomingEvents.map((ev) => (
                            <SelectItem key={ev.id} value={String(ev.id)}>
                              {format(new Date(ev.date), "dd.MM.yy", { locale: de })} · {ev.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Textarea
                    placeholder="z.B. Einladung mit Bitte um Rückmeldung bis zum 5. Juli"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    data-testid="input-ai-prompt"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    disabled={!aiPrompt.trim() || aiLoading}
                    onClick={async () => {
                      const selectedEvent = aiEventId && aiEventId !== "none"
                        ? upcomingEvents.find((e) => String(e.id) === aiEventId)
                        : null;
                      const eventContext = selectedEvent
                        ? `\n\nVeranstaltungsdetails:\n- Titel: ${selectedEvent.title}\n- Datum: ${format(new Date(selectedEvent.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr\n- Ort: ${selectedEvent.location}${selectedEvent.description ? `\n- Beschreibung: ${selectedEvent.description}` : ""}`
                        : "";
                      setAiLoading(true);
                      try {
                        const res = await fetch("/api/ai/generate-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            prompt: aiPrompt + eventContext,
                            subject: emailSubject,
                          }),
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
                    data-testid="button-ai-generate"
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
                data-testid="input-email-subject"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nachricht</label>
              <Textarea
                placeholder={"Guten Tag {{Vorname}},\n\n..."}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={8}
                data-testid="input-email-body"
              />
              <p className="text-xs text-muted-foreground">
                Tipp: <code className="bg-muted px-1 rounded">{"{{Vorname}}"}</code> wird automatisch durch den Vornamen des Mitglieds ersetzt.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!emailSubject.trim() || !emailBody.trim() || sendEmailMutation.isPending}
              onClick={() => {
                const ids = emailTarget === "all"
                  ? undefined
                  : [(emailTarget as Subscriber).id];
                sendEmailMutation.mutate({ memberIds: ids, subject: emailSubject, body: emailBody });
              }}
              data-testid="button-send-email"
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

      {/* QR Code Dialog */}
      <Dialog open={qrMember !== null} onOpenChange={(open) => !open && setQrMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Persönlicher QR-Code</DialogTitle>
          </DialogHeader>
          {qrMember && (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">{qrMember.firstName} {qrMember.lastName}</span>
                <br />
                Wer diesen Code scannt, trägt sich als Empfehlung dieses Mitglieds ein.
              </p>
              <div className="bg-white p-4 rounded-xl border">
                <QRCodeSVG
                  value={`${window.location.origin}/subscribe/member/${qrMember.id}`}
                  size={200}
                  level="M"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center break-all">
                {window.location.origin}/subscribe/member/{qrMember.id}
              </p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/subscribe/member/${qrMember.id}`);
                }}
                data-testid="button-copy-member-qr-link"
              >
                Link kopieren
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = "Hinzufügen",
}: {
  defaultValues?: Partial<MemberFormValues>;
  onSubmit: (data: MemberFormValues) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      birthday: defaultValues?.birthday || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vorname *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Max" data-testid="input-member-firstname" />
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
                  <Input {...field} placeholder="Mustermann" data-testid="input-member-lastname" />
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
                <Input {...field} type="email" placeholder="max@beispiel.de" data-testid="input-member-email" />
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
                <Input {...field} type="tel" placeholder="0123 456789" data-testid="input-member-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="birthday"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geburtstag (optional)</FormLabel>
              <FormControl>
                <Input {...field} type="date" data-testid="input-member-birthday" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-member">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

function PasswordForm({
  onSubmit,
  isPending,
  submitLabel = "Admin-Zugang einrichten",
}: {
  onSubmit: (data: PasswordFormValues) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neues Passwort</FormLabel>
              <FormControl>
                <Input {...field} type="password" placeholder="Mindestens 6 Zeichen" data-testid="input-password" />
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
              <FormLabel>Passwort wiederholen</FormLabel>
              <FormControl>
                <Input {...field} type="password" data-testid="input-password-confirm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-password">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

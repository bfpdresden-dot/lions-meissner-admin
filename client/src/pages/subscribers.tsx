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
import { Mail, Download, Trash2, UserX, UserCheck, Star, KeyRound, Pencil, UserPlus, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Subscriber, Event } from "@shared/schema";
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
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!confirmedSubscribers.length}
            data-testid="button-export-subscribers"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
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
                          <TableCell className="font-medium">{sub.firstName} {sub.lastName}</TableCell>
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

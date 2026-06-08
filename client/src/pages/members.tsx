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
import { Users, Download, Trash2, Plus, UserX, UserCheck, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Subscriber } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const memberFormSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben"),
  phone: z.string().optional(),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

export default function MembersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Subscriber | null>(null);
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormValues) => {
      const res = await apiRequest("POST", "/api/subscribe", {
        ...data,
        isMember: true,
        isActive: true,
      });
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
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/subscribers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
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
      toast({ title: "Aus Mitgliederliste entfernt", description: "Der Eintrag bleibt als Abonnent erhalten." });
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
      toast({ title: "Export erfolgreich" });
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
              Verwalten Sie die Mitglieder des Lions Club Mei&szlig;ner Land
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
                    <TableHead>Seit</TableHead>
                    <TableHead>Status</TableHead>
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
                        {format(new Date(member.subscribedAt), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              toggleActiveMutation.mutate({ id: member.id, isActive: !member.isActive })
                            }
                            title={member.isActive ? "Deaktivieren" : "Aktivieren"}
                            data-testid={`button-toggle-member-${member.id}`}
                          >
                            {member.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
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
                                  }}
                                  onSubmit={(data) =>
                                    updateMutation.mutate({ id: editingMember.id, data })
                                  }
                                  isPending={updateMutation.isPending}
                                  submitLabel="Speichern"
                                />
                              )}
                            </DialogContent>
                          </Dialog>
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
                                  bleibt aber als Abonnent erhalten. Soll die Person komplett gelöscht werden,
                                  nutzen Sie die Abonnenten-Verwaltung.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeMemberMutation.mutate(member.id)}
                                >
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
            <div className="px-4 py-3 border-t text-sm text-muted-foreground">
              {sortedMembers.length} {sortedMembers.length === 1 ? "Mitglied" : "Mitglieder"} gesamt
            </div>
          </Card>
        )}
      </div>
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
        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-member">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

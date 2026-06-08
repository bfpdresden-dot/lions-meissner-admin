import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Mail, Download, Trash2, UserX, UserCheck, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Subscriber, Event } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function SubscribersPage() {
  const { toast } = useToast();

  const { data: subscribers, isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/subscribers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscribers"] });
      toast({ title: "Abonnent gel\u00f6scht" });
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
    } catch (error) {
      toast({ title: "Fehler", description: "Export fehlgeschlagen.", variant: "destructive" });
    }
  };

  const getEventName = (eventId: number | null) => {
    if (!eventId || !events) return "-";
    const event = events.find((e) => e.id === eventId);
    return event?.title || "-";
  };

  const sortedSubscribers = [...(subscribers || [])].sort(
    (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-subscribers-title">Abonnenten</h1>
            <p className="text-muted-foreground mt-1">
              Verwalten Sie Ihre Newsletter-Abonnenten
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!subscribers?.length}
            data-testid="button-export-subscribers"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV Export
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : sortedSubscribers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">Keine Abonnenten</h3>
              <p className="text-muted-foreground">
                Erstellen Sie einen QR-Code f&uuml;r eine Veranstaltung, um Newsletter-Abonnenten zu gewinnen.
              </p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Mitglied</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSubscribers.map((sub) => (
                    <TableRow key={sub.id} data-testid={`row-subscriber-${sub.id}`}>
                      <TableCell className="font-medium">
                        {sub.firstName} {sub.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{sub.email}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getEventName(sub.eventId)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(sub.subscribedAt), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.isActive ? "default" : "secondary"}>
                          {sub.isActive ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => memberMutation.mutate({ id: sub.id, isMember: !sub.isMember })}
                          title={sub.isMember ? "Mitglied-Status entfernen" : "Als Mitglied markieren"}
                          data-testid={`button-member-${sub.id}`}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${sub.isMember ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              toggleMutation.mutate({ id: sub.id, isActive: !sub.isActive })
                            }
                            data-testid={`button-toggle-subscriber-${sub.id}`}
                          >
                            {sub.isActive ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-delete-subscriber-${sub.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Abonnent l&ouml;schen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  M&ouml;chten Sie {sub.firstName} {sub.lastName} wirklich l&ouml;schen?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(sub.id)}
                                >
                                  L&ouml;schen
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
          </Card>
        )}
      </div>
    </div>
  );
}

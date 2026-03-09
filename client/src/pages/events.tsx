import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Calendar, MapPin, Users, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event, InsertEvent } from "@shared/schema";
import { insertEventSchema } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { z } from "zod";

const eventFormSchema = insertEventSchema.extend({
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  description: z.string().min(5, "Beschreibung muss mindestens 5 Zeichen haben"),
  location: z.string().min(2, "Ort muss mindestens 2 Zeichen haben"),
  date: z.string().min(1, "Datum ist erforderlich"),
  maxParticipants: z.union([z.number().min(1).nullable(), z.string()]).transform((val) => {
    if (val === "" || val === null) return null;
    return typeof val === "string" ? parseInt(val, 10) || null : val;
  }),
  isActive: z.boolean().default(true),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function EventsPage() {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsCreateOpen(false);
      toast({ title: "Veranstaltung erstellt", description: "Die Veranstaltung wurde erfolgreich erstellt." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
      toast({ title: "Veranstaltung aktualisiert", description: "Die Veranstaltung wurde erfolgreich aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Veranstaltung gel\u00f6scht", description: "Die Veranstaltung wurde erfolgreich gel\u00f6scht." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-events-title">Veranstaltungen</h1>
            <p className="text-muted-foreground mt-1">Verwalten Sie Ihre Club-Veranstaltungen</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" />
                Neue Veranstaltung
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Neue Veranstaltung erstellen</DialogTitle>
              </DialogHeader>
              <EventForm
                onSubmit={(data) => createMutation.mutate(data)}
                isPending={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : sortedEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-1">Keine Veranstaltungen</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihre erste Veranstaltung, um loszulegen.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-event-empty">
                <Plus className="h-4 w-4 mr-2" />
                Erste Veranstaltung erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event) => {
              const isPast = new Date(event.date) < new Date();
              return (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{event.title}</h3>
                          <Badge variant={event.isActive ? "default" : "secondary"}>
                            {event.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
                          {isPast && (
                            <Badge variant="secondary">Vergangen</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(event.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                          {event.maxParticipants && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              Max. {event.maxParticipants} Teilnehmer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Dialog
                          open={editingEvent?.id === event.id}
                          onOpenChange={(open) => !open && setEditingEvent(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingEvent(event)}
                              data-testid={`button-edit-event-${event.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Veranstaltung bearbeiten</DialogTitle>
                            </DialogHeader>
                            {editingEvent && (
                              <EventForm
                                defaultValues={{
                                  title: editingEvent.title,
                                  description: editingEvent.description,
                                  date: format(new Date(editingEvent.date), "yyyy-MM-dd'T'HH:mm"),
                                  location: editingEvent.location,
                                  maxParticipants: editingEvent.maxParticipants ?? "",
                                  isActive: editingEvent.isActive,
                                }}
                                onSubmit={(data) =>
                                  updateMutation.mutate({ id: editingEvent.id, data })
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
                              data-testid={`button-delete-event-${event.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Veranstaltung l&ouml;schen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                M&ouml;chten Sie die Veranstaltung &quot;{event.title}&quot; wirklich l&ouml;schen?
                                Diese Aktion kann nicht r&uuml;ckg&auml;ngig gemacht werden.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(event.id)}
                                data-testid={`button-confirm-delete-event-${event.id}`}
                              >
                                L&ouml;schen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = "Erstellen",
}: {
  defaultValues?: Partial<EventFormValues>;
  onSubmit: (data: Record<string, unknown>) => void;
  isPending: boolean;
  submitLabel?: string;
}) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: defaultValues?.title || "",
      description: defaultValues?.description || "",
      date: defaultValues?.date || "",
      location: defaultValues?.location || "",
      maxParticipants: defaultValues?.maxParticipants ?? "",
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const handleSubmit = (values: EventFormValues) => {
    const payload = {
      ...values,
      date: new Date(values.date as string).toISOString(),
      maxParticipants: values.maxParticipants || null,
    };
    onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titel</FormLabel>
              <FormControl>
                <Input {...field} placeholder="z.B. Sommerfest 2026" data-testid="input-event-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Beschreiben Sie die Veranstaltung..."
                  className="resize-none"
                  rows={3}
                  data-testid="input-event-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Datum & Uhrzeit</FormLabel>
                <FormControl>
                  <Input {...field} type="datetime-local" data-testid="input-event-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ort</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="z.B. Vereinshaus" data-testid="input-event-location" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max. Teilnehmer (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="Unbegrenzt"
                    value={field.value ?? ""}
                    data-testid="input-event-max-participants"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-col justify-end">
                <FormLabel>Aktiv</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="switch-event-active"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" disabled={isPending} className="w-full" data-testid="button-submit-event">
          {isPending ? "Wird gespeichert..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}

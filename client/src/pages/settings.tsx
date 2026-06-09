import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Settings, MapPin, Mail, Phone, Building2, AtSign, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

const settingsSchema = z.object({
  clubName: z.string().min(1, "Pflichtfeld"),
  clubStreet: z.string().optional(),
  clubZip: z.string().optional(),
  clubCity: z.string().optional(),
  clubPhone: z.string().optional(),
  clubEmail: z.string().email("Gültige E-Mail erforderlich").or(z.literal("")).optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email("Gültige Absender-E-Mail erforderlich").or(z.literal("")).optional(),
  emailAiModel: z.string().optional(),
  eventAiModel: z.string().optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const DEFAULTS: SettingsValues = {
  clubName: "Lions Club Meißner Land",
  clubStreet: "Seestraße 18e",
  clubZip: "01640",
  clubCity: "Coswig",
  clubPhone: "0172 340 85 43",
  clubEmail: "schreiber1988@gmx.net",
  senderName: "Lions Club Meißner Land",
  senderEmail: "",
  emailAiModel: "openai/gpt-4o-mini",
  eventAiModel: "google/gemini-2.0-flash-001",
};

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: saved, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (saved) {
      form.reset({
        clubName: saved.clubName ?? DEFAULTS.clubName,
        clubStreet: saved.clubStreet ?? DEFAULTS.clubStreet,
        clubZip: saved.clubZip ?? DEFAULTS.clubZip,
        clubCity: saved.clubCity ?? DEFAULTS.clubCity,
        clubPhone: saved.clubPhone ?? DEFAULTS.clubPhone,
        clubEmail: saved.clubEmail ?? DEFAULTS.clubEmail,
        senderName: saved.senderName ?? DEFAULTS.senderName,
        senderEmail: saved.senderEmail ?? DEFAULTS.senderEmail,
        emailAiModel: saved.emailAiModel ?? DEFAULTS.emailAiModel,
        eventAiModel: saved.eventAiModel ?? DEFAULTS.eventAiModel,
      });
    }
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsValues) => {
      const payload: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        payload[k] = v ?? "";
      }
      const res = await apiRequest("PATCH", "/api/settings", payload);
      return res.json();
    },
    onSuccess: (updated: Record<string, string>) => {
      queryClient.setQueryData(["/api/settings"], updated);
      toast({ title: "Einstellungen gespeichert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-settings-title">
            <Settings className="h-6 w-6" />
            Einstellungen
          </h1>
          <p className="text-muted-foreground mt-1">Allgemeine Club-Daten und E-Mail-Konfiguration</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-40 animate-pulse bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">

              {/* Club identity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Club-Informationen
                  </CardTitle>
                  <CardDescription>
                    Diese Daten erscheinen in E-Mails, Flyern und auf öffentlichen Seiten.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clubName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Club-Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Lions Club Meißner Land" data-testid="input-club-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="clubStreet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Straße & Hausnummer</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Seestraße 18e" data-testid="input-club-street" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="clubZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PLZ</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="01640" data-testid="input-club-zip" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="clubCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stadt</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Coswig" data-testid="input-club-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="clubPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            Telefon
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="0172 340 85 43" data-testid="input-club-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clubEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            Kontakt-E-Mail
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="info@lions-club.de" data-testid="input-club-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email sender */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AtSign className="h-4 w-4" />
                    E-Mail-Absender
                  </CardTitle>
                  <CardDescription>
                    Name und Adresse, die beim Versand von Benachrichtigungen als Absender erscheinen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="senderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Absender-Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Lions Club Meißner Land" data-testid="input-sender-name" />
                        </FormControl>
                        <FormDescription>
                          Wird als „Von: …" in E-Mails angezeigt.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="senderEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Absender-E-Mail</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="noreply@lions-club.de" data-testid="input-sender-email" />
                        </FormControl>
                        <FormDescription>
                          Die E-Mail-Adresse, von der Nachrichten versendet werden (muss bei Ihrem E-Mail-Anbieter verifiziert sein).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* AI Models */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    KI-Modelle
                  </CardTitle>
                  <CardDescription>
                    Über OpenRouter verfügbare Modelle, z.B. <code className="text-xs bg-muted px-1 rounded">openai/gpt-4o-mini</code>, <code className="text-xs bg-muted px-1 rounded">google/gemini-2.0-flash-001</code>, <code className="text-xs bg-muted px-1 rounded">anthropic/claude-3-haiku</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailAiModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modell für E-Mail-Assistent</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="openai/gpt-4o-mini" data-testid="input-email-ai-model" />
                        </FormControl>
                        <FormDescription>Wird beim Verfassen von Mitglieder-E-Mails verwendet.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventAiModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modell für Veranstaltungs-Assistent</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="google/gemini-2.0-flash-001" data-testid="input-event-ai-model" />
                        </FormControl>
                        <FormDescription>Wird beim automatischen Ausfüllen von Veranstaltungen verwendet.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full"
                data-testid="button-save-settings"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Wird gespeichert..." : "Einstellungen speichern"}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
}

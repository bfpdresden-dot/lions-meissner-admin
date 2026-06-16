import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  Gift,
  Users,
  Star,
  Handshake,
  CheckCircle2,
  Mail,
  ArrowRight,
  Calendar,
} from "lucide-react";

const NAVY = "#1a3a5c";
const GOLD = "#c8a84b";

const contactSchema = z.object({
  firstName: z.string().min(2, "Bitte Vornamen eingeben"),
  lastName: z.string().min(2, "Bitte Nachnamen eingeben"),
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben"),
  message: z.string().optional(),
  topic: z.string(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface Option {
  id: string;
  icon: React.ReactNode;
  wish: string;
  offer: string;
  description: string;
  color: string;
  defaultMessage: string;
}

const OPTIONS: Option[] = [
  {
    id: "helfen",
    icon: <Heart className="h-7 w-7" />,
    wish: "Helfen",
    offer: "Bei einer Aktion mitmachen",
    description:
      "Packen Sie mit an – bei Benefizveranstaltungen, Projekten oder Aktionen für Menschen in der Region.",
    color: "#e05252",
    defaultMessage:
      "Ich möchte gerne bei einer Aktion oder Veranstaltung des Lions Club Meißner Land mithelfen.",
  },
  {
    id: "spenden",
    icon: <Gift className="h-7 w-7" />,
    wish: "Spenden",
    offer: "Projekte unterstützen",
    description:
      "Ihre Spende fließt direkt in gemeinnützige Projekte in Meißen, Coswig und Radebeul.",
    color: "#c8a84b",
    defaultMessage:
      "Ich möchte den Lions Club Meißner Land mit einer Spende unterstützen und bitte um weitere Informationen.",
  },
  {
    id: "netzwerken",
    icon: <Users className="h-7 w-7" />,
    wish: "Netzwerken",
    offer: "Gästeabend besuchen",
    description:
      "Lernen Sie uns unverbindlich kennen – bei einem unserer regelmäßigen Gästeabende für interessierte Bürger.",
    color: "#3b82f6",
    defaultMessage:
      "Ich interessiere mich für einen Gästeabend und möchte den Lions Club Meißner Land näher kennenlernen.",
  },
  {
    id: "mitglied",
    icon: <Star className="h-7 w-7" />,
    wish: "Mitglied werden",
    offer: "Unverbindliches Gespräch vereinbaren",
    description:
      "Der Lions Club lebt von engagierten Menschen. Sprechen Sie mit uns – unverbindlich und auf Augenhöhe.",
    color: "#1a3a5c",
    defaultMessage:
      "Ich möchte mehr über eine Mitgliedschaft im Lions Club Meißner Land erfahren und bitte um ein unverbindliches Gespräch.",
  },
  {
    id: "partner",
    icon: <Handshake className="h-7 w-7" />,
    wish: "Partner werden",
    offer: "Kooperation anfragen",
    description:
      "Als Unternehmen oder Organisation gemeinsam Gutes tun – wir freuen uns über Partnerschaftsanfragen.",
    color: "#059669",
    defaultMessage:
      "Ich bin an einer Kooperation / Partnerschaft mit dem Lions Club Meißner Land interessiert und möchte mehr erfahren.",
  },
];

function OptionCard({ option, onContact }: { option: Option; onContact: (o: Option) => void }) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: option.color }} />
      <div className="flex flex-col flex-1 p-6 gap-4">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-sm"
            style={{ background: option.color }}
          >
            {option.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Ich möchte…
            </p>
            <h2 className="text-xl font-bold text-gray-900">{option.wish}</h2>
            <p className="text-sm font-medium mt-0.5" style={{ color: option.color }}>
              {option.offer}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed flex-1">{option.description}</p>
        <Button
          onClick={() => onContact(option)}
          className="w-full gap-2 mt-auto"
          style={{ background: option.color, color: "#fff" }}
          data-testid={`button-mitmachen-${option.id}`}
        >
          Anfrage stellen
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MitmachenPage() {
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", email: "", message: "", topic: "" },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: () => {
      toast({ title: "Fehler beim Senden", description: "Bitte versuchen Sie es erneut.", variant: "destructive" });
    },
  });

  const openDialog = (option: Option) => {
    form.reset({
      firstName: "",
      lastName: "",
      email: "",
      message: option.defaultMessage,
      topic: option.wish,
    });
    setSuccess(false);
    setSelectedOption(option);
  };

  const closeDialog = () => {
    setSelectedOption(null);
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1e4976 100%)` }}>
        <div className="absolute inset-0 opacity-10">
          <img src="/images/hero-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
          <img
            src="/images/lions-logo.png"
            alt="Lions Club Logo"
            className="h-20 w-20 mx-auto mb-6 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Mitmachen</h1>
          <p className="text-lg opacity-80 max-w-xl mx-auto">
            Sie möchten sich engagieren, spenden, netzwerken oder einfach mehr erfahren?
            Wählen Sie aus, was zu Ihnen passt.
          </p>
          <div className="flex gap-3 justify-center flex-wrap mt-8">
            <Link href="/">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Unsere Veranstaltungen
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cards ── */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OPTIONS.map((opt) => (
            <OptionCard key={opt.id} option={opt} onContact={openDialog} />
          ))}
        </div>

        {/* ── Intro text ── */}
        <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
            style={{ background: GOLD }}
          >
            <Heart className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: NAVY }}>
            We Serve – Wir dienen
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
            Der Lions Club Meißner Land ist Teil von Lions International, der weltweit größten
            Serviceorganisation. Seit Jahrzehnten setzen wir uns ehrenamtlich für die Menschen
            im Landkreis Meißen ein – weil Engagement verbindet.
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t mt-8 pt-8 pb-12 text-center text-sm text-muted-foreground space-y-1 px-4">
        <p className="font-medium">Lions Club Mei&szlig;ner Land</p>
        <p>Sebastian Schreiber &middot; Seestra&szlig;e 18e, 01640 Coswig</p>
        <p>
          <a href="tel:01723408543" className="hover:underline">0172 340 85 43</a>
          {" "}&middot;{" "}
          <a href="mailto:schreiber1988@gmx.net" className="hover:underline">schreiber1988@gmx.net</a>
        </p>
        <p className="pt-1">
          <Link href="/" className="hover:underline">Veranstaltungen</Link>
          {" "}&middot;{" "}
          <Link href="/datenschutz" className="hover:underline">Datenschutzerklärung</Link>
        </p>
      </div>

      {/* ── Contact Dialog ── */}
      <Dialog open={!!selectedOption} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedOption && (
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ background: selectedOption.color }}
                >
                  {selectedOption.icon}
                </span>
              )}
              {selectedOption?.wish}
            </DialogTitle>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center py-8 text-center gap-3">
              <CheckCircle2 className="h-12 w-12" style={{ color: GOLD }} />
              <p className="font-semibold text-lg">Vielen Dank für Ihre Anfrage!</p>
              <p className="text-sm text-muted-foreground">
                Wir melden uns in Kürze bei Ihnen.
              </p>
              <Button variant="outline" onClick={closeDialog} className="mt-2">
                Schließen
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => contactMutation.mutate(data))}
                className="space-y-4 pt-2"
              >
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vorname</FormLabel>
                        <FormControl>
                          <Input placeholder="Max" data-testid="input-contact-firstname" {...field} />
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
                        <FormLabel>Nachname</FormLabel>
                        <FormControl>
                          <Input placeholder="Mustermann" data-testid="input-contact-lastname" {...field} />
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
                      <FormLabel>E-Mail-Adresse</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="max@beispiel.de" data-testid="input-contact-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nachricht <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          data-testid="input-contact-message"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={contactMutation.isPending}
                  style={{ background: selectedOption?.color }}
                  data-testid="button-contact-submit"
                >
                  <Mail className="h-4 w-4" />
                  {contactMutation.isPending ? "Wird gesendet…" : "Anfrage absenden"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

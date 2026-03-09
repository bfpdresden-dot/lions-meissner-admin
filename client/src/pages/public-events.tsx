import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users } from "lucide-react";
import type { Event } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function PublicEventsPage() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const upcomingEvents = (events || [])
    .filter((e) => e.isActive && new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-gradient-to-br from-[hsl(220,40%,15%)] to-[hsl(220,50%,22%)] text-white">
        <div className="absolute inset-0 opacity-20">
          <img
            src="/images/hero-bg.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">
          <img
            src="/images/lions-logo.png"
            alt="Lions Club Logo"
            className="h-20 w-20 mx-auto mb-6 object-contain"
            data-testid="img-public-logo"
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid="text-public-title">
            Lions Club Mei&szlig;ner Land
          </h1>
          <p className="text-lg opacity-80">Unsere Veranstaltungen</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Derzeit keine anstehenden Veranstaltungen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id} data-testid={`card-public-event-${event.id}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-semibold">{event.title}</h3>
                      <p className="text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </span>
                        {event.maxParticipants && (
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            Max. {event.maxParticipants} Teilnehmer
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 self-start">
                      {format(new Date(event.date), "dd. MMM", { locale: de })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground space-y-1">
          <p className="font-medium">Lions Club Mei&szlig;ner Land</p>
          <p>Sebastian Schreiber &middot; Seestra&szlig;e 18e, 01640 Coswig</p>
          <p>
            <a href="tel:01723408543" className="hover:underline">0172 340 85 43</a>
            {" "}&middot;{" "}
            <a href="mailto:schreiber1988@gmx.net" className="hover:underline">schreiber1988@gmx.net</a>
          </p>
        </div>
      </div>
    </div>
  );
}

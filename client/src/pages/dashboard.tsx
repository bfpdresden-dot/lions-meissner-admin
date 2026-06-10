import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, Users, TrendingUp, ExternalLink, UserPlus, ChevronRight, QrCode, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, Subscriber, Registration } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: subscribers, isLoading: subscribersLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const { data: registrations, isLoading: registrationsLoading } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/members"],
  });

  const { data: guestCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/registrations/counts"],
  });

  const isLoading = eventsLoading || subscribersLoading || registrationsLoading || membersLoading;
  const totalGuests = guestCounts ? Object.values(guestCounts).reduce((sum, c) => sum + c, 0) : 0;
  const activeEvents = events?.filter((e) => e.isActive) || [];
  const activeSubscribers = subscribers?.filter((s) => s.isActive) || [];
  const upcomingEvents = activeEvents
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentSubscribers = [...(subscribers || [])]
    .sort((a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <img
              src="/images/lions-logo.png"
              alt="Lions Club Logo"
              className="h-14 w-14 object-contain"
              data-testid="img-dashboard-logo"
            />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">
                Lions Club Mei&szlig;ner Land
              </h1>
              <p className="text-muted-foreground mt-0.5">Verwaltungs-Dashboard</p>
            </div>
          </div>
          <a href="/veranstaltungen" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" data-testid="button-public-page">
              <ExternalLink className="h-4 w-4 mr-2" />
              &Ouml;ffentliche Seite
            </Button>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Veranstaltungen"
            value={isLoading ? undefined : events?.length || 0}
            subtitle="Gesamt"
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            testId="stat-events-total"
            href="/events"
          />
          <StatCard
            title="Aktive Events"
            value={isLoading ? undefined : activeEvents.length}
            subtitle="Derzeit aktiv"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            testId="stat-events-active"
            href="/events"
          />
          <StatCard
            title="Abonnenten"
            value={isLoading ? undefined : subscribers?.length || 0}
            subtitle="Gesamt"
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            testId="stat-subscribers-total"
            href="/subscribers"
          />
          <StatCard
            title="Aktive Abonnenten"
            value={isLoading ? undefined : activeSubscribers.length}
            subtitle="Newsletter-Empf&auml;nger"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            testId="stat-subscribers-active"
            href="/subscribers"
          />
          <StatCard
            title="Anmeldungen"
            value={isLoading ? undefined : registrations?.length || 0}
            subtitle="Event-Registrierungen"
            icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
            testId="stat-registrations-total"
            href="/events"
          />
          <StatCard
            title="G&auml;ste gesamt"
            value={isLoading ? undefined : totalGuests}
            subtitle="Alle Veranstaltungen"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            testId="stat-guests-total"
            href="/events"
          />
          <StatCard
            title="Mitglieder"
            value={isLoading ? undefined : members?.length || 0}
            subtitle="Lions Club Mitglieder"
            icon={<Star className="h-4 w-4 text-muted-foreground" />}
            testId="stat-members-total"
            href="/members"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
              <CardTitle className="text-lg">N&auml;chste Veranstaltungen</CardTitle>
              <Link href="/events">
                <Button variant="ghost" size="sm" data-testid="link-all-events">
                  Alle anzeigen
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <Link href="/events">
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Keine anstehenden Veranstaltungen</p>
                    <p className="text-xs mt-1 opacity-60">Klicken um eine zu erstellen</p>
                  </div>
                </Link>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 4).map((event) => (
                    <Link key={event.id} href="/events">
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                        data-testid={`event-upcoming-${event.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.date), "dd. MMM yyyy, HH:mm", { locale: de })} Uhr
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{event.location}</p>
                        </div>
                        <div className="shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
              <CardTitle className="text-lg">Neueste Abonnenten</CardTitle>
              <Link href="/subscribers">
                <Button variant="ghost" size="sm" data-testid="link-all-subscribers">
                  Alle anzeigen
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentSubscribers.length === 0 ? (
                <Link href="/qr-codes">
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                    <Mail className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Noch keine Abonnenten</p>
                    <p className="text-xs mt-1 opacity-60">Klicken um einen QR-Code zu erstellen</p>
                  </div>
                </Link>
              ) : (
                <div className="space-y-2">
                  {recentSubscribers.map((sub) => (
                    <Link key={sub.id} href="/subscribers">
                      <div
                        className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                        data-testid={`subscriber-recent-${sub.id}`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {sub.firstName} {sub.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{sub.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={sub.isActive ? "default" : "secondary"}>
                            {sub.isActive ? "Aktiv" : "Inaktiv"}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/veranstaltungen" target="_blank" rel="noopener noreferrer" className="block group">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">&Ouml;ffentliche Veranstaltungen</p>
                  <p className="text-sm text-muted-foreground">Externe Ansicht &ouml;ffnen</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
              </CardContent>
            </Card>
          </a>

          <Link href="/qr-codes" className="block group">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">QR-Codes</p>
                  <p className="text-sm text-muted-foreground">Generieren &amp; drucken</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/subscribers" className="block group">
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">Newsletter</p>
                  <p className="text-sm text-muted-foreground">Abonnenten verwalten</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  testId,
  href,
}: {
  title: string;
  value: number | undefined;
  subtitle: string;
  icon: React.ReactNode;
  testId: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer hover:shadow-md transition-all border-2 border-transparent hover:border-primary/20 group">
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-1">
            {icon}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardHeader>
        <CardContent>
          {value === undefined ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold" data-testid={testId}>{value}</div>
          )}
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

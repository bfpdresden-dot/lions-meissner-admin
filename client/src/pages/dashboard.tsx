import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, Subscriber } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: subscribers, isLoading: subscribersLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/subscribers"],
  });

  const isLoading = eventsLoading || subscribersLoading;
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
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Willkommen beim Lions Club Mei&szlig;ner Land Verwaltungstool
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Veranstaltungen"
            value={isLoading ? undefined : events?.length || 0}
            subtitle="Gesamt"
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            testId="stat-events-total"
          />
          <StatCard
            title="Aktive Events"
            value={isLoading ? undefined : activeEvents.length}
            subtitle="Derzeit aktiv"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            testId="stat-events-active"
          />
          <StatCard
            title="Abonnenten"
            value={isLoading ? undefined : subscribers?.length || 0}
            subtitle="Gesamt"
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            testId="stat-subscribers-total"
          />
          <StatCard
            title="Aktive Abonnenten"
            value={isLoading ? undefined : activeSubscribers.length}
            subtitle="Newsletter-Empf&auml;nger"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            testId="stat-subscribers-active"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">N&auml;chste Veranstaltungen</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Keine anstehenden Veranstaltungen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                      data-testid={`event-upcoming-${event.id}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.date), "dd. MMMM yyyy, HH:mm", { locale: de })} Uhr
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {event.location}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Neue Abonnenten</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentSubscribers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Noch keine Abonnenten</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentSubscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                      data-testid={`subscriber-recent-${sub.id}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {sub.firstName} {sub.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{sub.email}</p>
                      </div>
                      <Badge variant={sub.isActive ? "default" : "secondary"} className="shrink-0">
                        {sub.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
}: {
  title: string;
  value: number | undefined;
  subtitle: string;
  icon: React.ReactNode;
  testId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
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
  );
}

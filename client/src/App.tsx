import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import EventsPage from "@/pages/events";
import SubscribersPage from "@/pages/subscribers";
import MembersPage from "@/pages/members";
import QRCodesPage from "@/pages/qr-codes";
import SettingsPage from "@/pages/settings";
import SubscribePage from "@/pages/subscribe";
import SubscribeMemberPage from "@/pages/subscribe-member";
import PublicEventsPage from "@/pages/public-events";
import PortalPage from "@/pages/portal";
import PasswordResetPage from "@/pages/password-reset";
import LoginPage from "@/pages/login";
import SetupPage from "@/pages/setup";
import DatenschutzPage from "@/pages/datenschutz";
import { useAuth, useLogout } from "@/hooks/use-auth";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/events" component={EventsPage} />
      <Route path="/subscribers" component={SubscribersPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/qr-codes" component={QRCodesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SubscribeRoute() {
  const [match, params] = useRoute("/subscribe/:eventId");
  if (!match || !params?.eventId) return null;
  return <SubscribePage eventId={params.eventId} />;
}

function SubscribeMemberRoute() {
  const [match, params] = useRoute("/subscribe/member/:memberId");
  if (!match || !params?.memberId) return null;
  return <SubscribeMemberPage memberId={params.memberId} />;
}

function AdminLayout() {
  const logout = useLogout();
  const { data: auth } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-2 p-3 border-b shrink-0 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <span className="text-sm font-medium text-muted-foreground flex-1">Admin-Bereich</span>
            {auth?.authenticated && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {auth.user?.firstName} {auth.user?.lastName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Abmelden
                </Button>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-hidden flex flex-col">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthGate() {
  const { data: auth, isLoading, isError } = useAuth();

  if (isLoading || isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  // No admins exist yet → show first-time setup wizard
  if (auth?.setupRequired) {
    return (
      <SetupPage
        onComplete={() => {
          queryClient.setQueryData(["/api/auth/me"], { authenticated: false, setupRequired: false });
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }}
      />
    );
  }

  // Admins exist but user not logged in → show login
  if (!auth?.authenticated) {
    return <LoginPage />;
  }

  return <AdminLayout />;
}

const ADMIN_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/events$/,
  /^\/subscribers$/,
  /^\/members$/,
  /^\/qr-codes$/,
  /^\/settings$/,
];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTE_PATTERNS.some((r) => r.test(pathname));
}

function App() {
  const [isSubscribeMember] = useRoute("/subscribe/member/:memberId");
  const [isSubscribe] = useRoute("/subscribe/:eventId");
  const [isPublicEvents] = useRoute("/veranstaltungen");
  const [isPortal] = useRoute("/mein-bereich");
  const [isPasswordReset] = useRoute("/passwort-reset");
  const [isDatenschutz] = useRoute("/datenschutz");

  const isKnownPublic =
    isSubscribeMember ||
    isSubscribe ||
    isPublicEvents ||
    isPortal ||
    isPasswordReset ||
    isDatenschutz;

  const isAdmin = isAdminRoute(window.location.pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isSubscribeMember ? (
          <SubscribeMemberRoute />
        ) : isSubscribe ? (
          <SubscribeRoute />
        ) : isPublicEvents ? (
          <PublicEventsPage />
        ) : isPortal ? (
          <PortalPage />
        ) : isPasswordReset ? (
          <PasswordResetPage />
        ) : isDatenschutz ? (
          <DatenschutzPage />
        ) : isAdmin || isKnownPublic ? (
          <AuthGate />
        ) : (
          <NotFound />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

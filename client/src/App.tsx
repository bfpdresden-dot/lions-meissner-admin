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
import SubscribePage from "@/pages/subscribe";
import PublicEventsPage from "@/pages/public-events";
import LoginPage from "@/pages/login";
import { useAuth, useLogout } from "@/hooks/use-auth";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/events" component={EventsPage} />
      <Route path="/subscribers" component={SubscribersPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/qr-codes" component={QRCodesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SubscribeRoute() {
  const [match, params] = useRoute("/subscribe/:eventId");
  if (!match || !params?.eventId) return null;
  return <SubscribePage eventId={params.eventId} />;
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  // If query errored OR no admins exist yet → allow access (backend is the real gatekeeper)
  if (isError || auth?.setupRequired) {
    return <AdminLayout />;
  }

  // Admins exist but user not logged in → show login
  if (!auth?.authenticated) {
    return <LoginPage />;
  }

  return <AdminLayout />;
}

function App() {
  const [isSubscribe] = useRoute("/subscribe/:eventId");
  const [isPublicEvents] = useRoute("/veranstaltungen");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isSubscribe ? (
          <SubscribeRoute />
        ) : isPublicEvents ? (
          <PublicEventsPage />
        ) : (
          <AuthGate />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

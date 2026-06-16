import { Switch, Route, useRoute, useLocation } from "wouter";
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
import SubscribeConfirmPage from "@/pages/subscribe-confirm";
import SubscribeMemberPage from "@/pages/subscribe-member";
import PublicEventsPage from "@/pages/public-events";
import PortalPage from "@/pages/portal";
import PasswordResetPage from "@/pages/password-reset";
import LoginPage from "@/pages/login";
import SetupPage from "@/pages/setup";
import DatenschutzPage from "@/pages/datenschutz";
import AbmeldenPage from "@/pages/abmelden";
import SchichtplanPage from "@/pages/schichtplan";
import AdminSchichtplanPage from "@/pages/admin-schichtplan";
import AdminKalkulationPage from "@/pages/admin-kalkulation";
import AdminStatistikPage from "@/pages/admin-statistik";
import AnleitungPage from "@/pages/anleitung";
import MitmachenPage from "@/pages/mitmachen";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { useEffect } from "react";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/events" component={EventsPage} />
      <Route path="/admin/subscribers" component={SubscribersPage} />
      <Route path="/admin/members" component={MembersPage} />
      <Route path="/admin/qr-codes" component={QRCodesPage} />
      <Route path="/admin/schichtplan" component={AdminSchichtplanPage} />
      <Route path="/admin/kalkulation" component={AdminKalkulationPage} />
      <Route path="/admin/statistik" component={AdminStatistikPage} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
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

  if (!auth?.authenticated) {
    return <LoginPage />;
  }

  return <AdminLayout />;
}

function RedirectToHome() {
  useEffect(() => {
    window.history.replaceState(null, "", "/");
    window.location.reload();
  }, []);
  return null;
}

function App() {
  const [pathname] = useLocation();

  const memberMatch = pathname.match(/^\/subscribe\/member\/([^/]+)$/);
  const confirmMatch = pathname.match(/^\/subscribe\/confirm\/([^/]+)$/);
  const subscribeMatch = pathname.match(/^\/subscribe\/([^/]+)$/);
  const schichtplanMatch = pathname.match(/^\/schichtplan\/([^/]+)$/);

  const isRoot = pathname === "/";
  const isVeranstaltungen = pathname === "/veranstaltungen";
  const isPortal = pathname === "/mein-bereich";
  const isPasswordReset = pathname === "/passwort-reset";
  const isDatenschutz = pathname === "/datenschutz";
  const isAbmelden = pathname === "/abmelden";
  const isAnleitung = pathname === "/anleitung";
  const isMitmachen = pathname === "/mitmachen";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isVeranstaltungen ? (
          <RedirectToHome />
        ) : memberMatch ? (
          <SubscribeMemberPage memberId={memberMatch[1]} />
        ) : confirmMatch ? (
          <SubscribeConfirmPage token={confirmMatch[1]} />
        ) : subscribeMatch ? (
          <SubscribePage eventId={subscribeMatch[1]} />
        ) : isRoot ? (
          <PublicEventsPage />
        ) : isPortal ? (
          <PortalPage />
        ) : isPasswordReset ? (
          <PasswordResetPage />
        ) : isDatenschutz ? (
          <DatenschutzPage />
        ) : isAbmelden ? (
          <AbmeldenPage />
        ) : isAnleitung ? (
          <AnleitungPage />
        ) : isMitmachen ? (
          <MitmachenPage />
        ) : schichtplanMatch ? (
          <SchichtplanPage eventId={schichtplanMatch[1]} />
        ) : isAdmin ? (
          <AuthGate />
        ) : (
          <NotFound />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

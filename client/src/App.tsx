import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import EventsPage from "@/pages/events";
import SubscribersPage from "@/pages/subscribers";
import QRCodesPage from "@/pages/qr-codes";
import SubscribePage from "@/pages/subscribe";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/events" component={EventsPage} />
      <Route path="/subscribers" component={SubscribersPage} />
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
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center p-3 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-hidden flex flex-col">
            <AdminRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  const [isSubscribe] = useRoute("/subscribe/:eventId");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {isSubscribe ? <SubscribeRoute /> : <AdminLayout />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

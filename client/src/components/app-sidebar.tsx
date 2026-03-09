import { Calendar, Mail, LayoutDashboard, QrCode, Phone, MapPin } from "lucide-react";
import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Veranstaltungen", url: "/events", icon: Calendar },
  { title: "Abonnenten", url: "/subscribers", icon: Mail },
  { title: "QR-Codes", url: "/qr-codes", icon: QrCode },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/lions-logo.png"
            alt="Lions Club Logo"
            className="h-10 w-10 rounded-md object-contain"
            data-testid="img-sidebar-logo"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">Lions Club</span>
            <span className="text-xs opacity-70">Mei&szlig;ner Land</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider opacity-60">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={isActive}
                      className="data-[active=true]:bg-sidebar-accent"
                    >
                      <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="space-y-2 text-xs opacity-70">
          <p className="font-semibold opacity-100 text-sm">Kontakt</p>
          <p>Sebastian Schreiber</p>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span>Seestr. 18e, 01640 Coswig</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3 shrink-0" />
            <a href="tel:01723408543" className="hover:underline" data-testid="link-phone">0172 340 85 43</a>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 shrink-0" />
            <a href="mailto:schreiber1988@gmx.net" className="hover:underline truncate" data-testid="link-email">schreiber1988@gmx.net</a>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

import { Link, useLocation } from "wouter";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  ListTodo,
  Users,
  Settings,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="font-semibold">Meeting Manager</span>
            </div>
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/">
                  <SidebarMenuButton
                    isActive={location === "/"}
                    tooltip="Dashboard"
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/meetings">
                  <SidebarMenuButton
                    isActive={location.startsWith("/meetings")}
                    tooltip="Meetings"
                  >
                    <Calendar />
                    <span>Meetings</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Link href="/calendar">
                  <SidebarMenuButton
                    isActive={location === "/calendar"}
                    tooltip="Calendar"
                  >
                    <Calendar />
                    <span>Calendar</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Link href="/meetings/new">
                    <Plus className="h-4 w-4" />
                    New Meeting
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="mt-auto">
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href="/profile/settings">
                    <SidebarMenuButton
                      isActive={location === "/profile/settings"}
                      tooltip="Settings"
                    >
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-x-hidden bg-background">{children}</main>
      </div>
    </SidebarProvider>
  );
}
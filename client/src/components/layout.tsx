import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LayoutDashboard, Calendar, Settings } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isNotDashboard = location !== "/";

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {isNotDashboard && (
              <h1 className="text-4xl font-bold">
                {location.startsWith("/meetings") ? "Meetings" :
                 location === "/calendar" ? "Calendar" :
                 location === "/profile/settings" ? "Settings" : ""}
              </h1>
            )}
            <div className={`flex items-center gap-2 ${!isNotDashboard ? "ml-auto" : ""}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/meetings" className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Meetings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/calendar" className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Calendar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile/settings" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
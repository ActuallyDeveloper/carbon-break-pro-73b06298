import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Home, User, Settings, Trophy, Users, MessageSquare, Palette, Calendar, Gamepad2, ShoppingCart, Menu, X, Library } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useUsername } from "@/hooks/useUsername";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { username } = useUsername();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  const navItems = [
    { to: "/home", icon: Home, label: "Home" },
    { to: "/single-player", icon: Gamepad2, label: "Single Player" },
    { to: "/multiplayer", icon: Users, label: "Multiplayer" },
    { to: "/tournaments", icon: Trophy, label: "Tournaments" },
    { to: "/level-designer", icon: Palette, label: "Designer" },
    { to: "/level-browser", icon: Library, label: "Browse Levels" },
    { to: "/single-player-shop", icon: ShoppingCart, label: "SP Shop" },
    { to: "/multiplayer-shop", icon: ShoppingCart, label: "MP Shop" },
    { to: "/seasonal-events", icon: Calendar, label: "Events" },
    { to: "/social", icon: Users, label: "Social" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-border">
        <div className="p-6 border-b border-border">
          <Link to="/home" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-foreground flex items-center justify-center">
              <span className="text-background text-xl font-bold">C</span>
            </div>
            <span className="text-2xl font-bold tracking-tight group-hover:opacity-80 transition-opacity">
              Carbon
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 h-11 ${
                  isActive(item.to) ? "bg-accent" : ""
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          {username && (
            <div className="px-3 py-2 mb-2 bg-accent rounded-lg">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="font-bold text-sm truncate">{username}</p>
            </div>
          )}
          <Link to="/profile">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 ${
                isActive("/profile") ? "bg-accent" : ""
              }`}
            >
              <User className="h-5 w-5" />
              <span className="font-medium">Profile</span>
            </Button>
          </Link>
          <Link to="/settings">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 ${
                isActive("/settings") ? "bg-accent" : ""
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
            </Button>
          </Link>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="flex-1"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              className="flex-1"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden border-b border-border">
          <div className="flex items-center justify-between p-4">
            <Link to="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-foreground flex items-center justify-center">
                <span className="text-background text-lg font-bold">C</span>
              </div>
              <span className="text-xl font-bold">Carbon</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="border-t border-border p-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {navItems.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 h-11 ${
                      isActive(item.to) ? "bg-accent" : ""
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-1">
                {username && (
                  <div className="px-3 py-2 mb-2 bg-accent rounded-lg">
                    <p className="text-xs text-muted-foreground">Logged in as</p>
                    <p className="font-bold text-sm truncate">{username}</p>
                  </div>
                )}
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                    <User className="h-5 w-5" />
                    <span className="font-medium">Profile</span>
                  </Button>
                </Link>
                <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-11">
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Settings</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-11"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Sign Out</span>
                </Button>
              </div>
            </nav>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

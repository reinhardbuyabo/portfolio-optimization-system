"use client";

import Link from "next/link";
import { TrendingUp, Menu, Bell, Settings, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const user = session?.user;
  const isLoading = status === "loading";
  const [imageError, setImageError] = useState(false);
  
  // Get first initial for avatar fallback
  const getInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.image]);

  return (
    <header className="bg-card border-b border-border h-[70px] sticky top-0 z-50">
      <div className="container h-full flex items-center justify-between">
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="p-2 hover:bg-muted rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Go to home">
            <div className="w-10 h-10 bg-gradient-to-br from-chart-1 to-chart-2 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="text-xl">LSTM-GARCH</span>
          </Link>
        </div>

        {/* Right side actions */}
        {!isLoading && user ? (
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className="px-3 py-2 hover:bg-muted rounded-lg">Dashboard</Link>
            <button className="p-2 hover:bg-muted rounded-lg" aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </button>
            <Link href="/settings" className="p-2 hover:bg-muted rounded-lg" aria-label="Settings">
              <Settings className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 pl-3 ml-1 border-l border-border">
              <div className="hidden md:block text-right">
                <p className="text-sm">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role || "investor"}</p>
              </div>
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center overflow-hidden">
                {user.image && typeof user.image === "string" && user.image.trim().length > 0 && !imageError ? (
                  <img 
                    src={user.image} 
                    alt={user.name || "User"} 
                    className="w-full h-full object-cover" 
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-sm font-medium text-primary-foreground select-none">
                    {getInitial()}
                  </span>
                )}
              </div>
            </div>
            <button onClick={logout} className="p-2 hover:bg-destructive/20 text-destructive rounded-lg" aria-label="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </nav>
        ) : !isLoading ? (
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/sign-in" className="px-4 py-2 hover:bg-muted rounded-lg transition-colors">Login</Link>
            <Link href="/sign-up" className="px-4 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-colors">Get Started</Link>
          </nav>
        ) : (
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <Sidebar open={open} onClose={() => setOpen(false)} user={user} />
    </header>
  );
}

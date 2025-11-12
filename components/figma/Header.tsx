import { User } from "../types";
import {
  TrendingUp,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { formatPercent } from "../lib/utils";

interface HeaderProps {
  user: User | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onMenuToggle?: () => void;
  onThemeToggle?: () => void;
  darkMode?: boolean;
  marketStatus?: {
    index: number;
    change: number;
  };
}

export function Header({
  user,
  onNavigate,
  onLogout,
  onMenuToggle,
  onThemeToggle,
  darkMode,
  marketStatus,
}: HeaderProps) {
  return (
    <header className="bg-card border-b border-border h-[70px] sticky top-0 z-50">
      <div className="container h-full flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-8">
          {/* Hamburger Menu Button */}
          {user && onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 hover:bg-muted rounded-lg transition-colors ml-2"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          <button
            onClick={() =>
              onNavigate(user ? "dashboard" : "landing")
            }
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to home"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-chart-1 to-chart-2 rounded-lg flex items-center justify-center">
              <TrendingUp
                className="w-6 h-6 text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-xl">LSTM-GARCH</span>
          </button>

          {/* Market Status Ticker */}
          {marketStatus && user && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                NSE 20:
              </span>
              <span>{marketStatus.index.toFixed(2)}</span>
              <span
                className={
                  marketStatus.change >= 0
                    ? "text-success"
                    : "text-destructive"
                }
              >
                {formatPercent(marketStatus.change)}
              </span>
            </div>
          )}
        </div>

        {/* User Menu */}
        {user ? (
          <nav
            className="flex items-center gap-4"
            aria-label="User menu"
          >
            <button
              onClick={() => onNavigate("dashboard")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Theme Toggle Button */}
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Moon
                    className="w-5 h-5"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}

            <button
              onClick={() => onNavigate("settings")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings
                className="w-5 h-5"
                aria-hidden="true"
              />
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="hidden md:block text-right">
                <p className="text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <UserIcon
                  className="w-5 h-5 text-primary-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("login")}
              className="px-4 py-2 hover:bg-muted rounded-lg transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => onNavigate("register")}
              className="px-4 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-colors"
            >
              Get Started
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
"use client";

import Link from "next/link";
import { X, LayoutDashboard, BarChart3, LineChart, Settings, Users, TrendingUp } from "lucide-react";

interface User {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: User | null | undefined;
}

export default function Sidebar({ open, onClose, user }: SidebarProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] z-[61] bg-card border-r border-border transform transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between h-[70px] px-4 border-b border-border">
          <div className="text-sm text-muted-foreground">{user?.name || user?.email || "Guest"}</div>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link href="/portfolios" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <BarChart3 className="w-4 h-4" />
            <span>Portfolios</span>
          </Link>
          <Link href="/market" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <LineChart className="w-4 h-4" />
            <span>Market</span>
          </Link>
          <Link href="/stock-analysis" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <TrendingUp className="w-4 h-4" />
            <span>Stock Analysis</span>
          </Link>
          <Link href="/reports" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <BarChart3 className="w-4 h-4" />
            <span>Reports</span>
          </Link>
          {user && (user.role === "ADMIN" || user.role === "MANAGER" || user.role === "admin" || user.role === "manager") && (
            <Link href="/admin" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
              <Users className="w-4 h-4" />
              <span>Admin</span>
            </Link>
          )}
          <Link href="/settings" onClick={onClose} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-muted">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}
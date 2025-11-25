"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { Users, Activity, Database, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { MetricCard } from "@/components/figma/MetricCard";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Portfolio {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "system" | "models">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchPortfolios();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }

  async function fetchPortfolios() {
    try {
      const res = await fetch("/api/portfolios");
      if (res.ok) {
        const data = await res.json();
        setPortfolios(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch portfolios:", err);
    }
  }

  const systemMetrics = {
    uptime: "99.9%",
    activeUsers: users.length,
    totalPortfolios: portfolios.length,
    apiCalls: 45678,
  };

  const modelStatus = [
    { name: "LSTM Model", status: "active", lastRun: "2024-11-06T10:30:00Z", accuracy: 96.8 },
    { name: "GARCH Model", status: "active", lastRun: "2024-11-06T10:25:00Z", accuracy: 95.2 },
    { name: "Optimization Engine", status: "active", lastRun: "2024-11-06T09:15:00Z", accuracy: 98.5 },
    { name: "Risk Calculator", status: "warning", lastRun: "2024-11-05T23:45:00Z", accuracy: 94.1 },
  ];

  const systemLogs = [
    { id: "1", level: "info", message: "User login: manager@example.com", timestamp: "2024-11-06T11:45:00Z" },
    { id: "2", level: "success", message: "Portfolio optimization completed for Portfolio #1", timestamp: "2024-11-06T11:30:00Z" },
    { id: "3", level: "warning", message: "High API usage detected", timestamp: "2024-11-06T11:15:00Z" },
    { id: "4", level: "info", message: "Scheduled backtest initiated", timestamp: "2024-11-06T11:00:00Z" },
    { id: "5", level: "error", message: "Failed to fetch market data for BAMB", timestamp: "2024-11-06T10:50:00Z" },
  ];

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="mb-2">System Administration</h1>
        <p className="text-muted-foreground">Manage users, monitor system health, and oversee ML pipeline performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="System Uptime" value={systemMetrics.uptime} icon={Activity} trend="up" />
        <MetricCard title="Active Users" value={String(systemMetrics.activeUsers)} icon={Users} trend="neutral" />
        <MetricCard title="Total Portfolios" value={String(systemMetrics.totalPortfolios)} icon={Database} trend="neutral" />
        <MetricCard title="API Calls (24h)" value={systemMetrics.apiCalls.toLocaleString()} icon={Activity} trend="neutral" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab("users")} className={`flex-1 py-4 px-6 transition-colors ${activeTab === "users" ? "bg-primary/10 text-primary border-b-2 border-primary" : "hover:bg-muted"}`}>User Management</button>
          <button onClick={() => setActiveTab("models")} className={`flex-1 py-4 px-6 transition-colors ${activeTab === "models" ? "bg-primary/10 text-primary border-b-2 border-primary" : "hover:bg-muted"}`}>ML Models</button>
          <button onClick={() => setActiveTab("system")} className={`flex-1 py-4 px-6 transition-colors ${activeTab === "system" ? "bg-primary/10 text-primary border-b-2 border-primary" : "hover:bg-muted"}`}>System Logs</button>
        </div>

        <div className="p-6">
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3>User Accounts</h3>
                <button className="px-4 py-2 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all">Add New User</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 text-sm text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">{user.name || "N/A"}</td>
                        <td className="py-3 px-4 text-sm">{user.email}</td>
                        <td className="py-3 px-4">
                          <select defaultValue={user.role} className="px-3 py-1 bg-muted border border-border rounded text-sm capitalize">
                            <option value="investor">Investor</option>
                            <option value="analyst">Analyst</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/20 text-success rounded text-xs">
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="px-3 py-1 text-sm border border-border hover:bg-muted rounded transition-colors">Edit</button>
                            <button className="px-3 py-1 text-sm text-destructive hover:bg-destructive/20 rounded transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "models" && (
            <div className="space-y-4">
              <h3 className="mb-4">ML Pipeline Status</h3>
              <div className="grid gap-4">
                {modelStatus.map((model) => (
                  <div key={model.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${model.status === "active" ? "bg-success/20" : model.status === "warning" ? "bg-warning/20" : "bg-destructive/20"}`}>
                        {model.status === "active" ? (
                          <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />
                        ) : model.status === "warning" ? (
                          <AlertCircle className="w-6 h-6 text-warning" aria-hidden="true" />
                        ) : (
                          <XCircle className="w-6 h-6 text-destructive" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <h4 className="mb-1">{model.name}</h4>
                        <p className="text-sm text-muted-foreground">Last run: {formatDate(model.lastRun)} • Accuracy: {model.accuracy}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors text-sm">View Logs</button>
                      <button className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm">Run Test</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-info/10 border border-info/30 rounded-lg">
                <h4 className="text-sm text-info mb-2">System Health Check</h4>
                <p className="text-sm text-muted-foreground">All critical models are operational. One model showing minor performance degradation - scheduled maintenance recommended.</p>
              </div>
            </div>
          )}

          {activeTab === "system" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3>System Activity Logs</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors text-sm">Filter</button>
                  <button className="px-4 py-2 border border-border hover:bg-muted rounded-lg transition-colors text-sm">Export Logs</button>
                </div>
              </div>
              <div className="space-y-2">
                {systemLogs.map((log) => {
                  const levelColorMap = {
                    info: "text-info bg-info/10 border-info/30",
                    success: "text-success bg-success/10 border-success/30",
                    warning: "text-warning bg-warning/10 border-warning/30",
                    error: "text-destructive bg-destructive/10 border-destructive/30",
                  };
                  const levelColor = levelColorMap[log.level as keyof typeof levelColorMap] || "text-muted-foreground";
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <span className={`px-2 py-1 rounded text-xs uppercase border ${levelColor}`}>{log.level}</span>
                      <div className="flex-1">
                        <p className="text-sm mb-1">{log.message}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

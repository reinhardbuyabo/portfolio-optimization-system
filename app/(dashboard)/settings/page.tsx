"use client";

import { useEffect, useState } from "react";
import type { UIUser } from "@/types";
import { User as UserIcon, Bell, Lock, Palette } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "preferences" | "security">("profile");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", timezone: "Africa/Nairobi", language: "en" });
  const [notifications, setNotifications] = useState({ emailAlerts: true, priceAlerts: true, volatilityAlerts: true, portfolioUpdates: true, weeklyReports: false, newsDigest: true });
  const [preferences, setPreferences] = useState({ theme: "dark", currency: "KES", refreshInterval: "5", chartType: "line" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem("uiUser");
      const user: UIUser | null = raw ? JSON.parse(raw) : null;
      setFormData((p) => ({ ...p, name: user?.name || "User", email: user?.email || "user@example.com" }));
    } catch {}
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    alert("Settings saved successfully!");
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and application settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1 bg-card border border-border rounded-lg p-4" aria-label="Settings navigation">
          <ul className="space-y-1">
            {[
              { id: "profile", label: "Profile", icon: UserIcon },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "preferences", label: "Preferences", icon: Palette },
              { id: "security", label: "Security", icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon as any;
              return (
                <li key={tab.id}>
                  <button onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === tab.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`} aria-current={activeTab === tab.id ? "page" : undefined}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="lg:col-span-3 bg-card border border-border rounded-lg p-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Profile Information</h3>
                <p className="text-sm text-muted-foreground mb-6">Update your personal information and contact details</p>
              </div>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-primary-foreground" aria-hidden="true" />
                </div>
                <div>
                  <button className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-lg transition-colors text-sm">Change Avatar</button>
                  <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max size 2MB.</p>
                </div>
              </div>
              <div className="grid gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm mb-2">Full Name</label>
                  <input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm mb-2">Email Address</label>
                  <input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm mb-2">Phone Number</label>
                  <input id="phone" type="tel" placeholder="+254 700 000 000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="timezone" className="block text-sm mb-2">Timezone</label>
                    <select id="timezone" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                      <option value="Africa/Nairobi">East Africa Time (EAT)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="language" className="block text-sm mb-2">Language</label>
                    <select id="language" value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground mb-6">Configure how and when you receive notifications</p>
              </div>
              <div className="space-y-4">
                {Object.entries({
                  emailAlerts: "Email Alerts",
                  priceAlerts: "Price Movement Alerts",
                  volatilityAlerts: "Volatility Alerts",
                  portfolioUpdates: "Portfolio Updates",
                  weeklyReports: "Weekly Performance Reports",
                  newsDigest: "Market News Digest",
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="text-sm mb-1">{label}</h4>
                      <p className="text-xs text-muted-foreground">
                        {key === "emailAlerts" && "Receive notifications via email"}
                        {key === "priceAlerts" && "Get notified when stock prices change significantly"}
                        {key === "volatilityAlerts" && "Alerts for high volatility events"}
                        {key === "portfolioUpdates" && "Updates about your portfolio performance"}
                        {key === "weeklyReports" && "Weekly summary of your portfolio"}
                        {key === "newsDigest" && "Daily market news and insights"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifications[key as keyof typeof notifications]} onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })} />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-chart-1/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-chart-1" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Application Preferences</h3>
                <p className="text-sm text-muted-foreground mb-6">Customize your application experience</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="theme" className="block text-sm mb-2">Theme</label>
                  <select id="theme" value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                    <option value="dark">Dark Mode</option>
                    <option value="light">Light Mode</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm mb-2">Default Currency</label>
                  <select id="currency" value={preferences.currency} onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="refresh" className="block text-sm mb-2">Data Refresh Interval (minutes)</label>
                  <select id="refresh" value={preferences.refreshInterval} onChange={(e) => setPreferences({ ...preferences, refreshInterval: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                    <option value="1">1 minute</option>
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="chart-type" className="block text-sm mb-2">Default Chart Type</label>
                  <select id="chart-type" value={preferences.chartType} onChange={(e) => setPreferences({ ...preferences, chartType: e.target.value })} className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1">
                    <option value="line">Line Chart</option>
                    <option value="candlestick">Candlestick</option>
                    <option value="area">Area Chart</option>
                    <option value="bar">Bar Chart</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4">Security Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">Manage your password and security preferences</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm mb-2">Current Password</label>
                  <input id="current-password" type="password" placeholder="Enter current password" className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm mb-2">New Password</label>
                  <input id="new-password" type="password" placeholder="Enter new password" className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm mb-2">Confirm New Password</label>
                  <input id="confirm-password" type="password" placeholder="Confirm new password" className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-chart-1" />
                </div>
                <button className="px-6 py-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors">Update Password</button>
              </div>
              <div className="pt-6 border-t border-border">
                <h4 className="mb-4">Two-Factor Authentication</h4>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account by enabling two-factor authentication.</p>
                  <button className="px-6 py-3 border border-border hover:bg-muted rounded-lg transition-colors">Enable 2FA</button>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <h4 className="mb-4 text-destructive">Danger Zone</h4>
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                  <button className="px-6 py-3 bg-destructive text-white hover:bg-destructive/90 rounded-lg transition-colors">Delete Account</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
            <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-gradient-to-r from-chart-1 to-chart-1/80 hover:from-chart-1/90 hover:to-chart-1/70 rounded-lg transition-all disabled:opacity-50">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Header from "@/components/newui/Header";
import Footer from "@/components/newui/Footer";

export const metadata: Metadata = {
  title: {
    template: "%s | Portfolio Optimization System",
    default: "Portfolio Optimization System",
  },
  description: "AI-powered portfolio optimization with LSTM and GARCH predictions",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      {children}
      <Footer />
    </main>
  );
}




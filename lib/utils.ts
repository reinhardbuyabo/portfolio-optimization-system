import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert prisma object into a regular JS Object
export function convertToPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Format errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatError(error: any) {
  if (error.name === 'ZodError') {
    // Handle Zod error
    const fieldErrors = Object.keys(error.issues).map(
          (field) => error.issues[field].message
    
    );

    return fieldErrors.join('. ');
  } else if (
    error.name === 'PrismaClientKnownRequestError' &&
    error.code === 'P2002'
  ) {
    // Handle Prisma error
    const field = error.meta?.target ? error.meta.target[0] : 'Field';
    return `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  } else {
    // Handle other errors
    return typeof error.message === 'string'
      ? error.message
      : JSON.stringify(error.message);
  }
}

export function getErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String(error.message);
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "Something went wrong";
  }

  return message;
}

// ---- UI formatting helpers (from Figma/Vite bundle) ----
export function formatCurrency(value: number, currency: string = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  const formattedNumber = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: 'exceptZero',
  }).format(value);
  return `${formattedNumber}%`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${formatNumber(value / 1e9, 2)}B`;
  }
  if (value >= 1e6) {
    return `${formatNumber(value / 1e6, 2)}M`;
  }
  if (value >= 1e3) {
    return `${formatNumber(value / 1e3, 2)}K`;
  }
  return formatNumber(value, 0);
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-destructive';
  return 'text-foreground';
}

export function getSentimentColor(sentiment?: 'positive' | 'neutral' | 'negative'): string {
  switch (sentiment) {
    case 'positive':
      return 'text-success';
    case 'negative':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

export function calculateSharpeRatio(returns: number, volatility: number, riskFreeRate: number = 0.05): number {
  return (returns - riskFreeRate) / volatility;
}

// Simple utility to join class names (kept for compatibility with React UI snippets)
export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function calculatePortfolioMetrics(
  holdings: Array<{ weight: number; return: number; volatility: number }>
) {
  const portfolioReturn = holdings.reduce((sum, h) => sum + h.weight * h.return, 0);
  const portfolioVolatility = Math.sqrt(
    holdings.reduce((sum, h) => sum + Math.pow(h.weight * h.volatility, 2), 0)
  );
  const sharpeRatio = calculateSharpeRatio(portfolioReturn, portfolioVolatility);

  return {
    return: portfolioReturn,
    volatility: portfolioVolatility,
    sharpeRatio,
  };
}

export function getTimeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

// ---- Risk helpers (shared across UI) ----
export type RiskCategory = "low" | "medium" | "high";

export function getRiskCategory(volatility: number): RiskCategory {
  if (volatility < 0.15) return "low";
  if (volatility < 0.25) return "medium";
  return "high";
}

export function riskTextClass(category: RiskCategory): string {
  switch (category) {
    case "low":
      return "text-success";
    case "high":
      return "text-destructive";
    default:
      return "text-warning";
  }
}

export function riskBadgeClass(category: RiskCategory): string {
  switch (category) {
    case "low":
      return "text-success bg-success/10 border-success/30";
    case "high":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-warning bg-warning/10 border-warning/30";
  }
}

"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useDashboardOverview } from "@/hooks/use-dashboard";
import type { TimePeriod } from "@/lib/services/dashboard";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

const periodLabels: Record<TimePeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half Yearly",
  yearly: "Yearly",
};

const defaultData = {
  revenue: 0,
  newCustomers: 0,
  activeAccounts: 0,
  growthRate: 0,
  revenueChange: 0,
  customersChange: 0,
  accountsChange: 0,
  growthChange: 0,
};

function getPeriodLabel(period: TimePeriod) {
  switch (period) {
    case "monthly":
      return "month";
    case "quarterly":
      return "quarter";
    case "half-yearly":
      return "half year";
    case "yearly":
      return "year";
    default:
      return "month";
  }
}

function getCurrentPeriodDescription(period: TimePeriod) {
  return `current ${getPeriodLabel(period)}`;
}

export type OverviewMetricCardProps = {
  description: string;
  value: ReactNode;
  change: number;
  periodLabel: string;
  footerTrendText: string;
  footerDescription: string;
  error?: {
    title: string;
    description: string;
  };
};

export function OverviewMetricCard({
  description,
  value,
  change,
  periodLabel,
  footerTrendText,
  footerDescription,
  error,
}: OverviewMetricCardProps) {
  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{description}</CardDescription>
          <CardAction>
            <Badge
              variant="outline"
              className="text-destructive border-destructive/50"
            >
              <AlertCircle className="size-4" />
              {error.title}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <CardTitle className="text-destructive text-2xl font-semibold tabular-nums">
            —
          </CardTitle>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1.5">
          <ErrorMessage className="text-left">{error.description}</ErrorMessage>
        </CardFooter>
      </Card>
    );
  }

  const isPositive = change >= 0;
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{description}</CardDescription>

        <CardAction>
          <Badge variant="outline">
            {isPositive ? <TrendingUp /> : <TrendingDown />}
            {isPositive ? "+" : ""}
            {change.toFixed(2)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardContent>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {footerTrendText} this {periodLabel}{" "}
          {isPositive ? (
            <TrendingUp className="size-4" />
          ) : (
            <TrendingDown className="size-4" />
          )}
        </div>
        <div className="text-muted-foreground">{footerDescription}</div>
      </CardFooter>
    </Card>
  );
}

function OverviewCardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <CardTitle className="space-y-2">
          <Skeleton className="h-8 w-32 @[250px]/card:h-9" />
        </CardTitle>
        <CardAction>
          <Skeleton className="h-6 w-14 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <Skeleton className="h-4 w-full max-w-[200px]" />
        <Skeleton className="h-4 w-full max-w-[160px]" />
      </CardFooter>
    </Card>
  );
}

export function SectionCards() {
  const [period, setPeriod] = useState<TimePeriod>("monthly");
  const { data = defaultData, isLoading, isError, error } = useDashboardOverview(period);
  const overviewCardError = isError
    ? {
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load overview",
      }
    : undefined;

  return (
    <div className="space-y-4 px-4 lg:px-6">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Key metrics and statistics
          </p>
        </div>
        <Select
          value={period}
          onValueChange={(value) => setPeriod(value as TimePeriod)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" labels={periodLabels} />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="half-yearly">Half Yearly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {isLoading ? (
          <>
            <OverviewCardSkeleton />
            <OverviewCardSkeleton />
            <OverviewCardSkeleton />
            <OverviewCardSkeleton />
          </>
        ) : (
          <>
            <OverviewMetricCard
              description="Total Revenue"
              value={
                <>
                  Rs.
                  {data.revenue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </>
              }
              change={data.revenueChange}
              periodLabel={getPeriodLabel(period)}
              footerTrendText={data.revenueChange >= 0 ? "Trending up" : "Trending down"}
              footerDescription={`Revenue for the ${getCurrentPeriodDescription(period)}`}
              error={overviewCardError}
            />
            <OverviewMetricCard
              description="New Customers"
              value={data.newCustomers.toLocaleString()}
              change={data.customersChange}
              periodLabel={getPeriodLabel(period)}
              footerTrendText={data.customersChange >= 0 ? "Up" : "Down"}
              footerDescription={
                data.customersChange >= 0
                  ? "Strong customer growth"
                  : "Acquisition needs attention"
              }
              error={overviewCardError}
            />
            <OverviewMetricCard
              description="Active Accounts"
              value={data.activeAccounts.toLocaleString()}
              change={data.accountsChange}
              periodLabel={getPeriodLabel(period)}
              footerTrendText={
                data.accountsChange >= 0
                  ? "Strong user retention"
                  : "Retention needs improvement"
              }
              footerDescription={
                data.accountsChange >= 0
                  ? "Engagement exceed targets"
                  : "Focus on user engagement"
              }
              error={overviewCardError}
            />
            <OverviewMetricCard
              description="Growth Rate"
              value={`${data.growthRate.toFixed(2)}%`}
              change={data.growthChange}
              periodLabel={getPeriodLabel(period)}
              footerTrendText={
                data.growthChange >= 0
                  ? "Steady performance increase"
                  : "Performance decline"
              }
              footerDescription={
                data.growthChange >= 0
                  ? "Meets growth projections"
                  : "Review growth strategy"
              }
              error={overviewCardError}
            />
          </>
        )}
      </div>
    </div>
  );
}

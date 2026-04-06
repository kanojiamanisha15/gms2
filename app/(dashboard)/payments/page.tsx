"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";
import { ChartSkeleton } from "@/lib/utils/lazy-loading";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";

const PaymentsChart = dynamic(
  () => import("@/components/features/payments/payments-chart").then((mod) => ({ default: mod.PaymentsChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const ExpensesTable = dynamic(
  () => import("@/components/features/payments/expenses-table").then((mod) => ({ default: mod.ExpensesTable })),
  { ssr: false }
);

export default function PaymentsPage() {
  const { hasPermission } = usePermissions();
  return (
    <PageContent
      title="Payments and Invoice"
      description="View and manage payments and invoices"
    >
      {hasPermission(PERMISSIONS.PAYMENTS_READ) ? <div className="px-4 lg:px-6 space-y-6">
        <PaymentsChart />
      </div>:null}
      {hasPermission(PERMISSIONS.EXPENSES_READ) ? <ExpensesTable />:null}
    </PageContent>
  );
}

"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermissions } from "@/hooks/use-permissions";

const ExpensesTable = dynamic(
  () => import("@/components/features/expenses/expenses-table").then((mod) => ({ default: mod.ExpensesTable })),
  { ssr: false }
);

export default function ExpensesPage() {
  const { hasPermission } = usePermissions();
  return (
    <PageContent title="Expenses" description="View and manage gym expenses">
      {hasPermission(PERMISSIONS.EXPENSES_READ) ? <ExpensesTable /> : null}
    </PageContent>
  );
}

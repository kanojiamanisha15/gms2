"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";

const UsersTable = dynamic(
  () =>
    import("@/components/features/users/users-table").then((mod) => ({
      default: mod.UsersTable,
    })),
  { ssr: false }
);

export default function UsersPage() {
  return (
    <PageContent
      title="Users"
      description="Application accounts (login users), roles, and access"
    >
      <UsersTable />
    </PageContent>
  );
}

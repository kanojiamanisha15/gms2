"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";
import { MembersImportExportActions } from "@/components/features/members/members-import-export-actions";

const MembersTable = dynamic(
  () => import("@/components/features/members/members-table").then((mod) => ({ default: mod.MembersTable })),
  { ssr: false }
);

export default function MembersPage() {
  return (
    <PageContent
      title="Members"
      description="Manage your gym members"
      headerBottomAction={<MembersImportExportActions />}
    >
      <MembersTable />
    </PageContent>
  );
}

"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";
import { TrainersImportExportActions } from "@/components/features/trainers-staff/trainers-import-export-actions";

const TrainersTable = dynamic(
  () => import("@/components/features/trainers-staff/trainers-table").then((mod) => ({ default: mod.TrainersTable })),
  { ssr: false }
);

export default function TrainersStaffPage() {
  return (
    <PageContent
      title="Trainers/Staff"
      description="Manage trainers and staff members"
      headerBottomAction={<TrainersImportExportActions />}
    >
      <TrainersTable />
    </PageContent>
  );
}

"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";

const GymsTable = dynamic(
  () =>
    import("@/components/features/gyms/gyms-table").then((mod) => ({
      default: mod.GymsTable,
    })),
  { ssr: false }
);

export default function GymsPage() {
  return (
    <PageContent title="Gyms" description="Manage gym locations">
      <GymsTable />
    </PageContent>
  );
}

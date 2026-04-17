"use client";

import dynamic from "next/dynamic";
import { PageContent } from "@/components/ui/page-content";

const BanksTable = dynamic(
  () => import("@/components/features/banks/banks-table").then((mod) => ({ default: mod.BanksTable })),
  { ssr: false }
);

export default function BanksPage() {
  return (
    <PageContent
      title="Banks"
      description="Manage bank details"
    >
      <BanksTable />
    </PageContent>
  );
}

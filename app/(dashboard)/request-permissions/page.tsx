"use client";

import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/ui/page-content";

export default function RequestPermissionsPage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <PageContent
      title="Permissions Required"
      description="Ask admin to provide the required permissions for your account."
    >
      <div className="px-4 lg:px-6">
        <div className="max-w-xl rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            You do not currently have access to any of the modules.
            Please contact your administrator and ask them to assign permissions.
          </p>
          <Button className="mt-4" onClick={handleRefresh}>
            Refresh Page
          </Button>
        </div>
      </div>
    </PageContent>
  );
}

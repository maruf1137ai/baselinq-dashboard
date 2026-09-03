// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready

// import React from "react";
// import { Plug } from "lucide-react";

import UpcomingFeature from "@/components/settings/UpcomingFeature";
import { PageBody, PageHeader } from "@/components/ui/page-header";

const Integrations = () => {
  return (
    <PageBody>
      <PageHeader title="Integrations" description="Connect Baselinq with your existing tools and workflows." />
      <UpcomingFeature title="Integrations" />
      {/* UPCOMING_FEATURE: Original JSX commented out below — restore when backend integration is ready
      <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <Plug className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-normal text-foreground mb-1">Integrations</h3>
          <p className="text-xs text-muted-foreground max-w-md">Connect to Slack, Procore, Autodesk, Microsoft 365, and more, coming soon.</p>
        </div>
      </div>
      */}
    </PageBody>
  );
};

export default Integrations;

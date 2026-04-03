// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready

// import React from "react";
// import { Plug } from "lucide-react";

import UpcomingFeature from "@/components/settings/UpcomingFeature";

const Integrations = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect Baselinq with your existing tools and workflows.</p>
      </div>
      <UpcomingFeature title="Integrations" />
      {/* UPCOMING_FEATURE: Original JSX commented out below — restore when backend integration is ready
      <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <Plug className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Integrations</h3>
          <p className="text-xs text-muted-foreground max-w-md">Connect to Slack, Procore, Autodesk, Microsoft 365, and more, coming soon.</p>
        </div>
      </div>
      */}
    </div>
  );
};

export default Integrations;

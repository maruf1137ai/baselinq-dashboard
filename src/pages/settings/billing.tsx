// UPCOMING_FEATURE: All original code commented out — restore when backend integration is ready

// import React from "react";
// import { CreditCard } from "lucide-react";

import UpcomingFeature from "@/components/settings/UpcomingFeature";

const Billing = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-normal tracking-tight text-foreground">Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription, invoices, and payment methods.</p>
      </div>
      <UpcomingFeature title="Billing" />
      {/* UPCOMING_FEATURE: Original JSX commented out below — restore when backend integration is ready
      <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">Billing & Subscription</h3>
          <p className="text-xs text-muted-foreground max-w-md">View invoices, manage payment methods, and update your subscription plan, coming soon.</p>
        </div>
      </div>
      */}
    </div>
  );
};

export default Billing;

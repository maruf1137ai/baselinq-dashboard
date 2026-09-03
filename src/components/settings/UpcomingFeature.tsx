import { Construction } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

interface UpcomingFeatureProps {
  title: string;
}

const UpcomingFeature = ({ title }: UpcomingFeatureProps) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <EmptyState
        variant="plain"
        icon={Construction}
        title={`${title} is not available yet`}
        description="Still in development. Nothing is missing from your project."
      />
    </div>
  );
};

export default UpcomingFeature;

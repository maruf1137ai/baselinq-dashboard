import { Construction } from "lucide-react";

interface UpcomingFeatureProps {
  title: string;
}

const UpcomingFeature = ({ title }: UpcomingFeatureProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-5">
        <Construction className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {title} — Upcoming Feature
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        This feature is currently under development and will be available soon.
        Stay tuned for updates!
      </p>
    </div>
  );
};

export default UpcomingFeature;

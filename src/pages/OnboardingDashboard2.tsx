import { DashboardLayout } from "@/components/DashboardLayout";
import { Outlet } from "react-router-dom";

const OnboardingDashboard2 = () => {
  return (
    <DashboardLayout padding="p-0" overflow="overflow-hidden">
      <div className="flex-1 h-[calc(100vh-var(--app-header-h))] overflow-y-auto">
        <Outlet />
      </div>
    </DashboardLayout>
  );
};

export default OnboardingDashboard2;

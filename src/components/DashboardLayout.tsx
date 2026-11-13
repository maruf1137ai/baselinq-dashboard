import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useProjectCurrency } from "@/hooks/useProjectCurrency";
import { BillingLockBanner } from "./BillingLockBanner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  padding?: string;
  overflow?: string;
}

export function DashboardLayout({
  children,
  padding = "p-6",
  overflow = "overflow-auto",
}: DashboardLayoutProps) {
  // Contract money follows the selected project's currency (formatMoney).
  useProjectCurrency();
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          <BillingLockBanner />
          <main className={`flex-1 ${padding} bg-background ${overflow}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

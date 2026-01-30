import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";

interface DashboardLayoutProps {
  children: React.ReactNode;
  padding?: string;
}

export function DashboardLayout({
  children,
  padding = "p-6",
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader />
          <main className={`flex-1 ${padding} bg-white  overflow-auto`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

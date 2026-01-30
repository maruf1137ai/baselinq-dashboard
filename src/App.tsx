import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AiWorkSpace from "./pages/AiWorkSpace";
import Communications from "./pages/Communications";
import Finance from "./pages/finance";
import Login from "./pages/login";
import ProtectedRoute from "./ProtectedRoute";
import Task from "./pages/Task";
import TaskDetails from "./pages/TaskDetails";
import Meetings from "./pages/meetings";
import MeetingDetails from "./pages/meetingDetails";
import "./App.css";
import "../public/fonts/stylesheet.css";
import Programme from "./pages/programme";
import Compliance from "./pages/Compliance";
import Documents from "./pages/Documents";
import TeamManagement from "./pages/settings/teamManagement";
import Settings from "./pages/settings/settings";
import ProjectDetails from "./pages/settings/projectDetails";
import Audit from "./pages/settings/audit";
import Billing from "./pages/settings/billing";
import DataManagement from "./pages/settings/dataManagement";
import Integrations from "./pages/settings/integrations";
import Notifications from "./pages/settings/notifications";
import Security from "./pages/settings/security";
import Site from "./pages/settings/Site";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner closeButton visibleToasts={3} duration={2000} position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-workspace"
            element={
              <ProtectedRoute>
                <AiWorkSpace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/communications"
            element={
              <ProtectedRoute>
                <Communications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <Finance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <ProtectedRoute>
                <Meetings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings/:id"
            element={
              <ProtectedRoute>
                <MeetingDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/programme"
            element={
              <ProtectedRoute>
                <Programme />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/tasks" element={<Task />} />
          <Route path="/tasks/:taskId" element={<TaskDetails />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/documents" element={<Documents />} />
          {/* <Route path="/settings" element={<TeamManagement />} /> */}
          <Route path="/settings" element={<Settings />}>
            <Route index element={<TeamManagement />} /> {/* default page */}
            <Route path="project-details" element={<ProjectDetails />} />
            <Route path="site" element={<Site />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="billing" element={<Billing />} />
            <Route path="integrations" element={<Integrations />} />
            <Route path="security" element={<Security />} />
            <Route path="data-management" element={<DataManagement />} />
            <Route path="audit" element={<Audit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster as Sonner, Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AiWorkSpace from "./pages/AiWorkSpace";
import Communications from "./pages/Communications";
import Finance from "./pages/finance";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import Unauthorized from "./pages/Unauthorized";
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
import AuditPage from "./pages/AuditPage";
import Billing from "./pages/settings/billing";
import DataManagement from "./pages/settings/dataManagement";
import Integrations from "./pages/settings/integrations";
import Notifications from "./pages/settings/notifications";
import Security from "./pages/settings/security";
import Site from "./pages/settings/Site";
import AssociatedCompanies from "./pages/settings/AssociatedCompanies";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectProtectedRoute from "./components/ProjectProtectedRoute";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import DocumentDetail from "./pages/DocumentDetail";
import AcceptInvitation from "./pages/AcceptInvitation";
import AcceptAppointedInvitation from "./pages/AcceptAppointedInvitation";
import OnboardingDashboard from "./pages/OnboardingDashboard";
import OnboardingDashboard2 from "./pages/OnboardingDashboard2";
import SelectProject from "./pages/account/SelectProject";
import AccountProfile from "./pages/account/AccountProfile";
import AccountOrganization from "./pages/account/AccountOrganization";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner
        closeButton
        visibleToasts={3}
        duration={2000}
        position="bottom-right"
      />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <Index />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-workspace"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <AiWorkSpace />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-workspace/:taskTypeSlug/:taskId"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <AiWorkSpace />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/communications"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <Communications />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewFinance">
                  <ProjectProtectedRoute>
                    <Finance />
                  </ProjectProtectedRoute>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <Meetings />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings/:id"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <MeetingDetails />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/programme"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewProgramme">
                  <ProjectProtectedRoute>
                    <Programme />
                  </ProjectProtectedRoute>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
          <Route path="/accept-appointed-invitation/:token" element={<AcceptAppointedInvitation />} />
          <Route path="/tasks" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <Task />
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route path="/tasks/:taskId" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <TaskDetails />
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route path="/compliance" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <Compliance />
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route path="/audit"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <AuditPage />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/documents" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <Documents />
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route path="/documents/:docId" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <DocumentDetail />
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route
            path="/create-project"
            element={
              <ProtectedRoute>
                <CreateProject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-project"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <EditProject />
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/settings" element={
            <ProtectedRoute>
              <RoleRoute permission="viewSettings">
                <ProjectProtectedRoute>
                  <Settings />
                </ProjectProtectedRoute>
              </RoleRoute>
            </ProtectedRoute>
          }>
            <Route index element={<TeamManagement />} />
            <Route path="associated-companies" element={<AssociatedCompanies />} />
            <Route path="project-details" element={<ProjectDetails />} />
            <Route path="site" element={<Site />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="billing" element={
              <Billing />
            } />
            <Route path="integrations" element={
              <Integrations />
            } />
            <Route path="security" element={<Security />} />
            <Route path="data-management" element={<DataManagement />} />
            <Route path="audit" element={
              <Audit />
            } />
          </Route>
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <OnboardingDashboard2 />
              </ProtectedRoute>
            }
          >
            <Route index element={<SelectProject />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="organization" element={<AccountOrganization />} />
          </Route>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

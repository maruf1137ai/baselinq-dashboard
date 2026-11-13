import { Toaster as Sonner } from "@/components/ui/sonner";
import { retryUnlessRefused } from "@/lib/queryRetry";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StagingBanner } from "@/components/StagingBanner";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// Part 15: Linq (and its markdown renderer) loads only when someone opens it.
const AiWorkSpace = lazy(() => import("./pages/AiWorkSpace"));
const LinqLoading = () => (
  <div role="status" className="p-6 text-sm text-muted-foreground">Loading Linq…</div>
);
import Communications from "./pages/Communications";
import Finance from "./pages/finance";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import Unauthorized from "./pages/Unauthorized";
import Task from "./pages/Task";
import TaskDetails from "./pages/TaskDetails";
import CertificatePage from "./pages/CertificatePage";
import InvoicePage from "./pages/InvoicePage";
import TaxInvoicePage from "./pages/TaxInvoicePage";
import FinancialStatementPage from "./pages/FinancialStatementPage";
import Help from "./pages/Help";
import HelpHome from "./pages/HelpHome";
import HelpTasks from "./pages/HelpTasks";
import HelpFinance from "./pages/HelpFinance";
import HelpBilling from "./pages/HelpBilling";
import HelpProgramme from "./pages/HelpProgramme";
import HelpMeetings from "./pages/HelpMeetings";
import HelpCommunication from "./pages/HelpCommunication";
import HelpDocumentation from "./pages/HelpDocumentation";
import HelpCompliance from "./pages/HelpCompliance";
import HelpProjectHealth from "./pages/HelpProjectHealth";
import HelpSettings from "./pages/HelpSettings";
import RolesPermissions from "./pages/RolesPermissions";
import ForgotPassword from "./pages/ForgotPassword";
import Meetings from "./pages/meetings";
import MeetingDetails from "./pages/meetingDetails";
import "./App.css";
import "../public/fonts/stylesheet.css";
import Programme from "./pages/programme";
import Compliance from "./pages/Compliance";
import ProjectHealth from "./pages/ProjectHealth";
import Documents from "./pages/Documents";
import TeamManagement from "./pages/settings/teamManagement";
import Settings from "./pages/settings/settings";
import ProjectDetails from "./pages/settings/projectDetails";
import Audit from "./pages/settings/audit";
import AuditPage from "./pages/AuditPage";
import Billing from "./pages/settings/billing";
import ContractPayment from "./pages/settings/contractPayment";
import DataManagement from "./pages/settings/dataManagement";
import Integrations from "./pages/settings/integrations";
import Notifications from "./pages/settings/notifications";
import Security from "./pages/settings/security";
import Site from "./pages/settings/Site";
import AssociatedCompanies from "./pages/settings/AssociatedCompanies";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PermissionLiveSync } from "./components/PermissionLiveSync";
import ProjectProtectedRoute from "./components/ProjectProtectedRoute";
import CreateProject from "./pages/CreateProject";
import EditProject from "./pages/EditProject";
import DocumentDetail from "./pages/DocumentDetail";
import UploadDocument from "./pages/UploadDocumentWizard";
import AcceptInvitation from "./pages/AcceptInvitation";
import AcceptAppointedInvitation from "./pages/AcceptAppointedInvitation";
import OnboardingDashboard from "./pages/OnboardingDashboard";
import OnboardingDashboard2 from "./pages/OnboardingDashboard2";
import SelectProject from "./pages/account/SelectProject";
import AccountProfile from "./pages/account/AccountProfile";
import AccountOrganization from "./pages/account/AccountOrganization";
import AdminGuard from "./pages/account/admin/AdminGuard";
import AdminDashboard from "./pages/account/admin/AdminDashboard";
import AdminUsers from "./pages/account/admin/AdminUsers";
import AdminProjects from "./pages/account/admin/AdminProjects";
import AdminCompanies from "./pages/account/admin/AdminCompanies";
import AdminActivity from "./pages/account/admin/AdminActivity";
import AdminActivityDetail from "./pages/account/admin/AdminActivityDetail";
import AdminHealth from "./pages/account/admin/AdminHealth";
import BillingOverview from "./pages/account/admin/billing/BillingOverview";
import BillingProjects from "./pages/account/admin/billing/BillingProjects";
import BillingProjectDetail from "./pages/account/admin/billing/BillingProjectDetail";
import BillingFees from "./pages/account/admin/billing/BillingFees";
import BillingInvoices from "./pages/account/admin/billing/BillingInvoices";
import BillingSettings from "./pages/account/admin/billing/BillingSettings";
import BillingGuide from "./pages/account/admin/billing/BillingGuide";

// A 4xx is an answer, not an outage — see lib/queryRetry (QA BUG-22).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: retryUnlessRefused } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PermissionLiveSync />
    <TooltipProvider>
      {/* ONE toaster. A second, unconfigured instance of the same sonner
          component sat beside this one, so every toast in the app was drawn
          twice (QA BUG-17). */}
      <Sonner
        closeButton
        visibleToasts={3}
        duration={2000}
        position="bottom-right"
      />
      <StagingBanner />
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
                  <Suspense fallback={<LinqLoading />}><AiWorkSpace /></Suspense>
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-workspace/:taskTypeSlug/:taskId"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <Suspense fallback={<LinqLoading />}><AiWorkSpace /></Suspense>
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          {/* General project chat — no task context. :sessionId is optional;
              when absent the page initialises a new session. */}
          <Route
            path="/ai-workspace/project/:projectId/:sessionId?"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <Suspense fallback={<LinqLoading />}><AiWorkSpace /></Suspense>
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
          {/*
            `viewFinance` alone, plus the staff bypass.

            The list used to be ["viewFinance", "viewPlatformFees",
            "viewInvoices"], which is OR'd — so a role with the Finance area
            switched off but a billing code still granted reached this page and
            got a single surviving tab. finance.platform_fees.view and
            finance.invoices.view are now children of finance.view
            (user/migrations/0077), so holding one without the parent is no
            longer a state the server will resolve; admitting them here would
            only let such a user through to an empty page instead of
            /unauthorized.

            `allowPlatformStaff` sits outside the permission list in RoleRoute,
            so Baselinq staff still reach their own billing on projects they are
            not members of.
          */}
          <Route
            path="/finance"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewFinance" allowPlatformStaff>
                  <ProjectProtectedRoute>
                    <Finance />
                  </ProjectProtectedRoute>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          {/*
            One Baselinq tax invoice as a printable document.

            Same gate as the Finance page's Invoices tab: `viewInvoices`
            (finance.invoices.view) or platform staff, who raise the bill on
            projects they are not members of and so hold no permission there.

            NO ProjectProtectedRoute, deliberately: the invoice names its own
            project in its payload, and a staff member arriving from the admin
            panel may have no project selected at all. The server decides
            access to the invoice itself (billing/views.py).
          */}
          <Route
            path="/finance/statement"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewFinance">
                  <ProjectProtectedRoute>
                    <FinancialStatementPage />
                  </ProjectProtectedRoute>
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/finance/tax-invoices/:id"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewFinance">
                  <TaxInvoicePage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <RoleRoute permission="viewInvoices" allowPlatformStaff>
                  <InvoicePage />
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
          {/* Werner spec — public certificate page. No auth: possession of
              the UUID4 token is the access grant (same model as Google Docs
              sharing links). Backend returns 404 for missing/revoked tokens. */}
          <Route path="/certificates/:type/:token" element={<CertificatePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {/* OTP-based password reset — single page, three internal
              steps (request email → enter 6-digit code → set new password). */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
          {/* Help hub — sidebar's "Help" link lands here, chooser between
              the /help/tasks, /help/finance, /help/programme,
              /help/meetings, /help/communication, /help/documentation,
              /help/compliance, /help/project-health and /help/settings
              reference pages below. */}
          <Route path="/help" element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          } />
          {/* Home reference — what every section of the landing page shows,
              who can see it, and where each figure comes from. Home itself
              has no permission, so neither does its reference page. No
              project scope, same reasoning as /help/tasks. */}
          <Route path="/help/home" element={
            <ProtectedRoute>
              <HelpHome />
            </ProtectedRoute>
          } />
          {/* Werner task workflow reference — who can do what per doc type.
              No project scope; usable from anywhere in the app. */}
          <Route path="/help/tasks" element={
            <ProtectedRoute>
              <HelpTasks />
            </ProtectedRoute>
          } />
          {/* Finance reference — who can do what in Cost Ledger / VOs / PCs /
              Platform Fees. No project scope, same reasoning as /help/tasks. */}
          <Route path="/help/finance" element={
            <ProtectedRoute>
              <HelpFinance />
            </ProtectedRoute>
          } />
          {/* Billing reference — Baselinq's platform fee for project users:
              what it is charged on, the monthly invoice, paying it, and the
              statuses. No project scope, same reasoning as /help/tasks. */}
          <Route path="/help/billing" element={
            <ProtectedRoute>
              <HelpBilling />
            </ProtectedRoute>
          } />
          {/* Programme reference — who can do what in Schedule & Milestones,
              Milestone Fees, Programme Baseline, Risk Forecast. No project
              scope, same reasoning as /help/tasks. */}
          <Route path="/help/programme" element={
            <ProtectedRoute>
              <HelpProgramme />
            </ProtectedRoute>
          } />
          {/* Meetings reference — who can do what in Scheduling, Attendees,
              Updating & Cancelling, AI Notes & Transcripts. No project
              scope, same reasoning as /help/tasks. */}
          <Route path="/help/meetings" element={
            <ProtectedRoute>
              <HelpMeetings />
            </ProtectedRoute>
          } />
          {/* Communication reference — who can do what with Channels,
              To & CC, Sending Messages & Attachments, Channel Membership.
              No project scope, same reasoning as /help/tasks. */}
          <Route path="/help/communication" element={
            <ProtectedRoute>
              <HelpCommunication />
            </ProtectedRoute>
          } />
          {/* Documentation reference — who can do what in Viewing Documents,
              Uploading & Folders, Downloading & Previewing, Editing /
              Versioning / Deleting. No project scope, same reasoning as
              /help/tasks. */}
          <Route path="/help/documentation" element={
            <ProtectedRoute>
              <HelpDocumentation />
            </ProtectedRoute>
          } />
          {/* Compliance reference — who can open the page vs. who can see
              and act on what's inside it (two different permissions). No
              project scope, same reasoning as /help/tasks. */}
          <Route path="/help/compliance" element={
            <ProtectedRoute>
              <HelpCompliance />
            </ProtectedRoute>
          } />
          {/* Project Health reference — who can open the page vs. who can
              act on Risk Signals, Notice Deadlines, and the Insurer tab
              (almost none of it is permission-gated). No project scope,
              same reasoning as /help/tasks. */}
          <Route path="/help/project-health" element={
            <ProtectedRoute>
              <HelpProjectHealth />
            </ProtectedRoute>
          } />
          {/* Settings reference — User Management (add/edit/remove a team
              member) and Security (signing PIN, insurance broker). No
              project scope, same reasoning as /help/tasks. */}
          <Route path="/help/settings" element={
            <ProtectedRoute>
              <HelpSettings />
            </ProtectedRoute>
          } />
          {/* Roles & Permissions — its own permission category (roles.view/
              roles.edit), not settings.edit — default access is exactly
              Administrator/Principal Agent/Project Manager/Super User (see
              user/migrations/0059_seed_roles_permission_category.py).
              viewRolesPermissions is enough to enter (read-only); the page
              gates Save/Reset/toggle separately with editRolesPermissions.
              No ProjectProtectedRoute: the page shows its own "pick a
              project" placeholder when none is selected. */}
          <Route path="/roles-permissions" element={
            <ProtectedRoute>
              <RoleRoute permission="viewRolesPermissions">
                <RolesPermissions />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/compliance" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <RoleRoute permission="viewCompliance">
                  <Compliance />
                </RoleRoute>
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          {/* Project Health — live risk dashboard. Gated on the same
              permission as Compliance so no new permission code has to be
              seeded before this page is usable. */}
          <Route path="/project-health" element={
            <ProtectedRoute>
              <ProjectProtectedRoute>
                <RoleRoute permission="viewCompliance">
                  <ProjectHealth />
                </RoleRoute>
              </ProjectProtectedRoute>
            </ProtectedRoute>
          } />
          <Route path="/audit"
            element={
              <ProtectedRoute>
                <ProjectProtectedRoute>
                  <RoleRoute permission="viewAudit">
                    <AuditPage />
                  </RoleRoute>
                </ProjectProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/documents" element={
            <ProtectedRoute>
              <RoleRoute permission="viewDocuments">
                <ProjectProtectedRoute>
                  <Documents />
                </ProjectProtectedRoute>
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/documents/upload" element={
            <ProtectedRoute>
              <RoleRoute permission="uploadDocument">
                <ProjectProtectedRoute>
                  <UploadDocument />
                </ProjectProtectedRoute>
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/documents/:docId" element={
            <ProtectedRoute>
              <RoleRoute permission="viewDocuments">
                <ProjectProtectedRoute>
                  <DocumentDetail />
                </ProjectProtectedRoute>
              </RoleRoute>
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
              {/* Settings → Billing is readable on billing.terms.view alone, and
                  Contract & payment on finance.view, so the shell admits both;
                  the other pages keep viewSettings. */}
              <RoleRoute permission={["viewSettings", "viewBillingTerms", "viewPlatformFees", "viewInvoices", "viewFinance"]} allowPlatformStaff>
                <ProjectProtectedRoute>
                  <Settings />
                </ProjectProtectedRoute>
              </RoleRoute>
            </ProtectedRoute>
          }>
            <Route index element={<RoleRoute permission="viewSettings"><TeamManagement /></RoleRoute>} />
            <Route path="associated-companies" element={<RoleRoute permission="viewSettings"><AssociatedCompanies /></RoleRoute>} />
            <Route path="project-details" element={
              <RoleRoute permission="viewSettings"><ProjectDetails /></RoleRoute>
            } />
            <Route path="site" element={
              <RoleRoute permission="viewSettings"><Site /></RoleRoute>
            } />
            <Route path="notifications" element={<Notifications />} />
            <Route path="billing" element={
              <RoleRoute permission={["viewBillingTerms", "viewPlatformFees", "viewInvoices"]} allowPlatformStaff><Billing /></RoleRoute>
            } />
            <Route path="contract-payment" element={
              <RoleRoute permission="viewFinance"><ContractPayment /></RoleRoute>
            } />
            <Route path="integrations" element={
              <RoleRoute permission="manageIntegrations"><Integrations /></RoleRoute>
            } />
            <Route path="security" element={<Security />} />
            <Route path="data-management" element={
              <RoleRoute permission="manageSettings"><DataManagement /></RoleRoute>
            } />
            <Route path="audit" element={
              <RoleRoute permission="viewAudit"><Audit /></RoleRoute>
            } />
            {/*
              `settings/permissions` is gone. It was a second permission matrix
              with its own hardcoded copies of the descriptions, the sort order,
              the hidden-code list and the parent/child map — and that copy had
              already drifted: it still described the Finance area as it stood
              before the tabs were reorganised, and its client-side cascade was
              bypassed entirely by a direct API call.

              /roles-permissions is the one matrix. It renders from the
              permission rows themselves (group, subgroup, sort_order,
              requires_code), so there is nothing left to keep in step.
            */}
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
            <Route path="admin" element={<AdminGuard />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="companies" element={<AdminCompanies />} />
              <Route path="activity" element={<AdminActivity />} />
              <Route path="activity/:userId" element={<AdminActivityDetail />} />
              <Route path="health" element={<AdminHealth />} />
              <Route path="billing" element={<BillingOverview />} />
              <Route path="billing/projects" element={<BillingProjects />} />
              <Route path="billing/projects/:projectId" element={<BillingProjectDetail />} />
              <Route path="billing/fees" element={<BillingFees />} />
              <Route path="billing/invoices" element={<BillingInvoices />} />
              <Route path="billing/settings" element={<BillingSettings />} />
              <Route path="billing/guide" element={<BillingGuide />} />
            </Route>
          </Route>
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

/**
 * Help hub — landing page for the sidebar's "Help" link.
 *
 * Just a chooser between the two plain-English reference pages:
 * HelpTasks.tsx (/help/tasks) and HelpFinance.tsx (/help/finance).
 * Add a new card here whenever a new /help/<area> reference page ships.
 */
import { Link } from "react-router-dom";
import { ClipboardList, Wallet, ChevronRight } from "lucide-react";

const OPTIONS = [
  {
    to: "/help/tasks",
    icon: ClipboardList,
    title: "Tasks",
    description:
      "RFI, SI, VO, IC, DC, GI, CPI — who can create, reply, sign, approve, close, or escalate each one.",
  },
  {
    to: "/help/finance",
    icon: Wallet,
    title: "Finance",
    description:
      "Cost Ledger, Variation Orders, Payment Certificates, Platform Fees — who can do what, and when.",
  },
];

export default function Help() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Help
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English reference guides for who can do what, and when.
          Pick an area to get started.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {OPTIONS.map(({ to, icon: Icon, title, description }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:bg-muted/40 transition-colors"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-normal text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:text-foreground transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

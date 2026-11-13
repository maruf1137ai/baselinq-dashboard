import { useEffectivePermissions } from "@/hooks/useEffectivePermissions";

/** Red bar across the project while a Baselinq invoice is over 30 days overdue. */
export function BillingLockBanner() {
  const raw = typeof window !== "undefined" ? localStorage.getItem("selectedProjectId") : null;
  const projectId = raw ? Number(raw) : null;
  const { data } = useEffectivePermissions(projectId);

  if (!data?.billingLocked) return null;

  return (
    <div
      role="alert"
      className="border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive"
    >
      <span className="font-medium">This project is read-only.</span> Baselinq invoice{" "}
      {data.billingLockInvoice ?? ""} is more than 30 days overdue. You can still view and download
      everything; changes are blocked until it is paid.
    </div>
  );
}

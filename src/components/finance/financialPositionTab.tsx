import { Link } from "react-router-dom";
import { Printer } from "lucide-react";

import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/useFetch";
import { formatDate } from "@/lib/dateUtils";
import { FinancialPositionError, FinancialPositionView, type FinancialPositionData } from "./FinancialPosition";
import Payments from "./payments";

/**
 * The first Finance tab: the client's one page about money, with a printable
 * statement — and beneath it the payment register where a payment is recorded.
 * It absorbed the separate Payments Status tab, whose totals it already shows.
 */
export default function FinancialPositionTab({ showPayments = true }: { showPayments?: boolean }) {
  const projectId = localStorage.getItem("selectedProjectId") || "";
  const { data, isLoading, isError } = useFetch<FinancialPositionData>(
    projectId ? `projects/${projectId}/financial-position/` : "",
    { enabled: !!projectId },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <AwesomeLoader message="Loading the financial position" />
      </div>
    );
  }
  if (isError || !data) return <main className="pt-6"><FinancialPositionError /></main>;

  return (
    <main className="pt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">As at {formatDate(data.asAt)}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/finance/statement" target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Print statement
          </Link>
        </Button>
      </div>
      <FinancialPositionView data={data} />
      {showPayments && <Payments embedded />}
    </main>
  );
}

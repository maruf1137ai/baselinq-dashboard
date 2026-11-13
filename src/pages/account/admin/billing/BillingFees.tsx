import React, { useState } from "react";

import { Input } from "@/components/ui/input";
import { Pager } from "@/components/ui/pager";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { type Paged, usePagedFetch } from "@/hooks/usePagedFetch";
import { CHARGE_STATE, type ChargeBillingState, type FeeChargeRow } from "@/lib/platformBilling";
import { AdminPage, ErrorNotice, SectionCard } from "../adminUi";
import { ChargesTable } from "./billingShared";

const STATES: ChargeBillingState[] = ["not_invoiced", "draft", "invoiced", "overdue", "paid", "reversed"];
const PAGE_SIZE = 25;

const BillingFees = () => {
  const [state, setState] = useState<ChargeBillingState | "">("");
  const [month, setMonth] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (state) params.set("state", state);
  if (month) params.set("month", month);
  const qs = params.toString();
  const { data, isLoading, isError, error, isPaging } = usePagedFetch<Paged<FeeChargeRow>>(
    `billing/admin/charges/${qs ? `?${qs}` : ""}`,
    page,
    PAGE_SIZE,
  );

  // A new filter starts from its first page.
  const pickState = (s: ChargeBillingState | "") => { setState(s); setPage(1); };

  return (
    <AdminPage title="Fees" description="Every platform fee on every project — what it was charged on, and whether it has been invoiced and paid.">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => pickState("")}
          className={`px-3 py-1.5 rounded-md text-sm border ${state === "" ? "bg-card border-border text-foreground" : "border-transparent text-muted-foreground hover:bg-card"}`}
        >
          All
        </button>
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => pickState(s)}
            className={`px-3 py-1.5 rounded-md text-sm border ${state === s ? "bg-card border-border text-foreground" : "border-transparent text-muted-foreground hover:bg-card"}`}
          >
            {CHARGE_STATE[s].label}
          </button>
        ))}
        <Input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className="w-44 h-9 bg-card ml-auto" aria-label="Month" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><AwesomeLoader message="Loading" /></div>
      ) : isError || !data ? (
        <ErrorNotice error={error} />
      ) : (
        <SectionCard
          title={`${data.count} fee${data.count === 1 ? "" : "s"}`}
          subtitle="Newest first. Fee + 15% VAT = total."
        >
          {data.results.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">No fees match.</p>
          ) : (
            <div className={isPaging ? "opacity-60 transition-opacity" : undefined}>
              <ChargesTable charges={data.results} showProject />
            </div>
          )}
          <Pager {...data} onPage={setPage} loading={isPaging} />
        </SectionCard>
      )}
    </AdminPage>
  );
};

export default BillingFees;

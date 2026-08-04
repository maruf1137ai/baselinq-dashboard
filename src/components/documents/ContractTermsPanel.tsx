import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AwesomeLoader } from '@/components/commons/AwesomeLoader';
import { AiMark } from '@/components/icons/AiMark';
import { cn } from '@/lib/utils';
import { fetchData, postData } from '@/lib/Api';
import { toast } from 'sonner';

interface ContractTerm {
  _id: string;
  termType: string;
  label: string;
  rawValue: string;
  editedValue: string;
  parsedValueNumeric: string | null;
  parsedValueDate: string | null;
  unit: string;
  trigger: string;
  sourceClauseReference: string;
  citationVerified: boolean;
  confidence: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

interface ContractTermExtraction {
  _id: string;
  status: 'none' | 'pending' | 'running' | 'complete' | 'failed';
  errorMessage: string;
  extractedAt: string | null;
  terms: ContractTerm[];
}

const TERM_TYPE_LABELS: Record<string, string> = {
  commencement_date: 'Commencement date',
  contract_period: 'Contract period',
  practical_completion_date: 'Practical completion date',
  sectional_completion_date: 'Sectional completion date',
  penalty_per_day: 'Penalty per day',
  payment_cycle: 'Payment cycle',
  days_to_certify: 'Days to certify',
  days_to_pay: 'Days to pay',
  retention_percentage: 'Retention percentage',
  retention_limit: 'Retention limit',
  defects_liability_period: 'Defects liability period',
  guarantee: 'Guarantee',
  party: 'Party',
  contract_value: 'Contract value',
  other: 'Other',
};

export function ContractTermsPanel({ docId, projectId }: { docId: string; projectId: string | null }) {
  const queryClient = useQueryClient();
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data, isLoading } = useQuery<ContractTermExtraction>({
    queryKey: ['contract-terms', docId, projectId],
    queryFn: () => fetchData(`documents/${docId}/contract-terms/?project_id=${projectId}`),
    enabled: !!docId && !!projectId,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'running' ? 4000 : false;
    },
  });

  const extraction = data;
  const terms = extraction?.terms ?? [];
  const isRunning = extraction?.status === 'pending' || extraction?.status === 'running';

  const { mutate: extractTerms, isPending: isTriggering } = useMutation({
    mutationFn: () => postData({ url: `documents/${docId}/extract-contract-terms/?project_id=${projectId}`, data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-terms', docId] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to start Contract Terms extraction.');
    },
  });

  const { mutate: confirmTerm, isPending: isConfirming } = useMutation({
    mutationFn: ({ termId, editedValue }: { termId: string; editedValue: string }) =>
      postData({
        url: `documents/${docId}/contract-terms/${termId}/confirm/?project_id=${projectId}`,
        data: { editedValue },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-terms', docId] });
      setEditingTermId(null);
      toast.success('Term confirmed.');
    },
    onError: () => toast.error('Failed to confirm term.'),
  });

  const { mutate: rejectTerm, isPending: isRejecting } = useMutation({
    mutationFn: (termId: string) =>
      postData({ url: `documents/${docId}/contract-terms/${termId}/reject/?project_id=${projectId}`, data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-terms', docId] });
      toast.success('Term rejected.');
    },
    onError: () => toast.error('Failed to reject term.'),
  });

  return (
    <section className="space-y-3 pt-6 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <AiMark size={16} />
          Contract Terms
          <span className="text-xs text-muted-foreground font-normal">({terms.length})</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-primary font-normal hover:bg-primary/5 gap-1.5"
          onClick={() => extractTerms()}
          disabled={isTriggering || isRunning}
        >
          {isTriggering || isRunning
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting...</>
            : <><AiMark size={16} /> {extraction && extraction.status !== 'none' ? 'Re-extract terms' : 'Extract Contract Terms'}</>
          }
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-1">
        Dates, rates and amounts read from the Contract Data / Schedule pages. Nothing here is
        applied anywhere until you confirm it below — confirming a term does not change the
        project on its own.
      </p>

      {isRunning && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-normal">Extracting contract terms...</span>
        </div>
      )}

      {extraction?.status === 'failed' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-100 bg-red-50 text-red-600">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-sm font-normal">{extraction.errorMessage || 'Extraction failed.'}</span>
        </div>
      )}

      {isLoading && (
        <AwesomeLoader message="Loading contract terms" />
      )}

      {!isLoading && (!extraction || extraction.status === 'none') && (
        <EmptyState
          size="sm"
          icon={AiMark as any}
          title="No contract terms extracted yet"
          description="Extract commencement date, contract period, penalty rate, retention and other Contract Data facts as structured, confirmable fields — instead of prose buried in findings."
          action={
            <Button
              size="sm"
              className="h-8 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => extractTerms()}
              disabled={isTriggering}
            >
              <AiMark size={16} />
              <span className="ml-1.5">Extract Contract Terms</span>
            </Button>
          }
        />
      )}

      {!isLoading && extraction?.status === 'complete' && terms.length === 0 && (
        <EmptyState
          size="sm"
          icon={AiMark as any}
          title="No Contract Data terms found"
          description="The extraction ran but found no explicit dates, rates or amounts in the indexed pages. This document may not contain a Contract Data / Schedule section."
        />
      )}

      {terms.length > 0 && (
        <div className="space-y-3">
          {terms.map((term) => (
            <div
              key={term._id}
              className={cn(
                'p-4 rounded-xl border bg-card transition-all',
                term.status === 'rejected'
                  ? 'border-border opacity-60'
                  : term.status === 'confirmed'
                    ? 'border-emerald-100'
                    : 'border-border'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-normal bg-muted/40 text-muted-foreground">
                      {TERM_TYPE_LABELS[term.termType] || term.termType}
                    </span>
                    {term.sourceClauseReference && (
                      <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                        {term.citationVerified
                          ? <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          : <ShieldAlert className="h-3 w-3 text-amber-600" />}
                        Clause {term.sourceClauseReference}
                        {!term.citationVerified && ' (unverified)'}
                      </span>
                    )}
                    <Badge className={cn(
                      'text-xs font-normal border-0 px-2 py-0.5',
                      term.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                        term.status === 'rejected' ? 'bg-red-50 text-red-600' :
                          'bg-muted/40 text-muted-foreground'
                    )}>
                      {term.status === 'confirmed' ? 'Confirmed' : term.status === 'rejected' ? 'Rejected' : 'Pending review'}
                    </Badge>
                  </div>

                  <p className="text-sm font-normal text-foreground">{term.label}</p>

                  {editingTermId === term._id ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-9 px-3 border border-border rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary/20 flex-1"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {term.editedValue || term.rawValue}
                      {term.unit && <span className="ml-1 text-xs">({term.unit})</span>}
                      {term.editedValue && term.editedValue !== term.rawValue && (
                        <span className="ml-2 text-xs text-muted-foreground/70 line-through">{term.rawValue}</span>
                      )}
                    </p>
                  )}
                  {term.trigger && (
                    <p className="text-xs text-muted-foreground">Trigger: {term.trigger}</p>
                  )}
                </div>

                {term.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    {editingTermId === term._id ? (
                      <>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditingTermId(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={isConfirming}
                          onClick={() => confirmTerm({ termId: term._id, editedValue: editValue })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Save & confirm
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-normal border-border rounded-lg"
                          onClick={() => { setEditingTermId(term._id); setEditValue(term.rawValue); }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-normal border-border rounded-lg gap-1"
                          disabled={isRejecting}
                          onClick={() => rejectTerm(term._id)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={isConfirming}
                          onClick={() => confirmTerm({ termId: term._id, editedValue: term.rawValue })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

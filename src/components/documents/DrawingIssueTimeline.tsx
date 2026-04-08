import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { User, Send, AlertTriangle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { mockDrawingIssues, DrawingIssue } from '@/data/mockDocuments';

const ISSUE_TYPE_CONFIG: Record<
  DrawingIssue['issueType'],
  { label: string; bg: string; text: string; border: string }
> = {
  site_copy: {
    label: 'Site Copy',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  office_copy: {
    label: 'Office Copy',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-100',
  },
  for_construction: {
    label: 'For Construction',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-100',
  },
  for_review: {
    label: 'For Review',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
};

const RevisionPill = ({ revision, isCurrent }: { revision: string; isCurrent?: boolean }) => (
  <div
    className={cn(
      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border shrink-0',
      isCurrent
        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
        : 'bg-white text-gray-500 border-gray-200'
    )}
  >
    {revision}
  </div>
);

interface DrawingIssueTimelineProps {
  documentId: number;
  currentRevision?: string;
  onIssueDrawing?: () => void;
}

const DrawingIssueTimeline: React.FC<DrawingIssueTimelineProps> = ({
  documentId,
  currentRevision,
  onIssueDrawing,
}) => {
  const issues = mockDrawingIssues
    .filter((i) => i.documentId === documentId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const latestSiteCopy = issues.find((i) => i.issueType === 'site_copy');
  const latestOfficeCopy = issues.find((i) => i.issueType === 'office_copy');

  const siteNotUpToDate =
    currentRevision &&
    latestSiteCopy &&
    latestSiteCopy.revision !== currentRevision;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Status summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Current Revision */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-gray-400 normal-case mb-3">Current Revision</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium shadow-sm">
              {currentRevision || '—'}
            </div>
            <div>
              <p className="text-sm font-normal text-foreground">Rev {currentRevision}</p>
              <p className="text-xs text-gray-400 mt-0.5">Latest version</p>
            </div>
          </div>
        </div>

        {/* Latest Site Copy */}
        <div className={cn(
          "bg-white rounded-2xl border p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]",
          siteNotUpToDate ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
        )}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 normal-case">Latest Site Copy</p>
            {siteNotUpToDate && (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            )}
          </div>
          {latestSiteCopy ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">
                {latestSiteCopy.revision}
              </div>
              <div>
                <p className="text-sm font-normal text-foreground">
                  Rev {latestSiteCopy.revision}
                  {siteNotUpToDate && (
                    <span className="ml-1.5 text-xs text-amber-600 font-normal">outdated</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  {latestSiteCopy.issuedBy} · {format(new Date(latestSiteCopy.issuedAt), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not yet issued</p>
          )}
        </div>

        {/* Last Office Copy */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)]">
          <p className="text-xs text-gray-400 normal-case mb-3">Last Office Copy</p>
          {latestOfficeCopy ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium">
                {latestOfficeCopy.revision}
              </div>
              <div>
                <p className="text-sm font-normal text-foreground">Rev {latestOfficeCopy.revision}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  {latestOfficeCopy.issuedBy} · {format(new Date(latestOfficeCopy.issuedAt), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No office copy yet</p>
          )}
        </div>
      </div>

      {/* Outdated site copy warning */}
      {siteNotUpToDate && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 font-normal">
              Site copy (Rev {latestSiteCopy?.revision}) is behind the current revision (Rev {currentRevision}).
              Consider issuing Rev {currentRevision} to site.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white h-8 px-4 text-xs font-normal rounded-lg shrink-0 ml-4"
            onClick={onIssueDrawing}
          >
            <Send className="w-3 h-3 mr-1.5" />
            Issue to Site
          </Button>
        </div>
      )}

      {/* Issue history */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-normal text-gray-400 normal-case">
          Issue History ({issues.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-normal gap-1.5 border-gray-200 rounded-lg"
          onClick={onIssueDrawing}
        >
          <Plus className="h-3.5 w-3.5" /> Issue Drawing
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No issue records yet.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-[2rem_6rem_8rem_1fr_6rem] gap-4 px-4 pb-2 border-b border-gray-100">
            <span />
            <span className="text-xs text-gray-400 normal-case">Issue Type</span>
            <span className="text-xs text-gray-400 normal-case">Date Issued</span>
            <span className="text-xs text-gray-400 normal-case">Notes</span>
            <span className="text-xs text-gray-400 normal-case text-right">Issued By</span>
          </div>

          {issues.map((issue) => {
            const typeConfig = ISSUE_TYPE_CONFIG[issue.issueType];
            const isLatestSite = latestSiteCopy?.id === issue.id;
            const isLatestOffice = latestOfficeCopy?.id === issue.id;

            return (
              <div
                key={issue.id}
                className={cn(
                  'grid grid-cols-[2rem_6rem_8rem_1fr_6rem] gap-4 items-center px-4 py-3.5 rounded-xl border transition-all',
                  isLatestSite
                    ? 'bg-emerald-50/50 border-emerald-100'
                    : isLatestOffice
                    ? 'bg-blue-50/30 border-blue-100'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                )}
              >
                {/* Revision bubble */}
                <RevisionPill
                  revision={issue.revision}
                  isCurrent={issue.revision === currentRevision}
                />

                {/* Issue type badge */}
                <Badge
                  className={cn(
                    'text-xs font-normal border px-2 py-0.5 w-fit',
                    typeConfig.bg,
                    typeConfig.text,
                    typeConfig.border
                  )}
                >
                  {typeConfig.label}
                  {isLatestSite && (
                    <CheckCircle2 className="w-2.5 h-2.5 ml-1 inline" />
                  )}
                </Badge>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-sm text-foreground font-normal">
                  <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                  {format(new Date(issue.issuedAt), 'dd MMM yyyy')}
                </div>

                {/* Notes */}
                <span className="text-xs text-gray-500 font-normal truncate">
                  {issue.notes || <span className="text-gray-300">—</span>}
                </span>

                {/* Issued by */}
                <div className="flex items-center gap-1.5 justify-end">
                  <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 font-medium shrink-0">
                    {issue.issuedBy.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs text-gray-500 font-normal">{issue.issuedBy.split(' ')[0]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DrawingIssueTimeline;

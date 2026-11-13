import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Notification } from '@/types/notification';

/**
 * Small unread-count pill + hover tooltip, shared by every per-item unread
 * badge (Documents, Project Health, Finance, Meetings) — same visual
 * language as the Tasks board's badge (Task.tsx), factored out once it
 * started repeating across pages.
 */
export function UnreadNotificationBadge({ notifications }: { notifications?: Notification[] }) {
  if (!notifications || notifications.length === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-primary text-white text-xs font-medium shrink-0 cursor-default"
          >
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        </TooltipTrigger>
        {/*
          `whitespace-normal break-words` is load-bearing, not decoration.

          TooltipContent renders without a Radix Portal (see ui/tooltip.tsx), so
          the tooltip is a real DOM descendant of whatever triggered it. On the
          Finance certificate table that is a `whitespace-nowrap` cell, and the
          cell's nowrap is inherited — which forced both lines onto one
          unwrappable line that the base class's `overflow-hidden` then clipped.
          The notification text was never truncated in JS; it arrives in full.

          `line-clamp-2` on the body was supplying the ellipsis on top of that,
          so it is gone too: a notification tooltip exists to be read.
        */}
        <TooltipContent
          side="top"
          className="bg-[#1B1C1F] text-white border-none py-1.5 px-3 max-w-sm whitespace-normal break-words"
        >
          <div className="flex flex-col gap-1.5">
            {notifications.slice(0, 5).map((n) => (
              <div key={n._id}>
                <p className="text-xs font-medium">{n.title}</p>
                {n.body && <p className="text-xs opacity-70">{n.body}</p>}
              </div>
            ))}
            {notifications.length > 5 && (
              <p className="text-xs opacity-60">+{notifications.length - 5} more</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

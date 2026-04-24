import { useState, useEffect, useRef, useMemo } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-pane time picker: scrollable 15-minute slot list (Cal.com / Google Calendar pattern).
 * One click = one choice. No compound hour/minute/AM-PM, no Apply button.
 * Typed search: "9", "9:30", "9pm", "14:00" all parse + snap to nearest slot.
 */

const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const suffix = h < 12 ? "AM" : "PM";
      out.push(`${hour12}:${String(m).padStart(2, "0")} ${suffix}`);
    }
  }
  return out;
})();

function normaliseQuery(raw: string): string | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const m = q.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];
  if (isNaN(h) || h < 0 || h > 23) return null;
  if (isNaN(min) || min < 0 || min > 59) return null;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h < 12 ? "AM" : "PM";
  const snapMin = Math.round(min / 15) * 15;
  const adjMin = snapMin === 60 ? 0 : snapMin;
  return `${hour12}:${String(adjMin).padStart(2, "0")} ${suffix}`;
}

export function TimePicker({
  time,
  setTime,
  label = "Time *",
}: {
  time: string;
  setTime: (t: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SLOTS;
    return SLOTS.filter((s) => s.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }, 40);
    return () => clearTimeout(t);
  }, [open]);

  const pick = (slot: string) => {
    setTime(slot);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const parsed = normaliseQuery(query);
    if (parsed && SLOTS.includes(parsed)) {
      pick(parsed);
    } else if (filtered.length > 0) {
      pick(filtered[0]);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <Label className="text-sm text-foreground mb-2">{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start font-normal text-left"
          >
            <Clock className="mr-2 h-4 w-4" />
            {time || "Select time"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              autoFocus
              placeholder="Type 9:30, 9am, 14:00…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
            />
          </div>

          <div
            className="max-h-[240px] overflow-y-auto py-1 overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No matches. Try &quot;9:30&quot; or &quot;14:00&quot;.
              </div>
            ) : (
              filtered.map((slot) => {
                const isSelected = slot === time;
                return (
                  <button
                    key={slot}
                    ref={isSelected ? selectedRef : undefined}
                    onClick={() => pick(slot)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm transition-colors tabular-nums",
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {slot}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

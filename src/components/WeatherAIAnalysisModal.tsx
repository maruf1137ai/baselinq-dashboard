import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, isAfter, parseISO, startOfToday } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  Droplets,
  Wind,
  Thermometer,
  Eye,
  CloudRain,
  CloudSun,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { analyzeWeather } from "@/lib/Api";
import AiIcon from "@/components/icons/AiIcon";

const CONDITION_ICON: Record<string, string> = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️", Thunderstorm: "⛈️",
  Snow: "❄️", Mist: "🌫️", Fog: "🌫️", Haze: "🌫️", Dust: "💨", Sand: "💨",
  Ash: "🌋", Squall: "💨", Tornado: "🌪️",
};

interface WeatherAIAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
}

const toDate = (v?: string | null): Date | null => {
  if (!v) return null;
  try {
    return parseISO(v);
  } catch {
    return null;
  }
};

const WeatherAIAnalysisModal = ({ open, onOpenChange, project }: WeatherAIAnalysisModalProps) => {
  const projectId = project?._id ?? project?.id;

  // Selectable window is bounded by the project duration (clamped to >= today,
  // since the forecast is forward-looking).
  const { lowerBound, upperBound, defaultRange } = useMemo(() => {
    const today = startOfToday();
    const projStart = toDate(project?.start_date ?? project?.startDate);
    const projEnd = toDate(project?.end_date ?? project?.endDate);
    const lower = projStart && isAfter(projStart, today) ? projStart : today;
    const upper = projEnd && isAfter(projEnd, lower) ? projEnd : addDays(lower, 5);
    const to = isAfter(addDays(lower, 5), upper) ? upper : addDays(lower, 5);
    return { lowerBound: lower, upperBound: upper, defaultRange: { from: lower, to } as DateRange };
  }, [project?.start_date, project?.startDate, project?.end_date, project?.endDate]);

  const [range, setRange] = useState<DateRange | undefined>(defaultRange);

  // Reset the range whenever the modal (re)opens or the project changes.
  useEffect(() => {
    if (open) setRange(defaultRange);
  }, [open, defaultRange]);

  const fromISO = range?.from ? format(range.from, "yyyy-MM-dd") : undefined;
  const toISO = range?.to ? format(range.to, "yyyy-MM-dd") : undefined;

  const forceRef = useRef(false);
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["weatherAnalysis", projectId, fromISO, toISO],
    queryFn: async () => {
      const force = forceRef.current;
      forceRef.current = false;
      return analyzeWeather({
        project_id: projectId,
        range_start: fromISO,
        range_end: toISO,
        force_refresh: force,
      });
    },
    enabled: open && !!projectId && !!fromISO && !!toISO,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (isError) toast.error((error as Error)?.message || "Weather analysis failed");
  }, [isError, error]);

  const today = data?.today_weather;
  const forecast: any[] = data?.forecast_daily ?? [];
  const aiAvailable = data?.ai_available;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white max-h-[88vh] overflow-y-auto font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-foreground">
            <AiIcon className="h-5 w-5 text-primary" />
            AI Weather Analysis
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Site weather risk for {project?.name || "this project"}
            {project?.location ? ` — ${project.location}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Header AI narrative — reads project features + headline weather risk */}
        {data?.ai_project_header && (
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-primary">
              <AiIcon className="h-3.5 w-3.5" />
              AI project weather brief
            </div>
            <p className="leading-relaxed">{data.ai_project_header}</p>
          </div>
        )}
        {data && aiAvailable === false && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            AI analysis is currently unavailable — showing weather data only.
          </div>
        )}

        {/* Date range + refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                {range?.from && range?.to
                  ? `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
                  : "Select range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                defaultMonth={lowerBound}
                disabled={{ before: lowerBound, after: upperBound }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">
            Within the project duration
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-2"
            disabled={isFetching}
            onClick={() => {
              forceRef.current = true;
              refetch();
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="relative min-h-[320px]">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center min-h-[320px] gap-6">
              <div className="ai-orb-loader">
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
                <div className="ai-orb-wave" />
              </div>
              <div className="text-center animate-pulse">
                <p className="text-sm font-medium text-primary">Analyzing site weather…</p>
                <p className="text-xs text-gray-400 mt-1">
                  Reading the forecast against this project's scope
                </p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-foreground">{(error as Error)?.message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center min-h-[320px] text-sm text-muted-foreground">
              Select a date range to analyze site weather.
            </div>
          ) : (
            <Tabs defaultValue="today" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted p-1 rounded-xl">
                <TabsTrigger
                  value="today"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <CloudSun className="h-4 w-4" />
                  Today
                </TabsTrigger>
                <TabsTrigger
                  value="future"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2"
                >
                  <CloudRain className="h-4 w-4" />
                  Future conditions
                </TabsTrigger>
              </TabsList>

              {/* TODAY */}
              <TabsContent value="today" className="m-0 border-none outline-none space-y-4">
                {today ? (
                  <div className="rounded-xl border border-border bg-white p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{CONDITION_ICON[today.main] ?? "🌡️"}</span>
                      <div>
                        <p className="font-semibold text-foreground">{today.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {today.description || today.main}
                        </p>
                      </div>
                      <span className="ml-auto text-3xl font-semibold">{today.temp}°C</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Metric icon={<Thermometer className="h-4 w-4" />} label="Feels like" value={`${today.feels_like}°C`} />
                      <Metric icon={<Droplets className="h-4 w-4" />} label="Humidity" value={`${today.humidity}%`} />
                      <Metric icon={<Wind className="h-4 w-4" />} label="Wind" value={`${today.wind_speed} m/s`} />
                      {today.visibility_km != null && (
                        <Metric icon={<Eye className="h-4 w-4" />} label="Visibility" value={`${today.visibility_km} km`} />
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No current conditions available.</p>
                )}
                {data.ai_today && (
                  <AiNote text={data.ai_today} />
                )}
              </TabsContent>

              {/* FUTURE */}
              <TabsContent value="future" className="m-0 border-none outline-none space-y-4">
                {data.coverage_note && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{data.coverage_note}</span>
                  </div>
                )}
                {forecast.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {forecast.map((d) => (
                      <div key={d.date} className="rounded-xl border border-border bg-white p-3 text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {format(parseISO(d.date), "EEE, MMM d")}
                        </p>
                        <span className="text-3xl block my-1">{CONDITION_ICON[d.main] ?? "🌡️"}</span>
                        <p className="text-sm font-semibold text-foreground">
                          {d.temp_min}° / {d.temp_max}°
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{d.description || d.main}</p>
                        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-blue-600">
                          <Droplets className="h-3 w-3" />
                          {d.pop}%
                        </div>
                        <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                          <Wind className="h-3 w-3" />
                          {d.wind_speed} m/s
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No forecast data is available within the selected window.
                  </p>
                )}
                {data.ai_future && <AiNote text={data.ai_future} />}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Metric = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg bg-sidebar p-2.5">
    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
      {icon}
      {label}
    </div>
    <p className="font-semibold text-sm text-foreground">{value}</p>
  </div>
);

const AiNote = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-foreground">
    <div className="flex items-center gap-2 mb-1.5 text-xs font-medium text-primary">
      <AiIcon className="h-3.5 w-3.5" />
      AI analysis
    </div>
    <p className="leading-relaxed">{text}</p>
  </div>
);

export default WeatherAIAnalysisModal;

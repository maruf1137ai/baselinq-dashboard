import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

export function TimePicker({ time, setTime }: any) {
  const [open, setOpen] = useState(false);

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = ["00", "15", "30", "45"];
  const meridiem = ["AM", "PM"];

  const [tempHour, setTempHour] = useState("12");
  const [tempMinute, setTempMinute] = useState("00");
  const [tempMeridiem, setTempMeridiem] = useState("AM");

  const applyTime = () => {
    const formatted = `${tempHour}:${tempMinute} ${tempMeridiem}`;
    setTime(formatted);
    setOpen(false);
  };

  return (
    <div className="flex flex-col w-full">
      <Label className="text-sm text-[#1A1F36] mb-2">Due Time *</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start font-normal text-left">
            <Clock className="mr-2 h-4 w-4" />
            {time || "Select time"}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[260px] p-4 space-y-4">
          {/* HOURS */}
          <div>
            <p className="text-sm font-medium mb-2">Hour</p>
            <div className="grid grid-cols-6 gap-2">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => setTempHour(String(h))}
                  className={`
                    py-1 rounded-md border text-sm
                    ${tempHour === String(h) ? "bg-primary text-white" : ""}
                  `}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* MINUTES */}
          <div>
            <p className="text-sm font-medium mb-2">Minutes</p>
            <div className="grid grid-cols-4 gap-2">
              {minutes.map((m) => (
                <button
                  key={m}
                  onClick={() => setTempMinute(m)}
                  className={`
                    py-1 rounded-md border text-sm
                    ${tempMinute === m ? "bg-primary text-white" : ""}
                  `}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* AM / PM */}
          <div>
            <p className="text-sm font-medium mb-2">AM / PM</p>
            <div className="flex gap-2">
              {meridiem.map((m) => (
                <button
                  key={m}
                  onClick={() => setTempMeridiem(m)}
                  className={`
                    flex-1 py-1 rounded-md border text-sm
                    ${tempMeridiem === m ? "bg-primary text-white" : ""}
                  `}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* APPLY BUTTON */}
          <Button onClick={applyTime} className="w-full">
            Set Time
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const isMeetingPast = (dateStr: string, timeStr: string) => {
  if (!dateStr) return false;
  try {
    const timeToParse = timeStr || "00:00 AM";
    const [hStr, mRest] = timeToParse.split(":");
    if (!mRest) return false;
    const [mStr, mer] = mRest.split(" ");

    let hour = parseInt(hStr);
    const minute = parseInt(mStr);
    if (mer?.toUpperCase() === "PM" && hour < 12) hour += 12;
    if (mer?.toUpperCase() === "AM" && hour === 12) hour = 0;

    const [y, m, d] = dateStr.split("-").map(Number);
    const meetingDate = new Date(y, m - 1, d, hour, minute);

    return meetingDate < new Date();
  } catch (e) {
    return false;
  }
};

export const isMeetingPastUTC = (scheduledUtc: string | null | undefined): boolean => {
  if (!scheduledUtc) return false;
  try {
    return new Date(scheduledUtc) < new Date();
  } catch {
    return false;
  }
};

export const formatMeetingTime = (scheduledUtc: string | null | undefined): string => {
  if (!scheduledUtc) return "";
  try {
    return new Date(scheduledUtc).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export const formatMeetingDate = (scheduledUtc: string | null | undefined): string => {
  if (!scheduledUtc) return "";
  try {
    return new Date(scheduledUtc).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export const formatMeetingDateTime = (scheduledUtc: string | null | undefined): string => {
  const d = formatMeetingDate(scheduledUtc);
  const t = formatMeetingTime(scheduledUtc);
  if (!d) return "";
  return t ? `${d} • ${t}` : d;
};

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

    // Use a Date object in local time
    const [y, m, d] = dateStr.split("-").map(Number);
    const meetingDate = new Date(y, m - 1, d, hour, minute);

    return meetingDate < new Date();
  } catch (e) {
    return false;
  }
};

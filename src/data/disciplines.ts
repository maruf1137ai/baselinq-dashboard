export const DISCIPLINE_OPTIONS = [
  "Architectural",
  "Structural",
  "Mechanical",
  "Electrical",
  "Plumbing",
  "Civil",
  "Fire & Safety",
  "Landscape",
  "MEP",
  "Interior",
  "Facade",
  "HVAC",
] as const;

export type Discipline = (typeof DISCIPLINE_OPTIONS)[number] | "";

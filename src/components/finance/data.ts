import { OrderStatus, VariationOrder } from "./VariationOrdersTable";

export const variationOrders: VariationOrder[] = [
  {
    id: "VO-005",
    title: "HVAC system upgrade for server room",
    value: 501708,
    status: OrderStatus.Approved,
    requestedBy: {
      name: "Jane Doe",
      avatarUrl: "https://picsum.photos/seed/jane/32/32",
    },
    updated: "18/10/25",
    impact: 14,
  },
  {
    id: "VO-004",
    title: "Additional fire suppression in basement",
    value: 89450,
    status: OrderStatus.InReview,
    requestedBy: {
      name: "Alice Johnson",
      avatarUrl: "https://picsum.photos/seed/alice/32/32",
    },
    updated: "15/10/25",
    impact: 7,
  },
  {
    id: "VO-003",
    title: "Structural steel upgrade - main columns",
    value: 501708,
    status: OrderStatus.Approved,
    requestedBy: {
      name: "Emily Clark",
      avatarUrl: "https://picsum.photos/seed/emily/32/32",
    },
    updated: "01/10/25",
    impact: 21,
  },
  {
    id: "VO-002",
    title: "Facade panel material change",
    value: 501708,
    status: OrderStatus.Approved,
    requestedBy: {
      name: "Sarah Brown",
      avatarUrl: "https://picsum.photos/seed/sarah/32/32",
    },
    updated: "12/09/25",
    impact: 0,
  },
  {
    id: "VO-001",
    title: "Electrical capacity increase",
    value: 153723,
    status: OrderStatus.Approved,
    requestedBy: {
      name: "Maria Garcia",
      avatarUrl: "https://picsum.photos/seed/maria/32/32",
    },
    updated: "28/08/25",
    impact: 5,
  },
];

export const voSummeryData = {
  totalApproved: 1658847,
  inReview: 89450,
  draftPipeline: 0,
  totalValue: 1748297,
  approvedCount: 4,
  inReviewCount: 1,
  draftCount: 0,
  contingencyRemaining: -998297,
  contingencyTotal: 750000,
  contingencyUsagePercentage: 233.10626666666664,
};

export const paymentCertificateData = [
  {
    pc: "PC-003",
    period: "Oct 2025",
    claim: "R 1,377,500",
    retention: "R 72,500",
    net: "R 1,377,500",
    approvals: "approved",
    updated: "22/10/25",
    actions: "",
  },
  {
    pc: "PC-002",
    period: "Sep 2025",
    claim: "R 1,377,500",
    retention: "R 64,000",
    net: "R 1,216,000",
    approvals: "pending",
    updated: "15/09/25",
    actions: "",
  },
  {
    pc: "PC-001",
    period: "Aug 2025",
    claim: "R 1,377,500",
    retention: "R 56,000",
    net: "R 1,064,000",
    approvals: "reject",
    updated: "01/09/25",
    actions: "",
  },
];

export const billingLadgerData = [
  {
    date: "22/10/25",
    artefact: "VO-002",
    event: "Approved",
    net: "R 180,000",
    fee: "R1,800",
    status: "Queued",
  },
  {
    date: "22/10/25",
    artefact: "VO-002",
    event: "Approved",
    net: "R 180,000",
    fee: "R1,800",
    status: "Posted",
  },
  {
    date: "22/10/25",
    artefact: "VO-002",
    event: "Approved",
    net: "R 180,000",
    fee: "R1,800",
    status: "Posted",
  },
];

export interface Bar {
  color: string;
  width: string;
}

export interface ChartRow {
  month: string;
  value: string;
  bars: Bar[];
}

export const CHART_DATA: ChartRow[] = [
  {
    month: "Aug",
    value: "R 1.1M",
    bars: [
      { color: "bg-gray-200", width: "w-[92%]" },
      { color: "bg-indigo-400", width: "w-[88%]" },
      { color: "bg-green-600", width: "w-[85%]" },
    ],
  },
  {
    month: "Sep",
    value: "R 1.2M",
    bars: [
      { color: "bg-gray-200", width: "w-[98%]" },
      { color: "bg-indigo-400", width: "w-[93%]" },
      { color: "bg-green-600", width: "w-[91%]" },
    ],
  },
  {
    month: "Oct",
    value: "R 1.4M",
    bars: [
      { color: "bg-gray-200", width: "w-full" },
      { color: "bg-indigo-400", width: "w-[98%]" },
      { color: "bg-green-600", width: "w-[96%]" },
    ],
  },
  {
    month: "Nov",
    value: "R 1.5M",
    bars: [
      { color: "bg-gray-200", width: "w-full" },
      { color: "bg-green-600", width: "w-[90%]" },
    ],
  },
  {
    month: "Dec",
    value: "R 1.6M",
    bars: [
      { color: "bg-gray-200", width: "w-full" },
      { color: "bg-green-600", width: "w-[95%]" },
    ],
  },
  {
    month: "Jan",
    value: "R 1.8M",
    bars: [
      { color: "bg-gray-200", width: "w-full" },
      { color: "bg-green-600", width: "w-[98%]" },
    ],
  },
];

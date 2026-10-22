type DeliveryStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

interface StatusBadgeProps {
  status: DeliveryStatus;
}

const statusStyles: Record<DeliveryStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ASSIGNED: "bg-blue-50 text-blue-700",
  PICKED_UP: "bg-violet-50 text-violet-700",
  IN_TRANSIT: "bg-cyan-50 text-cyan-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
};

const statusLabels: Record<DeliveryStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Driver assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "On the way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
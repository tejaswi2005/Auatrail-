import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Droplets,
  Eye,
  Filter,
  LoaderCircle,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { api } from "../../services/api";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "ASSIGNED"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

type DeliveryStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

type Driver = {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  availability: "AVAILABLE" | "BUSY" | "OFFLINE";
};


interface CustomerUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Address {
  id?: string;
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

interface Product {
  id?: string;
  name?: string | null;
  bottleSizeLiters?: number | null;
  pricePaise?: number | null;
}

interface OrderItem {
  id: string;
  quantity?: number | null;
  unitPricePaise?: number | null;
  subtotalPaise?: number | null;
  product?: Product | null;
}

interface Delivery {
  id: string;
  status?: DeliveryStatus | null;
  driverId?: string | null;
  startedAt?: string | null;
  deliveredAt?: string | null;
}

interface Order {
  id: string;
  orderNumber?: string | null;
  status: OrderStatus;
  totalAmountPaise?: number | null;
  notes?: string | null;
  createdAt?: string | null;
  customer?: {
    user?: CustomerUser | null;
  } | null;
  address?: Address | null;
  items?: OrderItem[] | null;
  delivery?: Delivery | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// interface Driver {
//   id: string;
//   availability: "AVAILABLE" | "BUSY" | "OFFLINE";
//   user?: {
//     name?: string | null;
//     phone?: string | null;
//     isActive?: boolean;
//   } | null;
// }

/* -------------------------------------------------------------------------- */
/* Constants and helpers                                                       */
/* -------------------------------------------------------------------------- */

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "ASSIGNED",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const bulkStatuses: OrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY",
  "ASSIGNED",
  "CANCELLED",
];

const statusStyles: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-700 ring-blue-200",
  PREPARING: "bg-violet-50 text-violet-700 ring-violet-200",
  READY: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  ASSIGNED: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  IN_DELIVERY: "bg-sky-50 text-sky-700 ring-sky-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CANCELLED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const defaultStatusStyle =
  "bg-slate-100 text-slate-700 ring-slate-200";

const formatStatus = (status?: string | null): string => {
  if (!status) return "Unknown";

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatMoney = (paise?: number | null): string => {
  if (typeof paise !== "number" || !Number.isFinite(paise)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
};

const formatDate = (date?: string | null): string => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};

const getStatusStyle = (status?: string | null): string => {
  if (!status) return defaultStatusStyle;

  return status in statusStyles
    ? statusStyles[status as OrderStatus]
    : defaultStatusStyle;
};

const getOwnerActions = (order: Order): OrderStatus[] => {
  switch (order.status) {
    case "PENDING":
      return ["CONFIRMED", "CANCELLED"];

    case "CONFIRMED":
      return ["PREPARING", "CANCELLED"];

    case "PREPARING":
      return ["READY", "CANCELLED"];

    case "READY":
      return order.delivery?.driverId
        ? ["ASSIGNED", "CANCELLED"]
        : ["CANCELLED"];

    default:
      return [];
  }
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const addressText = (address?: Address | null): string => {
  if (!address) return "No address information available.";

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ") || "No address information available.";
};

const getDeliveryArea = (address?: Address | null): string => {
  if (!address) return "Area not specified";

  const city = address.city?.trim();
  const postalCode = address.postalCode?.trim();

  if (postalCode && city) return `${postalCode} · ${city}`;
  if (postalCode) return postalCode;
  if (city) return city;
  if (address.addressLine1?.trim()) {
    return address.addressLine1.trim();
  }

  return "Area not specified";
};


/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function OwnerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [selectedOrderIds, setSelectedOrderIds] =
    useState<string[]>([]);

  const [bulkStatus, setBulkStatus] =
    useState<OrderStatus | "">("");

  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [filterArea, setFilterArea] = useState("ALL");
  const [selectedBatchDriverId, setSelectedBatchDriverId] = useState("");
  const [batchAssigning, setBatchAssigning] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* Load orders                                                              */
  /* ------------------------------------------------------------------------ */

  const loadOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response =
        await api.get<ApiResponse<Order[]>>("/orders");

      const list = response.data?.data;

      if (!Array.isArray(list)) {
        throw new Error("The server returned an invalid orders response.");
      }

      setOrders(list);

      // Keep the selected order synchronized with the latest server data.
      setSelectedOrder((current) => {
        if (!current) return null;

        return (
          list.find((order) => order.id === current.id) ?? null
        );
      });

      setSelectedOrderIds((current) =>
        current.filter((id) =>
          list.some((order) => order.id === id)
        )
      );
    } catch (err: unknown) {
      console.error("Unable to load orders:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to load orders. Check your connection and try again.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Load drivers                                                             */
  /* ------------------------------------------------------------------------ */

  const loadDrivers = useCallback(async () => {
    try {
      const response =
        await api.get<ApiResponse<Driver[]>>("/drivers");

      const list = response.data?.data;

      setDrivers(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      console.error("Unable to load drivers:", err);

      setDrivers([]);

      setError(
        getErrorMessage(
          err,
          "Unable to load drivers. Please try again.",
        ),
      );
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    void loadDrivers();
  }, [loadOrders, loadDrivers]);

  /* ------------------------------------------------------------------------ */
  /* Search, filters and statistics                                           */
  /* ------------------------------------------------------------------------ */

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        filterStatus === "ALL" ||
        order.status === filterStatus;

      const customer = order.customer?.user;

      const matchesSearch =
        !term ||
        (order.orderNumber ?? "").toLowerCase().includes(term) ||
        (customer?.name ?? "").toLowerCase().includes(term) ||
        (customer?.email ?? "").toLowerCase().includes(term) ||
        (customer?.phone ?? "").toLowerCase().includes(term);

      const matchesArea =
        filterArea === "ALL" ||
        getDeliveryArea(order.address) === filterArea;

      return matchesStatus && matchesSearch && matchesArea;
    });
  }, [orders, search, filterStatus, filterArea]);

  const deliveryAreas = useMemo(
    () =>
      [...new Set(orders.map((order) => getDeliveryArea(order.address)))]
        .sort((a, b) => a.localeCompare(b)),
    [orders],
  );

  const eligibleBulkOrders = useMemo(
    () =>
      filteredOrders.filter(
        (order) =>
          selectedOrderIds.includes(order.id) &&
          bulkStatus !== "" &&
          getOwnerActions(order).includes(bulkStatus),
      ),
    [filteredOrders, selectedOrderIds, bulkStatus],
  );

  const eligibleBatchOrders = useMemo(
    () =>
      filteredOrders.filter(
        (order) =>
          selectedOrderIds.includes(order.id) &&
          order.status === "READY" &&
          Boolean(order.delivery?.id) &&
          (
            !order.delivery?.driverId ||
            order.delivery.status === "CANCELLED" ||
            order.delivery.status === "FAILED"
          ),
      ),
    [filteredOrders, selectedOrderIds],
  );

  const counts = useMemo(
    () => ({
      total: orders.length,

      pending: orders.filter(
        (order) => order.status === "PENDING",
      ).length,

      preparing: orders.filter((order) =>
        ["CONFIRMED", "PREPARING", "READY"].includes(
          order.status,
        ),
      ).length,

      delivered: orders.filter(
        (order) => order.status === "DELIVERED",
      ).length,
    }),
    [orders],
  );

  const visibleIds = filteredOrders.map((order) => order.id);

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedOrderIds.includes(id));

  const availableDrivers = drivers.filter(
    (driver) =>
      (driver.availability === "AVAILABLE" ||
        driver.availability === "BUSY") &&
      driver.isActive !== false,
  );

  /* ------------------------------------------------------------------------ */
  /* Selection handlers                                                       */
  /* ------------------------------------------------------------------------ */

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedOrderIds((current) => {
      const allSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => current.includes(id));

      return allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])];
    });
  };

  const openOrderDetails = (order: Order) => {
    setError("");
    setNotice("");
    setSelectedDriverId("");
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setSelectedDriverId("");
  };

  /* ------------------------------------------------------------------------ */
  /* Bulk status update                                                       */
  /* ------------------------------------------------------------------------ */

  const applyBulkStatus = async () => {
    if (
      !bulkStatus ||
      eligibleBulkOrders.length === 0 ||
      bulkUpdating
    ) {
      return;
    }

    const eligibleIds = eligibleBulkOrders.map(
      (order) => order.id,
    );

    const skippedCount =
      selectedOrderIds.length - eligibleIds.length;

    const targetStatus = bulkStatus;

    const confirmed = window.confirm(
      `Update ${eligibleIds.length} eligible order(s) to ${formatStatus(
        targetStatus,
      )}?` +
      (skippedCount > 0
        ? ` ${skippedCount} selected order(s) are not eligible and will be skipped.`
        : ""),
    );

    if (!confirmed) return;

    setBulkUpdating(true);
    setError("");
    setNotice("");

    try {
      const results = await Promise.allSettled(
        eligibleIds.map((id) =>
          api.patch<ApiResponse<Order>>(
            `/orders/${id}/status`,
            { status: targetStatus },
          ),
        ),
      );

      const successfulIds: string[] = [];
      const failures: string[] = [];

      results.forEach((result, index) => {
        const orderId = eligibleIds[index];

        if (result.status === "fulfilled") {
          successfulIds.push(orderId);
          return;
        }

        const order = eligibleBulkOrders.find(
          (item) => item.id === orderId,
        );

        failures.push(
          `${order?.orderNumber ?? orderId}: ${getErrorMessage(
            result.reason,
            "Request failed",
          )}`,
        );
      });

      await loadOrders(true);

      setSelectedOrderIds((current) =>
        current.filter((id) => !successfulIds.includes(id)),
      );

      if (successfulIds.length > 0) {
        setNotice(
          `${successfulIds.length} order(s) updated to ${formatStatus(
            targetStatus,
          )} successfully.`,
        );
      }

      if (failures.length > 0) {
        setError(
          `Could not update ${failures.length} order(s): ${failures
            .slice(0, 5)
            .join(" | ")}` +
          (failures.length > 5
            ? ` | And ${failures.length - 5} more failure(s).`
            : ""),
        );
      }

      if (
        successfulIds.length === 0 &&
        failures.length === 0
      ) {
        setError(
          "No orders were updated. Check your selection and try again.",
        );
      }
    } catch (err: unknown) {
      console.error("Bulk update failed:", err);

      setError(
        getErrorMessage(
          err,
          "Bulk update failed. Please refresh and try again.",
        ),
      );
    } finally {
      setBulkUpdating(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Single order status update                                               */
  /* ------------------------------------------------------------------------ */

  const updateStatus = async (
    order: Order,
    status: OrderStatus,
  ) => {
    const orderNumber = order.orderNumber ?? order.id;

    const actionText =
      status === "CANCELLED"
        ? `cancel order ${orderNumber}`
        : `change order ${orderNumber} to ${formatStatus(status)}`;

    if (!window.confirm(`Are you sure you want to ${actionText}?`)) {
      return;
    }

    setUpdatingId(order.id);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<ApiResponse<Order>>(
        `/orders/${order.id}/status`,
        { status },
      );

      const updated = response.data?.data;

      if (!updated?.id) {
        throw new Error("The server returned an invalid order response.");
      }

      setOrders((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );

      setSelectedOrder((current) =>
        current?.id === updated.id
          ? { ...current, ...updated }
          : current,
      );

      setNotice(
        response.data.message ?? "Order status updated successfully.",
      );
    } catch (err: unknown) {
      console.error("Unable to update order status:", err);

      setError(
        getErrorMessage(
          err,
          "Could not update this order. Refresh and try again.",
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Assign driver                                                            */
  /* ------------------------------------------------------------------------ */

  const assignDriver = async (order: Order) => {
    const delivery = order.delivery;
    const deliveryId = delivery?.id;

    if (!deliveryId) {
      setError("This order has no delivery record.");
      return;
    }

    if (!selectedDriverId) {
      setError("Please select a driver.");
      return;
    }

    if (order.status !== "READY") {
      setError("Only orders marked READY can be assigned.");
      return;
    }

    if (
      delivery.driverId &&
      delivery.status !== "CANCELLED" &&
      delivery.status !== "FAILED"
    ) {
      setError("This delivery already has a driver assigned.");
      return;
    }

    setAssigning(true);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<ApiResponse<unknown>>(
        `/deliveries/${deliveryId}/assign`,
        { driverId: selectedDriverId },
      );

      setNotice(
        response.data?.message ??
        "Driver assigned successfully.",
      );

      setSelectedDriverId("");

      await Promise.all([
        loadOrders(true),
        loadDrivers(),
      ]);
    } catch (err: unknown) {
      console.error("Unable to assign driver:", err);

      setError(
        getErrorMessage(
          err,
          "Could not assign the driver. Please try again.",
        ),
      );
    } finally {
      setAssigning(false);
    }
  };


  const assignSelectedOrders = async () => {
    if (!selectedBatchDriverId) {
      setError("Please select a driver.");
      return;
    }

    if (eligibleBatchOrders.length === 0) {
      setError("Select at least one eligible READY order.");
      return;
    }

    const ordersToAssign = [...eligibleBatchOrders];

    const confirmed = window.confirm(
      `Assign ${ordersToAssign.length} delivery(s) to the selected driver?`,
    );

    if (!confirmed) return;

    setBatchAssigning(true);
    setError("");
    setNotice("");

    let successCount = 0;
    const successfulOrderIds: string[] = [];
    const failures: string[] = [];

    try {
      for (const order of ordersToAssign) {
        try {
          await api.patch(
            `/deliveries/${order.delivery!.id}/assign`,
            { driverId: selectedBatchDriverId },
          );

          successCount++;
          successfulOrderIds.push(order.id);
        } catch (err) {
          failures.push(
            `${order.orderNumber ?? order.id}: ${getErrorMessage(
              err,
              "Assignment failed",
            )}`,
          );
        }
      }

      setSelectedOrderIds((current) =>
        current.filter((id) => !successfulOrderIds.includes(id)),
      );

      await Promise.all([loadOrders(true), loadDrivers()]);

      // Show the results after refreshing.
      if (successCount > 0) {
        setNotice(
          `${successCount} delivery(s) assigned successfully.`,
        );
      }

      if (failures.length > 0) {
        setError(
          `${failures.length} assignment(s) failed: ${failures
            .slice(0, 4)
            .join(" | ")}`,
        );
      }
    } catch (err) {
      console.error("Batch assignment failed:", err);
      setError(
        "Unable to complete assignment. Please refresh and try again.",
      );
    } finally {
      setBatchAssigning(false);
    }
  };



  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/owner/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-100">
              <Droplets size={24} />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                AquaTrail
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Owner workspace
              </p>
            </div>
          </Link>

          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 sm:px-4"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-100 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/10" />

          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-sky-50">
                <ShoppingBag size={14} />
                ORDER MANAGEMENT
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Customer orders
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-sky-50 sm:text-base">
                Review purchases, check delivery details, and update
                multiple eligible orders together.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadOrders(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-3 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh orders
            </button>
          </div>
        </section>

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span className="flex-1">{notice}</span>

            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span className="flex-1">{error}</span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total orders",
              value: counts.total,
              icon: ShoppingBag,
              style: "bg-sky-50 text-sky-600",
              hint: "All customer orders",
            },
            {
              label: "Awaiting confirmation",
              value: counts.pending,
              icon: Clock3,
              style: "bg-amber-50 text-amber-600",
              hint: "Need your attention",
            },
            {
              label: "In preparation",
              value: counts.preparing,
              icon: Package,
              style: "bg-violet-50 text-violet-600",
              hint: "Confirmed, preparing, or ready",
            },
            {
              label: "Delivered",
              value: counts.delivered,
              icon: CheckCircle2,
              style: "bg-emerald-50 text-emerald-600",
              hint: "Successfully completed",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {item.label}
                  </span>

                  <span
                    className={`rounded-xl p-2.5 ${item.style}`}
                  >
                    <Icon size={20} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-extrabold text-slate-900">
                  {loading ? "—" : item.value}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.hint}
                </p>
              </div>
            );
          })}
        </section>

        {/* Order list */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Order list
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Search, filter, and select multiple orders for bulk updates.
              </p>
            </div>

            <div className="relative">
              <Filter
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                aria-label="Filter orders by status"
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 sm:min-w-44"
              >
                <option value="ALL">All statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:min-w-64">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Order, customer, email..."
                  aria-label="Search orders"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50"
                />
              </div>

              <div className="relative">
                <MapPin
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={filterArea}
                  onChange={(event) => setFilterArea(event.target.value)}
                  aria-label="Filter by delivery location"
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm font-medium outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 sm:min-w-48"
                >
                  <option value="ALL">All delivery areas</option>

                  {deliveryAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>
            {selectedOrderIds.length > 0 && (
              <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Assign multiple deliveries
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {selectedOrderIds.length} order(s) selected
                      {" · "}
                      {eligibleBatchOrders.length} eligible for assignment
                    </p>

                    {filterArea !== "ALL" && (
                      <p className="mt-1 text-sm font-medium text-sky-700">
                        Delivery area: {filterArea}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedBatchDriverId}
                      onChange={(event) =>
                        setSelectedBatchDriverId(event.target.value)
                      }
                      aria-label="Select driver for multiple deliveries"
                      className="min-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
                    >
                      <option value="">Select driver</option>

                      {availableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                          {driver.phone ? ` · ${driver.phone}` : ""}
                          {driver.availability === "BUSY"
                            ? " · Already delivering"
                            : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void assignSelectedOrders()}
                      disabled={
                        batchAssigning ||
                        !selectedBatchDriverId ||
                        eligibleBatchOrders.length === 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {batchAssigning
                        ? "Assigning..."
                        : `Assign ${eligibleBatchOrders.length} deliveries`}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderIds([]);
                        setSelectedBatchDriverId("");
                      }}
                      disabled={batchAssigning}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Bulk actions */}
          {selectedOrderIds.length > 0 && (
            <div className="flex flex-col gap-3 border-b border-sky-100 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-sky-900">
                  {selectedOrderIds.length} order(s) selected
                </p>

                <p className="mt-1 text-xs text-sky-700">
                  {eligibleBulkOrders.length} eligible for the selected status.
                  Delivered orders cannot be bulk-marked delivered.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={bulkStatus}
                  onChange={(event) =>
                    setBulkStatus(
                      event.target.value as OrderStatus | "",
                    )
                  }
                  aria-label="Choose bulk order status"
                  className="rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Choose new status</option>

                  {bulkStatuses.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void applyBulkStatus()}
                  disabled={
                    bulkUpdating ||
                    !bulkStatus ||
                    eligibleBulkOrders.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkUpdating && (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {bulkUpdating
                    ? "Updating..."
                    : "Apply to selected"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderIds([]);
                    setBulkStatus("");
                  }}
                  className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Loading and empty states */}
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-medium text-slate-500">
              <LoaderCircle
                size={22}
                className="animate-spin text-sky-600"
              />
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl bg-sky-50 p-4 text-sky-600">
                <ShoppingBag size={30} />
              </div>

              <h4 className="mt-4 font-bold text-slate-900">
                No orders found
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or status filter.
              </p>

              {(search || filterStatus !== "ALL" || filterArea !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("ALL");
                    setFilterArea("ALL");
                  }}
                  className="mt-4 text-sm font-bold text-sky-700 hover:text-sky-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-12 px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select all visible orders"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 accent-sky-600"
                        />
                      </th>

                      <th className="px-5 py-4 font-semibold">
                        Order
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Customer
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Date
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Total
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Status
                      </th>
                      <th className="px-5 py-4 text-right font-semibold">
                        Details
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="transition hover:bg-sky-50/40"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            aria-label={`Select order ${order.orderNumber ?? order.id}`}
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() =>
                              toggleOrderSelection(order.id)
                            }
                            className="h-4 w-4 accent-sky-600"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {order.orderNumber ?? "Order"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {order.items?.length ?? 0} product types
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {order.customer?.user?.name ?? "Customer"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {order.customer?.user?.email ?? "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-slate-900">
                          {formatMoney(order.totalAmountPaise)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${getStatusStyle(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>

                          {order.status === "DELIVERED" && (
                            <p className="mt-1 text-xs font-medium text-emerald-700">
                              Completed
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openOrderDetails(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          >
                            <Eye size={14} />
                            View order
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 p-4 md:hidden">
                <div className="flex items-center gap-2 px-1 pb-1 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    aria-label="Select all visible orders"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 accent-sky-600"
                  />
                  Select all visible orders
                </div>

                {filteredOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select order ${order.orderNumber ?? order.id}`}
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() =>
                          toggleOrderSelection(order.id)
                        }
                        className="mt-1 h-4 w-4 accent-sky-600"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all font-extrabold text-slate-900">
                              {order.orderNumber ?? "Order"}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              {order.customer?.user?.name ?? "Customer"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${getStatusStyle(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-lg font-extrabold text-slate-900">
                            {formatMoney(order.totalAmountPaise)}
                          </span>

                          <button
                            type="button"
                            onClick={() => openOrderDetails(order)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700"
                          >
                            <Eye size={14} />
                            View details
                          </button>
                        </div>

                        {order.status === "DELIVERED" && (
                          <p className="mt-2 text-xs font-semibold text-emerald-700">
                            ✓ Delivery completed
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </div>
            </>
          )}
        </section>
      </main>

      {/* Order details modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-dialog-title"
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600">
                  Order details
                </p>

                <h3
                  id="order-dialog-title"
                  className="mt-1 break-all text-xl font-extrabold text-slate-900 sm:text-2xl"
                >
                  {selectedOrder.orderNumber ?? "Order"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderDetails}
                aria-label="Close order details"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Status and total */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current status
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${getStatusStyle(selectedOrder.status)}`}
                  >
                    {formatStatus(selectedOrder.status)}
                  </span>

                  {selectedOrder.status === "DELIVERED" && (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                      Delivery successfully completed
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Order total
                  </p>

                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {formatMoney(selectedOrder.totalAmountPaise)}
                  </p>
                </div>
              </div>

              {/* Customer and address */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
                    <UserRound size={18} className="text-sky-600" />
                    Customer
                  </div>

                  <p className="font-semibold text-slate-800">
                    {selectedOrder.customer?.user?.name ?? "Customer"}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedOrder.customer?.user?.email ?? "No email available"}
                  </p>

                  {selectedOrder.customer?.user?.phone && (
                    <a
                      href={`tel:${selectedOrder.customer.user.phone}`}
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
                    >
                      <Phone size={15} />
                      {selectedOrder.customer.user.phone}
                    </a>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2 font-bold text-slate-900">
                    <MapPin size={18} className="text-sky-600" />
                    Delivery address
                  </div>

                  {selectedOrder.address?.label && (
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {selectedOrder.address.label}
                    </p>
                  )}

                  <p className="text-sm leading-6 text-slate-600">
                    {addressText(selectedOrder.address)}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-bold text-slate-900">
                    Items ordered
                  </h4>
                </div>

                <div className="divide-y divide-slate-100">
                  {(Array.isArray(selectedOrder.items)
                    ? selectedOrder.items
                    : []
                  ).map((item, index) => (
                    <div
                      key={item.id ?? `${selectedOrder.id}-${index}`}
                      className="flex items-start justify-between gap-4 px-4 py-4"
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                          <Package size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {item.product?.name ?? "Product"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.product?.bottleSizeLiters ?? "—"} L ·{" "}
                            {formatMoney(item.unitPricePaise)} each
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Quantity: {item.quantity ?? 0}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-sm font-extrabold text-slate-900">
                        {formatMoney(item.subtotalPaise)}
                      </p>
                    </div>
                  ))}

                  {(!selectedOrder.items ||
                    selectedOrder.items.length === 0) && (
                      <p className="p-4 text-sm text-slate-500">
                        No item details are available for this order.
                      </p>
                    )}
                </div>

                <div className="flex items-center justify-between bg-slate-50 px-4 py-4">
                  <span className="font-semibold text-slate-600">
                    Order total
                  </span>

                  <span className="text-lg font-extrabold text-slate-900">
                    {formatMoney(selectedOrder.totalAmountPaise)}
                  </span>
                </div>
              </div>

              {/* Customer notes */}
              {selectedOrder.notes && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-900">
                    Customer notes
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-amber-800">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {/* Delivery information */}
              {selectedOrder.delivery && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-bold text-slate-900">
                    Delivery information
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span>
                      Delivery status:{" "}
                      <strong
                        className={
                          selectedOrder.delivery.status === "DELIVERED"
                            ? "text-emerald-700"
                            : ""
                        }
                      >
                        {formatStatus(selectedOrder.delivery.status)}
                      </strong>
                    </span>

                    <span>
                      Driver:{" "}
                      <strong>
                        {selectedOrder.delivery.driverId
                          ? "Assigned"
                          : "Not assigned"}
                      </strong>
                    </span>

                    {selectedOrder.delivery.deliveredAt && (
                      <span>
                        Delivered at:{" "}
                        <strong>
                          {formatDate(
                            selectedOrder.delivery.deliveredAt,
                          )}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Order actions */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="font-bold text-slate-900">
                  Order actions
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Only the next valid workflow actions are shown.
                </p>

                {getOwnerActions(selectedOrder).length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {getOwnerActions(selectedOrder).map((status) => {
                      const cancel = status === "CANCELLED";

                      return (
                        <button
                          key={status}
                          type="button"
                          disabled={updatingId === selectedOrder.id}
                          onClick={() =>
                            void updateStatus(selectedOrder, status)
                          }
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${cancel
                            ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                            : "bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-md shadow-sky-100 hover:from-sky-700 hover:to-cyan-600"
                            }`}
                        >
                          {updatingId === selectedOrder.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}

                          {cancel
                            ? "Cancel order"
                            : `Mark ${formatStatus(status)}`}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                    {selectedOrder.status === "DELIVERED"
                      ? "This order has been delivered. No further status changes are available."
                      : "No owner status changes are available. Delivery progress is managed by the delivery workflow."}
                  </p>
                )}
              </div>

              {/* Driver assignment */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <h4 className="font-bold text-slate-900">
                  Assign delivery to driver
                </h4>

                <p className="mt-1 text-sm text-slate-600">
                  Select an available driver for this order.
                </p>

                {selectedOrder.delivery?.driverId &&
                  selectedOrder.delivery.status !== "CANCELLED" &&
                  selectedOrder.delivery.status !== "FAILED" ? (
                  <p className="mt-3 text-sm font-semibold text-emerald-700">
                    A driver is already assigned to this delivery.
                  </p>
                ) : selectedOrder.status !== "READY" ? (
                  <p className="mt-3 text-sm text-amber-700">
                    Mark the order as Ready before assigning a driver.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <select
                      value={selectedDriverId}
                      onChange={(event) =>
                        setSelectedDriverId(event.target.value)
                      }
                      disabled={assigning}
                      aria-label="Select delivery driver"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 disabled:opacity-60"
                    >
                      <option value="">
                        Choose an available driver
                      </option>

                      {availableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name || "Unnamed driver"}
                          {driver.phone ? ` — ${driver.phone}` : ""}
                          {` (${driver.availability})`}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={assigning || !selectedDriverId}
                      onClick={() => void assignDriver(selectedOrder)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {assigning && (
                        <LoaderCircle
                          size={16}
                          className="animate-spin"
                        />
                      )}

                      {assigning
                        ? "Assigning..."
                        : "Assign driver"}
                    </button>
                  </div>
                )}

                {availableDrivers.length === 0 &&
                  !selectedOrder.delivery?.driverId &&
                  selectedOrder.status === "READY" && (
                    <p className="mt-3 text-sm text-amber-700">
                      No available drivers found. Ask a driver to go online.
                    </p>
                  )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
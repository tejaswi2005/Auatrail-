
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Droplets,
  Home,
  IdCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { api } from "../../services/api";

type DeliveryStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

type DriverAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";
type Tab = "dashboard" | "deliveries" | "profile";

type DriverProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "DRIVER";
  licenseNumber?: string | null;
  availability: DriverAvailability;
  isActive: boolean;
  createdAt: string;
};

type DeliveryItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    bottleSizeLiters: number;
  };
};

type Delivery = {
  id: string;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmountPaise: number;
    notes?: string | null;
    customer: {
      name: string;
      phone?: string | null;
      email?: string | null;
    };
    address: {
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      state: string;
      postalCode: string;
      latitude?: number | null;
      longitude?: number | null;
    };
    items: DeliveryItem[];
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type UpdateStatus =
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED";

const activeStatuses: DeliveryStatus[] = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
];

const statusStyles: Record<DeliveryStatus, string> = {
  ASSIGNED: "bg-blue-50 text-blue-700 ring-blue-200",
  ACCEPTED: "bg-violet-50 text-violet-700 ring-violet-200",
  PICKED_UP: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_TRANSIT: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-slate-200",
};

function nextAction(status: DeliveryStatus) {
  switch (status) {
    case "ASSIGNED":
      return {
        target: "ACCEPTED" as const,
        label: "Accept delivery",
        icon: CheckCircle2,
      };
    case "ACCEPTED":
      return {
        target: "PICKED_UP" as const,
        label: "Confirm bottle pickup",
        icon: Package,
      };
    case "PICKED_UP":
      return {
        target: "IN_TRANSIT" as const,
        label: "Start trip",
        icon: Truck,
      };
    default:
      return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string } } }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return error instanceof Error && error.message
    ? error.message
    : fallback;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "D";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function availabilityStyle(availability: DriverAvailability) {
  switch (availability) {
    case "AVAILABLE":
      return "bg-emerald-100 text-emerald-800";
    case "BUSY":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function availabilityDescription(availability: DriverAvailability) {
  switch (availability) {
    case "AVAILABLE":
      return "You are available to receive deliveries.";
    case "BUSY":
      return "You have an active delivery.";
    default:
      return "You are offline and cannot receive new deliveries.";
  }
}

export default function DriverDashboard() {
  const navigate = useNavigate();

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showFailureFor, setShowFailureFor] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileDetailsOpen, setProfileDetailsOpen] = useState(false);
  const [previousTab, setPreviousTab] = useState<Tab>("dashboard");

  const loadDashboard = useCallback(async (refresh = false) => {
    setError("");

    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [deliveryResponse, profileResponse] = await Promise.all([
        api.get<ApiResponse<Delivery[]>>("/deliveries/my"),
        api.get<ApiResponse<DriverProfile>>("/drivers/me"),
      ]);

      if (!Array.isArray(deliveryResponse.data.data)) {
        throw new Error("Unexpected deliveries response.");
      }

      setDeliveries(deliveryResponse.data.data);
      setDriver(profileResponse.data.data);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Unable to load your dashboard. Please try again."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Change availability using the authenticated driver's own profile.
  const handleAvailabilityChange = async () => {
    if (!driver || updatingAvailability) return;

    if (driver.availability === "BUSY") {
      setError(
        "You have an active delivery. Complete or resolve it before changing availability."
      );
      return;
    }

    const nextAvailability: "AVAILABLE" | "OFFLINE" =
      driver.availability === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";

    setUpdatingAvailability(true);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<
        ApiResponse<{ availability: DriverAvailability }>
      >("/drivers/me/availability", {
        availability: nextAvailability,
      });

      if (
        !response.data.success ||
        !response.data.data?.availability
      ) {
        throw new Error(
          response.data.message || "Unexpected availability response."
        );
      }

      setDriver((current) =>
        current
          ? {
              ...current,
              availability: response.data.data.availability,
            }
          : current
      );

      setNotice(
        response.data.message ||
          `Availability changed to ${response.data.data.availability}.`
      );
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Could not update availability. Please try again."
        )
      );
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const updateStatus = async (
    deliveryId: string,
    status: UpdateStatus,
    reason?: string
  ) => {
    setUpdatingId(deliveryId);
    setError("");
    setNotice("");

    try {
      const response = await api.patch<
        ApiResponse<{ id: string; status: DeliveryStatus }>
      >(`/deliveries/${deliveryId}/status`, {
        status,
        ...(reason ? { failureReason: reason } : {}),
      });

      setNotice(response.data.message || "Delivery updated successfully.");
      setShowFailureFor(null);
      setFailureReason("");

      await loadDashboard(true);
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Could not update delivery status.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    [
      "accessToken",
      "refreshToken",
      "token",
      "user",
      "authUser",
    ].forEach((key) => localStorage.removeItem(key));

    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setProfileMenuOpen(false);
    setProfileDetailsOpen(false);
    setError("");
    setNotice("");
  };

  const openProfileDetails = () => {
    setPreviousTab(activeTab === "profile" ? "dashboard" : activeTab);
    setActiveTab("profile");
    setProfileDetailsOpen(true);
    setProfileMenuOpen(false);
    setError("");
    setNotice("");
  };

  const goBackFromProfile = () => {
    setActiveTab(previousTab);
    setProfileDetailsOpen(false);
    setProfileMenuOpen(false);
  };

  const activeDeliveries = deliveries.filter((delivery) =>
    activeStatuses.includes(delivery.status)
  );

  const completedCount = deliveries.filter(
    (delivery) => delivery.status === "DELIVERED"
  ).length;

  const failedCount = deliveries.filter(
    (delivery) => delivery.status === "FAILED"
  ).length;

  const navigationItems: {
    id: Tab;
    label: string;
    icon: typeof LayoutDashboard;
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "deliveries", label: "Deliveries", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-800 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => selectTab("dashboard")}
            className="flex shrink-0 items-center gap-3 text-left"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
              <Droplets size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">
                AquaTrail
              </h1>
              <p className="text-xs text-slate-500">Driver workspace</p>
            </div>
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    activeTab === item.id
                      ? "bg-sky-50 text-sky-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Quick availability control in the header */}
            {driver && (
              <button
                type="button"
                onClick={() => void handleAvailabilityChange()}
                disabled={
                  loading ||
                  updatingAvailability ||
                  driver.availability === "BUSY" ||
                  !driver.isActive
                }
                title={
                  !driver.isActive
                    ? "Your account is inactive"
                    : driver.availability === "BUSY"
                      ? "Complete your active delivery first"
                      : driver.availability === "AVAILABLE"
                        ? "Go offline"
                        : "Become available for deliveries"
                }
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${
                  driver.availability === "AVAILABLE"
                    ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : driver.availability === "BUSY"
                      ? "bg-amber-50 text-amber-800"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {updatingAvailability ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      driver.availability === "AVAILABLE"
                        ? "bg-emerald-500"
                        : driver.availability === "BUSY"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                    }`}
                  />
                )}
                <span className="hidden sm:inline">
                  {updatingAvailability
                    ? "Updating..."
                    : driver.availability === "AVAILABLE"
                      ? "Go Offline"
                      : driver.availability === "BUSY"
                        ? "Busy"
                        : "Go Available"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={loading || refreshing}
              aria-label="Refresh dashboard"
              className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <div className="relative">
              <button
                type="button"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 pr-2.5 hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sm font-extrabold text-sky-700">
                  {getInitials(driver?.name)}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    profileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate font-bold text-slate-900">
                      {driver?.name || "Driver"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {driver?.email || "Driver account"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openProfileDetails}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                  >
                    <UserRound size={18} />
                    My Profile
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="ml-auto font-bold"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === "dashboard" && (
          <>
            <section className="rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-6 text-white sm:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold tracking-widest text-sky-100">
                    DRIVER WORKSPACE
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold">
                    Welcome{driver?.name ? `, ${driver.name}` : ""}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-sky-50">
                    Manage your assigned water orders and delivery progress.
                  </p>
                </div>

                {driver && (
                  <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-lg font-extrabold">
                      {getInitials(driver.name)}
                    </span>
                    <div>
                      <p className="font-bold">{driver.name}</p>
                      <p className="text-xs text-sky-100">Driver account</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${availabilityStyle(
                          driver.availability
                        )}`}
                      >
                        {driver.availability}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Main availability control */}
              {driver && (
                <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold">Delivery availability</p>
                    <p className="mt-1 text-sm text-sky-50">
                      {availabilityDescription(driver.availability)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAvailabilityChange()}
                    disabled={
                      updatingAvailability ||
                      driver.availability === "BUSY" ||
                      !driver.isActive
                    }
                    className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-sky-800 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {updatingAvailability ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : driver.availability === "AVAILABLE" ? (
                      <Activity size={18} />
                    ) : driver.availability === "BUSY" ? (
                      <Truck size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {updatingAvailability
                      ? "Updating..."
                      : driver.availability === "AVAILABLE"
                        ? "Go Offline"
                        : driver.availability === "BUSY"
                          ? "Delivery in progress"
                          : "Go Available"}
                  </button>
                </div>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Active deliveries"
                value={loading ? "—" : activeDeliveries.length}
                icon={<Truck size={21} />}
              />
              <SummaryCard
                title="Completed deliveries"
                value={loading ? "—" : completedCount}
                icon={<CheckCircle2 size={21} />}
              />
              <SummaryCard
                title="Failed deliveries"
                value={loading ? "—" : failedCount}
                icon={<AlertCircle size={21} />}
              />
              <SummaryCard
                title="All assigned"
                value={loading ? "—" : deliveries.length}
                icon={<Package size={21} />}
              />
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Recent deliveries
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Review your latest assigned orders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectTab("deliveries")}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100"
                >
                  View all <ArrowRight size={16} />
                </button>
              </div>

              {loading ? (
                <LoadingState />
              ) : deliveries.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="mt-5 space-y-3">
                  {deliveries.slice(0, 3).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          Order #{delivery.order.orderNumber}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {delivery.order.customer.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {delivery.order.address.city},{" "}
                          {delivery.order.address.state}
                        </p>
                      </div>
                      <StatusBadge status={delivery.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === "deliveries" && (
          <section>
            <div className="mb-5">
              <p className="text-sm font-bold uppercase tracking-widest text-sky-700">
                Delivery management
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                My Deliveries
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Accept orders, confirm pickup, start your trip, and update
                the delivery result.
              </p>
            </div>

            {loading ? (
              <LoadingState />
            ) : deliveries.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {deliveries.map((delivery) => {
                  const action = nextAction(delivery.status);
                  const ActionIcon = action?.icon;
                  const address = delivery.order.address;
                  const isUpdating = updatingId === delivery.id;
                  const showFailureForm = showFailureFor === delivery.id;

                  return (
                    <article
                      key={delivery.id}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Order
                          </p>
                          <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                            #{delivery.order.orderNumber}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Updated {formatDate(delivery.updatedAt)}
                          </p>
                        </div>
                        <StatusBadge status={delivery.status} />
                      </div>

                      <div className="space-y-5 p-5">
                        <div>
                          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Package size={17} className="text-sky-600" />
                            Bottles ordered
                          </p>
                          <div className="space-y-2">
                            {delivery.order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
                              >
                                <span>
                                  {item.product.name} (
                                  {item.product.bottleSizeLiters} L)
                                </span>
                                <span className="font-bold">
                                  × {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-bold text-slate-900">
                            Customer
                          </p>
                          <p className="font-semibold">
                            {delivery.order.customer.name}
                          </p>
                          {delivery.order.customer.phone && (
                            <a
                              href={`tel:${delivery.order.customer.phone}`}
                              className="mt-2 inline-flex items-center gap-2 text-sm text-sky-700 hover:underline"
                            >
                              <Phone size={15} />
                              {delivery.order.customer.phone}
                            </a>
                          )}
                          {delivery.order.customer.email && (
                            <p className="mt-1 break-all text-sm text-slate-500">
                              {delivery.order.customer.email}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-100 p-4">
                          <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                            <MapPin size={17} className="text-sky-600" />
                            Delivery address
                          </p>
                          <p className="text-sm leading-6 text-slate-600">
                            {address.addressLine1}
                            {address.addressLine2
                              ? `, ${address.addressLine2}`
                              : ""}
                            <br />
                            {address.city}, {address.state}{" "}
                            {address.postalCode}
                          </p>

                          {address.latitude != null &&
                            address.longitude != null && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline"
                              >
                                Open directions <ArrowRight size={15} />
                              </a>
                            )}
                        </div>

                        {delivery.order.notes && (
                          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                            <strong>Order notes:</strong>{" "}
                            {delivery.order.notes}
                          </div>
                        )}

                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <Clock size={15} className="mt-0.5 shrink-0" />
                          <div>
                            <p>Picked up: {formatDate(delivery.pickedUpAt)}</p>
                            <p>Trip started: {formatDate(delivery.startedAt)}</p>
                            <p>Delivered: {formatDate(delivery.deliveredAt)}</p>
                          </div>
                        </div>

                        {delivery.status === "FAILED" && (
                          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                            <strong>Failure reason:</strong>{" "}
                            {delivery.failureReason || "Not provided"}
                          </p>
                        )}

                        {action && (
                          <div className="border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void updateStatus(delivery.id, action.target)
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <LoaderCircle
                                  size={18}
                                  className="animate-spin"
                                />
                              ) : ActionIcon ? (
                                <ActionIcon size={18} />
                              ) : null}
                              {isUpdating ? "Updating..." : action.label}
                            </button>
                          </div>
                        )}

                        {delivery.status === "IN_TRANSIT" && (
                          <div className="space-y-3 border-t border-slate-100 pt-4">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                void updateStatus(delivery.id, "DELIVERED")
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <LoaderCircle
                                  size={18}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2 size={18} />
                              )}
                              {isUpdating ? "Updating..." : "Mark delivered"}
                            </button>

                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                setShowFailureFor(
                                  showFailureForm ? null : delivery.id
                                );
                                setFailureReason("");
                              }}
                              className="w-full rounded-xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              {showFailureForm
                                ? "Cancel failure report"
                                : "Report failed delivery"}
                            </button>

                            {showFailureForm && (
                              <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                                <label
                                  htmlFor={`failure-${delivery.id}`}
                                  className="block text-sm font-semibold text-slate-700"
                                >
                                  Reason for failed delivery
                                </label>
                                <textarea
                                  id={`failure-${delivery.id}`}
                                  value={failureReason}
                                  onChange={(event) =>
                                    setFailureReason(event.target.value)
                                  }
                                  maxLength={500}
                                  rows={3}
                                  placeholder="Explain why the order could not be delivered..."
                                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-400"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    isUpdating ||
                                    failureReason.trim().length < 3
                                  }
                                  onClick={() =>
                                    void updateStatus(
                                      delivery.id,
                                      "FAILED",
                                      failureReason.trim()
                                    )
                                  }
                                  className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                >
                                  {isUpdating
                                    ? "Submitting..."
                                    : "Confirm failed delivery"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {delivery.status === "DELIVERED" && (
                          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                            <CheckCircle2 size={18} />
                            Delivery completed successfully.
                          </div>
                        )}

                        {delivery.status === "CANCELLED" && (
                          <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
                            This delivery has been cancelled.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "profile" && (
          <section className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={goBackFromProfile}
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
              Back
            </button>

            {!profileDetailsOpen ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-sky-700 to-cyan-500 p-6 text-white">
                  <h2 className="text-2xl font-extrabold">My Profile</h2>
                  <p className="mt-1 text-sm text-sky-100">
                    Manage your account options.
                  </p>
                </div>

                <div className="space-y-2 p-4">
                  <button
                    type="button"
                    onClick={() => setProfileDetailsOpen(true)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-100 p-4 text-left hover:bg-sky-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded-xl bg-sky-100 p-3 text-sky-700">
                        <UserRound size={20} />
                      </span>
                      <span>
                        <span className="block font-bold text-slate-900">
                          Personal details
                        </span>
                        <span className="mt-1 block text-sm text-slate-500">
                          Name, contact, license and availability
                        </span>
                      </span>
                    </span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl border border-rose-100 p-4 text-left text-rose-700 hover:bg-rose-50"
                  >
                    <span className="rounded-xl bg-rose-100 p-3">
                      <LogOut size={20} />
                    </span>
                    <span>
                      <span className="block font-bold">Logout</span>
                      <span className="mt-1 block text-sm">
                        Sign out of AquaTrail
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-sky-700 to-cyan-500 p-6 text-white sm:p-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/20 text-2xl font-extrabold ring-1 ring-white/30">
                      {getInitials(driver?.name)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="break-words text-2xl font-extrabold">
                        {driver?.name || "Driver profile"}
                      </h2>
                      <p className="mt-1 text-sm text-sky-100">
                        AquaTrail delivery driver
                      </p>
                      {driver && (
                        <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                          {driver.isActive
                            ? "ACTIVE ACCOUNT"
                            : "INACTIVE ACCOUNT"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <LoadingState />
                ) : !driver ? (
                  <div className="p-5 text-sm text-amber-800">
                    Profile details could not be loaded. Check the{" "}
                    <code>/drivers/me</code> endpoint and refresh.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
                      <ProfileField
                        icon={<UserRound size={19} />}
                        label="Full name"
                        value={driver.name}
                      />
                      <ProfileField
                        icon={<Mail size={19} />}
                        label="Email address"
                        value={driver.email}
                      />
                      <ProfileField
                        icon={<Phone size={19} />}
                        label="Phone number"
                        value={driver.phone || "Not provided"}
                      />
                      <ProfileField
                        icon={<IdCard size={19} />}
                        label="License number"
                        value={driver.licenseNumber || "Not provided"}
                      />
                      <ProfileField
                        icon={<Activity size={19} />}
                        label="Account availability"
                        value={driver.availability.replace(/_/g, " ")}
                      />
                      <ProfileField
                        icon={<CalendarDays size={19} />}
                        label="Account created"
                        value={formatDate(driver.createdAt)}
                      />
                      <ProfileField
                        icon={<IdCard size={19} />}
                        label="Driver profile ID"
                        value={driver.id}
                      />
                      <ProfileField
                        icon={<UserRound size={19} />}
                        label="Account role"
                        value={driver.role}
                      />
                    </div>

                    {/* Availability control in My Profile */}
                    <div className="border-t border-slate-100 p-5 sm:p-7">
                      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-bold text-slate-900">
                            Delivery availability
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {availabilityDescription(driver.availability)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${availabilityStyle(
                              driver.availability
                            )}`}
                          >
                            {driver.availability}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleAvailabilityChange()}
                          disabled={
                            updatingAvailability ||
                            driver.availability === "BUSY" ||
                            !driver.isActive
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingAvailability ? (
                            <LoaderCircle
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Activity size={17} />
                          )}
                          {updatingAvailability
                            ? "Updating..."
                            : driver.availability === "AVAILABLE"
                              ? "Go Offline"
                              : driver.availability === "BUSY"
                                ? "Delivery in progress"
                                : "Go Available"}
                        </button>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-500">
                        Contact the shop owner to change your registered
                        account details. Availability can be managed here
                        when you are not on an active delivery.
                      </p>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700"
                      >
                        <LogOut size={17} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Persistent bottom navigation for mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          <BottomNavButton
            label="Dashboard"
            icon={<LayoutDashboard size={21} />}
            active={activeTab === "dashboard"}
            onClick={() => selectTab("dashboard")}
          />
          <BottomNavButton
            label="Deliveries"
            icon={<Truck size={21} />}
            active={activeTab === "deliveries"}
            onClick={() => selectTab("deliveries")}
          />
          <BottomNavButton
            label="Profile"
            icon={<UserRound size={21} />}
            active={activeTab === "profile"}
            onClick={() => {
              setActiveTab("profile");
              setProfileMenuOpen(false);
              setProfileDetailsOpen(false);
              setError("");
              setNotice("");
            }}
          />
        </div>
      </nav>
    </div>
  );
}

function BottomNavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
        active ? "text-sky-700" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span className="absolute bottom-0 h-0.5 w-10 rounded-full bg-sky-600" />
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{title}</span>
        <span className="rounded-xl bg-sky-50 p-3 text-sky-600">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function ProfileField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 p-4">
      <span className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">
      <LoaderCircle size={22} className="animate-spin text-sky-600" />
      Loading...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center">
      <div className="rounded-2xl bg-sky-50 p-4 text-sky-600">
        <Home size={30} />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">
        No deliveries assigned
      </h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        When the owner assigns a delivery to your account, it will appear here.
      </p>
    </div>
  );
}

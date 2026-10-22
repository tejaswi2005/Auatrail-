import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Home,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
  UserRound,
  Waves,
} from "lucide-react";

import { api } from "../../services/api";

// --------------------------------------------------
// Types
// --------------------------------------------------

interface Product {
  id: string;
  name: string;
  description: string | null;
  bottleSizeLiters: number;
  pricePaise: number;
  stockQuantity: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

interface Delivery {
  id: string;
  status: string;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountPaise: number;
  createdAt: string;
  delivery: Delivery | null;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function statusStyle(status: string): string {
  switch (status.toUpperCase()) {
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";

    case "CANCELLED":
      return "bg-red-50 text-red-700";

    case "IN_DELIVERY":
    case "OUT_FOR_DELIVERY":
    case "IN_TRANSIT":
    case "ASSIGNED":
    case "READY":
      return "bg-blue-50 text-blue-700";

    case "CONFIRMED":
    case "PROCESSING":
    case "PREPARING":
      return "bg-amber-50 text-amber-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isActiveOrder(status: string): boolean {
  return [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PREPARING",
    "READY",
    "ASSIGNED",
    "IN_DELIVERY",
    "OUT_FOR_DELIVERY",
    "IN_TRANSIT",
  ].includes(status.toUpperCase());
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const apiError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    if (apiError.response?.data?.message) {
      return apiError.response.data.message;
    }
  }

  return "We couldn't load your dashboard. Please try again.";
}

function extractArray<T>(
  responseData: unknown,
  nestedKey: string
): T[] {
  if (Array.isArray(responseData)) {
    return responseData as T[];
  }

  if (typeof responseData !== "object" || responseData === null) {
    return [];
  }

  const data = responseData as Record<string, unknown>;

  // Standard API response: { success: true, data: [...] }
  if (Array.isArray(data.data)) {
    return data.data as T[];
  }

  // Alternative response: { data: { products: [...] } }
  if (
    typeof data.data === "object" &&
    data.data !== null &&
    !Array.isArray(data.data)
  ) {
    const nestedData = data.data as Record<string, unknown>;

    if (Array.isArray(nestedData[nestedKey])) {
      return nestedData[nestedKey] as T[];
    }
  }

  // Alternative response: { products: [...] }
  if (Array.isArray(data[nestedKey])) {
    return data[nestedKey] as T[];
  }

  return [];
}

// --------------------------------------------------
// Customer Dashboard
// --------------------------------------------------

export default function CustomerDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (isRefresh = false) => {
    setError("");

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [productResponse, orderResponse] = await Promise.all([
        api.get("/products"),
        api.get("/orders/my"),
      ]);

      const productData = extractArray<Product>(
        productResponse.data,
        "products"
      );

      const orderData = extractArray<CustomerOrder>(
        orderResponse.data,
        "orders"
      );

      setProducts(productData);
      setOrders(orderData);
    } catch (err: unknown) {
      console.error("Failed to load customer dashboard:", err);

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // --------------------------------------------------
  // Dashboard data
  // --------------------------------------------------

  const activeOrders = orders.filter((order) =>
    isActiveOrder(order.status)
  );

  const activeDeliveries = activeOrders.filter(
    (order) => order.delivery !== null
  );

  const availableProducts = products.filter(
    (product) =>
      product.stockQuantity > 0 &&
      product.isActive !== false
  );

  const latestOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 4);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link
            to="/customer/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200">
              <Droplets size={25} />
            </span>

            <span>
              <span className="block text-xl font-extrabold tracking-tight">
                Aqua<span className="text-blue-600">Trail</span>
              </span>

              <span className="hidden text-xs text-slate-400 sm:block">
                Water delivery, simplified
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing || loading}
              aria-label="Refresh dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            <Link
              to="/customer/profile"
              aria-label="View your profile"
              title="My Profile"
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 transition hover:border-blue-200 hover:bg-sky-50 sm:px-3 sm:py-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm transition group-hover:scale-105">
                <UserRound size={19} />
              </span>

              <span className="hidden text-sm font-semibold text-slate-700 sm:block">
                My Profile
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Welcome */}
        <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
              <Waves size={17} />
              YOUR WATER, YOUR WAY
            </p>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome to AquaTrail
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Order your water, manage your deliveries, and track your
              driver from one place.
            </p>
          </div>

          <Link
            to="/customer/products"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Order water
            <ArrowRight size={17} />
          </Link>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3 text-sm text-red-700">
              <AlertCircle size={20} className="shrink-0" />
              {error}
            </div>

            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="w-fit rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {/* Hero banner */}
        <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-200/50 sm:p-9 lg:p-10">
          <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full border-[35px] border-white/10" />

          <div className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative z-10 grid items-center gap-7 md:grid-cols-[1fr_auto]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <Droplets size={15} />
                PURE WATER. RELIABLE DELIVERY.
              </span>

              <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                Pure water.
                <br className="hidden sm:block" />
                Closer to you.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-blue-50 sm:text-base">
                Your next water delivery is just a few clicks away.
                Browse available bottles and let us bring them to your
                doorstep.
              </p>
            </div>

            <div className="hidden h-36 w-36 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner backdrop-blur-sm md:flex lg:h-44 lg:w-44">
              <Droplets
                size={100}
                strokeWidth={1.1}
                className="text-white drop-shadow-lg"
              />
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<ShoppingBag size={22} />}
            label="Total orders"
            value={loading ? "—" : String(orders.length)}
            description="Your order history"
            iconClass="bg-blue-50 text-blue-600"
          />

          <StatCard
            icon={<Truck size={22} />}
            label="Active deliveries"
            value={loading ? "—" : String(activeDeliveries.length)}
            description="Orders being delivered"
            iconClass="bg-cyan-50 text-cyan-600"
          />

          <StatCard
            icon={<Package size={22} />}
            label="Available Bottle Size"
            value={loading ? "—" : String(availableProducts.length)}
            description="Ready to order"
            iconClass="bg-emerald-50 text-emerald-600"
          />
        </section>

        {/* Active deliveries */}
        <section className="mb-9">
          <SectionHeading
            title="Your active deliveries"
            subtitle="Follow your orders from preparation to delivery."
          />

          {loading ? (
            <LoadingCard />
          ) : activeOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
                <Truck size={27} />
              </div>

              <h3 className="mt-4 font-bold text-slate-800">
                No active deliveries
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                When you place an order, its progress will appear here.
              </p>

              <Link
                to="/customer/products"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Browse water
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {activeOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-blue-600">
                        <Package size={23} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          Order Created at
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${statusStyle(order.status)}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="my-5 flex items-center justify-between border-y border-slate-100 py-4">
                    <div>
                      <p className="text-xs text-slate-500">Order total</p>

                      <p className="mt-1 text-lg font-extrabold text-slate-900">
                        {formatPrice(order.totalAmountPaise)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Delivery status
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {order.delivery
                          ? statusLabel(order.delivery.status)
                          : "Awaiting assignment"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      to="/customer/orders"
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-sky-50"
                    >
                      View Orders
                      <ArrowRight size={16} />
                    </Link>

                    {order.delivery &&
                      !["DELIVERED", "CANCELLED"].includes(
                        order.status.toUpperCase()
                      ) && (
                        <Link
                          to={`/customer/track/${order.delivery.id}`}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          <MapPin size={17} />
                          Track delivery
                        </Link>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Available products */}
        <section id="available-products" className="mb-9 scroll-mt-24">
          <SectionHeading
            title="Available water"
            subtitle="Choose from the products available at your water shop."
            action={
              <span className="text-xs font-semibold text-slate-400">
                {availableProducts.length} products
              </span>
            }
          />

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-10 text-center">
              <Package size={35} className="mx-auto text-slate-300" />

              <h3 className="mt-3 font-bold text-slate-800">
                No products available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Please check again later.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-100/70"
                >
                  <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/80 text-blue-500 shadow-sm">
                        <Droplets size={62} strokeWidth={1.4} />
                      </div>
                    )}

                    <span className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                      {product.bottleSizeLiters} L bottle
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {product.stockQuantity} in stock
                        </p>
                      </div>

                      <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-extrabold text-emerald-700">
                        {formatPrice(product.pricePaise)}
                      </span>
                    </div>

                    {product.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 size={15} />
                        In stock
                      </span>

                      <Link
                        to="/customer/products"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Order
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Recent orders */}
        <section id="recent-orders" className="scroll-mt-24">
          <SectionHeading
            title="Recent orders"
            subtitle="A quick look at your latest orders."
            action={
              <Link
                to="/customer/orders"
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                All orders
                <ArrowRight size={16} />
              </Link>
            }
          />

          {loading ? (
            <LoadingCard />
          ) : latestOrders.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white px-5 py-8 text-center">
              <ClipboardList
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-semibold text-slate-700">
                Your orders will appear here.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Place your first order to get started.
              </p>

        
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {latestOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
                    index !== 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-blue-600">
                      <ShoppingBag size={20} />
                    </div>

                    <div>
                      <p className="font-bold text-slate-900">
                        Order Created at
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-extrabold text-slate-900">
                        {formatPrice(order.totalAmountPaise)}
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    {order.delivery &&
                      !["DELIVERED", "CANCELLED"].includes(
                        order.status.toUpperCase()
                      ) && (
                        <Link
                          to={`/customer/track/${order.delivery.id}`}
                          aria-label={`Track order ${order.orderNumber}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <MapPin size={18} />
                        </Link>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-2">
            <Droplets size={15} className="text-blue-500" />
            AquaTrail — Water delivery, made simple.
          </p>
        </footer>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          <MobileNavItem
            icon={<Home size={20} />}
            label="Home"
            href="/customer/dashboard"
            active
          />

          <MobileNavItem
            icon={<ShoppingBag size={20} />}
            label="Shop"
            href="/customer/products"
          />

          <MobileNavItem
            icon={<ClipboardList size={20} />}
            label="Orders"
            href="/customer/orders"
          />

          <MobileNavItem
            icon={<UserRound size={20} />}
            label="Account"
            href="/customer/profile"
          />
        </div>
      </nav>
    </div>
  );
}

// --------------------------------------------------
// Reusable components
// --------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  iconClass: string;
}

function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </article>
  );
}

interface SectionHeadingProps {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

function SectionHeading({
  title,
  subtitle,
  action,
}: SectionHeadingProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

      {action}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-6">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-4 h-3 w-full rounded bg-slate-100" />
      <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
      <div className="mt-5 h-10 rounded-xl bg-slate-100" />
    </div>
  );
}

interface MobileNavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function MobileNavItem({
  icon,
  label,
  href,
  active = false,
}: MobileNavItemProps) {
  return (
    <Link
      to={href}
      className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition ${
        active
          ? "text-blue-600"
          : "text-slate-400 hover:text-blue-600"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
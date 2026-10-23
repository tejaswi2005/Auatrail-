
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Droplets,
  LogOut,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  UserRound,
} from "lucide-react";

import { api } from "../../services/api";
import { clearSession } from "../../services/auth";
import { User } from "lucide-react";

interface Product {
  id: string;
  name: string;
  bottleSizeLiters: number;
  pricePaise: number;
  stockQuantity: number;
  isActive: boolean;
}

interface OrderItem {
  id?: string;
  quantity: number;
  product?: { name: string };
}

interface Order {
  id: string;
  orderNumber?: string;
  status: string;
  totalAmountPaise: number;
  createdAt: string;
  customer?: {
    user?: { name?: string };
  };
  items?: OrderItem[];
  delivery?: {
    id: string;
    status: string;
    driver?: { user?: { name?: string } } | null;
  } | null;
}

function extractArray<T>(response: unknown): T[] {
  if (!response || typeof response !== "object") return [];

  const root = response as Record<string, unknown>;
  const data = root.data;

  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    for (const key of ["orders", "products", "data"]) {
      if (Array.isArray(nested[key])) return nested[key] as T[];
    }
  }

  for (const key of ["orders", "products"]) {
    if (Array.isArray(root[key])) return root[key] as T[];
  }

  return [];
}

function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);
}

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status: string) {
  switch (status.toUpperCase()) {
    case "DELIVERED":
      return "bg-emerald-50 text-emerald-700";
    case "CANCELLED":
    case "FAILED":
      return "bg-red-50 text-red-700";
    case "IN_TRANSIT":
    case "PICKED_UP":
    case "IN_DELIVERY":
    case "OUT_FOR_DELIVERY":
      return "bg-blue-50 text-blue-700";
    case "CONFIRMED":
    case "PREPARING":
    case "READY":
    case "ASSIGNED":
    case "ACCEPTED":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function displayStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OwnerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [orderResponse, productResponse] = await Promise.all([
        api.get("/orders"),
        api.get("/products"),
      ]);

      setOrders(extractArray<Order>(orderResponse.data));
      setProducts(extractArray<Product>(productResponse.data));
    } catch (err: unknown) {
      console.error("Unable to load owner dashboard:", err);

      const message =
        typeof err === "object" &&
          err !== null &&
          "response" in err
          ? (
            err as {
              response?: { data?: { message?: string } };
            }
          ).response?.data?.message
          : undefined;

      setError(
        message ||
        "Unable to load dashboard data. Check your owner account and API endpoints."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const today = new Date().toDateString();

  const todaysOrders = orders.filter(
    (order) => new Date(order.createdAt).toDateString() === today
  );

  const activeOrders = orders.filter((order) =>
    ["PENDING", "CONFIRMED", "PREPARING", "READY", "ASSIGNED",
      "IN_DELIVERY", "OUT_FOR_DELIVERY", "IN_TRANSIT"].includes(
        order.status.toUpperCase()
      )
  );

  const deliveredOrders = orders.filter(
    (order) => order.status.toUpperCase() === "DELIVERED"
  );

  const lowStockProducts = products.filter(
    (product) => product.isActive && product.stockQuantity <= 10
  );

  const todayRevenuePaise = todaysOrders
    .filter((order) => order.status.toUpperCase() !== "CANCELLED")
    .reduce((total, order) => total + (Number(order.totalAmountPaise) || 0), 0);

  const totalRevenuePaise = deliveredOrders.reduce(
    (total, order) => total + (Number(order.totalAmountPaise) || 0),
    0
  );

  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  function handleLogout() {
    clearSession();
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
              <Droplets size={23} />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">
                Aqua<span className="text-blue-600">Trail</span>
              </span>
              <span className="block text-xs text-slate-500">
                Owner workspace
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-sky-50 disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>


            <Link
              to="/owner/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <User size={17} />
              <span>My Profile</span>
            </Link>


            {/* <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={17} />
              <span className="hidden sm:inline">Logout</span>
            </button> */}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-100">
                Business overview
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Owner Dashboard
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
                Monitor orders, water bottle inventory, and delivery activity
                from one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/owner/orders"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <ShoppingBag size={18} />
                Manage Orders
              </Link>
              <Link
                to="/owner/inventory"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                <Boxes size={18} />
                Inventory
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  Dashboard data unavailable
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Today's Orders"
            value={loading ? "—" : todaysOrders.length}
            note="Orders placed today"
            icon={<ShoppingBag size={22} />}
            iconStyle="bg-blue-50 text-blue-600"
            footer={<ArrowUpRight size={16} />}
          />
          <MetricCard
            title="Active Orders"
            value={loading ? "—" : activeOrders.length}
            note="Awaiting completion"
            icon={<Clock3 size={22} />}
            iconStyle="bg-amber-50 text-amber-600"
            footer={<Activity size={16} />}
          />
          <MetricCard
            title="Today's Order Value"
            value={loading ? "—" : formatMoney(todayRevenuePaise)}
            note="Excludes cancelled orders"
            icon={<TrendingUp size={22} />}
            iconStyle="bg-emerald-50 text-emerald-600"
            footer={<ArrowUpRight size={16} />}
          />
          <MetricCard
            title="Low Stock Products"
            value={loading ? "—" : lowStockProducts.length}
            note="Active products with 10 or fewer"
            icon={<AlertTriangle size={22} />}
            iconStyle="bg-red-50 text-red-600"
            footer={<ArrowDownRight size={16} />}
          />
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Recent Orders</h2>
                <p className="mt-1 text-sm text-slate-500">
                  The latest customer orders
                </p>
              </div>
              <Link
                to="/owner/orders"
                className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800"
              >
                View all <ArrowRight size={16} />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <RefreshCw className="mr-3 h-5 w-5 animate-spin" />
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="py-14 text-center">
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold">No orders yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  New customer orders will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[570px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-4 font-semibold">Order</th>
                      <th className="pb-3 pr-4 font-semibold">Date</th>
                      <th className="pb-3 pr-4 font-semibold">Amount</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50">
                        <td className="py-4 pr-4">
                          <p className="font-bold text-slate-800">
                            #{order.orderNumber || order.id.slice(-8)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {order.customer?.user?.name || "Customer"}
                          </p>
                        </td>
                        <td className="py-4 pr-4 text-sm text-slate-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="py-4 pr-4 text-sm font-bold text-slate-800">
                          {formatMoney(order.totalAmountPaise)}
                        </td>
                        <td className="py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${statusStyle(order.status)}`}
                          >
                            {displayStatus(order.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
                <Boxes size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Inventory Alerts</h2>
                <p className="text-sm text-slate-500">
                  Stock requiring attention
                </p>
              </div>
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Checking inventory...
              </p>
            ) : lowStockProducts.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-3 font-semibold">No low-stock alerts</p>
                <p className="mt-1 text-sm text-slate-500">
                  Your active products are above the alert threshold.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.bottleSizeLiters}L bottle
                      </p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-amber-700">
                      {product.stockQuantity} left
                    </span>
                  </div>
                ))}

                <Link
                  to="/owner/inventory"
                  className="inline-flex items-center gap-2 pt-2 text-sm font-bold text-blue-600 hover:text-blue-800"
                >
                  Review inventory <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-500">
              Jump to your daily business tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ActionCard
              to="/owner/orders"
              icon={<ShoppingBag size={22} />}
              title="Manage Orders"
              description="Review incoming orders and their status."
              style="bg-blue-50 text-blue-700"
            />
            <ActionCard
              to="/owner/inventory"
              icon={<Boxes size={22} />}
              title="Inventory"
              description="Review stock and restocking needs."
              style="bg-cyan-50 text-cyan-700"
            />
            <ActionCard
              to="/owner/products"
              icon={<Package size={22} />}
              title="Products"
              description="Manage bottle products and pricing."
              style="bg-emerald-50 text-emerald-700"
            />
            <ActionCard
              to="/owner/drivers"
              icon={<Users size={22} />}
              title="Drivers"
              description="Manage driver availability and assignments."
              style="bg-violet-50 text-violet-700"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <TrendingUp size={21} />
              </div>
              <div>
                <h2 className="font-bold">Business Summary</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Completed orders: {loading ? "—" : deliveredOrders.length}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Completed order value: {loading ? "—" : formatMoney(totalRevenuePaise)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Truck size={18} />
              AquaTrail operations
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          AquaTrail Owner Workspace · Business management
        </footer>
      </main>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
  iconStyle: string;
  footer: React.ReactNode;
}

function MetricCard({
  title,
  value,
  note,
  icon,
  iconStyle,
  footer,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-4 break-words text-2xl font-extrabold tracking-tight sm:text-3xl">
            {value}
          </p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          {icon}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{note}</p>
        <span className="text-slate-400">{footer}</span>
      </div>
    </div>
  );
}

interface ActionCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  style: string;
}

function ActionCard({
  to,
  icon,
  title,
  description,
  style,
}: ActionCardProps) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${style}`}>
        {icon}
      </div>
      <h3 className="mt-4 flex items-center justify-between gap-2 font-bold text-slate-900">
        {title}
        <ArrowRight
          size={17}
          className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600"
        />
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

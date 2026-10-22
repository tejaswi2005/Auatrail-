import { useEffect, useState } from "react";
import {
  Droplets,
  Package,
  Truck,
  Users,
  IndianRupee,
} from "lucide-react";
import { api } from "../../services/api";
import { clearSession, getSessionUser } from "../../services/auth";

interface DashboardOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountPaise: number;
  createdAt: string;
  customer: {
    user: {
      name: string;
      phone: string | null;
    };
  };
}

export default function OwnerDashboard() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [driverCount, setDriverCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [error, setError] = useState("");

  const user = getSessionUser();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [orderResponse, productResponse] = await Promise.all([
          api.get("/orders"),
          api.get("/products"),
        ]);

        setOrders(orderResponse.data.data);
        setProductCount(productResponse.data.data.length);

        // Dedicated driver/customer summary endpoints will be added next.
      } catch (error) {
        console.error(error);
        setError("Unable to load dashboard data.");
      }
    }

    void loadDashboard();
  }, []);

  const totalRevenuePaise = orders
    .filter((order) => order.status === "DELIVERED")
    .reduce((sum, order) => sum + order.totalAmountPaise, 0);

  const activeDeliveries = orders.filter((order) =>
    ["ASSIGNED", "IN_DELIVERY"].includes(order.status)
  ).length;

  const cards = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: Package,
    },
    {
      label: "Active Deliveries",
      value: activeDeliveries,
      icon: Truck,
    },
    {
      label: "Products",
      value: productCount,
      icon: Droplets,
    },
    {
      label: "Delivered Revenue",
      value: `₹${(totalRevenuePaise / 100).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}`,
      icon: IndianRupee,
    },
    {
      label: "Drivers",
      value: driverCount,
      icon: Truck,
    },
    {
      label: "Customers",
      value: customerCount,
      icon: Users,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-5 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-700 p-3 text-white">
            <Droplets />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900">
              AquaTrail
            </h1>
            <p className="text-sm text-slate-500">Owner workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {user?.name ?? "Owner"}
          </span>

          <button
            onClick={() => {
              clearSession();
              window.location.href = "/login";
            }}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-5 sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">
            Overview
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            Welcome back
          </h2>

          <p className="mt-2 text-slate-500">
            Manage your water business and deliveries.
          </p>
        </div>

        {error && (
          <p className="mb-5 rounded-xl bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <section
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <Icon className="text-cyan-700" size={22} />
                </div>

                <p className="mt-5 text-3xl font-bold text-slate-900">
                  {card.value}
                </p>
              </section>
            );
          })}
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b p-6">
            <h3 className="text-lg font-bold text-slate-900">
              Recent orders
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Amount</th>
                </tr>
              </thead>

              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="px-6 py-4 font-semibold">
                      {order.orderNumber}
                    </td>

                    <td className="px-6 py-4">
                      {order.customer.user.name}
                    </td>

                    <td className="px-6 py-4">{order.status}</td>

                    <td className="px-6 py-4">
                      ₹{(order.totalAmountPaise / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {orders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No orders yet. Orders will appear here when customers
                      start purchasing.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
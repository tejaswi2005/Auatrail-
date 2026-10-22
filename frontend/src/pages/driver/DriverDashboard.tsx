import { useEffect, useState } from "react";
import { MapPin, Package, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";

interface Delivery {
  id: string;
  status: string;
  order: {
    orderNumber: string;
    address: {
      addressLine1: string;
      city: string;
      postalCode: string;
    };
    customer: {
      user: {
        name: string;
        phone: string | null;
      };
    };
    items: Array<{
      id: string;
      quantity: number;
      product: {
        name: string;
      };
    }>;
  };
}

export default function DriverDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/deliveries/my")
      .then((response) => setDeliveries(response.data.data))
      .catch((error) => {
        console.error(error);
        setError("Unable to load assigned deliveries.");
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-5 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-700 p-3 text-white">
            <Truck />
          </div>

          <div>
            <h1 className="text-2xl font-bold">Driver Dashboard</h1>
            <p className="text-sm text-slate-500">
              Your assigned water deliveries
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-8 space-y-5">
          {deliveries.map((delivery) => (
            <section
              key={delivery.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Order number</p>
                  <h2 className="mt-1 text-lg font-bold">
                    {delivery.order.orderNumber}
                  </h2>
                </div>

                <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
                  {delivery.status}
                </span>
              </div>

              <div className="mt-5 flex gap-3">
                <MapPin className="shrink-0 text-cyan-700" />

                <div>
                  <p className="font-semibold">
                    {delivery.order.customer.user.name}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {delivery.order.address.addressLine1},{" "}
                    {delivery.order.address.city},{" "}
                    {delivery.order.address.postalCode}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Package className="shrink-0 text-cyan-700" />

                <div>
                  {delivery.order.items.map((item) => (
                    <p key={item.id} className="text-sm text-slate-600">
                      {item.product.name} × {item.quantity}
                    </p>
                  ))}
                </div>
              </div>

              <Link
                to={`/driver/deliveries/${delivery.id}`}
                className="mt-6 inline-flex rounded-xl bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800"
              >
                Open delivery
              </Link>
            </section>
          ))}

          {deliveries.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Truck className="mx-auto text-slate-400" size={40} />

              <h2 className="mt-4 text-lg font-bold">
                No assigned deliveries
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                New assignments will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
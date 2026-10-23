import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  LoaderCircle,
  MapPin,
  Radio,
  Truck,
} from "lucide-react";

import DeliveryMap from "../../components/maps/DeliveryMap";
import { socket } from "../../services/socket";
import { api } from "../../services/api";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationUpdate extends Coordinates {
  deliveryId: string;
  timestamp: string;
}

interface DeliveryDetails {
  id: string;
  status: string;
  orderNumber: string;
  address: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
  };
}

interface TrackingPageProps {
  deliveryId: string;
}

function isValidCoordinates(
  latitude: unknown,
  longitude: unknown
): latitude is number {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function TrackDelivery({
  deliveryId,
}: TrackingPageProps) {
  const navigate = useNavigate();

  const [delivery, setDelivery] =
    useState<DeliveryDetails | null>(null);

  const [driverLocation, setDriverLocation] =
    useState<Coordinates | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");

  useEffect(() => {
    let active = true;

    const handleConnect = () => {
      if (active) {
        setConnectionStatus("Live connection established");
      }

      socket.emit(
        "delivery:subscribe",
        { deliveryId },
        (result: { success: boolean; message?: string }) => {
          if (!active) return;

          if (!result.success) {
            setConnectionStatus(
              result.message || "Unable to subscribe to tracking"
            );
          }
        }
      );
    };

    const handleDisconnect = () => {
      if (active) {
        setConnectionStatus("Connection interrupted. Reconnecting...");
      }
    };

    const handleLocation = (update: LocationUpdate) => {
      if (
        !active ||
        update.deliveryId !== deliveryId ||
        !isValidCoordinates(update.latitude, update.longitude)
      ) {
        return;
      }

      setDriverLocation({
        latitude: update.latitude,
        longitude: update.longitude,
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("delivery:location", handleLocation);

    socket.connect();

    async function loadDelivery() {
      try {
        setLoading(true);
        setError("");

        const [deliveryResponse, locationResponse] =
          await Promise.all([
            api.get(`/deliveries/${encodeURIComponent(deliveryId)}`),
            api.get(
              `/deliveries/${encodeURIComponent(deliveryId)}/location`
            ),
          ]);

        if (!active) return;

        const details = deliveryResponse.data?.data as
          | DeliveryDetails
          | undefined;

        if (!details) {
          throw new Error("Delivery details were not returned.");
        }

        setDelivery(details);

        const location = locationResponse.data?.data;

        if (
          location &&
          isValidCoordinates(location.latitude, location.longitude)
        ) {
          setDriverLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      } catch (err: unknown) {
        if (!active) return;

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load delivery information.";

        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDelivery();

    return () => {
      active = false;

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("delivery:location", handleLocation);

      // Do not disconnect the shared socket here if other pages
      // or components also use it.
      socket.emit("delivery:unsubscribe", { deliveryId });
    };
  }, [deliveryId]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-cyan-700">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <span className="font-medium">
            Loading delivery information...
          </span>
        </div>
      </main>
    );
  }

  if (error || !delivery) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <AlertCircle className="h-6 w-6 text-red-600" />

          <h1 className="mt-3 text-xl font-bold text-red-800">
            Unable to load delivery
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error || "Delivery information is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/customer/orders")}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
          >
            Back to orders
          </button>
        </div>
      </main>
    );
  }

  const address = delivery.address;

  const destination: Coordinates | null =
    isValidCoordinates(address.latitude, address.longitude)
      ? {
          latitude: address.latitude,
          longitude: address.longitude as number,
        }
      : null;

  const addressText = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">
            AquaTrail Live Tracking
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Track your water delivery
          </h1>

          <p className="mt-2 text-slate-500">
            Order {delivery.orderNumber}
          </p>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-3">
                <Truck className="h-5 w-5 text-cyan-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Delivery status
                </p>

                <p className="font-bold text-slate-900">
                  {delivery.status.replaceAll("_", " ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3">
                <Radio className="h-5 w-5 text-emerald-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Tracking connection
                </p>

                <p className="font-semibold text-slate-900">
                  {connectionStatus}
                </p>
              </div>
            </div>

            {!driverLocation && (
              <p className="mt-3 text-sm text-amber-700">
                Waiting for the driver's first location update.
              </p>
            )}
          </section>
        </div>

        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />

            <div>
              <h2 className="font-bold text-slate-900">
                Delivery destination
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {addressText || "Address unavailable"}
              </p>

              {!destination && (
                <p className="mt-2 text-sm text-amber-700">
                  This address does not have map coordinates. The
                  map cannot display the actual destination until
                  coordinates are saved.
                </p>
              )}
            </div>
          </div>
        </section>

        {destination ? (
          <DeliveryMap
            driverLocation={driverLocation}
            customerLocation={destination}
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Map tracking requires latitude and longitude for
              the delivery address. Your delivery address is
              available above.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
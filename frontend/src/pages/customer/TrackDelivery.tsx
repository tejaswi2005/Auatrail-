import { useEffect, useState } from "react";
import DeliveryMap from "../../components/maps/DeliveryMap";
import { socket } from "../../services/socket";
import { api } from "../../services/api";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationUpdate {
  deliveryId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface TrackingPageProps {
  deliveryId: string;
}

export default function TrackDelivery({
  deliveryId,
}: TrackingPageProps) {
  const [driverLocation, setDriverLocation] =
    useState<Coordinates | null>(null);

  const [customerLocation] = useState<Coordinates>({
    latitude: 18.5204,
    longitude: 73.8567,
  });

  const [connectionStatus, setConnectionStatus] =
    useState("Connecting...");

  useEffect(() => {
    let active = true;

    const handleConnect = () => {
      if (active) setConnectionStatus("Live connection established");
    };

    const handleDisconnect = () => {
      if (active) setConnectionStatus("Reconnecting...");
    };

    const handleLocation = (update: LocationUpdate) => {
      if (
        active &&
        update.deliveryId === deliveryId &&
        Number.isFinite(update.latitude) &&
        Number.isFinite(update.longitude)
      ) {
        setDriverLocation({
          latitude: update.latitude,
          longitude: update.longitude,
        });
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("delivery:location", handleLocation);

    socket.connect();

    const loadLatestLocation = async () => {
      try {
        // The backend endpoint will be implemented with delivery
        // authorization in the next stage.
        const response = await api.get(
          `/deliveries/${encodeURIComponent(deliveryId)}/location`
        );

        if (active && response.data?.data) {
          setDriverLocation({
            latitude: response.data.data.latitude,
            longitude: response.data.data.longitude,
          });
        }
      } catch (error) {
        console.error("Could not load latest driver location:", error);
      }
    };

    void loadLatestLocation();

    return () => {
      active = false;

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("delivery:location", handleLocation);

      socket.disconnect();
    };
  }, [deliveryId]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-700">
            AquaTrail Live Tracking
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Track your water delivery
          </h1>

          <p className="mt-2 text-slate-500">
            Delivery ID: {deliveryId}
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-800">
            Driver location
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {connectionStatus}
          </p>

          {!driverLocation && (
            <p className="mt-3 text-sm text-amber-700">
              Waiting for the driver's first location update.
            </p>
          )}
        </div>

        <DeliveryMap
          driverLocation={driverLocation}
          customerLocation={customerLocation}
        />
      </div>
    </main>
  );
}
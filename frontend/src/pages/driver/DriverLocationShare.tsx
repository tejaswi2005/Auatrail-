import { useEffect, useRef, useState } from "react";
import { socket } from "../../services/socket";

interface DriverLocationShareProps {
  deliveryId: string;
}

export default function DriverLocationShare({
  deliveryId,
}: DriverLocationShareProps) {
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("Location sharing is off");

  const watchId = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }

      socket.off("connect_error");
      socket.disconnect();
    };
  }, []);

  const startSharing = () => {
    if (!navigator.geolocation) {
      setMessage("This browser does not support GPS location.");
      return;
    }

    if (!window.isSecureContext) {
      setMessage(
        "Location sharing requires HTTPS, or localhost during development."
      );
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        // This event is only a client-side prototype until the
        // backend validates the authenticated driver and delivery.
        socket.emit("driver:location", {
          deliveryId,
          latitude,
          longitude,
          accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });

        setMessage(
          `GPS updated: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        );
      },
      (error) => {
        setMessage(`Unable to access GPS: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    setSharing(true);
    setMessage("Requesting GPS location...");
  };

  const stopSharing = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    socket.disconnect();
    setSharing(false);
    setMessage("Location sharing stopped");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">
        Delivery GPS
      </h2>

      <p className="mt-2 text-sm text-slate-500">{message}</p>

      {!sharing ? (
        <button
          onClick={startSharing}
          className="mt-5 rounded-xl bg-cyan-700 px-5 py-3 font-semibold text-white hover:bg-cyan-800"
        >
          Start sharing location
        </button>
      ) : (
        <button
          onClick={stopSharing}
          className="mt-5 rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white hover:bg-rose-700"
        >
          Stop sharing location
        </button>
      )}
    </section>
  );
}
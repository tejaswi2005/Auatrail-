import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DeliveryMapProps {
  driverLocation: Coordinates | null;
  customerLocation: Coordinates;
}

const driverIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 38px;
      height: 38px;
      border: 3px solid white;
      border-radius: 50%;
      background: #0891b2;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 2px 10px rgba(0,0,0,.25);
    ">🚚</div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function FitMap({
  driverLocation,
  customerLocation,
}: DeliveryMapProps) {
  const map = useMap();

  useEffect(() => {
    const locations: L.LatLngExpression[] = [
      [customerLocation.latitude, customerLocation.longitude],
    ];

    if (driverLocation) {
      locations.push([
        driverLocation.latitude,
        driverLocation.longitude,
      ]);
    }

    if (locations.length === 1) {
      map.setView(locations[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(locations), {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [map, driverLocation, customerLocation]);

  return null;
}

export default function DeliveryMap({
  driverLocation,
  customerLocation,
}: DeliveryMapProps) {
  return (
    <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={[
          customerLocation.latitude,
          customerLocation.longitude,
        ]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker
          position={[
            customerLocation.latitude,
            customerLocation.longitude,
          ]}
        >
          <Popup>Customer delivery location</Popup>
        </Marker>

        {driverLocation && (
          <Marker
            position={[
              driverLocation.latitude,
              driverLocation.longitude,
            ]}
            icon={driverIcon}
          >
            <Popup>Water delivery driver</Popup>
          </Marker>
        )}

        <FitMap
          driverLocation={driverLocation}
          customerLocation={customerLocation}
        />
      </MapContainer>
    </div>
  );
}
import { useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SelectedLocation {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value: SelectedLocation | null;
  onChange: (location: SelectedLocation) => void;
}

/* -------------------------------------------------------------------------- */
/* Custom map marker                                                          */
/* -------------------------------------------------------------------------- */

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 30px;
      height: 30px;
      background-color: #0284c7;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      position: relative;
    ">
      <div style="
        position: absolute;
        top: 8px;
        left: 8px;
        width: 8px;
        height: 8px;
        background-color: white;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

/* -------------------------------------------------------------------------- */
/* Handle map clicks                                                          */
/* -------------------------------------------------------------------------- */

interface MapClickHandlerProps {
  onChange: (location: SelectedLocation) => void;
}

function MapClickHandler({ onChange }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      onChange({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Location Picker Component                                                  */
/* -------------------------------------------------------------------------- */

export default function LocationPicker({
  value,
  onChange,
}: LocationPickerProps) {
  // Default map view: Pune.
  // This is only the initial view, not the customer's selected location.
  const [initialCenter] = useState<[number, number]>(
    value ? [value.lat, value.lng] : [18.5204, 73.8567]
  );

  return (
    <div className="w-full space-y-4">
      {/* Map */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <MapContainer
          center={initialCenter}
          zoom={value ? 16 : 12}
          scrollWheelZoom={true}
          style={{
            height: "350px",
            width: "100%",
          }}
        >
          {/* OpenStreetMap tiles */}

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Clicking the map selects a location */}

          <MapClickHandler onChange={onChange} />

          {/* Selected location marker */}

          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={markerIcon}
              draggable={true}
              eventHandlers={{
                dragend(event) {
                  const position = event.target.getLatLng();

                  onChange({
                    lat: position.lat,
                    lng: position.lng,
                  });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Instructions */}

      <div className="rounded-xl border border-blue-100 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            📍
          </div>

          <div>
            <h4 className="font-semibold text-slate-800">
              Select your delivery location
            </h4>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Click on the map to place the marker at your delivery
              address. You can drag the marker to adjust its position.
            </p>
          </div>
        </div>
      </div>

      {/* Selected coordinates */}

      {value ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-800">
            ✓ Location selected successfully
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">Latitude</p>

              <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {value.lat.toFixed(6)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-slate-500">Longitude</p>

              <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {value.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Please click on the map to select your delivery location.
          </p>
        </div>
      )}
    </div>
  );
}
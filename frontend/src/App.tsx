import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useParams } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";

import OwnerDashboard from "./pages/owner/OwnerDashboard";
import DriverDashboard from "./pages/driver/DriverDashboard";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerProfile from "./pages/customer/CustomerProfile";
import CustomerOrders from "./pages/customer/CustomerOrders";
import CustomerProducts from "./pages/customer/CustomerProducts";
import CustomerCheckout from "./pages/customer/CustomerCheckout";
import TrackDelivery from "./pages/customer/TrackDelivery";


import OwnerProducts from "./pages/owner/OwnerProducts";
import OwnerOrders from "./pages/owner/OwnerOrders";
import Drivers from "./pages/owner/Drivers";
import OwnerSettings from "./pages/owner/OwnerSettings";
import Inventory from "./pages/owner/Inventory";


import ProtectedRoute from "./components/ProtectedRoute";

function Unauthorized() {
  return (
    <main className="p-10 text-center">
      <h1 className="text-2xl font-bold">Access denied</h1>
      <p className="mt-2 text-slate-500">
        You do not have permission to access this page.
      </p>
    </main>
  );
}

function TrackDeliveryRoute() {
  const { deliveryId } = useParams<{ deliveryId: string }>();

  if (!deliveryId) {
    return <Navigate to="/customer/orders" replace />;
  }

  return <TrackDelivery deliveryId={deliveryId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Owner routes */}
        <Route element={<ProtectedRoute allowedRoles={["OWNER"]} />}>
          <Route
            path="/owner/dashboard"
            element={<OwnerDashboard />}
          />
          <Route
            path="/owner/products"
            element={<OwnerProducts />}
          />
          <Route
            path="/owner/orders"
            element={<OwnerOrders />}
          />
          <Route
            path="/owner/drivers"
            element={<Drivers />}
          />
          <Route 
            path="/owner/settings" 
            element={<OwnerSettings />} 
          />
          <Route 
            path="/owner/inventory" 
            element={<Inventory />} 
          />
        </Route>

        {/* Driver routes */}
        <Route element={<ProtectedRoute allowedRoles={["DRIVER"]} />}>
          <Route
            path="/driver/dashboard"
            element={<DriverDashboard />}
          />
        </Route>

        {/* Customer routes */}
        <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
          <Route
            path="/customer/dashboard"
            element={<CustomerDashboard />}
          />

          <Route
            path="/customer/profile"
            element={<CustomerProfile />}
          />
          <Route
            path="/customer/orders"
            element={<CustomerOrders />}
          />

          <Route
            path="/customer/products"
            element={<CustomerProducts />}
          />
          <Route
            path="/customer/checkout"
            element={<CustomerCheckout />}
          />
          <Route
            path="/customer/track/:deliveryId"
            element={<TrackDeliveryRoute />}
          />
        </Route>


        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
        <Route
          path="/customer/track/:deliveryId"
          element={<TrackDeliveryRoute />}
        />
      </Routes>
    </BrowserRouter>
  );
}
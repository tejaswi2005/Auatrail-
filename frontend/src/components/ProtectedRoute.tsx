import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  getAccessToken,
  getSessionUser,
} from "../services/auth";

interface ProtectedRouteProps {
  allowedRoles?: Array<"OWNER" | "DRIVER" | "CUSTOMER">;
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const token = getAccessToken();
  const user = getSessionUser();

  console.log("ProtectedRoute check:", {
    path: location.pathname,
    hasToken: Boolean(token),
    userRole: user?.role ?? null,
    allowedRoles,
  });

  if (!token || !user) {
    console.warn("Redirecting to login: token or user is missing.");

    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn("Redirecting to unauthorized: role mismatch.");

    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
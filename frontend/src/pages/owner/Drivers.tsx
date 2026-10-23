
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Truck,
  Users,
  Phone,
  Mail,
  AlertCircle,
  LoaderCircle,
  UserPlus,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../services/api";

type Availability = "AVAILABLE" | "BUSY" | "OFFLINE";

type Driver = {
  id: string;
  userId?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  licenseNumber?: string | null;
  isAvailable?: boolean;
  availability?: Availability;
  activeDeliveries?: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type DriverForm = {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  temporaryPassword: string;
};

const emptyForm: DriverForm = {
  name: "",
  email: "",
  phone: "",
  licenseNumber: "",
  temporaryPassword: "",
};

function getAvailability(driver: Driver): string {
  if (driver.availability) return driver.availability;
  if (driver.isAvailable === true) return "AVAILABLE";
  if (driver.isAvailable === false) return "BUSY";
  return "UNKNOWN";
}

const availabilityStyles: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  BUSY: "bg-amber-50 text-amber-700 ring-amber-200",
  OFFLINE: "bg-slate-100 text-slate-600 ring-slate-200",
  UNKNOWN: "bg-slate-100 text-slate-600 ring-slate-200",
};

function getApiError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) return response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadDrivers = useCallback(async (refresh = false) => {
    setError("");
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get<ApiResponse<Driver[]>>("/drivers");

      if (!Array.isArray(response.data.data)) {
        throw new Error("Unexpected driver response.");
      }

      setDrivers(response.data.data);
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          "Could not load drivers. Check the driver API and try again."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      const matchesSearch =
        !query ||
        driver.name.toLowerCase().includes(query) ||
        (driver.email ?? "").toLowerCase().includes(query) ||
        (driver.phone ?? "").toLowerCase().includes(query);

      const status = getAvailability(driver);
      const matchesFilter = filter === "ALL" || status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [drivers, search, filter]);

  const availableCount = drivers.filter(
    (driver) => getAvailability(driver) === "AVAILABLE"
  ).length;

  const updateField = (field: keyof DriverForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormError("");
  };

  const closeAddForm = () => {
    if (creating) return;
    setShowAddForm(false);
    setForm(emptyForm);
    setFormError("");
    setShowPassword(false);
  };

  const createDriver = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const licenseNumber = form.licenseNumber.trim();
    const temporaryPassword = form.temporaryPassword;

    if (name.length < 2) {
      setFormError("Name must contain at least 2 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (phone && (phone.length < 7 || phone.length > 20)) {
      setFormError("Phone number must contain 7 to 20 characters.");
      return;
    }

    if (temporaryPassword.length < 8 || temporaryPassword.length > 100) {
      setFormError("Temporary password must contain 8 to 100 characters.");
      return;
    }

    setCreating(true);

    try {
      const response = await api.post<ApiResponse<{ driver: Driver }>>(
        "/drivers",
        {
          name,
          email,
          ...(phone ? { phone } : {}),
          ...(licenseNumber ? { licenseNumber } : {}),
          temporaryPassword,
        }
      );

      setShowAddForm(false);
      setForm(emptyForm);
      setShowPassword(false);
      setSuccess(
        response.data.message ||
          "Driver account created successfully. Share the temporary password securely."
      );

      await loadDrivers(true);
    } catch (err: unknown) {
      setFormError(
        getApiError(
          err,
          "Could not create the driver. Please try again."
        )
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
              <Truck size={23} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">
                AquaTrail
              </h1>
              <p className="text-xs text-slate-500">Driver management</p>
            </div>
          </Link>

          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-sm font-bold tracking-widest text-sky-100">
              OWNER WORKSPACE
            </p>
            <h2 className="mt-2 text-3xl font-extrabold">Drivers</h2>
            <p className="mt-2 text-sm text-sky-50">
              Manage your delivery team, accounts and availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setSuccess("");
                setShowAddForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              <UserPlus size={17} />
              Add Driver
            </button>

            <button
              type="button"
              onClick={() => void loadDrivers(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto rounded-lg p-1 hover:bg-emerald-100"
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total drivers</span>
              <span className="rounded-xl bg-sky-50 p-3 text-sky-600">
                <Users size={21} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {loading ? "—" : drivers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Available drivers
              </span>
              <span className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                <Truck size={21} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {loading ? "—" : availableCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Driver directory
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Contact information, availability and active deliveries.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search drivers..."
                  aria-label="Search drivers"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-sky-400 sm:w-60"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter drivers"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
              >
                <option value="ALL">All drivers</option>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle className="animate-spin text-sky-600" size={22} />
              Loading drivers...
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
              <Truck size={32} className="text-slate-300" />
              <h4 className="mt-3 font-bold text-slate-800">
                {drivers.length === 0 ? "No drivers added yet" : "No drivers found"}
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {drivers.length === 0
                  ? "Add your first driver to start managing deliveries."
                  : "Try changing your search or filter."}
              </p>
              {drivers.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
                >
                  <UserPlus size={16} />
                  Add your first driver
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Driver</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Availability</th>
                      <th className="px-6 py-4">Active deliveries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrivers.map((driver) => {
                      const status = getAvailability(driver);

                      return (
                        <tr key={driver.id} className="hover:bg-sky-50/40">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                                {driver.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {driver.name}
                                </span>
                                {driver.licenseNumber && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    License: {driver.licenseNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {driver.phone && (
                              <a
                                href={`tel:${driver.phone}`}
                                className="mb-1 flex items-center gap-2 hover:text-sky-700"
                              >
                                <Phone size={14} />
                                {driver.phone}
                              </a>
                            )}
                            {driver.email && (
                              <a
                                href={`mailto:${driver.email}`}
                                className="flex items-center gap-2 break-all hover:text-sky-700"
                              >
                                <Mail size={14} />
                                {driver.email}
                              </a>
                            )}
                            {!driver.phone && !driver.email && "No contact details"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${
                                availabilityStyles[status] ??
                                availabilityStyles.UNKNOWN
                              }`}
                            >
                              {status.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                            {driver.activeDeliveries ?? 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {filteredDrivers.map((driver) => {
                  const status = getAvailability(driver);

                  return (
                    <article
                      key={driver.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 font-bold text-sky-700">
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-bold text-slate-900">
                              {driver.name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {driver.activeDeliveries ?? 0} active deliveries
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ring-1 ring-inset ${
                            availabilityStyles[status] ??
                            availabilityStyles.UNKNOWN
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      {driver.phone && (
                        <a
                          href={`tel:${driver.phone}`}
                          className="mt-4 flex items-center gap-2 text-sm text-slate-600"
                        >
                          <Phone size={15} />
                          {driver.phone}
                        </a>
                      )}
                      {driver.email && (
                        <a
                          href={`mailto:${driver.email}`}
                          className="mt-2 flex items-center gap-2 break-all text-sm text-slate-600"
                        >
                          <Mail size={15} />
                          {driver.email}
                        </a>
                      )}
                      {driver.licenseNumber && (
                        <p className="mt-2 text-sm text-slate-500">
                          License: {driver.licenseNumber}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Showing {filteredDrivers.length} of {drivers.length} drivers
          </div>
        </section>
      </main>

      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAddForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-driver-title"
            className="my-auto w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-100 p-3 text-sky-700">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3
                    id="add-driver-title"
                    className="text-xl font-extrabold text-slate-900"
                  >
                    Add a driver
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a driver account for AquaTrail.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddForm}
                disabled={creating}
                aria-label="Close form"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createDriver} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="driver-name"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Full name *
                  </label>
                  <input
                    id="driver-name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Enter driver's full name"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="driver-email"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Email address *
                  </label>
                  <input
                    id="driver-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="driver@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="driver-phone"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="driver-phone"
                    type="tel"
                    autoComplete="tel"
                    minLength={7}
                    maxLength={20}
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="driver-license"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Driving license number
                  </label>
                  <input
                    id="driver-license"
                    maxLength={50}
                    value={form.licenseNumber}
                    onChange={(event) =>
                      updateField("licenseNumber", event.target.value)
                    }
                    placeholder="Enter license number (optional)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="driver-password"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Temporary password *
                  </label>
                  <div className="relative">
                    <input
                      id="driver-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={100}
                      value={form.temporaryPassword}
                      onChange={(event) =>
                        updateField("temporaryPassword", event.target.value)
                      }
                      placeholder="At least 8 characters"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-3 pr-12 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Share this password with the driver through a secure channel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <ShieldCheck size={17} className="mt-0.5 shrink-0" />
                <p>
                  The driver will use this email and temporary password to sign
                  in. Add a password-change flow before using temporary passwords
                  in a production deployment.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAddForm}
                  disabled={creating}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Creating driver...
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      Create driver account
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Store,
  UserRound,
  Phone,
  MapPin,
  ShieldCheck,
  FileText,
  Clock,
  Truck,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../services/api";

type OwnerProfile = {
  name: string;
  email: string;
  phone: string;
  profilePhotoUrl: string;

  shopName: string;
  shopNumber: string;
  shopType: string;
  shopPhone: string;
  shopAddress: string;
  landmark: string;
  city: string;
  state: string;
  pinCode: string;
  latitude: string;
  longitude: string;

  businessRegistrationNumber: string;
  licenseType: string;
  licenseNumber: string;
  issuingAuthority: string;
  licenseIssueDate: string;
  licenseExpiryDate: string;
  verificationStatus: string;

  waterTypes: string;
  deliveryAvailable: boolean;
  serviceAreas: string;
  openingTime: string;
  closingTime: string;

  accountStatus: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLoginAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const emptyProfile: OwnerProfile = {
  name: "",
  email: "",
  phone: "",
  profilePhotoUrl: "",

  shopName: "",
  shopNumber: "",
  shopType: "",
  shopPhone: "",
  shopAddress: "",
  landmark: "",
  city: "",
  state: "",
  pinCode: "",
  latitude: "",
  longitude: "",

  businessRegistrationNumber: "",
  licenseType: "",
  licenseNumber: "",
  issuingAuthority: "",
  licenseIssueDate: "",
  licenseExpiryDate: "",
  verificationStatus: "PENDING",

  waterTypes: "",
  deliveryAvailable: false,
  serviceAreas: "",
  openingTime: "",
  closingTime: "",

  accountStatus: "",
  emailVerified: false,
  phoneVerified: false,
  lastLoginAt: "",
};

function errorMessage(error: unknown, fallback: string) {
  return (
    (error as {
      response?: { data?: { message?: string } };
    })?.response?.data?.message ?? fallback
  );
}

function httpStatus(error: unknown) {
  return (error as {
    response?: { status?: number };
  })?.response?.status;
}

export default function OwnerSettings() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState<OwnerProfile>(emptyProfile);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get<ApiResponse<OwnerProfile>>(
            "/owner/profile"
          );

        if (!response.data.success || !response.data.data) {
          throw new Error("Invalid profile response.");
        }

        if (active) {
          setProfile({
            ...emptyProfile,
            ...response.data.data,
          });
        }
      } catch (err) {
        if (!active) return;

        const status = httpStatus(err);

        if (status === 401) {
          navigate("/owner/login", {
            replace: true,
            state: { from: "/owner/settings" },
          });
          return;
        }

        setError(
          status === 403
            ? "You are not authorized to access these settings."
            : errorMessage(
                err,
                "Unable to load your owner profile."
              )
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  function updateField<K extends keyof OwnerProfile>(
    field: K,
    value: OwnerProfile[K]
  ) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveProfile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      // Send only editable fields.
      // Never send an ownerId from the browser.
      const payload = {
        name: profile.name.trim(),
        phone: profile.phone.trim(),

        shopName: profile.shopName.trim(),
        shopNumber: profile.shopNumber.trim(),
        shopType: profile.shopType,
        shopPhone: profile.shopPhone.trim(),
        shopAddress: profile.shopAddress.trim(),
        landmark: profile.landmark.trim(),
        city: profile.city.trim(),
        state: profile.state.trim(),
        pinCode: profile.pinCode.trim(),
        latitude: profile.latitude,
        longitude: profile.longitude,

        businessRegistrationNumber:
          profile.businessRegistrationNumber.trim(),
        licenseType: profile.licenseType,
        licenseNumber: profile.licenseNumber.trim(),
        issuingAuthority: profile.issuingAuthority.trim(),
        licenseIssueDate: profile.licenseIssueDate || null,
        licenseExpiryDate: profile.licenseExpiryDate || null,

        waterTypes: profile.waterTypes,
        deliveryAvailable: profile.deliveryAvailable,
        serviceAreas: profile.serviceAreas.trim(),
        openingTime: profile.openingTime || null,
        closingTime: profile.closingTime || null,
      };

      const response =
        await api.patch<ApiResponse<OwnerProfile>>(
          "/owner/profile",
          payload
        );

      if (!response.data.success || !response.data.data) {
        throw new Error("Invalid profile response.");
      }

      setProfile((current) => ({
        ...current,
        ...response.data.data,
      }));

      setNotice(
        response.data.message ?? "Profile updated successfully."
      );
    } catch (err) {
      const status = httpStatus(err);

      if (status === 401) {
        navigate("/owner/login", {
          replace: true,
          state: { from: "/owner/settings" },
        });
        return;
      }

      setError(
        status === 403
          ? "You are not authorized to update this profile."
          : errorMessage(
              err,
              "Could not save your details. Please try again."
            )
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 " +
    "bg-white px-4 py-3 text-sm outline-none " +
    "focus:border-sky-400 focus:ring-4 focus:ring-sky-50 " +
    "disabled:bg-slate-100";

  const labelClass =
    "block text-sm font-semibold text-slate-700";

  const readOnlyClass =
    inputClass + " cursor-not-allowed text-slate-500";

  function sectionTitle(
    icon: React.ReactNode,
    title: string,
    description: string
  ) {
    return (
      <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:p-6">
        <span className="rounded-xl bg-sky-50 p-3 text-sky-600">
          {icon}
        </span>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-xl bg-white p-6 shadow-sm">
          <LoaderCircle className="animate-spin" />
          Verifying your account and loading details...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            to="/owner/dashboard"
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-sky-600 p-3 text-white">
              <Store size={22} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold">
                AquaTrail
              </h1>
              <p className="text-xs text-slate-500">
                Owner account settings
              </p>
            </div>
          </Link>

          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-gradient-to-r from-sky-800 to-cyan-500 p-6 text-white sm:p-8">
          <p className="text-xs font-bold tracking-widest">
            OWNER ACCOUNT
          </p>
          <h2 className="mt-2 text-3xl font-extrabold">
            Profile and shop details
          </h2>
          <p className="mt-2 text-sm text-sky-50">
            Manage your identity, business, licences and location.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs">
            <ShieldCheck size={16} />
            Authenticated owner profile
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} />
            {notice}
          </div>
        )}

        <form onSubmit={saveProfile} className="space-y-6">
          {/* OWNER DETAILS */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <UserRound size={21} />,
              "Owner information",
              "Your personal account and contact details."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className={labelClass}>
                Full name *
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  value={profile.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Enter full legal name"
                />
              </label>

              <label className={labelClass}>
                Registered email *
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className={readOnlyClass}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Change only through verified email settings.
                </span>
              </label>

              <label className={labelClass}>
                Owner phone number *
                <input
                  required
                  type="tel"
                  maxLength={20}
                  autoComplete="tel"
                  value={profile.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Enter contact number"
                />
              </label>

              <label className={labelClass}>
                Profile photo URL (optional)
                <input
                  type="url"
                  value={profile.profilePhotoUrl}
                  readOnly
                  className={readOnlyClass}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Managed through a secure photo-upload feature.
                </span>
              </label>
            </div>
          </section>

          {/* SHOP DETAILS */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <Store size={21} />,
              "Shop information",
              "Identify your shop and how customers contact it."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className={labelClass}>
                Shop / business name *
                <input
                  required
                  maxLength={120}
                  value={profile.shopName}
                  onChange={(e) =>
                    updateField("shopName", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Enter business name"
                />
              </label>

              <label className={labelClass}>
                Shop number / unit number
                <input
                  maxLength={50}
                  value={profile.shopNumber}
                  onChange={(e) =>
                    updateField("shopNumber", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="e.g. Shop 12, Unit B-4"
                />
              </label>

              <label className={labelClass}>
                Business type *
                <select
                  required
                  value={profile.shopType}
                  onChange={(e) =>
                    updateField("shopType", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                >
                  <option value="">Select business type</option>
                  <option value="RETAIL">Retail shop</option>
                  <option value="WHOLESALE">Wholesale supplier</option>
                  <option value="DISTRIBUTOR">Water distributor</option>
                  <option value="MANUFACTURER">Manufacturer / bottler</option>
                  <option value="DELIVERY_ONLY">Delivery service</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <label className={labelClass}>
                Shop contact number
                <input
                  type="tel"
                  maxLength={20}
                  value={profile.shopPhone}
                  onChange={(e) =>
                    updateField("shopPhone", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Business contact number"
                />
              </label>
            </div>
          </section>

          {/* LOCATION */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <MapPin size={21} />,
              "Shop location",
              "Address and map coordinates for your business."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className={`${labelClass} sm:col-span-2`}>
                Complete street address *
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  autoComplete="street-address"
                  value={profile.shopAddress}
                  onChange={(e) =>
                    updateField("shopAddress", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Building, street, area and address"
                />
              </label>

              <label className={labelClass}>
                Landmark
                <input
                  maxLength={150}
                  value={profile.landmark}
                  onChange={(e) =>
                    updateField("landmark", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Nearby landmark"
                />
              </label>

              <label className={labelClass}>
                City *
                <input
                  required
                  maxLength={100}
                  value={profile.city}
                  onChange={(e) =>
                    updateField("city", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                State *
                <input
                  required
                  maxLength={100}
                  value={profile.state}
                  onChange={(e) =>
                    updateField("state", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                PIN code *
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={profile.pinCode}
                  onChange={(e) =>
                    updateField(
                      "pinCode",
                      e.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="6-digit PIN code"
                />
              </label>

              <label className={labelClass}>
                Latitude (optional)
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={profile.latitude}
                  onChange={(e) =>
                    updateField("latitude", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="e.g. 18.5204"
                />
              </label>

              <label className={labelClass}>
                Longitude (optional)
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={profile.longitude}
                  onChange={(e) =>
                    updateField("longitude", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="e.g. 73.8567"
                />
              </label>
            </div>
          </section>

          {/* BUSINESS LICENCES */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <FileText size={21} />,
              "Registration and licences",
              "Enter applicable business registration and licence details."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className={labelClass}>
                Business registration number
                <input
                  maxLength={100}
                  value={profile.businessRegistrationNumber}
                  onChange={(e) =>
                    updateField(
                      "businessRegistrationNumber",
                      e.target.value
                    )
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Registration number, if applicable"
                />
              </label>

              <label className={labelClass}>
                Licence type
                <select
                  value={profile.licenseType}
                  onChange={(e) =>
                    updateField("licenseType", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                >
                  <option value="">Select licence type</option>
                  <option value="FSSAI">FSSAI licence / registration</option>
                  <option value="GST">GST registration</option>
                  <option value="TRADE">Trade licence</option>
                  <option value="BIS">BIS certification</option>
                  <option value="LOCAL">Local authority permission</option>
                  <option value="OTHER">Other</option>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                </select>
              </label>

              <label className={labelClass}>
                Licence / certificate number
                <input
                  maxLength={120}
                  value={profile.licenseNumber}
                  onChange={(e) =>
                    updateField("licenseNumber", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Enter number if applicable"
                />
              </label>

              <label className={labelClass}>
                Issuing authority
                <input
                  maxLength={150}
                  value={profile.issuingAuthority}
                  onChange={(e) =>
                    updateField("issuingAuthority", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Authority that issued the licence"
                />
              </label>

              <label className={labelClass}>
                Issue date
                <input
                  type="date"
                  value={profile.licenseIssueDate}
                  onChange={(e) =>
                    updateField("licenseIssueDate", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                />
              </label>

              <label className={labelClass}>
                Expiry date
                <input
                  type="date"
                  min={profile.licenseIssueDate || undefined}
                  value={profile.licenseExpiryDate}
                  onChange={(e) =>
                    updateField("licenseExpiryDate", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                />
              </label>

              <div className="sm:col-span-2 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  Verification status
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {profile.verificationStatus || "PENDING"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  This status is controlled by the authorized
                  verification workflow, not by the shop owner.
                </p>
              </div>
            </div>
          </section>

          {/* WATER AND DELIVERY */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <Truck size={21} />,
              "Water products and delivery",
              "Describe the products and service areas your shop supports."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <label className={labelClass}>
                Water products / types
                <input
                  maxLength={300}
                  value={profile.waterTypes}
                  onChange={(e) =>
                    updateField("waterTypes", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="e.g. 20L jars, bottled water"
                />
              </label>

              <div className={labelClass}>
                Delivery service
                <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    checked={profile.deliveryAvailable}
                    onChange={(e) =>
                      updateField(
                        "deliveryAvailable",
                        e.target.checked
                      )
                    }
                    disabled={saving}
                    className="h-4 w-4 accent-sky-600"
                  />
                  <span className="text-sm font-medium">
                    We provide home / business delivery
                  </span>
                </label>
              </div>

              <label className={`${labelClass} sm:col-span-2`}>
                Delivery service areas
                <textarea
                  rows={2}
                  maxLength={500}
                  value={profile.serviceAreas}
                  onChange={(e) =>
                    updateField("serviceAreas", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                  placeholder="Areas, localities or PIN codes served"
                />
              </label>

              <label className={labelClass}>
                Opening time
                <span className="relative block">
                  <Clock
                    size={16}
                    className="absolute left-3 top-5 text-slate-400"
                  />
                  <input
                    type="time"
                    value={profile.openingTime}
                    onChange={(e) =>
                      updateField("openingTime", e.target.value)
                    }
                    className={`${inputClass} pl-9`}
                    disabled={saving}
                  />
                </span>
              </label>

              <label className={labelClass}>
                Closing time
                <input
                  type="time"
                  value={profile.closingTime}
                  onChange={(e) =>
                    updateField("closingTime", e.target.value)
                  }
                  className={inputClass}
                  disabled={saving}
                />
              </label>
            </div>
          </section>

          {/* ACCOUNT STATUS */}
          <section className="overflow-hidden rounded-3xl border bg-white">
            {sectionTitle(
              <ShieldCheck size={21} />,
              "Account and verification status",
              "View security and account information."
            )}

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <p className={labelClass}>Account status</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {profile.accountStatus || "Not provided"}
                </p>
              </div>

              <div>
                <p className={labelClass}>Email verification</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {profile.emailVerified ? "Verified" : "Not verified"}
                </p>
              </div>

              <div>
                <p className={labelClass}>Phone verification</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {profile.phoneVerified ? "Verified" : "Not verified"}
                </p>
              </div>

              <div>
                <p className={labelClass}>Last login</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
                  {profile.lastLoginAt
                    ? new Date(profile.lastLoginAt).toLocaleString()
                    : "Not available"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <Link
                  to="/owner/change-password"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  <ShieldCheck size={17} />
                  Change password
                </Link>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse justify-between gap-3 rounded-2xl border bg-white p-5 sm:flex-row sm:items-center sm:px-6">
            <p className="text-xs text-slate-500">
              Your changes are saved to your authenticated owner profile.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Saving..." : "Save all changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  LoaderCircle,
  AlertCircle,
  RefreshCw,
  Pencil,
  Plus,
  X,
  Save,
  Star,
} from "lucide-react";

import { api } from "../../services/api";
import LocationPicker, {
  type SelectedLocation,
} from "../../components/maps/LocationPicker";

interface CustomerAddress {
  id?: string;
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

interface CustomerProfileData {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobileNumber?: string | null;
  role?: string | null;
  addresses?: CustomerAddress[] | null;
  address?: CustomerAddress | string | null;
  createdAt?: string;
}

interface AddressFormData {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

const emptyAddressForm: AddressFormData = {
  label: "Home",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  isDefault: false,
};


function getAddressText(address: CustomerAddress): string {
  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

function getMobileNumber(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const normalized = value?.trim();

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function isCustomerAddress(value: unknown): value is CustomerAddress {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeAddresses(
  profile: CustomerProfileData
): CustomerAddress[] {
  if (Array.isArray(profile.addresses)) {
    return profile.addresses.filter(isCustomerAddress);
  }

  if (isCustomerAddress(profile.address)) {
    return [profile.address];
  }

  return [];
}

function normalizeProfile(
  payload: unknown
): CustomerProfileData | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const root = payload as Record<string, unknown>;

  const data =
    typeof root.data === "object" && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root;

  const candidate =
    typeof data.customer === "object" && data.customer !== null
      ? data.customer
      : typeof data.profile === "object" && data.profile !== null
        ? data.profile
        : data;

  if (typeof candidate !== "object" || candidate === null) {
    return null;
  }

  const profile = candidate as CustomerProfileData;

  return {
    ...profile,
    addresses: normalizeAddresses(profile),
  };
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default function CustomerProfile() {
  const [profile, setProfile] =
    useState<CustomerProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [editingAddressId, setEditingAddressId] =
    useState<string | null>(null);

  const [showAddressForm, setShowAddressForm] = useState(false);

  const [addressForm, setAddressForm] =
    useState<AddressFormData>(emptyAddressForm);

  const [savingAddress, setSavingAddress] = useState(false);

  const [updatingDefaultId, setUpdatingDefaultId] =
    useState<string | null>(null);

  const [profileMessage, setProfileMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [location, setLocation] =
    useState<SelectedLocation | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers/me");
      const customer = normalizeProfile(response.data);

      if (!customer) {
        throw new Error("Customer profile data was not returned.");
      }

      setProfile(customer);
      setPhoneInput(
        getMobileNumber(customer.phone, customer.mobileNumber)
      );
    } catch (err: unknown) {
      console.error("Unable to load customer profile:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phone = phoneInput.trim();

    if (phone.length < 7 || phone.length > 30) {
      setFormError("Enter a valid mobile number.");
      return;
    }

    try {
      setSavingPhone(true);
      setFormError("");
      setProfileMessage("");

      await api.patch("/customers/me", { phone });

      setProfile((previous) =>
        previous
          ? {
              ...previous,
              phone,
              mobileNumber: phone,
            }
          : previous
      );

      setEditingPhone(false);
      setProfileMessage("Mobile number updated successfully.");
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSavingPhone(false);
    }
  }

  function startAddAddress() {
    const hasAddresses = (profile?.addresses?.length ?? 0) > 0;

    setEditingAddressId(null);

    setAddressForm({
      ...emptyAddressForm,
      isDefault: !hasAddresses,
    });

    setLocation(null);
    setShowAddressForm(true);
    setFormError("");
    setProfileMessage("");
  }

  function startEditAddress(address: CustomerAddress) {
    if (!address.id) {
      setFormError("This address cannot be edited because its ID is missing.");
      return;
    }

    setEditingAddressId(address.id);

    setAddressForm({
      label: address.label ?? "",
      addressLine1: address.addressLine1 ?? "",
      addressLine2: address.addressLine2 ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      postalCode: address.postalCode ?? "",
      isDefault: Boolean(address.isDefault),
    });

    setLocation(
      typeof address.latitude === "number" &&
        typeof address.longitude === "number"
        ? {
            lat: address.latitude,
            lng: address.longitude,
          }
        : null
    );

    setShowAddressForm(true);
    setFormError("");
    setProfileMessage("");
  }

  function cancelAddressForm() {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm);
    setLocation(null);
    setFormError("");
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !addressForm.addressLine1.trim() ||
      !addressForm.city.trim() ||
      !addressForm.state.trim() ||
      !addressForm.postalCode.trim()
    ) {
      setFormError(
        "Please fill in the address, city, state, and postal code."
      );
      return;
    }

    const payload = {
      label: addressForm.label.trim() || undefined,
      addressLine1: addressForm.addressLine1.trim(),
      addressLine2: addressForm.addressLine2.trim() || undefined,
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      postalCode: addressForm.postalCode.trim(),
      isDefault: addressForm.isDefault,
      ...(location
        ? {
            latitude: location.lat,
            longitude: location.lng,
          }
        : {}),
    };

    const wasEditing = Boolean(editingAddressId);

    try {
      setSavingAddress(true);
      setFormError("");
      setProfileMessage("");

      if (editingAddressId) {
        await api.put(
          `/addresses/${editingAddressId}`,
          payload
        );
      } else {
        await api.post("/addresses", payload);
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm(emptyAddressForm);
      setLocation(null);

      await loadProfile();

      setProfileMessage(
        wasEditing
          ? "Address updated successfully."
          : "Address added successfully."
      );
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setSavingAddress(false);
    }
  }

  async function setDefaultAddress(addressId: string) {
    try {
      setUpdatingDefaultId(addressId);
      setFormError("");
      setProfileMessage("");

      await api.patch(`/addresses/${addressId}/default`);

      await loadProfile();

      setProfileMessage("Default delivery address updated.");
    } catch (err: unknown) {
      setFormError(getErrorMessage(err));
    } finally {
      setUpdatingDefaultId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sky-700">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <span className="font-medium">
            Loading your profile...
          </span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-red-600" />

            <div className="flex-1">
              <h2 className="font-semibold text-red-800">
                Unable to load profile
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error || "Your profile information could not be found."}
              </p>

              <button
                type="button"
                onClick={() => void loadProfile()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const addresses = profile.addresses ?? [];

  const mobileNumber = getMobileNumber(
    profile.phone,
    profile.mobileNumber
  );

  const primaryAddress =
    addresses.find((address) => address.isDefault) ??
    addresses[0];

  const fallbackAddress =
    typeof profile.address === "string"
      ? profile.address.trim()
      : profile.address && isCustomerAddress(profile.address)
        ? getAddressText(profile.address)
        : "";

  const deliveryAddress = primaryAddress
    ? getAddressText(primaryAddress)
    : fallbackAddress;

  const initials = (profile.name || "Customer")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">
            AquaTrail Account
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-2 text-slate-600">
            View and update your personal details and delivery addresses.
          </p>
        </div>

        {/* Success and error messages */}
        {profileMessage && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            {profileMessage}
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Profile banner */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-blue-700 to-cyan-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15 text-2xl font-bold">
              {initials || "C"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sky-100">
                Welcome to AquaTrail
              </p>

              <h2 className="mt-1 break-words text-2xl font-bold">
                {profile.name || "Customer"}
              </h2>

              <p className="mt-2 break-all text-sm text-sky-100">
                {profile.email || "No email available"}
              </p>

              <p className="mt-2 flex items-center gap-2 text-sm text-sky-100">
                <Phone className="h-4 w-4 shrink-0" />
                <span>
                  {mobileNumber || "No mobile number available"}
                </span>
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" />
              {profile.role || "CUSTOMER"}
            </div>
          </div>
        </section>

        {/* Information cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Personal information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-sky-100 p-3">
                <User className="h-5 w-5 text-sky-700" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Personal Information
                </h2>

                <p className="text-sm text-slate-500">
                  Your account details
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <InfoRow
                icon={<User className="h-5 w-5" />}
                label="Full Name"
                value={profile.name}
              />

              <InfoRow
                icon={<Mail className="h-5 w-5" />}
                label="Email Address"
                value={profile.email}
              />

              {/* Editable mobile number */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-slate-400">
                  <Phone className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mobile Number
                    </p>

                    {!editingPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneInput(mobileNumber);
                          setEditingPhone(true);
                          setFormError("");
                          setProfileMessage("");
                        }}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                  </div>

                  {editingPhone ? (
                    <form
                      onSubmit={(event) => void savePhone(event)}
                      className="mt-3 space-y-3"
                    >
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(event) =>
                          setPhoneInput(event.target.value)
                        }
                        placeholder="Enter mobile number"
                        required
                        minLength={7}
                        maxLength={30}
                        autoComplete="tel"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={savingPhone}
                          className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                        >
                          {savingPhone ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </button>

                        <button
                          type="button"
                          disabled={savingPhone}
                          onClick={() => {
                            setEditingPhone(false);
                            setPhoneInput(mobileNumber);
                            setFormError("");
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-1 break-words text-sm font-medium text-slate-800">
                      {mobileNumber || "Not provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Delivery addresses */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-cyan-100 p-3">
                <MapPin className="h-5 w-5 text-cyan-700" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Delivery Addresses
                </h2>

                <p className="text-sm text-slate-500">
                  Where your water bottles are delivered
                </p>
              </div>

              {!showAddressForm && (
                <button
                  type="button"
                  onClick={startAddAddress}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              )}
            </div>

            {/* Existing addresses */}
            {addresses.length > 0 ? (
              <div className="space-y-4">
                {addresses.map((address, index) => (
                  <div
                    key={address.id ?? index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-800">
                        {address.label || `Address ${index + 1}`}
                      </h3>

                      {address.isDefault && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />

                      <span>
                        {getAddressText(address) ||
                          "Address details are not available."}
                      </span>
                    </p>

                    <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 shrink-0 text-cyan-700" />
                      <span>
                        {mobileNumber || "No mobile number available"}
                      </span>
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                      {address.id && !address.isDefault && (
                        <button
                          type="button"
                          disabled={updatingDefaultId !== null}
                          onClick={() =>
                            void setDefaultAddress(address.id!)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          {updatingDefaultId === address.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                          Set as default
                        </button>
                      )}

                      {address.id && (
                        <button
                          type="button"
                          onClick={() => startEditAddress(address)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit address
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : deliveryAddress ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />
                  <span>{deliveryAddress}</span>
                </p>

                <p className="mt-3 text-sm text-slate-600">
                  This address does not have an editable address record.
                  Add a new address to save a complete delivery location.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <MapPin className="h-7 w-7 text-slate-400" />

                <p className="mt-3 font-semibold text-slate-800">
                  No delivery address added
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Add your delivery address to make your next order easier.
                </p>

                <button
                  type="button"
                  onClick={startAddAddress}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  <Plus className="h-4 w-4" />
                  Add delivery address
                </button>
              </div>
            )}

            {/* Add/edit address form */}
            {showAddressForm && (
              <form
                onSubmit={(event) => void saveAddress(event)}
                className="mt-6 space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">
                    {editingAddressId
                      ? "Edit delivery address"
                      : "Add delivery address"}
                  </h3>

                  <button
                    type="button"
                    onClick={cancelAddressForm}
                    disabled={savingAddress}
                    aria-label="Close address form"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="addressLabel"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Address label
                  </label>

                  <select
                    id="addressLabel"
                    value={addressForm.label}
                    onChange={(event) =>
                      setAddressForm((previous) => ({
                        ...previous,
                        label: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="addressLine1"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Address line 1 *
                  </label>

                  <input
                    id="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={(event) =>
                      setAddressForm((previous) => ({
                        ...previous,
                        addressLine1: event.target.value,
                      }))
                    }
                    required
                    maxLength={200}
                    placeholder="House number, building, street"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="addressLine2"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Address line 2
                  </label>

                  <input
                    id="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={(event) =>
                      setAddressForm((previous) => ({
                        ...previous,
                        addressLine2: event.target.value,
                      }))
                    }
                    maxLength={200}
                    placeholder="Area, landmark (optional)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="addressCity"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      City *
                    </label>

                    <input
                      id="addressCity"
                      value={addressForm.city}
                      onChange={(event) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          city: event.target.value,
                        }))
                      }
                      required
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="addressState"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      State *
                    </label>

                    <input
                      id="addressState"
                      value={addressForm.state}
                      onChange={(event) =>
                        setAddressForm((previous) => ({
                          ...previous,
                          state: event.target.value,
                        }))
                      }
                      required
                      maxLength={100}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="addressPostalCode"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Postal code *
                  </label>

                  <input
                    id="addressPostalCode"
                    value={addressForm.postalCode}
                    onChange={(event) =>
                      setAddressForm((previous) => ({
                        ...previous,
                        postalCode: event.target.value,
                      }))
                    }
                    required
                    maxLength={20}
                    autoComplete="postal-code"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                {/* Map location */}
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Delivery location
                  </p>

                  <p className="mb-3 text-xs leading-5 text-slate-500">
                    Select or move the marker to set the delivery
                    coordinates. If you do not select a location, the
                    existing coordinates are retained when editing.
                  </p>

                  <LocationPicker
                    value={location}
                    onChange={setLocation}
                  />

                  {location && (
                    <p className="mt-2 text-xs text-slate-600">
                      Latitude: {location.lat.toFixed(6)} · Longitude:{" "}
                      {location.lng.toFixed(6)}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(event) =>
                      setAddressForm((previous) => ({
                        ...previous,
                        isDefault: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />

                  Set as default delivery address
                </label>

                <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingAddress ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {savingAddress ? "Saving..." : "Save address"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelAddressForm}
                    disabled={savingAddress}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        {/* Account summary */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 p-3">
              <ShieldCheck className="h-5 w-5 text-emerald-700" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Account Information
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Your profile information is loaded from your AquaTrail
                account. Keep your contact details and delivery addresses
                up to date.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value?: string | null;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-800">
          {value?.trim() || "Not provided"}
        </p>
      </div>
    </div>
  );
}
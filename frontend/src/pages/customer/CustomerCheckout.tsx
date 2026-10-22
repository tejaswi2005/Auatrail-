import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";



import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Droplets,
    MapPin,
    Minus,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Truck,
    X,
} from "lucide-react";

import LocationPicker, {
    type SelectedLocation,
} from "../../components/maps/LocationPicker";

import { api } from "../../services/api";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface CheckoutState {
    productId?: string;
    quantity?: number;
}

interface Product {
    id: string;
    name: string;
    description?: string | null;
    bottleSizeLiters: number;
    pricePaise: number;
    stockQuantity: number;
    isActive?: boolean;
}

interface CustomerAddress {
    id: string;
    label?: string | null;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number | null;
    longitude?: number | null;
    isDefault: boolean;
}

interface AddressFormValues {
    label: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
}

interface OrderResponse {
    id?: string;
    orderNumber?: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const EMPTY_ADDRESS_FORM: AddressFormValues = {
    label: "Home",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
};

const INPUT_CLASS =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const PRIMARY_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatPrice(amountPaise: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amountPaise / 100);
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const apiError = error as {
            response?: {
                data?: {
                    message?: string;
                };
            };
        };

        if (apiError.response?.data?.message) {
            return apiError.response.data.message;
        }
    }

    return error instanceof Error ? error.message : fallback;
}

function extractProducts(responseData: unknown): Product[] {
    if (!responseData || typeof responseData !== "object") {
        return [];
    }

    const response = responseData as {
        data?: unknown;
        products?: unknown;
    };

    if (Array.isArray(response.data)) {
        return response.data as Product[];
    }

    if (
        response.data &&
        typeof response.data === "object" &&
        Array.isArray((response.data as { products?: unknown }).products)
    ) {
        return (response.data as { products: Product[] }).products;
    }

    if (Array.isArray(response.products)) {
        return response.products as Product[];
    }

    return [];
}

function extractAddresses(responseData: unknown): CustomerAddress[] {
    if (!responseData || typeof responseData !== "object") {
        return [];
    }

    const response = responseData as {
        data?: unknown;
        addresses?: unknown;
    };

    if (Array.isArray(response.data)) {
        return response.data as CustomerAddress[];
    }

    if (
        response.data &&
        typeof response.data === "object" &&
        Array.isArray((response.data as { addresses?: unknown }).addresses)
    ) {
        return (response.data as { addresses: CustomerAddress[] }).addresses;
    }

    if (Array.isArray(response.addresses)) {
        return response.addresses as CustomerAddress[];
    }

    return [];
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function CustomerCheckout() {
    const location = useLocation();
    const navigate = useNavigate();

    const checkoutState = location.state as CheckoutState | null;

    const productId = checkoutState?.productId;
    const requestedQuantity = Number(checkoutState?.quantity);

    /* Product state */

    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);

    /* Address state */

    const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");

    const [showAddressForm, setShowAddressForm] = useState(false);

    const [addressForm, setAddressForm] =
        useState<AddressFormValues>(EMPTY_ADDRESS_FORM);

    const [selectedLocation, setSelectedLocation] =
        useState<SelectedLocation | null>(null);

    const [savingAddress, setSavingAddress] = useState(false);
    const [addressError, setAddressError] = useState("");
    const [addressSuccess, setAddressSuccess] = useState("");

    /* Order state */

    const [notes, setNotes] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    /* ------------------------------------------------------------------------ */
    /* Load product and addresses                                               */
    /* ------------------------------------------------------------------------ */

    useEffect(() => {
        let active = true;

        async function loadCheckout() {
            if (
                !productId ||
                !Number.isSafeInteger(requestedQuantity) ||
                requestedQuantity < 1
            ) {
                setError(
                    "Your product selection is missing. Please select a bottle again."
                );
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const [productsResponse, addressesResponse] = await Promise.all([
                    api.get("/products"),
                    api.get("/addresses"),
                ]);

                const products = extractProducts(productsResponse.data);

                const customerAddresses = extractAddresses(addressesResponse.data);

                const selectedProduct = products.find(
                    (item) => item.id === productId
                );

                if (
                    !selectedProduct ||
                    selectedProduct.isActive === false ||
                    Number(selectedProduct.bottleSizeLiters) !== 20
                ) {
                    throw new Error(
                        "This 20-litre water bottle is unavailable."
                    );
                }

                if (
                    !Number.isSafeInteger(Number(selectedProduct.stockQuantity)) ||
                    selectedProduct.stockQuantity < 1
                ) {
                    throw new Error(
                        "This water bottle is currently out of stock."
                    );
                }

                if (requestedQuantity > selectedProduct.stockQuantity) {
                    throw new Error(
                        `Only ${selectedProduct.stockQuantity} bottle(s) are available. Please adjust your quantity.`
                    );
                }

                if (!active) {
                    return;
                }

                setProduct(selectedProduct);
                setQuantity(requestedQuantity);
                setAddresses(customerAddresses);

                const defaultAddress =
                    customerAddresses.find((address) => address.isDefault) ??
                    customerAddresses[0];

                setSelectedAddressId(defaultAddress?.id ?? "");

                if (customerAddresses.length === 0) {
                    setShowAddressForm(true);
                }
            } catch (err: unknown) {
                if (!active) {
                    return;
                }

                setError(
                    getErrorMessage(
                        err,
                        "Unable to load checkout details. Please try again."
                    )
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        void loadCheckout();

        return () => {
            active = false;
        };
    }, [productId, requestedQuantity]);

    /* ------------------------------------------------------------------------ */
    /* Quantity controls                                                        */
    /* ------------------------------------------------------------------------ */

    function changeQuantity(amount: number) {
        if (!product || submitting) {
            return;
        }

        setQuantity((current) =>
            Math.min(
                product.stockQuantity,
                Math.max(1, current + amount)
            )
        );

        setError("");
    }

    /* ------------------------------------------------------------------------ */
    /* Address form helpers                                                     */
    /* ------------------------------------------------------------------------ */

    function updateAddressField(
        field: keyof AddressFormValues,
        value: string
    ) {
        setAddressForm((current) => ({
            ...current,
            [field]: value,
        }));

        setAddressError("");
        setAddressSuccess("");
    }

    function openAddressForm() {
        setAddressError("");
        setAddressSuccess("");
        setError("");
        setSelectedLocation(null);
        setShowAddressForm(true);
    }

    function cancelAddressForm() {
        if (savingAddress) {
            return;
        }

        setShowAddressForm(false);
        setAddressError("");
        setSelectedLocation(null);
        setAddressForm(EMPTY_ADDRESS_FORM);
    }

    /* ------------------------------------------------------------------------ */
    /* Save new address                                                         */
    /* ------------------------------------------------------------------------ */

    async function handleSaveAddress(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (savingAddress) {
            return;
        }

        setAddressError("");
        setAddressSuccess("");
        setError("");

        if (!selectedLocation) {
            setAddressError(
                "Please select your delivery location on the map."
            );
            return;
        }

        const postalCode = addressForm.postalCode.trim();

        if (!/^[1-9][0-9]{5}$/.test(postalCode)) {
            setAddressError("Please enter a valid 6-digit Indian PIN code.");
            return;
        }

        if (
            !addressForm.addressLine1.trim() ||
            !addressForm.city.trim() ||
            !addressForm.state.trim()
        ) {
            setAddressError(
                "Please complete the required address fields."
            );
            return;
        }

        try {
            setSavingAddress(true);

            const response = await api.post("/addresses", {
                label: addressForm.label,
                addressLine1: addressForm.addressLine1.trim(),
                addressLine2: addressForm.addressLine2.trim() || undefined,
                city: addressForm.city.trim(),
                state: addressForm.state.trim(),
                postalCode,
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
            });

            const responseBody = response.data?.data ?? response.data;

            const savedAddress: CustomerAddress | undefined =
                responseBody?.address ?? responseBody;

            if (!savedAddress?.id) {
                /*
                 * Do not assume the address was saved if the server response
                 * does not contain a valid address ID.
                 */
                throw new Error(
                    "The server did not return the saved address ID. Please check your address API response."
                );
            }

            const completeAddress: CustomerAddress = {
                ...savedAddress,
                label: savedAddress.label ?? addressForm.label,
                addressLine1:
                    savedAddress.addressLine1 || addressForm.addressLine1.trim(),
                addressLine2:
                    savedAddress.addressLine2 ??
                    (addressForm.addressLine2.trim() || null),
                city: savedAddress.city || addressForm.city.trim(),
                state: savedAddress.state || addressForm.state.trim(),
                postalCode: savedAddress.postalCode || postalCode,
                latitude: savedAddress.latitude ?? selectedLocation.lat,
                longitude: savedAddress.longitude ?? selectedLocation.lng,
                isDefault: savedAddress.isDefault ?? false,
            };

            setAddresses((current) => {
                const alreadyExists = current.some(
                    (address) => address.id === completeAddress.id
                );

                if (alreadyExists) {
                    return current.map((address) =>
                        address.id === completeAddress.id
                            ? completeAddress
                            : address
                    );
                }

                return [...current, completeAddress];
            });

            setSelectedAddressId(completeAddress.id);
            setShowAddressForm(false);
            setAddressForm(EMPTY_ADDRESS_FORM);
            setSelectedLocation(null);

            setAddressSuccess(
                "Delivery address saved successfully and selected for your order."
            );
        } catch (err: unknown) {
            setAddressError(
                getErrorMessage(
                    err,
                    "Unable to save your address. Please try again."
                )
            );
        } finally {
            setSavingAddress(false);
        }
    }

    /* ------------------------------------------------------------------------ */
    /* Place order                                                              */
    /* ------------------------------------------------------------------------ */

    async function handleSubmitOrder() {
        if (submitting) {
            return;
        }

        setError("");
        setAddressSuccess("");

        if (!product || !productId) {
            setError(
                "The selected water bottle is unavailable. Please select it again."
            );
            return;
        }

        if (
            Number(product.bottleSizeLiters) !== 20 ||
            product.isActive === false
        ) {
            setError(
                "Only available 20-litre water bottles can be ordered."
            );
            return;
        }

        if (
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > product.stockQuantity
        ) {
            setError("Please select a valid bottle quantity.");
            return;
        }

        if (showAddressForm) {
            setAddressError(
                "Please save or cancel the new address form before placing your order."
            );
            return;
        }

        const selectedAddress = addresses.find(
            (address) => address.id === selectedAddressId
        );

        if (!selectedAddress) {
            setError("Please add or select a delivery address.");
            return;
        }

        if (notes.trim().length > 1000) {
            setError(
                "Delivery instructions cannot exceed 1000 characters."
            );
            return;
        }

        try {
            setSubmitting(true);

            const response = await api.post("/orders", {
                addressId: selectedAddressId,
                items: [
                    {
                        productId: product.id,
                        quantity,
                    },
                ],
                notes: notes.trim() || undefined,
            });

            const order = response.data?.data as
                | OrderResponse
                | undefined;

            if (order?.id) {
                navigate(`/customer/orders/${order.id}`, {
                    replace: true,
                    state: {
                        orderNumber: order.orderNumber,
                    },
                });
            } else {
                navigate("/customer/orders", {
                    replace: true,
                });
            }
        } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
        console.error("Place order failed:", {
            status: err.response?.status,
            response: err.response?.data,
            requestUrl: err.config?.url,
        });

        setError(
            err.response?.data?.message ||
            err.response?.data?.error ||
            `Unable to place order. HTTP status: ${
                err.response?.status ?? "No response"
            }`
        );
    } else {
        console.error("Unexpected place order error:", err);

        setError(
            getErrorMessage(
                err,
                "Unable to place your order. Please try again."
            )
        );
    }
} finally {
    setSubmitting(false);
}
    }

    /* ------------------------------------------------------------------------ */
    /* Loading state                                                            */
    /* ------------------------------------------------------------------------ */

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

                <p className="mt-4 text-sm font-medium text-slate-500">
                    Preparing your checkout...
                </p>
            </div>
        );
    }

    /* ------------------------------------------------------------------------ */
    /* Product unavailable                                                      */
    /* ------------------------------------------------------------------------ */

    if (!product) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <Droplets
                        className="mx-auto text-blue-600"
                        size={36}
                    />

                    <h1 className="mt-4 text-xl font-extrabold text-slate-900">
                        Checkout unavailable
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {error ||
                            "Please select a water bottle before checking out."}
                    </p>

                    <Link
                        to="/customer/products"
                        className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                        Return to Products
                    </Link>
                </div>
            </div>
        );
    }

    const totalAmountPaise = quantity * product.pricePaise;
    const totalLitres = quantity * 20;

    /* ------------------------------------------------------------------------ */
    /* Checkout page                                                            */
    /* ------------------------------------------------------------------------ */

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Header */}

            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link
                        to="/customer/dashboard"
                        className="flex items-center gap-3"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
                            <Droplets size={24} />
                        </span>

                        <span className="text-lg font-extrabold">
                            Aqua<span className="text-blue-600">Trail</span>
                        </span>
                    </Link>

                    <Link
                        to="/customer/dashboard"
                        className="text-sm font-semibold text-slate-600 transition hover:text-blue-600"
                    >
                        Dashboard
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <Link
                    to="/customer/products"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
                >
                    <ArrowLeft size={16} />
                    Back to Products
                </Link>

                <div className="mb-8">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                        <ShieldCheck size={14} />
                        Secure Checkout
                    </div>

                    <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                        Complete Your Order
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
                        Confirm your delivery address and the number of 20-litre
                        water bottles you need.
                    </p>
                </div>

                {/* General checkout error */}

                {error && (
                    <div
                        role="alert"
                        className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800"
                    >
                        {error}
                    </div>
                )}

                {/* Address success message */}

                {addressSuccess && (
                    <div
                        role="status"
                        className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
                    >
                        {addressSuccess}
                    </div>
                )}

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5 lg:gap-8">
                    {/* ---------------------------------------------------------------- */}
                    {/* Delivery address section                                         */}
                    {/* ---------------------------------------------------------------- */}

                    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <MapPin size={22} />
                            </span>

                            <div>
                                <h2 className="text-lg font-extrabold">
                                    Delivery Address
                                </h2>

                                <p className="text-sm text-slate-500">
                                    Select a saved address or add a new one.
                                </p>
                            </div>
                        </div>

                        {/* Existing saved addresses */}

                        {addresses.length > 0 && (
                            <div className="mt-6 space-y-3">
                                {addresses.map((address) => (
                                    <label
                                        key={address.id}
                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${selectedAddressId === address.id
                                                ? "border-blue-500 bg-sky-50 ring-2 ring-blue-100"
                                                : "border-slate-200 hover:border-blue-200"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="deliveryAddress"
                                            value={address.id}
                                            checked={selectedAddressId === address.id}
                                            disabled={showAddressForm || submitting}
                                            onChange={() => {
                                                setSelectedAddressId(address.id);
                                                setError("");
                                                setAddressSuccess("");
                                            }}
                                            className="mt-1 accent-blue-600"
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block font-bold text-slate-800">
                                                {address.label || address.addressLine1}
                                            </span>

                                            {address.label && (
                                                <span className="mt-1 block text-sm text-slate-600">
                                                    {address.addressLine1}
                                                </span>
                                            )}

                                            {address.addressLine2 && (
                                                <span className="mt-1 block text-sm text-slate-500">
                                                    {address.addressLine2}
                                                </span>
                                            )}

                                            <span className="mt-1 block text-sm text-slate-500">
                                                {address.city}, {address.state} -{" "}
                                                {address.postalCode}
                                            </span>

                                            {address.latitude != null &&
                                                address.longitude != null && (
                                                    <span className="mt-2 block text-xs text-slate-400">
                                                        <MapPin
                                                            size={12}
                                                            className="mr-1 inline"
                                                        />
                                                        Map location saved
                                                    </span>
                                                )}

                                            {address.isDefault && (
                                                <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                                                    Default address
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Add address button */}

                        {!showAddressForm && (
                            <button
                                type="button"
                                onClick={openAddressForm}
                                disabled={submitting}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 disabled:opacity-50 sm:w-auto"
                            >
                                <Plus size={18} />
                                Add New Address
                            </button>
                        )}

                        {/* -------------------------------------------------------------- */}
                        {/* New address form: independent form, not nested in another form */}
                        {/* -------------------------------------------------------------- */}

                        {showAddressForm && (
                            <form
                                id="new-address-form"
                                onSubmit={handleSaveAddress}
                                className="mt-6 rounded-2xl border border-blue-100 bg-sky-50/60 p-4 sm:p-6"
                            >
                                <div className="mb-5 flex items-start justify-between gap-3">
                                    <div>
                                        <h3 className="text-lg font-extrabold text-slate-900">
                                            Add Delivery Address
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Enter your address and select your delivery
                                            location on the map.
                                        </p>
                                    </div>

                                    {addresses.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={cancelAddressForm}
                                            disabled={savingAddress}
                                            aria-label="Close address form"
                                            className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-50"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {addressError && (
                                    <div
                                        role="alert"
                                        className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                                    >
                                        {addressError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {/* Address label */}

                                    <div>
                                        <label
                                            htmlFor="addressLabel"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            Address Label
                                        </label>

                                        <select
                                            id="addressLabel"
                                            value={addressForm.label}
                                            onChange={(event) =>
                                                updateAddressField("label", event.target.value)
                                            }
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        >
                                            <option value="Home">Home</option>
                                            <option value="Work">Work</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {/* Address line 1 */}

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="addressLine1"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            Address Line 1 *
                                        </label>

                                        <input
                                            id="addressLine1"
                                            type="text"
                                            required
                                            maxLength={200}
                                            autoComplete="address-line1"
                                            value={addressForm.addressLine1}
                                            onChange={(event) =>
                                                updateAddressField(
                                                    "addressLine1",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="House number, building, street"
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        />
                                    </div>

                                    {/* Address line 2 */}

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="addressLine2"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            Address Line 2 (Optional)
                                        </label>

                                        <input
                                            id="addressLine2"
                                            type="text"
                                            maxLength={200}
                                            autoComplete="address-line2"
                                            value={addressForm.addressLine2}
                                            onChange={(event) =>
                                                updateAddressField(
                                                    "addressLine2",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Apartment, landmark, area"
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        />
                                    </div>

                                    {/* City */}

                                    <div>
                                        <label
                                            htmlFor="city"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            City *
                                        </label>

                                        <input
                                            id="city"
                                            type="text"
                                            required
                                            maxLength={100}
                                            autoComplete="address-level2"
                                            value={addressForm.city}
                                            onChange={(event) =>
                                                updateAddressField("city", event.target.value)
                                            }
                                            placeholder="Enter city"
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        />
                                    </div>

                                    {/* State */}

                                    <div>
                                        <label
                                            htmlFor="state"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            State *
                                        </label>

                                        <input
                                            id="state"
                                            type="text"
                                            required
                                            maxLength={100}
                                            autoComplete="address-level1"
                                            value={addressForm.state}
                                            onChange={(event) =>
                                                updateAddressField("state", event.target.value)
                                            }
                                            placeholder="Enter state"
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        />
                                    </div>

                                    {/* PIN code */}

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="postalCode"
                                            className="text-sm font-semibold text-slate-700"
                                        >
                                            PIN Code *
                                        </label>

                                        <input
                                            id="postalCode"
                                            type="text"
                                            required
                                            inputMode="numeric"
                                            autoComplete="postal-code"
                                            maxLength={6}
                                            pattern="[1-9][0-9]{5}"
                                            value={addressForm.postalCode}
                                            onChange={(event) =>
                                                updateAddressField(
                                                    "postalCode",
                                                    event.target.value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 6)
                                                )
                                            }
                                            placeholder="6-digit PIN code"
                                            className={INPUT_CLASS}
                                            disabled={savingAddress}
                                        />
                                    </div>
                                </div>

                                {/* Map location picker */}

                                <div className="mt-6">
                                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                                        Select Delivery Location *
                                    </label>

                                    <LocationPicker
                                        value={selectedLocation}
                                        onChange={(newLocation: SelectedLocation) => {
                                            setSelectedLocation(newLocation);
                                            setAddressError("");
                                        }}
                                    />

                                </div>

                                {/* Address form buttons */}

                                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        type="submit"
                                        disabled={savingAddress}
                                        className={`${PRIMARY_BUTTON_CLASS} flex-1`}
                                    >
                                        {savingAddress ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                                Saving Address...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={18} />
                                                Save Address
                                            </>
                                        )}
                                    </button>

                                    {addresses.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={cancelAddressForm}
                                            disabled={savingAddress}
                                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* Delivery information */}

                        <div className="mt-6 rounded-2xl bg-sky-50 p-4">
                            <div className="flex items-start gap-3">
                                <Truck
                                    size={20}
                                    className="mt-0.5 shrink-0 text-blue-600"
                                />

                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        Delivery updates with AquaTrail
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Track your order and follow delivery progress after
                                        your order is placed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Delivery instructions */}

                        <div className="mt-6">
                            <label
                                htmlFor="deliveryNotes"
                                className="block text-sm font-semibold text-slate-700"
                            >
                                Delivery Instructions (Optional)
                            </label>

                            <textarea
                                id="deliveryNotes"
                                rows={3}
                                maxLength={1000}
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Example: Please call when you arrive."
                                className={INPUT_CLASS}
                                disabled={submitting}
                            />

                            <p className="mt-1 text-right text-xs text-slate-400">
                                {notes.length}/1000
                            </p>
                        </div>
                    </section>

                    {/* ---------------------------------------------------------------- */}
                    {/* Order summary                                                    */}
                    {/* ---------------------------------------------------------------- */}

                    <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-6 lg:col-span-2">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ShoppingBag size={21} />
                            </span>

                            <div>
                                <h2 className="text-lg font-extrabold">
                                    Order Summary
                                </h2>

                                <p className="text-xs text-slate-500">
                                    Review your water bottle order.
                                </p>
                            </div>
                        </div>

                        {/* Selected product */}

                        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-100 p-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-blue-600">
                                <Droplets size={27} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="font-bold">{product.name}</p>

                                <p className="mt-1 text-sm text-slate-500">
                                    20-litre water bottle
                                </p>

                                <p className="mt-2 text-sm font-semibold">
                                    {formatPrice(product.pricePaise)} per bottle
                                </p>
                            </div>
                        </div>

                        {/* Quantity controls */}

                        <div className="mt-5">
                            <p className="mb-3 text-sm font-semibold text-slate-700">
                                Number of bottles
                            </p>

                            <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                                <button
                                    type="button"
                                    onClick={() => changeQuantity(-1)}
                                    disabled={quantity <= 1 || submitting}
                                    aria-label="Decrease bottle quantity"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Minus size={18} />
                                </button>

                                <div className="text-center">
                                    <p className="text-xl font-extrabold">{quantity}</p>

                                    <p className="text-xs text-slate-500">
                                        {quantity === 1 ? "bottle" : "bottles"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => changeQuantity(1)}
                                    disabled={
                                        quantity >= product.stockQuantity || submitting
                                    }
                                    aria-label="Increase bottle quantity"
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-blue-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-slate-400">
                                Available stock: {product.stockQuantity} bottles
                            </p>
                        </div>

                        {/* Price summary */}

                        <div className="mt-5 space-y-4">
                            <SummaryRow
                                label="Total water"
                                value={`${totalLitres} litres`}
                            />

                            <SummaryRow
                                label="Subtotal"
                                value={formatPrice(totalAmountPaise)}
                            />

                            <div className="border-t border-dashed border-slate-200 pt-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-bold">Total Amount</span>

                                    <span className="text-2xl font-extrabold text-blue-700">
                                        {formatPrice(totalAmountPaise)}
                                    </span>
                                </div>

                                <p className="mt-2 text-xs leading-5 text-slate-400">
                                    The server must verify the final price and stock when
                                    the order is placed.
                                </p>
                            </div>
                        </div>

                        {/* Place order button.
                This is deliberately NOT inside the address form. */}

                        <button
                            type="button"
                            onClick={() => void handleSubmitOrder()}
                            disabled={
                                submitting ||
                                addresses.length === 0 ||
                                !selectedAddressId ||
                                showAddressForm ||
                                savingAddress
                            }
                            className={`${PRIMARY_BUTTON_CLASS} mt-6 w-full py-3.5`}
                        >
                            {submitting ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Placing Order...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Place Order
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        {addresses.length === 0 && (
                            <p className="mt-3 text-center text-xs text-amber-700">
                                Add a delivery address to continue.
                            </p>
                        )}

                        {showAddressForm && (
                            <p className="mt-3 text-center text-xs text-amber-700">
                                Save your new address before placing your order.
                            </p>
                        )}

                        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                            <ShieldCheck size={15} />
                            Secure order submission
                        </p>
                    </aside>
                </div>
            </main>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Summary row                                                                */
/* -------------------------------------------------------------------------- */

interface SummaryRowProps {
    label: string;
    value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">{label}</span>

            <span className="text-right font-semibold text-slate-800">
                {value}
            </span>
        </div>
    );
}
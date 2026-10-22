import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Droplets,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

import { api } from "../../services/api";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  bottleSizeLiters: number;
  pricePaise: number;
  stockQuantity: number;
  isActive?: boolean;
}

const formatPrice = (amountPaise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);

export default function CustomerProducts() {
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/products");
        const result = response.data?.data;

        const products: Product[] = Array.isArray(result)
          ? result
          : Array.isArray(result?.products)
            ? result.products
            : [];

        // This business sells only 20-litre water bottles.
        const waterProduct = products.find(
          (item) =>
            Number(item.bottleSizeLiters) === 20 &&
            item.isActive !== false
        );

        if (active) {
          setProduct(waterProduct ?? null);
        }
      } catch {
        if (active) {
          setError("Unable to load the water bottle. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, []);

  const availableStock = Math.max(
    0,
    Math.floor(product?.stockQuantity ?? 0)
  );

  const totalLitres = quantity * 20;
  const totalAmountPaise = quantity * (product?.pricePaise ?? 0);

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(availableStock, current + 1)
    );
  };

  const handleContinue = () => {
    if (!product || quantity < 1 || quantity > availableStock) {
      return;
    }

    // Pass the selected product and quantity to the checkout page.
    navigate("/customer/checkout", {
      state: {
        productId: product.id,
        quantity,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/customer/dashboard"
            className="flex min-w-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
              <Droplets size={24} />
            </span>

            <span className="min-w-0">
              <span className="block text-lg font-extrabold tracking-tight">
                Aqua<span className="text-blue-600">Trail</span>
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                Water delivery made simple
              </span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-2">
            <Link
              to="/customer/orders"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-sky-50 hover:text-blue-700"
            >
              My Orders
            </Link>

            <Link
              to="/customer/profile"
              aria-label="My Profile"
              title="My Profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-sky-50 hover:text-blue-700"
            >
              <UserRound size={19} />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <Link
          to="/customer/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Page heading */}
        <section className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            <Droplets size={14} />
            AquaTrail Water Delivery
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Order Your Water
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Choose how many 20-litre water bottles you need. We'll help you
            manage your order and track its delivery.
          </p>
        </section>

        {/* Information banner */}
        <section className="mb-8 flex items-center gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            <Truck size={24} />
          </span>

          <div>
            <h2 className="font-bold text-slate-800">
              Delivered to your doorstep
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Track your order status and delivery progress through AquaTrail.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-500">
              Loading water bottle details...
            </p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-100 bg-white p-8 text-center">
            <p className="font-semibold text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : !product ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
              <Droplets size={32} />
            </span>

            <h2 className="mt-5 text-xl font-extrabold">
              Water Bottles Currently Unavailable
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              We couldn't find an active 20-litre water bottle in stock.
              Please check again later or contact your water supplier.
            </p>

            <Link
              to="/customer/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Return to Dashboard
              <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5 lg:gap-8">
            {/* Product card */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
              <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-100 p-8 sm:min-h-80">
                <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/40 blur-2xl" />
                <div className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />

                <div className="relative flex flex-col items-center">
                  <div className="flex h-36 w-36 items-center justify-center rounded-[2rem] border border-white/80 bg-white/80 text-blue-600 shadow-xl shadow-blue-900/10 sm:h-44 sm:w-44">
                    <Droplets
                      size={92}
                      strokeWidth={1.3}
                      className="drop-shadow-sm"
                    />
                  </div>

                  <span className="mt-5 rounded-full border border-white bg-white/90 px-4 py-2 text-sm font-extrabold text-blue-700 shadow-sm">
                    20 LITRES
                  </span>
                </div>

                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                  <Check size={14} />
                  {availableStock > 0 ? "Available" : "Out of Stock"}
                </div>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                      Drinking Water
                    </p>

                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
                      {product.name}
                    </h2>
                  </div>

                  <span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-blue-700">
                    20L Bottle
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {product.description ||
                    "Convenient 20-litre drinking water bottle delivered to your doorstep."}
                </p>

                <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-sm text-slate-500">Price per bottle</p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">
                      {formatPrice(product.pricePaise)}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <ShieldCheck size={16} />
                    Secure order
                  </span>
                </div>

                {/* Quantity selector */}
                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        Select Quantity
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {availableStock} bottle
                        {availableStock === 1 ? "" : "s"} available
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={quantity <= 1}
                        aria-label="Decrease bottle quantity"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={18} />
                      </button>

                      <span
                        aria-live="polite"
                        className="min-w-8 text-center text-xl font-extrabold"
                      >
                        {quantity}
                      </span>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={quantity >= availableStock}
                        aria-label="Increase bottle quantity"
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    You can order multiple bottles in a single delivery,
                    subject to available stock.
                  </p>
                </div>
              </div>
            </section>

            {/* Order summary */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:sticky lg:top-24 lg:col-span-2">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ShoppingBag size={21} />
                </span>

                <div>
                  <h2 className="text-lg font-extrabold">Order Summary</h2>
                  <p className="text-xs text-slate-500">
                    Review your selected quantity
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Bottle size</span>
                  <span className="font-semibold">20 litres</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Quantity</span>
                  <span className="font-semibold">
                    {quantity} bottle{quantity === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Total water</span>
                  <span className="font-semibold">{totalLitres} litres</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500">Price per bottle</span>
                  <span className="font-semibold">
                    {formatPrice(product.pricePaise)}
                  </span>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-2xl font-extrabold text-blue-700">
                      {formatPrice(totalAmountPaise)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Final charges, including any delivery fee or applicable
                    taxes, will be confirmed during checkout.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  availableStock < 1 ||
                  quantity < 1 ||
                  quantity > availableStock
                }
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Checkout
                <ArrowRight size={18} />
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={15} />
                Your order is subject to stock confirmation
              </div>
            </aside>
          </div>
        )}

        {/* Bottom banner */}
        <section className="mt-8 flex flex-col items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-7 text-center text-white shadow-xl shadow-blue-900/10 sm:p-9">
          <Droplets size={30} />

          <h2 className="text-xl font-extrabold sm:text-2xl">
            Your Water Delivery, Made Simple
          </h2>

          <p className="max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
            Place your water order, follow its progress, and stay updated
            throughout delivery with AquaTrail.
          </p>
        </section>
      </main>
    </div>
  );
}
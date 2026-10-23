
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Droplets,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { api } from "../../services/api";

type Product = {
  id: string;
  name: string;
  description?: string | null;
  bottleSizeLiters: number;
  pricePaise: number;
  stockQuantity: number;
  isActive: boolean;
  imageUrl?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  errors?: unknown;
};

type ProductForm = {
  name: string;
  description: string;
  bottleSizeLiters: string;
  price: string;
  stock: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  bottleSizeLiters: "20",
  price: "",
  stock: "",
};

const LOW_STOCK_LIMIT = 10;

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getProducts(data: unknown): Product[] {
  if (Array.isArray(data)) return data as Product[];

  if (data && typeof data === "object" && "data" in data) {
    const nested = (data as { data: unknown }).data;
    if (Array.isArray(nested)) return nested as Product[];
  }

  return [];
}

function getErrorMessage(err: unknown): string {
  const error = err as {
    message?: string;
    response?: {
      data?: {
        message?: string;
        errors?: {
          fieldErrors?: Record<string, string[]>;
          formErrors?: string[];
        };
      };
    };
  };

  const responseData = error?.response?.data;
  const validationErrors = responseData?.errors;

  if (validationErrors) {
    const fieldMessages = Object.entries(
      validationErrors.fieldErrors ?? {},
    ).flatMap(([field, messages]) =>
      messages.map((message) => `${field}: ${message}`),
    );

    const messages = [
      ...(validationErrors.formErrors ?? []),
      ...fieldMessages,
    ];

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  return (
    responseData?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ApiResponse<unknown>>("/products");
      setProducts(getProducts(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.isActive !== false);

    return {
      totalProducts: active.length,
      totalUnits: active.reduce(
        (sum, product) => sum + Number(product.stockQuantity || 0),
        0,
      ),
      lowStock: active.filter(
        (product) =>
          product.stockQuantity > 0 &&
          product.stockQuantity <= LOW_STOCK_LIMIT,
      ).length,
      outOfStock: active.filter(
        (product) => product.stockQuantity <= 0,
      ).length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "LOW" &&
          product.stockQuantity > 0 &&
          product.stockQuantity <= LOW_STOCK_LIMIT) ||
        (filter === "OUT" && product.stockQuantity <= 0) ||
        (filter === "ACTIVE" && product.isActive !== false) ||
        (filter === "INACTIVE" && product.isActive === false);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  async function handleCreateProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");

    const priceRupees = Number(form.price);
    const pricePaise = Math.round(priceRupees * 100);
    const stockQuantity = Number(form.stock);
    const bottleSizeLiters = Number(form.bottleSizeLiters);

    if (form.name.trim().length < 2) {
      setError("Product name must contain at least 2 characters.");
      return;
    }

    if (
      !Number.isFinite(bottleSizeLiters) ||
      bottleSizeLiters <= 0 ||
      bottleSizeLiters > 100
    ) {
      setError("Bottle size must be greater than 0 and at most 100 litres.");
      return;
    }

    if (
      !Number.isFinite(priceRupees) ||
      priceRupees <= 0 ||
      !Number.isSafeInteger(pricePaise)
    ) {
      setError("Enter a valid price greater than ₹0.");
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/products", {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        bottleSizeLiters,
        pricePaise,
        stockQuantity,
      });

      setForm(emptyForm);
      setShowForm(false);
      setNotice("Product added successfully.");

      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function stockLabel(product: Product) {
    if (product.stockQuantity <= 0) {
      return {
        text: "Out of stock",
        className: "bg-red-50 text-red-700",
      };
    }

    if (product.stockQuantity <= LOW_STOCK_LIMIT) {
      return {
        text: "Low stock",
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      text: "In stock",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              AQUATRAIL / OWNER
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage bottle sizes, product prices, and available stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadProducts()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} />
              Add product
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Active products"
            value={stats.totalProducts}
            detail="Available in your shop"
            icon={<Boxes size={21} />}
            iconClass="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Units in stock"
            value={stats.totalUnits}
            detail="Across active products"
            icon={<Droplets size={21} />}
            iconClass="bg-cyan-50 text-cyan-700"
          />
          <StatCard
            title="Low stock"
            value={stats.lowStock}
            detail={`Between 1 and ${LOW_STOCK_LIMIT} units`}
            icon={<AlertTriangle size={21} />}
            iconClass="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="Out of stock"
            value={stats.outOfStock}
            detail="Products needing replenishment"
            icon={<PackagePlus size={21} />}
            iconClass="bg-red-50 text-red-600"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
              aria-label="Filter products"
            >
              <option value="ALL">All products</option>
              <option value="ACTIVE">Active products</option>
              <option value="LOW">Low stock</option>
              <option value="OUT">Out of stock</option>
              <option value="INACTIVE">Inactive products</option>
            </select>
          </div>

          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="font-semibold text-slate-900">Product list</h2>
            <span className="text-sm text-slate-500">
              {filteredProducts.length} products
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Boxes size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">
                No products found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or add a product to your inventory.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Product</th>
                      <th className="px-5 py-3 font-semibold">Bottle size</th>
                      <th className="px-5 py-3 font-semibold">Price</th>
                      <th className="px-5 py-3 font-semibold">Stock</th>
                      <th className="px-5 py-3 font-semibold">Stock status</th>
                      <th className="px-5 py-3 font-semibold">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product) => {
                      const status = stockLabel(product);

                      return (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {product.name}
                            </p>
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                              {product.description || "No description"}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                            {product.bottleSizeLiters} L
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                            {money(Number(product.pricePaise) / 100)}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {product.stockQuantity} units
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`text-xs font-semibold ${
                                product.isActive === false
                                  ? "text-slate-500"
                                  : "text-emerald-700"
                              }`}
                            >
                              {product.isActive === false
                                ? "Inactive"
                                : "Active"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-4 md:hidden">
                {filteredProducts.map((product) => {
                  const status = stockLabel(product);

                  return (
                    <article
                      key={product.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {product.description || "No description"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Bottle size: {product.bottleSizeLiters} L
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.text}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="font-bold text-slate-900">
                          {money(Number(product.pricePaise) / 100)}
                        </span>
                        <span className="text-sm text-slate-600">
                          {product.stockQuantity} units
                        </span>
                      </div>

                      {product.isActive === false && (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          Inactive product
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <p className="text-xs leading-5 text-slate-500">
          Low-stock threshold: {LOW_STOCK_LIMIT} units. Inventory uses the
          product stock quantity stored by your backend.
        </p>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="add-product-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Add product
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a bottle size, selling price, and opening stock.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Product name *
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. 20L water bottle"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Bottle type or product details"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Bottle size (litres) *
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  max="100"
                  step="any"
                  value={form.bottleSizeLiters}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      bottleSizeLiters: e.target.value,
                    })
                  }
                  placeholder="e.g. 20"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Price (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="e.g. 80"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Enter price in rupees.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Initial stock (units) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: e.target.value })
                    }
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: number;
  detail: string;
  icon: ReactNode;
  iconClass: string;
};

function StatCard({
  title,
  value,
  detail,
  icon,
  iconClass,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${iconClass}`}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

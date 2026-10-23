
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Droplets,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { api } from "../../services/api";

interface Product {
  id: string;
  name: string;
  description: string | null;
  bottleSizeLiters: number;
  pricePaise: number;
  stockQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

type EditForm = {
  name: string;
  description: string;
  bottleSizeLiters: string;
  priceRupees: string;
  imageUrl: string;
};

const emptyForm: EditForm = {
  name: "",
  description: "",
  bottleSizeLiters: "20",
  priceRupees: "",
  imageUrl: "",
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);

export default function OwnerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editing, setEditing] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [restocking, setRestocking] = useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = useState("");
  const [restockNote, setRestockNote] = useState("");
  const [savingStock, setSavingStock] = useState(false);

  const loadProducts = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await api.get<ApiResponse<Product[]>>("/products");
      setProducts(response.data.data ?? []);
    } catch {
      setError("Unable to load products. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      `${product.name} ${product.description ?? ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const totalUnits = products.reduce(
    (total, product) => total + product.stockQuantity,
    0
  );

  const lowStockCount = products.filter(
    (product) => product.stockQuantity <= 5
  ).length;

  const openEdit = (product: Product) => {
    setEditing(product);
    setEditForm({
      name: product.name,
      description: product.description ?? "",
      bottleSizeLiters: String(product.bottleSizeLiters),
      priceRupees: (product.pricePaise / 100).toFixed(2),
      imageUrl: product.imageUrl ?? "",
    });
    setError("");
    setNotice("");
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;

    const price = Number(editForm.priceRupees);
    const size = Number(editForm.bottleSizeLiters);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size <= 0) {
      setError("Enter a valid bottle size and price.");
      return;
    }

    if (editForm.imageUrl.trim()) {
      try {
        new URL(editForm.imageUrl.trim());
      } catch {
        setError("Enter a valid image URL or leave it blank.");
        return;
      }
    }

    setSaving(true);
    setError("");

    try {
      const response = await api.patch<ApiResponse<Product>>(
        `/products/${editing.id}`,
        {
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          bottleSizeLiters: size,
          pricePaise: Math.round(price * 100),
          imageUrl: editForm.imageUrl.trim() || null,
        }
      );

      setProducts((current) =>
        current.map((product) =>
          product.id === editing.id ? response.data.data : product
        )
      );
      setEditing(null);
      setNotice("Product details updated successfully.");
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? "Could not update the product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const openRestock = (product: Product) => {
    setRestocking(product);
    setRestockQuantity("");
    setRestockNote("");
    setError("");
    setNotice("");
  };

  const saveRestock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restocking) return;

    const quantity = Number(restockQuantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
      setError("Enter a whole number between 1 and 100,000.");
      return;
    }

    setSavingStock(true);
    setError("");

    try {
      const response = await api.patch<ApiResponse<Product>>(
        `/products/${restocking.id}/stock`,
        {
          quantity,
          note: restockNote.trim() || undefined,
        }
      );

      setProducts((current) =>
        current.map((product) =>
          product.id === restocking.id ? response.data.data : product
        )
      );
      setRestocking(null);
      setNotice(`${quantity} unit${quantity === 1 ? "" : "s"} added to ${restocking.name}.`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? "Could not update stock. Please try again."
      );
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-100">
              <Droplets size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                AquaTrail
              </h1>
              <p className="text-xs font-medium text-slate-500">Owner workspace</p>
            </div>
          </Link>

          <Link
            to="/owner/dashboard"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-6 text-white shadow-xl shadow-sky-100 sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 right-40 h-48 w-48 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-sky-50">
                <Package size={14} /> PRODUCT MANAGEMENT
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Your products
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-sky-50 sm:text-base">
                Manage bottle details, update prices, and keep your inventory ready for every delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadProducts(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-3 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:opacity-60 sm:self-center"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh products
            </button>
          </div>
        </section>

        {notice && (
          <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {error && !editing && !restocking && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Active products</span>
              <span className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><Package size={20} /></span>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{loading ? "—" : products.length}</p>
            <p className="mt-1 text-xs text-slate-500">Products available in the catalogue</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Units in stock</span>
              <span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700"><Boxes size={20} /></span>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{loading ? "—" : totalUnits.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-slate-500">Across active products</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">Low-stock items</span>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><AlertTriangle size={20} /></span>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{loading ? "—" : lowStockCount}</p>
            <p className="mt-1 text-xs text-slate-500">5 units or fewer remaining</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Product catalogue</h3>
              <p className="mt-1 text-sm text-slate-500">Edit product information or add stock to an existing item.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-medium text-slate-500">
              <Loader2 size={22} className="animate-spin text-sky-600" /> Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="rounded-2xl bg-sky-50 p-4 text-sky-600"><Package size={30} /></div>
              <h4 className="mt-4 font-bold text-slate-900">No products found</h4>
              <p className="mt-1 text-sm text-slate-500">
                {search ? "Try another search term." : "No active products are available yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Product</th>
                      <th className="px-6 py-4 font-semibold">Bottle size</th>
                      <th className="px-6 py-4 font-semibold">Price</th>
                      <th className="px-6 py-4 font-semibold">Stock</th>
                      <th className="px-6 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="transition hover:bg-sky-50/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-xl border border-slate-100 object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-cyan-100 text-sky-600">
                                <Droplets size={22} />
                              </div>
                            )}
                            <div className="max-w-xs">
                              <p className="font-semibold text-slate-900">{product.name}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{product.description || "No description"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{product.bottleSizeLiters} L</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{money(product.pricePaise)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${product.stockQuantity <= 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {product.stockQuantity} units
                          </span>
                          {product.stockQuantity <= 5 && <p className="mt-1 text-xs text-amber-600">Restock soon</p>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openEdit(product)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
                              <Pencil size={14} /> Edit
                            </button>
                            <button type="button" onClick={() => openRestock(product)} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-700">
                              <Plus size={14} /> Restock
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 md:hidden">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="h-14 w-14 rounded-xl border border-slate-100 object-cover" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Droplets size={24} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900">{product.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">{product.bottleSizeLiters} L bottle</p>
                        <p className="mt-2 text-lg font-extrabold text-sky-700">{money(product.pricePaise)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${product.stockQuantity <= 5 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {product.stockQuantity} in stock
                      </span>
                    </div>
                    {product.description && <p className="mt-3 text-sm leading-5 text-slate-500">{product.description}</p>}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => openEdit(product)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                        <Pencil size={15} /> Edit
                      </button>
                      <button type="button" onClick={() => openRestock(product)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-sky-700">
                        <Plus size={15} /> Restock
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
                Showing {filteredProducts.length} of {products.length} active products
              </div>
            </>
          )}
        </section>
      </main>

      {(editing || restocking) && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving && !savingStock) {
              setEditing(null);
              setRestocking(null);
              setError("");
            }
          }}
        >
          <section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600">
                  {editing ? "Edit catalogue item" : "Inventory update"}
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                  {editing ? "Edit product" : "Restock product"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editing ? editing.name : restocking?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditing(null); setRestocking(null); setError(""); }}
                disabled={saving || savingStock}
                aria-label="Close dialog"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:mx-6">
                {error}
              </div>
            )}

            {editing && (
              <form onSubmit={saveProduct} className="space-y-4 p-5 sm:p-6">
                <div>
                  <label htmlFor="product-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Product name</label>
                  <input id="product-name" required minLength={2} maxLength={120} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                </div>
                <div>
                  <label htmlFor="product-description" className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                  <textarea id="product-description" maxLength={1000} rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Describe this product..." className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="product-size" className="mb-1.5 block text-sm font-semibold text-slate-700">Bottle size (L)</label>
                    <input id="product-size" type="number" required min="0.1" max="100" step="0.1" value={editForm.bottleSizeLiters} onChange={(e) => setEditForm({ ...editForm, bottleSizeLiters: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                  </div>
                  <div>
                    <label htmlFor="product-price" className="mb-1.5 block text-sm font-semibold text-slate-700">Price (₹)</label>
                    <input id="product-price" type="number" required min="0.01" step="0.01" value={editForm.priceRupees} onChange={(e) => setEditForm({ ...editForm, priceRupees: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                  </div>
                </div>
                <div>
                  <label htmlFor="product-image" className="mb-1.5 block text-sm font-semibold text-slate-700">Image URL <span className="font-normal text-slate-400">(optional)</span></label>
                  <input id="product-image" type="url" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://example.com/bottle.jpg" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                  <p className="mt-1.5 text-xs text-slate-400">Leave blank to clear the product image.</p>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setEditing(null); setError(""); }} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-100 hover:from-sky-700 hover:to-cyan-600 disabled:opacity-60">
                    {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            )}

            {restocking && (
              <form onSubmit={saveRestock} className="space-y-5 p-5 sm:p-6">
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-sm text-sky-800">Current stock</p>
                  <p className="mt-1 text-3xl font-extrabold text-sky-900">{restocking.stockQuantity} <span className="text-sm font-semibold">units</span></p>
                  <p className="mt-1 text-xs text-sky-700">New stock = current stock + quantity received</p>
                </div>
                <div>
                  <label htmlFor="restock-quantity" className="mb-1.5 block text-sm font-semibold text-slate-700">Quantity to add</label>
                  <input id="restock-quantity" type="number" required min="1" max="100000" step="1" autoFocus value={restockQuantity} onChange={(e) => setRestockQuantity(e.target.value)} placeholder="e.g. 50" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                  {Number(restockQuantity) > 0 && Number.isInteger(Number(restockQuantity)) && (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">Stock after restock: {restocking.stockQuantity + Number(restockQuantity)} units</p>
                  )}
                </div>
                <div>
                  <label htmlFor="restock-note" className="mb-1.5 block text-sm font-semibold text-slate-700">Note <span className="font-normal text-slate-400">(optional)</span></label>
                  <input id="restock-note" maxLength={250} value={restockNote} onChange={(e) => setRestockNote(e.target.value)} placeholder="e.g. Supplier delivery, invoice number..." className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50" />
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setRestocking(null); setError(""); }} disabled={savingStock} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={savingStock} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-100 hover:from-sky-700 hover:to-cyan-600 disabled:opacity-60">
                    {savingStock ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                    {savingStock ? "Updating stock..." : "Confirm restock"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

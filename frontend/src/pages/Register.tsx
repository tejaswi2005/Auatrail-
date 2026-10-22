import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Droplets,
  Eye,
  EyeOff,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 10 || password.length > 72) {
      setError("Password must contain between 10 and 72 characters.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });

      navigate("/login", {
        replace: true,
        state: {
          message: "Your account was created successfully. Please sign in.",
        },
      });
    } catch (err: unknown) {
      console.error("Registration failed:", err);

      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err
          ? (
              err as {
                response?: {
                  data?: {
                    message?: string;
                    error?: string;
                  };
                };
              }
            ).response?.data?.message ??
            (
              err as {
                response?: {
                  data?: {
                    error?: string;
                  };
                };
              }
            ).response?.data?.error
          : undefined;

      setError(
        message || "Unable to create your account. Please check your details.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-white to-cyan-100 px-4 py-8 sm:px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-sky-900/10 lg:grid-cols-2">
        {/* Left panel */}
        <section className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 p-10 text-white lg:flex xl:p-12">
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full border-[45px] border-white/10" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full border-[55px] border-white/10" />

          <Link to="/login" className="relative z-10 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Droplets size={28} />
            </span>

            <span className="text-2xl font-extrabold tracking-tight">
              AquaTrail
            </span>
          </Link>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
              <Droplets size={16} />
              Pure water, delivered
            </span>

            <h1 className="mt-7 max-w-md text-4xl font-extrabold leading-tight xl:text-5xl">
              Your daily water delivery, made simple.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-sky-50">
              Create your account to order water, manage deliveries, and
              follow your driver's journey right to your doorstep.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "Order water in just a few clicks",
                "Track your delivery in real time",
                "Keep your orders organized",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">
                    ✓
                  </span>
                  <span className="text-sm font-medium text-white/95">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-sm text-sky-100">
            Fresh water. Reliable delivery. Peace of mind.
          </p>
        </section>

        {/* Registration form */}
        <section className="flex items-center justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12">
          <div className="w-full max-w-md">
            <Link
              to="/login"
              className="mb-8 flex items-center gap-2 lg:hidden"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200">
                <Droplets size={25} />
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                Aqua<span className="text-blue-600">Trail</span>
              </span>
            </Link>

            <div className="mb-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
                <UserRound size={25} />
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Get started
              </p>

              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Create your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Join AquaTrail and make your water deliveries easier.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <div className="relative">
                  <UserRound
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    maxLength={254}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone number{" "}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <div className="relative">
                  <Phone
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={20}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={10}
                    maxLength={72}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Use minimum 8 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-200/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? "Creating account..." : "Create account"}

                {!loading && (
                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
              <p className="text-xs leading-5 text-slate-500">
                Your account is created securely. You can start ordering water
                after signing in.
              </p>
            </div>

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-blue-600 transition hover:text-blue-800"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-5 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} AquaTrail. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
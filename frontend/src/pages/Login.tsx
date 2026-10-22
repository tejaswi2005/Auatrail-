import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Droplets,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { api } from "../services/api";
import { saveSession } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { user, accessToken } = response.data.data;

      saveSession(accessToken, user);

      if (user.role === "OWNER") {
        navigate("/owner/dashboard", { replace: true });
      } else if (user.role === "DRIVER") {
        navigate("/driver/dashboard", { replace: true });
      } else {
        navigate("/customer/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      console.error("Login failed:", err);

      setError(
        "We couldn't sign you in. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="relative flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f2f9ff] px-4 py-8 sm:px-6">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl"
      />

      <section className="relative w-full max-w-md">
        {/* Brand */}
        <Link
          to="/login"
          className="mb-7 flex items-center justify-center gap-3"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-lg shadow-cyan-700/20">
            <Droplets size={31} />
          </div>

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Aqua<span className="text-cyan-600">Trail</span>
            </h1>

            <p className="text-xs font-medium tracking-wide text-slate-500">
              WATER DELIVERY, SIMPLIFIED
            </p>
          </div>
        </Link>

        {/* Login card */}
        <div className="rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-blue-900/5 sm:p-8">
          <div className="mb-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
              <ShieldCheck size={15} />
              Secure sign in
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Welcome back!
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to order fresh water and track your delivery.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-50">
                <Mail size={19} className="shrink-0 text-slate-400" />

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
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

              <div className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-cyan-50">
                <LockKeyhole
                  size={19}
                  className="shrink-0 text-slate-400"
                />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  className="flex h-10 w-8 shrink-0 items-center justify-center text-slate-400 hover:text-cyan-700"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm leading-5 text-rose-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 px-5 py-3 font-bold text-white shadow-lg shadow-cyan-800/15 transition hover:from-cyan-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing you in..." : "Sign in"}

              {!loading && <ArrowRight size={19} />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs text-slate-400">
              NEW TO AQUATRAIL?
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Link
            to="/register"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-cyan-800 transition hover:bg-cyan-50"
          >
            Create an account
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          Pure water. Reliable delivery. Right at your doorstep.
        </p>
      </section>
    </main>
  );
}
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const getDashboardPath = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "manager") return "/manager/dashboard";
  return "/employee/dashboard";
};

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.email.trim() || !form.password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const data = await login({
        email: form.email.trim(),
        password: form.password,
      });

      if (data.pendingApproval) {
        setSuccess(
          data.message || "Your account is waiting for admin approval."
        );
        return;
      }

      navigate(getDashboardPath(data.user?.role), { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setSuccess("");

    if (!credentialResponse?.credential) {
      setError("Google login failed. Credential not found.");
      return;
    }

    try {
      setGoogleLoading(true);

      const data = await loginWithGoogle(credentialResponse.credential);

      if (data.pendingApproval) {
        setSuccess(
          data.message || "Your account is waiting for admin approval."
        );
        return;
      }

      navigate(getDashboardPath(data.user?.role), { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Google login failed"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-3 sm:p-5 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-7xl items-center justify-center sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-48px)]">
        <div className="grid w-full overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-blue-200/70 lg:max-h-[760px] lg:grid-cols-[0.92fr_1.08fr]">
          {/* Left Login Section */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-100 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="w-full max-w-md">
              <div className="mb-6 flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-blue-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Activity size={15} />
                  </span>
                  LiveTrack
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-300/70">
                  <ShieldCheck size={26} />
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Welcome Back
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to manage attendance, activity, tasks, meetings, and
                  reports securely.
                </p>
              </div>

              {success && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {success}
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full rounded-2xl border border-white bg-white/95 px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <Lock
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-white bg-white/95 px-11 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-blue-100" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  or
                </span>
                <div className="h-px flex-1 bg-blue-100" />
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setError("Google login was cancelled or failed")
                  }
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  width="100%"
                />
              </div>

              {googleLoading && (
                <p className="mt-2 text-center text-xs font-medium text-slate-500">
                  Signing in with Google...
                </p>
              )}

              <p className="mt-6 text-center text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link
                  to="/register"
                  className="font-black text-blue-600 hover:text-blue-700"
                >
                  Register for approval
                </Link>
              </p>

              <div className="mt-7 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/80 p-3 text-center shadow-sm ring-1 ring-blue-100">
                  <p className="text-base font-black text-blue-700">Live</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Presence
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 p-3 text-center shadow-sm ring-1 ring-blue-100">
                  <p className="text-base font-black text-blue-700">Safe</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Access
                  </p>
                </div>

                <div className="rounded-2xl bg-white/80 p-3 text-center shadow-sm ring-1 ring-blue-100">
                  <p className="text-base font-black text-blue-700">Admin</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Approval
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Responsive Visual Section */}
          <div className="relative min-h-[420px] overflow-hidden bg-slate-950 p-5 sm:p-7 lg:min-h-[640px] lg:p-10">
            {/* Replace /login-hero.jpg later with your own image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(37,99,235,0.35), rgba(15,23,42,0.9)), url('/login-hero.jpg')",
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/45 via-blue-900/25 to-slate-950/90" />

            <div className="relative z-10 flex h-full min-h-[380px] flex-col justify-between gap-8 lg:min-h-[560px]">
              <div className="flex justify-end">
                <div className="flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-800 shadow-xl backdrop-blur">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Admin approval secured
                </div>
              </div>

              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur">
                  <ShieldCheck size={15} />
                  Professional employee tracking
                </div>

                <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                  Track attendance, activity, breaks, tasks and meetings in one
                  place.
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
                  A secure MERN dashboard for live employee presence, approvals,
                  historical reports, meeting access control, and productivity
                  workflows.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[320px_1fr] xl:items-end">
                <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Today&apos;s Activity
                      </p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        Live Overview
                      </h3>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      Online
                    </span>
                  </div>

                  <div className="flex h-24 items-end gap-2">
                    {[42, 64, 48, 78, 58, 88, 70].map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 rounded-t-xl bg-blue-600/90"
                        style={{ height: `${height}px` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
                    <Users size={20} className="text-blue-600" />
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Users
                    </p>
                    <p className="text-xl font-black text-slate-950">128</p>
                  </div>

                  <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
                    <Activity size={20} className="text-emerald-600" />
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Active
                    </p>
                    <p className="text-xl font-black text-slate-950">86</p>
                  </div>

                  <div className="rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
                    <BarChart3 size={20} className="text-blue-600" />
                    <p className="mt-3 text-xs font-bold text-slate-500">
                      Reports
                    </p>
                    <p className="text-xl font-black text-slate-950">24</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
              {["A", "M", "E"].map((item, index) => (
                <div
                  key={item}
                  className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white text-sm font-black text-blue-700 shadow-xl"
                  style={{ transform: `translateX(${index * 10}px)` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
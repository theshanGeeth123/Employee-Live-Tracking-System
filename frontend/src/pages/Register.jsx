import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    department: "",
    position: "",
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

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Name, email and password are required");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const data = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
      });

      if (data.pendingApproval) {
        setSuccess(
          data.message ||
            "Registration successful. Your account is waiting for admin approval."
        );

        setForm({
          name: "",
          email: "",
          password: "",
          phone: "",
          department: "",
          position: "",
        });

        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setSuccess("");

    if (!credentialResponse?.credential) {
      setError("Google registration failed. Credential not found.");
      return;
    }

    try {
      setGoogleLoading(true);

      const data = await loginWithGoogle(credentialResponse.credential);

      if (data.pendingApproval) {
        setSuccess(
          data.message ||
            "Google registration successful. Your account is waiting for admin approval."
        );
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
          error.message ||
          "Google registration failed"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-blue-200/70 lg:grid-cols-[1fr_1fr]">
          {/* LEFT SIDE */}
          <div className="flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-100 px-5 py-8 sm:px-8 lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-6 flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-blue-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Activity size={15} />
                  </span>
                  LiveTrack
                </div>
              </div>

              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-300/70">
                  <UserPlus size={26} />
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Create Account
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Register your account and wait for admin approval before
                  accessing the system.
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

              <div className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setError("Google registration was cancelled or failed")
                  }
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  width="100%"
                />
              </div>

              {googleLoading && (
                <p className="mb-3 text-center text-xs font-medium text-slate-500">
                  Registering with Google...
                </p>
              )}

              <div className="mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-blue-100" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  or register manually
                </span>
                <div className="h-px flex-1 bg-blue-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Full Name
                  </label>

                  <div className="relative">
                    <User
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      className="w-full rounded-2xl border border-white bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

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
                      placeholder="Enter email"
                      className="w-full rounded-2xl border border-white bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Password
                  </label>

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
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-2xl border border-white bg-white px-11 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
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

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Phone
                    </label>

                    <div className="relative">
                      <Phone
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                      />

                      <input
                        type="text"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full rounded-2xl border border-white bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      Department
                    </label>

                    <div className="relative">
                      <Building2
                        size={17}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                      />

                      <input
                        type="text"
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full rounded-2xl border border-white bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Position
                  </label>

                  <div className="relative">
                    <Briefcase
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"
                    />

                    <input
                      type="text"
                      name="position"
                      value={form.position}
                      onChange={handleChange}
                      placeholder="Example: Software Engineer"
                      className="w-full rounded-2xl border border-white bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-1 ring-blue-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-300/60 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Registering..." : "Register for Approval"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-black text-blue-600 hover:text-blue-700"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="relative min-h-[390px] overflow-hidden bg-slate-950 p-6 sm:p-8 lg:min-h-[760px] lg:p-10">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(37,99,235,0.45), rgba(15,23,42,0.92)), url('/login-hero.jpg')",
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-slate-900/30 to-slate-950/95" />

            <div className="relative z-10 flex h-full min-h-[340px] flex-col justify-between gap-8 lg:min-h-[680px]">
              <div className="flex justify-end">
                <div className="flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-slate-800 shadow-xl backdrop-blur">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Approval-based access
                </div>
              </div>

              <div className="max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur">
                  <ShieldCheck size={15} />
                  Secure registration workflow
                </div>

                <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                  Join the system securely with admin approval.
                </h2>

                <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
                  New users register first, then admins review details, assign
                  roles, set positions, and approve access before dashboard use.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Account Flow
                      </p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        Approval Queue
                      </h3>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                      Pending
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <UserPlus size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-900">
                          User registers
                        </p>
                        <p className="text-xs text-slate-500">
                          Email or Google account
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <ShieldCheck size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-900">
                          Admin approves
                        </p>
                        <p className="text-xs text-slate-500">
                          Role and position assigned
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
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

            {/* You can replace /login-hero.jpg later using your own image inside public folder */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
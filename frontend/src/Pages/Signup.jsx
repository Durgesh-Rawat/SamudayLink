import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// ── Only NGO and Volunteer can sign up publicly ───────────────────
// Coordinator account is created manually by the project owner.
// There is no coordinator option here by design.
const ROLES = [
  {
    value: "ngo",
    label: "NGO / Social group",
    icon: "🏢",
    desc: "Submit field reports and manage community data",
  },
  {
    value: "volunteer",
    label: "Volunteer",
    icon: "🙋",
    desc: "Get matched to tasks and help your community",
  },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "", role: "" });
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.role)               { toast.error("Please select your role.");                return; }
    if (!form.name.trim())        { toast.error("Please enter your full name.");             return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters."); return; }

    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);

      await setDoc(doc(db, "users", user.uid), {
        name:      form.name.trim(),
        email:     form.email,
        role:      form.role,
        createdAt: new Date(),
      });

      await sendEmailVerification(user);
      toast.success("Account created! Check your email to verify 📧");
      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {
      const msg =
        err.code === "auth/email-already-in-use" ? "An account with this email already exists."
        : err.code === "auth/invalid-email"       ? "Invalid email address."
        : err.code === "auth/weak-password"       ? "Password is too weak."
        : "Signup failed. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4 py-10">
      <Toaster position="top-right" />
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">

        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">SL</div>
          <span className="font-bold text-lg text-gray-900">SamudayLink</span>
        </Link>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-1">Create account</h2>
        <p className="text-sm text-center text-gray-400 mb-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Log in</Link>
        </p>

        <form onSubmit={handleSignup} className="space-y-4">

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I am joining as <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button key={r.value} type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`flex flex-col items-center gap-1.5 px-3 py-4 border-2 rounded-xl transition ${
                    form.role === r.value
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-200 hover:bg-gray-50"
                  }`}>
                  <span className="text-2xl">{r.icon}</span>
                  <span className={`font-semibold text-xs text-center ${form.role === r.value ? "text-indigo-700" : "text-gray-700"}`}>
                    {r.label}
                  </span>
                  <span className="text-xs text-gray-400 text-center leading-tight">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name <span className="text-red-500">*</span>
            </label>
            <input type="text" required placeholder="Priya Sharma"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address <span className="text-red-500">*</span>
            </label>
            <input type="email" required placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="text-xs text-indigo-600 hover:underline">
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <input type={showPw ? "text" : "password"} required placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <button disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account…
              </span>
            ) : "Create account →"}
          </button>
        </form>
      </div>
    </div>
  );
}
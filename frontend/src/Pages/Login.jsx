import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      const user = userCred.user;

      if (!user.emailVerified) {
        await sendEmailVerification(user);
        setError("Please verify your email. A new verification link has been sent.");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const role = snap.data()?.role;

      // ✅ Route based on role — coordinator added
      if (role === "ngo")          navigate("/ngo");
      else if (role === "coordinator") navigate("/coordinator");
      else                         navigate("/volunteer");

    } catch (err) {
      const msg =
        err.code === "auth/user-not-found"    ? "No account found with this email." :
        err.code === "auth/wrong-password"    ? "Incorrect password." :
        err.code === "auth/invalid-credential"? "Invalid email or password." :
        err.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." :
        "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg border border-gray-100">

        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">SL</div>
          <span className="font-bold text-lg text-gray-900">SamudayLink</span>
        </Link>

        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1">Welcome back</h2>
        <p className="text-sm text-center text-gray-400 mb-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline font-medium">Sign up</Link>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" placeholder="you@example.com" required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" placeholder="Enter your password" required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {loading ? "Logging in…" : "Log in →"}
          </button>
        </form>
      </div>
    </div>
  );
}
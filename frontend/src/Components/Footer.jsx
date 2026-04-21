import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SL</span>
            </div>
            <span className="text-white font-bold text-lg">SamudayLink</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Bridging NGOs, coordinators, and volunteers to solve real community
            problems through smart data and meaningful action.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm">Quick links</h3>
          <ul className="space-y-2 text-sm">
            {[
              { label: "Home", href: "#" },
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#work" },
              { label: "Contact", href: "#contact" },
            ].map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-white transition">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* For users */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm">For users</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/signup" className="hover:text-white transition">
                Join as NGO
              </Link>
            </li>
            <li>
              <Link to="/signup" className="hover:text-white transition">
                Join as volunteer
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition">
                Log in
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4 text-sm">Contact</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>EMail : support@samudaylink.com</li>
            <li>Gautam Buddh Nagar, UP</li>
            <li>Mon–Fri, 9am–6pm IST</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} SamudayLink. Built for Google Solution Challenge.
      </div>
    </footer>
  );
}
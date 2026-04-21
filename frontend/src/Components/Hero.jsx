import { Link } from "react-router-dom";
import person1 from "../assets/person1.png";
import person2 from "../assets/person2.png";
import person3 from "../assets/person3.png";
import person4 from "../assets/person4.png";

export default function Hero() {
  const stats = [
    { value: "120+", label: "NGOs onboarded" },
    { value: "2,400+", label: "Volunteers active" },
    { value: "8,900+", label: "Needs resolved" },
  ];

  return (
    <section className="pt-35 pb-16 bg-linear-to-br from-indigo-50 via-white to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left content */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              Powered by Google Firebase + Vertex AI
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Turn Community{" "}
              <span className="text-indigo-600 relative">
                Needs
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M0 6 Q100 0 200 6" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                </svg>
              </span>{" "}
              into Real Impact
            </h1>

            <p className="mt-5 text-gray-500 text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed">
              One platform for NGOs to report community problems, coordinators
              to visualise urgency, and volunteers to take action — intelligently
              matched by AI.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/signup"
                className="bg-indigo-600 text-white px-7 py-3 rounded-full font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 text-sm"
              >
                Join as NGO →
              </Link>
              <Link
                to="/signup"
                className="border border-indigo-200 text-indigo-700 bg-white px-7 py-3 rounded-full font-semibold hover:bg-indigo-50 transition text-sm"
              >
                Volunteer with us
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-400">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:underline font-medium">
                Log in
              </Link>
            </p>

            {/* Stats row */}
            <div className="mt-10 flex flex-wrap gap-6 justify-center lg:justify-start">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right image collage */}
          <div className="shrink-0 w-full max-w-sm lg:max-w-md">
            <div className="grid grid-cols-2 gap-4">
              <img
                src={person1}
                className="w-full h-48 object-cover rounded-2xl shadow-md hover:scale-105 transition duration-300"
                alt="Community volunteer"
              />
              <img
                src={person2}
                className="w-full h-48 object-cover rounded-2xl shadow-md hover:scale-105 transition duration-300 mt-6"
                alt="NGO field worker"
              />
              <img
                src={person3}
                className="w-full h-48 object-cover rounded-2xl shadow-md hover:scale-105 transition duration-300 -mt-6"
                alt="Community member"
              />
              <img
                src={person4}
                className="w-full h-48 object-cover rounded-2xl shadow-md hover:scale-105 transition duration-300"
                alt="Volunteer in action"
              />
            </div>

            {/* Floating card */}
            <div className="mt-4 bg-white rounded-xl shadow-lg border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg">✓</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Task resolved in Dadri</p>
                <p className="text-xs text-gray-400">Food shortage · 2 min ago · 3 volunteers</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
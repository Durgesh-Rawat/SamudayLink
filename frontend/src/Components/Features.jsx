const features = [
  {
    icon: "📊",
    title: "Smart data aggregation",
    desc: "Automatically collect and normalize reports from paper surveys, digital forms, and CSV imports across all NGOs.",
    color: "bg-indigo-50 border-indigo-100",
    iconBg: "bg-indigo-100",
  },
  {
    icon: "🗺️",
    title: "Urgency heatmap",
    desc: "Visualise the most critical community needs on a Google Maps heatmap — updated live as new reports arrive.",
    color: "bg-red-50 border-red-100",
    iconBg: "bg-red-100",
  },
  {
    icon: "🤝",
    title: "AI volunteer matching",
    desc: "Vertex AI scores volunteers by skill, proximity, and availability to find the perfect match for every task.",
    color: "bg-green-50 border-green-100",
    iconBg: "bg-green-100",
  },
  {
    icon: "⚡",
    title: "Real-time updates",
    desc: "Firebase Firestore keeps every coordinator and volunteer's screen updated the instant anything changes.",
    color: "bg-amber-50 border-amber-100",
    iconBg: "bg-amber-100",
  },
  {
    icon: "🔔",
    title: "Instant push notifications",
    desc: "Firebase Cloud Messaging alerts matched volunteers the moment a task is created — web and mobile.",
    color: "bg-purple-50 border-purple-100",
    iconBg: "bg-purple-100",
  },
  {
    icon: "📄",
    title: "OCR for paper surveys",
    desc: "Upload a photo of a handwritten survey and Cloud Vision API extracts the data automatically.",
    color: "bg-teal-50 border-teal-100",
    iconBg: "bg-teal-100",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">
            What we offer
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            Everything needed to create{" "}
            <span className="text-indigo-600">real impact</span>
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
            Built entirely on Google's ecosystem — Firebase, Vertex AI, Cloud Vision,
            and Google Maps — for a seamless, scalable experience.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`border rounded-2xl p-6 hover:shadow-lg transition duration-200 group cursor-default ${f.color}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${f.iconBg} group-hover:scale-110 transition`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-900 text-base mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
const steps = [
  {
    num: "01",
    title: "NGOs submit reports",
    desc: "Field workers upload paper surveys or fill digital forms. Cloud Vision OCR extracts data automatically.",
    color: "text-indigo-600",
    bg: "bg-indigo-600",
  },
  {
    num: "02",
    title: "AI processes & scores",
    desc: "Vertex AI classifies categories, scores urgency 1–10, and aggregates reports into unified community needs.",
    color: "text-amber-600",
    bg: "bg-amber-500",
  },
  {
    num: "03",
    title: "Coordinator reviews heatmap",
    desc: "District coordinators see a live Google Maps heatmap and create tasks for the most urgent needs.",
    color: "text-red-600",
    bg: "bg-red-500",
  },
  {
    num: "04",
    title: "Volunteers are matched & notified",
    desc: "The system ranks volunteers by skill and location. Top matches receive an instant push notification.",
    color: "text-green-600",
    bg: "bg-green-600",
  },
];

export default function Work() {
  return (
    <section id="work" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">
            The process
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            From paper survey to task resolved
          </h2>
          <p className="mt-4 text-gray-500 text-sm max-w-lg mx-auto">
            The entire journey — field report to volunteer on the ground — happens in under 10 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.num} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-3 w-6 h-0.5 bg-gray-200 z-10" />
              )}

              <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center text-white font-bold text-sm mb-4`}>
                {s.num}
              </div>
              <h3 className={`font-semibold text-base mb-2 ${s.color}`}>{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Timeline badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-5 py-2.5 rounded-full font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Average end-to-end time: under 10 minutes
          </div>
        </div>
      </div>
    </section>
  );
}
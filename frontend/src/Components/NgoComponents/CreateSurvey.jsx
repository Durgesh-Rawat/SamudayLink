import { useState, useRef } from "react";
import { useNGO } from "../../Context/NGOContext";
import toast from "react-hot-toast";
import { MdCloudUpload, MdCheckCircle } from "react-icons/md";
import Papa from "papaparse";

export default function CreateSurvey() {
  const { addReport } = useNGO();

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState([]);
  const fileRef = useRef();

  // ✅ Handle file upload
  const handleFile = (f) => {
    if (!f) return;

    if (f.type !== "text/csv") {
      toast.error("Only CSV files are supported for bulk upload");
      return;
    }

    setFile(f);
    parseCSV(f);
  };

  // ✅ Parse CSV
  const parseCSV = (file) => {
    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const formatted = results.data
            .filter((row) => row.Title && row.Category && row.Area)
            .map((row) => ({
              title: row.Title,
              category: row.Category,
              area: row.Area,
              urgency: Number(row.Urgency) || 5,
              affectedHouseholds: Number(row.Households) || 0,
              status: row.Status || "open",
              sourceType: row.Source || "bulk_upload",
              date: row.Date || new Date().toISOString(),
              description: row.Description || "",
            }));

          if (formatted.length === 0) {
            toast.error("No valid data found in CSV");
          } else {
            setExtracted(formatted);
            toast.success(`${formatted.length} records parsed`);
          }
        } catch (err) {
          toast.error("Error parsing CSV");
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        toast.error("CSV parsing failed");
        setLoading(false);
      },
    });
  };

  // ✅ Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ✅ Submit all reports
  const handleSubmitExtracted = async () => {
    if (!extracted.length) return;

    try {
      setLoading(true);

      for (const report of extracted) {
        await addReport(report);
      }

      toast.success(`${extracted.length} reports uploaded successfully!`);
      setFile(null);
      setExtracted([]);
    } catch {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Bulk Upload Surveys (CSV)
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a CSV file to add multiple survey reports at once.
        </p>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* Upload box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50"
          }`}
        >
          <MdCloudUpload className="size-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">
            {file ? file.name : "Drop CSV file here"}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            or click to browse — CSV only
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">
                Processing file…
              </span>
            </div>
          </div>
        )}

        {/* Preview */}
        {extracted.length > 0 && !loading && (
          <div className="bg-white border border-green-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MdCheckCircle className="text-green-500 size-5" />
              <span className="font-semibold text-gray-700 text-sm">
                {extracted.length} records ready
              </span>
            </div>

            {/* Preview first 5 */}
            <div className="space-y-3 mb-4">
              {extracted.slice(0, 5).map((r, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-gray-500">
                    {r.area} • {r.category} • {r.urgency}/10
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Showing 5 of {extracted.length} records
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitExtracted}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm"
              >
                Upload All →
              </button>
              <button
                onClick={() => { setFile(null); setExtracted([]); }}
                className="px-4 py-2.5 border rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
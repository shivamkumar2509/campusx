import { useState } from "react";
import { VERIFICATION_LABELS } from "../../utils/clubHelpers";

const isHttpUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
};

/**
 * Apply form. Recruitment ke verification_type ke hisaab se:
 *  - both  -> student physical/online chunta hai
 *  - video -> video link maanga jaata hai
 *  - physical/online -> sirf confirm
 */
export default function ApplicationForm({
  verificationType,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}) {
  const [choice, setChoice] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (verificationType === "both" && !choice) {
      setLocalError("Please choose Physical or Online verification.");
      return;
    }
    if (verificationType === "video" && !isHttpUrl(videoUrl.trim())) {
      setLocalError("Please enter a valid video link (starting with http:// or https://).");
      return;
    }

    const body = {};
    if (verificationType === "both") body.verification_type = choice;
    if (verificationType === "video") body.video_url = videoUrl.trim();
    onSubmit(body);
  };

  const error = localError || serverError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <h3 className="text-lg font-semibold text-gray-900">Application Form</h3>

      {verificationType === "both" && (
        <fieldset>
          <legend className="text-sm font-medium text-gray-700 mb-2">
            How would you like to be verified?
          </legend>
          <div className="flex gap-4">
            {["physical", "online"].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="verification_type"
                  value={v}
                  checked={choice === v}
                  onChange={() => setChoice(v)}
                />
                {VERIFICATION_LABELS[v]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {verificationType === "video" && (
        <div>
          <label htmlFor="video_url" className="block text-sm font-medium text-gray-700 mb-1">
            Video link
          </label>
          <input
            id="video_url"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtu.be/..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {(verificationType === "physical" || verificationType === "online") && (
        <p className="text-sm text-gray-600">
          Verification for this recruitment is{" "}
          <span className="font-medium">
            {VERIFICATION_LABELS[verificationType].toLowerCase()}
          </span>
          . Confirm below to submit your application.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="border px-5 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

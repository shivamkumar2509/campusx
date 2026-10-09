import "./LoadingSpinner.css";

export default function LoadingSpinner({
  size = "medium",
  message = "Loading...",
  fullScreen = false,
  color = "primary",
}) {
  const spinner = (
    <div className={`spinner-container spinner-${size} spinner-color-${color}`}>
      <div className="spinner-wrapper">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-dot">⚡</div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="spinner-fullscreen">{spinner}</div>;
  }

  return spinner;
}

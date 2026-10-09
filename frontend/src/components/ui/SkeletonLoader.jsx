import "./SkeletonLoader.css";

export default function SkeletonLoader({
  type = "text",
  count = 1,
  width = "100%",
  height = "16px",
  className = "",
}) {
  const renderSkeleton = (index) => {
    const commonStyle = {
      width: Array.isArray(width) ? width[index % width.length] : width,
      height: Array.isArray(height) ? height[index % height.length] : height,
    };

    switch (type) {
      case "text":
        return (
          <div
            key={index}
            className={`skeleton skeleton-text ${className}`}
            style={commonStyle}
          />
        );

      case "circle":
        return (
          <div
            key={index}
            className={`skeleton skeleton-circle ${className}`}
            style={{ width: height, height: height }}
          />
        );

      case "card":
        return (
          <div key={index} className={`skeleton-card ${className}`}>
            <div className="skeleton skeleton-card-image" />
            <div className="skeleton-card-body">
              <div
                className="skeleton skeleton-text"
                style={{ width: "60%", height: "20px" }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ width: "100%", height: "14px" }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ width: "80%", height: "14px" }}
              />
            </div>
          </div>
        );

      case "list":
        return (
          <div key={index} className={`skeleton-list-item ${className}`}>
            <div
              className="skeleton skeleton-circle"
              style={{ width: "40px", height: "40px" }}
            />
            <div className="skeleton-list-content">
              <div
                className="skeleton skeleton-text"
                style={{ width: "40%", height: "16px" }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ width: "80%", height: "12px" }}
              />
            </div>
          </div>
        );

      case "stat-card":
        return (
          <div key={index} className={`skeleton-stat-card ${className}`}>
            <div className="skeleton-stat-header">
              <div
                className="skeleton skeleton-circle"
                style={{ width: "36px", height: "36px" }}
              />
              <div
                className="skeleton skeleton-text"
                style={{ width: "50%", height: "24px" }}
              />
            </div>
            <div
              className="skeleton skeleton-text"
              style={{ width: "70%", height: "12px", marginTop: "12px" }}
            />
          </div>
        );

      default:
        return (
          <div
            key={index}
            className={`skeleton ${className}`}
            style={commonStyle}
          />
        );
    }
  };

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }).map((_, index) => renderSkeleton(index))}
    </div>
  );
}

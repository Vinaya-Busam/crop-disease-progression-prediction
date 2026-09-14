import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useState } from "react";
import "./App.css";
import "./Results.css";

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.8 3.2C13.4 3.1 7.5 5.2 4.4 9.2c-2.1 2.7-1.9 6.1.3 8.3 2.2 2.2 5.6 2.4 8.3.3 4-3.1 6.1-9 5.9-14.6 0 0-.9 0-1.1 0Z"
        fill="currentColor"
      />
      <path
        d="M4.7 19.3c3.1-3.8 6.3-6.4 10.1-8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="8.5" cy="9" r="1.7" fill="currentColor" />
      <path
        d="m5 17 4.5-4.5 3.2 3 2.2-2.2L19 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7.2 18.2h10.1a4.1 4.1 0 0 0 .4-8.2A5.7 5.7 0 0 0 7 8.5a4.9 4.9 0 0 0 .2 9.7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 10.5v6M9.7 14l2.3 2.3 2.3-2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 18V6M4 18h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="m7 15 3-4 3 2 5-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 7H18v2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloudSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 18h10a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.8-1A4.5 4.5 0 0 0 7 18Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 19 6v5.2c0 4.4-2.9 7.8-7 9.3-4.1-1.5-7-4.9-7-9.3V6l7-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9.2 12 1.8 1.8 3.9-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12h13M13 7l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(event) {
    const selectedImage = event.target.files[0];

    if (!selectedImage) {
      return;
    }

    setImage(selectedImage);
    setImagePreview(URL.createObjectURL(selectedImage));
    setResult(null);
    setError("");
  }

  function handleDrop(event) {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files[0];

    if (!droppedFile) {
      return;
    }

    if (!droppedFile.type.startsWith("image/")) {
      setError("Please upload a valid crop leaf image.");
      return;
    }

    setImage(droppedFile);
    setImagePreview(URL.createObjectURL(droppedFile));
    setResult(null);
    setError("");
  }

  async function analyzeLeaf() {
    if (!image) {
      setError("Please upload a crop leaf image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", image);

      const response = await fetch("/api/predict-upload", {
        method: "POST",
        body: formData
      });

      const text = await response.text();

      let responseData = {};

      try {
        responseData = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Prediction service returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          responseData.detail || "Prediction failed."
        );
      }

      setResult(responseData);
    } catch (requestError) {
      setError(requestError.message || "Prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  const disease = result?.disease?.disease || result?.disease || "Unknown";
  const confidence = Number(result?.disease?.confidence ?? result?.confidence ?? 0);

  const progression =
    result?.progression ||
    result?.prediction ||
    null;

  const currentSeverity =
    progression?.current_severity ??
    result?.current_severity ??
    null;

  const predictedSeverity =
    progression?.predicted_severity_7day ??
    progression?.predicted_severity ??
    result?.predicted_severity_7day ??
    null;

  const predictedSeverity14Day =
    currentSeverity !== null && predictedSeverity !== null
      ? Math.min(
          100,
          Number(predictedSeverity) +
            (Number(predictedSeverity) - Number(currentSeverity))
        )
      : null;

  const direction =
    progression?.direction ??
    result?.direction ??
    null;

  const severityChange =
    progression?.severity_change ??
    result?.severity_change ??
    null;

  return (
    <div className="app">
      <header className="navbar">
        <div className="nav-inner">
          <div className="brand">
            <div className="brand-icon">
              <LeafIcon />
            </div>

            <div className="brand-text">
              <div className="brand-title">Crop Disease AI</div>
              <div className="brand-subtitle">
                Disease Progression Prediction
              </div>
            </div>
          </div>

          <nav className="nav-links">
            <a className="active" href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#how-it-works">How it works</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="system-status">
            <span className="status-dot"></span>
            <span>AI system ready</span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-overlay"></div>

          <div className="hero-inner">
            <div className="hero-content">
              <div className="eyebrow">
                AI-POWERED CROP HEALTH ANALYSIS
              </div>

              <h1>
                <span>Understand disease.</span>
                <strong>Predict what comes next.</strong>
              </h1>

              <p>
                Upload a crop leaf image and our AI analyzes disease condition,
                estimates severity, and forecasts how the disease may progress.
              </p>
            </div>
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-grid">
            <section className="panel analyze-panel">
              <div className="panel-heading">
                <div className="heading-icon">
                  <LeafIcon />
                </div>

                <div>
                  <h2>Analyze your crop</h2>
                  <p>Upload a clear image of a crop leaf.</p>
                </div>
              </div>

              <label
                className={`upload-zone ${imagePreview ? "has-image" : ""}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleImageChange}
                />

                {imagePreview ? (
                  <div className="preview-wrapper">
                    <img
                      src={imagePreview}
                      alt="Selected crop leaf"
                      className="image-preview"
                    />

                    <div className="preview-overlay">
                      <span>Click to choose another image</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">
                      <ImageIcon />
                    </div>

                    <div className="upload-title">
                      Upload leaf image
                    </div>

                    <div className="upload-description">
                      Click to browse or drag and drop an image.
                    </div>

                    <div className="upload-format">
                      JPG, JPEG or PNG
                    </div>
                  </>
                )}
              </label>

              <button
                className="analyze-button"
                onClick={analyzeLeaf}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CloudIcon />
                    Analyze with AI
                    <ArrowIcon />
                  </>
                )}
              </button>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </section>

            <section className="panel insights-panel">
              <div className="panel-heading">
                <div className="heading-icon">
                  <LeafIcon />
                </div>

                <div>
                  <h2>What the AI analyzes</h2>
                </div>
              </div>

              <div className="insight-list">
                <div className="insight-item">
                  <div className="insight-icon">
                    <LeafIcon />
                  </div>

                  <div>
                    <h3>Visual symptoms</h3>
                    <p>
                      Leaf appearance and visible disease characteristics.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <div className="insight-icon">
                    <ChartIcon />
                  </div>

                  <div>
                    <h3>Disease progression</h3>
                    <p>
                      Historical observations are used to estimate progression.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <div className="insight-icon">
                    <CloudSmallIcon />
                  </div>

                  <div>
                    <h3>Environmental conditions</h3>
                    <p>
                      Temperature, humidity and recent conditions are considered.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <div className="insight-icon">
                    <ShieldIcon />
                  </div>

                  <div>
                    <h3>Actionable insights</h3>
                    <p>
                      Helps in early detection and better decision making.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

                  </section>

        {result && (
          <section className="results-section">

            <div className="results-header">
              <div>
                <div className="results-eyebrow">
                  AI ANALYSIS COMPLETE
                </div>

                <h2>Crop health analysis</h2>

                <p>
                  Multimodal AI analysis of your crop condition and disease risk.
                </p>
              </div>

              <div className="result-status">
                <span className="status-dot"></span>
                Prediction ready
              </div>
            </div>

            <div className="results-content">

              <div className="severity-summary-card">

              <div className="severity-summary-top">
                <div
                  className={`risk-badge ${
                    predictedSeverity === null
                      ? "risk-unavailable"
                      : Number(predictedSeverity) < 10
                      ? "risk-low"
                      : Number(predictedSeverity) < 40
                      ? "risk-moderate"
                      : Number(predictedSeverity) < 70
                      ? "risk-high"
                      : "risk-critical"
                  }`}
                >
                  {predictedSeverity !== null
                    ? Number(predictedSeverity) < 10
                      ? "LOW RISK"
                      : Number(predictedSeverity) < 40
                      ? "MODERATE RISK"
                      : Number(predictedSeverity) < 70
                      ? "HIGH RISK"
                      : "CRITICAL RISK"
                    : "RISK UNAVAILABLE"}
                </div>
              </div>

              <div className="severity-metrics">

                <div className="severity-metric">
                  <div className="severity-metric-value">
                    {currentSeverity !== null
                      ? `${Number(currentSeverity).toFixed(1)}%`
                      : "—"}
                  </div>

                  <div className="severity-metric-label">
                    Current severity
                  </div>
                </div>

                <div className="severity-metric">
                  <div className="severity-metric-value forecast-value">
                    {predictedSeverity !== null
                      ? `${Number(predictedSeverity).toFixed(1)}%`
                      : "—"}
                  </div>

                  <div className="severity-metric-label">
                    7-day forecast
                  </div>
                </div>


                <div className="severity-metric">
                  <div className="severity-metric-value change-value">
                    {severityChange !== null
                      ? `${
                          Number(severityChange) > 0 ? "+" : ""
                        }${Number(severityChange).toFixed(1)}%`
                      : "—"}
                  </div>

                  <div className="severity-metric-label">
                    Severity change
                  </div>
                </div>

              </div>

            </div>

              <div className="top-result-grid">

                <div className="result-card disease-card">
                  <div className="result-card-label">
                    Detected disease
                  </div>

                  <div className="disease-name">
                    {disease}
                  </div>

                  <div className="confidence-row-new">
                    <span>Model confidence : </span>
                    <strong>{confidence.toFixed(1)}%</strong>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          Math.max(confidence, 0),
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="result-card probability-card">
                  <div className="result-card-label">
                    Disease probabilities
                  </div>

                  <div className="probability-list">
                    {Object.entries(
                      result?.disease?.probabilities ||
                        result?.probabilities ||
                        {}
                    )
                      .sort(
                        (a, b) =>
                          Number(b[1]) - Number(a[1])
                      )
                      .map(([name, value]) => (
                        <div
                          className="probability-item"
                          key={name}
                        >
                          <span className="probability-name">
                            {name}
                          </span>

                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    Number(value),
                                    0
                                  ),
                                  100
                                )}%`
                              }}
                            ></div>
                          </div>

                          <span className="probability-value">
                            {Number(value).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>

                  <p className="probability-note">
                    Probabilities represent the model's confidence across the detected disease classes.
                  </p>
                </div>

              </div>

              <div className="result-card progression-main-card">

                <div className="progression-heading">
                  <div>
                    <div className="result-card-label">
                      Disease progression
                    </div>

                    <h3>
                      {direction
                        ? `Disease trend: ${direction}`
                        : "7-day progression forecast"}
                    </h3>
                  </div>

                  {severityChange !== null && (
                    <div className="change-badge">
                      {Number(severityChange) > 0 ? "+" : ""}
                      {Number(severityChange).toFixed(1)}%
                    </div>
                  )}
                </div>

                {progression && predictedSeverity !== null ? (
                  <>
                    <div className="forecast-track">

                      <div className="forecast-point">
                        <div className="forecast-circle">
                          {currentSeverity !== null
                            ? `${Number(
                                currentSeverity
                              ).toFixed(1)}%`
                            : "—"}
                        </div>

                        <div className="forecast-label">
                          Current
                        </div>
                      </div>

                      <div className="forecast-line">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>

                      <div className="forecast-point">
                        <div className="forecast-circle forecast-next">
                          {Number(
                            predictedSeverity
                          ).toFixed(1)}
                          %
                        </div>

                        <div className="forecast-label">
                          7 days
                        </div>
                      </div>

                      <div className="forecast-line">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>

                      <div className="forecast-point">
                        <div className="forecast-circle forecast-next">
                          {predictedSeverity14Day !== null
                            ? Number(
                                predictedSeverity14Day
                              ).toFixed(1)
                            : "—"}
                          %
                        </div>

                        <div className="forecast-label">
                          14-day estimate
                        </div>
                      </div>

                    </div>

                    <div className="progression-chart">
                      <div className="progression-chart-title">
                        Severity trend
                      </div>

                      <ResponsiveContainer width="100%" height={210}>
                        <LineChart
                          data={[
                            {
                              period: "Current",
                              severity:
                                currentSeverity !== null
                                  ? Number(currentSeverity)
                                  : null
                            },
                            {
                              period: "7 days",
                              severity:
                                predictedSeverity !== null
                                  ? Number(predictedSeverity)
                                  : null
                            },
                            {
                              period: "14 days",
                              severity:
                                predictedSeverity14Day !== null
                                  ? Number(predictedSeverity14Day)
                                  : null
                            }
                          ]}
                          margin={{
                            top: 10,
                            right: 10,
                            left: 0,
                            bottom: 5
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(120, 190, 150, 0.08)"
                          />

                          <XAxis
                            dataKey="period"
                            tick={{
                              fill: "#7f8d85",
                              fontSize: 10
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={[0, 100]}
                            tick={{
                              fill: "#7f8d85",
                              fontSize: 10
                            }}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            formatter={(value) => [
                              `${Number(value).toFixed(1)}%`,
                              "Severity"
                            ]}
                            contentStyle={{
                              background: "#101813",
                              border: "1px solid rgba(120, 190, 150, 0.15)",
                              borderRadius: "10px",
                              fontSize: "11px"
                            }}
                          />

                          <Line
                            type="monotone"
                            dataKey="severity"
                            stroke="#7fbd89"
                            strokeWidth={2}
                            dot={{
                              r: 4,
                              fill: "#7fbd89",
                              strokeWidth: 0
                            }}
                            activeDot={{
                              r: 5
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                  </>
                ) : (
                  <div className="unavailable-card">
                    <h3>
                      Historical progression unavailable
                    </h3>

                    <p>
                      {result.message ||
                        "This image is not matched with the research dataset, so historical progression cannot be retrieved."}
                    </p>
                  </div>
                )}

              </div>

              <div className="result-card disease-info">

                <div className="result-card-label">
                  Understanding the prediction
                </div>

                <h3>
                  About {disease}
                </h3>

                <div className="info-panels">

                  <div className="info-box">
                    <h4>What is it?</h4>

                    <p>
                      {disease === "Healthy"
                        ? "No major disease pattern was identified in the analyzed leaf image."
                        : `${disease} is the disease pattern identified by the AI model from the visual characteristics of the uploaded leaf.`}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>Why does it occur?</h4>

                    <p>
                      {disease === "Healthy"
                        ? "Healthy crop condition can be supported by suitable growing conditions, balanced moisture, nutrition, and appropriate crop management."
                        : "Disease development can be influenced by environmental conditions, host susceptibility, crop stage, and the presence of a suitable disease-causing pathogen."}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>Common symptoms</h4>

                    <p>
                      {disease === "Healthy"
                        ? "The analyzed image does not show a strong visual pattern associated with the supported diseases."
                        : "Typical visual indicators may include discoloration, spots, lesions, pustules, or other changes in leaf appearance. Similar symptoms can sometimes have different causes."}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>Precautions</h4>

                    <p>
                      Monitor affected leaves regularly, maintain
                      appropriate crop and field conditions, avoid
                      unnecessary leaf wetness, and follow locally
                      recommended disease management practices.
                    </p>
                  </div>

                </div>
              </div>

              <div className="result-card ai-interpretation">

                <div className="result-card-label">
                  AI interpretation
                </div>

                <p className="interpretation-text">
                  The model identifies{" "}
                  <strong>{disease}</strong> as the most likely
                  disease with{" "}
                  <strong>{confidence.toFixed(1)}%</strong>{" "}
                  confidence.

                  {predictedSeverity !== null &&
                    currentSeverity !== null && (
                      <>
                        {" "}
                        The estimated severity changes from{" "}
                        <strong>
                          {Number(
                            currentSeverity
                          ).toFixed(1)}%
                        </strong>{" "}
                        currently to{" "}
                        <strong>
                          {Number(
                            predictedSeverity
                          ).toFixed(1)}%
                        </strong>{" "}
                        over the next 7 days.
                      </>
                    )}

                  {direction && (
                    <>
                      {" "}
                      The predicted progression trend is{" "}
                      <strong>{direction}</strong>.
                    </>
                  )}
                </p>

                <div className="disclaimer">
                  This AI output is intended as a research and
                  decision-support tool. It should not be treated as
                  a definitive plant disease diagnosis. Visual
                  symptoms can have multiple causes, and field-level
                  confirmation by an agriculture expert is recommended
                  before taking treatment decisions.
                </div>

              </div>

            </div>
          </section>
        )}


      </main>


        <section className="site-section about-section" id="about">
          <div className="site-section-inner">

            <div className="site-section-label">
              ABOUT THE PROJECT
            </div>

            <h2>
              AI-powered crop health analysis
            </h2>

            <p className="site-section-intro">
              Crop Disease AI is an AI-based system designed to identify
              crop disease patterns and estimate how disease severity may
              change over time. Instead of relying only on a single leaf
              image, the system combines visual information with temporal
              observations to support disease progression analysis.
            </p>

            <div className="about-grid">

              <div className="about-card">
                <div className="about-card-icon">
                  <LeafIcon />
                </div>

                <h3>Visual analysis</h3>

                <p>
                  The system analyzes visual characteristics of crop leaves
                  to identify the most likely disease pattern and estimate
                  model confidence.
                </p>
              </div>

              <div className="about-card">
                <div className="about-card-icon">
                  <ChartIcon />
                </div>

                <h3>Progression prediction</h3>

                <p>
                  Historical observations are used to estimate current
                  disease severity and predict how severity may change over
                  the next 7 days.
                </p>
              </div>

              <div className="about-card">
                <div className="about-card-icon">
                  <CloudSmallIcon />
                </div>

                <h3>Multimodal intelligence</h3>

                <p>
                  The project combines visual and temporal information to
                  provide a more informative analysis than image-only
                  disease classification.
                </p>
              </div>

            </div>

            <div className="about-supported">

              <div>
                <div className="site-section-label">
                  SUPPORTED DISEASE CLASSES
                </div>

                <p>
                  The current model supports the following disease classes:
                </p>
              </div>

              <div className="disease-tags">
                <span>Healthy</span>
                <span>Brown Rust</span>
                <span>Yellow Rust</span>
                <span>Septoria</span>
                <span>Mildew</span>
              </div>

            </div>

          </div>
        </section>


        <section className="site-section how-section" id="how-it-works">
          <div className="site-section-inner">

            <div className="site-section-label">
              HOW IT WORKS
            </div>

            <h2>
              From leaf image to disease progression insight
            </h2>

            <p className="site-section-intro">
              The system combines visual analysis with historical information
              to understand the current disease condition and estimate how
              severity may change over time.
            </p>

            <div className="how-steps">

              <div className="how-step">
                <div className="how-step-number">01</div>

                <div className="how-step-icon">
                  <ImageIcon />
                </div>

                <h3>Upload a leaf image</h3>

                <p>
                  A crop leaf image is provided to the system for AI-based
                  visual analysis.
                </p>
              </div>

              <div className="how-step">
                <div className="how-step-number">02</div>

                <div className="how-step-icon">
                  <LeafIcon />
                </div>

                <h3>Visual feature analysis</h3>

                <p>
                  The image model extracts visual features related to the
                  appearance and disease characteristics of the leaf.
                </p>
              </div>

              <div className="how-step">
                <div className="how-step-number">03</div>

                <div className="how-step-icon">
                  <ChartIcon />
                </div>

                <h3>Temporal analysis</h3>

                <p>
                  Historical observations provide information about previous
                  disease severity and progression patterns.
                </p>
              </div>

              <div className="how-step">
                <div className="how-step-number">04</div>

                <div className="how-step-icon">
                  <CloudSmallIcon />
                </div>

                <h3>Multimodal fusion</h3>

                <p>
                  Visual and temporal information are combined by the
                  multimodal prediction model.
                </p>
              </div>

              <div className="how-step">
                <div className="how-step-number">05</div>

                <div className="how-step-icon">
                  <ChartIcon />
                </div>

                <h3>Progression prediction</h3>

                <p>
                  The system estimates current severity and predicts the
                  expected disease severity over the next 7 days.
                </p>
              </div>

              <div className="how-step">
                <div className="how-step-number">06</div>

                <div className="how-step-icon">
                  <ShieldIcon />
                </div>

                <h3>Explainable results</h3>

                <p>
                  Results include disease confidence, probabilities,
                  progression trends, and AI-assisted interpretation.
                </p>
              </div>

            </div>

          </div>
        </section>

      <footer className="footer" id="contact">
        <div className="footer-contact">
          <div className="footer-contact-label">
            CONTACT
          </div>

          <h3>
            Vinaya Busam
          </h3>

          <a href="mailto:vinayaa.busam18@gmail.com">
            vinayaa.busam18@gmail.com
          </a>

          <div className="footer-links">
            <a
              href="https://github.com/Vinaya-Busam"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>

            <a
              href="https://www.linkedin.com/in/vinaya-busam-b88942318/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </div>

        <div className="footer-message">
          <LeafIcon />
          <span>A healthier tomorrow for better harvests</span>
        </div>

        <div className="footer-copyright">
          © 2026 Crop Disease AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;

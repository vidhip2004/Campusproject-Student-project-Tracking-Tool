import { useEffect, useState } from "react";
import axios from "axios";
import "./WeeklyReview.css";

function WeeklyReview() {
  const WEEKLY_PROGRESS_API =
    "http://localhost:8081/api/weekly-progress";

  const WEEKLY_REVIEW_API =
    "http://localhost:8081/api/weekly-review";

  const [weeklyData, setWeeklyData] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const getFacultyInfo = () => {
    const stored = JSON.parse(localStorage.getItem("faculty")) || JSON.parse(localStorage.getItem("user")) || {};
    return {
      facultyId: stored.facultyId || stored.id || localStorage.getItem("facultyId") || "",
      facultyName: stored.facultyName || stored.name || localStorage.getItem("facultyName") || ""
    };
  };

  // =========================================================
  // FETCH WEEKLY PROGRESS
  // =========================================================

  useEffect(() => {
    fetchWeeklyProgress();
  }, []);

  const fetchWeeklyProgress = async () => {
    try {
      setLoading(true);
      setError("");

      const { facultyId, facultyName } = getFacultyInfo();

      const response = await axios.get(WEEKLY_PROGRESS_API, {
        params: {
          facultyId: facultyId || undefined,
          facultyName: facultyName || undefined,
        }
      });

      console.log("Weekly Progress:", response.data);

      setWeeklyData(response.data || []);
    } catch (error) {
      console.error("Error fetching weekly progress:", error);

      setError("Unable to load weekly progress.");
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // GET STUDENT NAME
  // =========================================================

  const getStudentName = (item) => {
    return (
      item.studentName ||
      item.student?.studentName ||
      item.student?.name ||
      item.student?.fullName ||
      `Student ${item.studentId || ""}`
    );
  };

  // =========================================================
  // SEARCH + FILTER
  // =========================================================

  const filteredData = weeklyData.filter((item) => {
    const studentName = getStudentName(item);

    const matchesSearch = studentName
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesWeek =
      selectedWeekFilter === "" ||
      item.week === selectedWeekFilter;

    return matchesSearch && matchesWeek;
  });

  // =========================================================
  // OPEN REVIEW
  // =========================================================

  const openReview = async (item) => {
    try {
      setError("");
      setSelectedWeek(item);

      setFeedback(item.facultyFeedback || "");

      try {
        const { facultyId, facultyName } = getFacultyInfo();
        const response = await axios.get(
          `${WEEKLY_REVIEW_API}/progress/${item.progressId}`,
          {
            params: {
              facultyId: facultyId || undefined,
              facultyName: facultyName || undefined,
            },
          }
        );

        if (response.data) {
          setFeedback(
            response.data.facultyFeedback || ""
          );
        }
      } catch (reviewError) {
        console.log("No existing faculty review found.");
      }
    } catch (error) {
      console.error(
        "Error opening weekly review:",
        error
      );

      setError("Unable to open weekly review.");
    }
  };

  const submitReview = async (status) => {
    if (!selectedWeek) {
      return;
    }

    if (status === "Needs Improvement" && (!feedback || !feedback.trim())) {
      setError("Faculty feedback is required when requesting changes.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { facultyId, facultyName } = getFacultyInfo();
      const authParams = {
        facultyId: facultyId || undefined,
        facultyName: facultyName || undefined,
      };

      // ATOMIC REVIEW OPERATION (status + feedback + notification)
      await axios.put(
        `${WEEKLY_REVIEW_API}/progress/${selectedWeek.progressId}`,
        {
          progressId: selectedWeek.progressId,
          status: status,
          facultyFeedback: feedback ? feedback.trim() : "",
        },
        {
          params: authParams,
        }
      );

      setSelectedWeek(null);
      setFeedback("");

      await fetchWeeklyProgress();
    } catch (error) {
      console.error(
        "Error submitting weekly review:",
        error
      );

      const backendMessage =
        error.response?.data?.message;

      setError(
        backendMessage ||
          "Unable to submit weekly review. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setSelectedWeek(null);
    setFeedback("");
    setError("");
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="weekly-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="weekly-header">
        <h1>Weekly Review</h1>

        <p>
          Review weekly progress submitted by students.
        </p>
      </div>


      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}

      <div className="weekly-toolbar">

        <input
          type="text"
          placeholder="Search Student..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={selectedWeekFilter}
          onChange={(e) =>
            setSelectedWeekFilter(e.target.value)
          }
        >
          <option value="">
            All Weeks
          </option>

          <option value="Week 1">Week 1</option>
          <option value="Week 2">Week 2</option>
          <option value="Week 3">Week 3</option>
          <option value="Week 4">Week 4</option>
          <option value="Week 5">Week 5</option>
          <option value="Week 6">Week 6</option>
          <option value="Week 7">Week 7</option>
          <option value="Week 8">Week 8</option>
        </select>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (
        <div className="no-data">
          <h3>Loading...</h3>

          <p>
            Fetching weekly progress.
          </p>
        </div>
      )}


      {/* =====================================================
          NO DATA
      ===================================================== */}

      {!loading &&
        filteredData.length === 0 && (
          <div className="no-data">
            <h3>
              No Weekly Progress Found
            </h3>

            <p>
              No weekly progress has been
              submitted by students yet.
            </p>
          </div>
        )}


      {/* =====================================================
          CARDS
      ===================================================== */}

      {!loading &&
        filteredData.length > 0 && (
          <div className="weekly-grid">

            {filteredData.map((item) => {
              const studentName =
                getStudentName(item);

              const week =
                item.week ||
                "Week Not Available";

              const progress =
                item.percentage ??
                item.progress ??
                0;

              const status =
                item.status ||
                "Submitted";

              return (
                <div
                  className="weekly-card"
                  key={
                    item.progressId ||
                    item.id
                  }
                >

                  <div className="weekly-top">

                    <div className="student-info">

                      <h3>
                        {studentName}
                      </h3>

                      {item.studentId && (
                        <span>
                          Student ID: {item.studentId}
                        </span>
                      )}

                    </div>

                    <span
                      className={
                        status === "Approved"
                          ? "status-approved"
                          : status ===
                            "Needs Improvement"
                          ? "status-improvement"
                          : "status-submitted"
                      }
                    >
                      {status === "Needs Improvement" ? "Changes Requested" : status === "Submitted" ? "Submitted — Pending Review" : status}
                    </span>

                  </div>


                  <div className="week-row">
                    {week}
                  </div>


                  <div className="progress-container">

                    <div className="progress-header">

                      <span>
                        Progress
                      </span>

                      <strong>
                        {progress}%
                      </strong>

                    </div>

                    <div className="progress-bar">

                      <div
                        className="progress-fill"
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                  </div>


                  <button
                    className="view-btn"
                    onClick={() =>
                      openReview(item)
                    }
                  >
                    View Full Review
                  </button>

                </div>
              );
            })}

          </div>
        )}


      {/* =====================================================
          REVIEW MODAL
      ===================================================== */}

      {/* =====================================================
          REVIEW MODAL
      ===================================================== */}

      {selectedWeek && (
        <div className="weekly-review-overlay" onClick={closeModal}>

          <div className="weekly-review-modal" onClick={(e) => e.stopPropagation()}>


            {/* =================================================
                MODAL HEADER
            ================================================= */}

            <div className="review-modal-header">

              <div>

                <h2>
                  {getStudentName(selectedWeek)}
                </h2>

                <p>
                  Weekly Progress Review
                </p>

              </div>

              <button
                className="modal-x-btn"
                onClick={closeModal}
                disabled={saving}
                title="Close"
              >
                ×
              </button>

            </div>


            {/* =================================================
                SUMMARY (RECTANGULAR STAT CARDS)
            ================================================= */}

            <div className="review-summary">

              <div className="summary-item">

                <span>
                  Week
                </span>

                <strong>
                  {selectedWeek.week || "-"}
                </strong>

              </div>


              <div className="summary-item">

                <span>
                  Progress
                </span>

                <strong>
                  {selectedWeek.percentage ?? 0}%
                </strong>

              </div>


              <div className="summary-item">

                <span>
                  Status
                </span>

                <div>
                  <span
                    className={`summary-status-tag ${
                      selectedWeek.status === "Approved"
                        ? "status-approved"
                        : selectedWeek.status === "Needs Improvement"
                        ? "status-improvement"
                        : "status-submitted"
                    }`}
                  >
                    {selectedWeek.status === "Needs Improvement"
                      ? "Changes Requested"
                      : (selectedWeek.status || "Submitted")}
                  </span>
                </div>

              </div>


              <div className="summary-item">

                <span>
                  Student ID
                </span>

                <strong>
                  {selectedWeek.studentId || "-"}
                </strong>

              </div>

            </div>


            {/* =================================================
                SCROLLABLE REVIEW BODY (RECTANGULAR CONTENT BOXES)
            ================================================= */}

            <div className="review-modal-body">


              {/* PROJECT */}

              <section className="review-section">

                <div className="section-title">
                  Project Details
                </div>

                <div className="project-box">

                  <span>
                    Project Title
                  </span>

                  <strong>
                    {selectedWeek.projectTitle || "-"}
                  </strong>

                </div>

              </section>


              {/* PROGRESS TITLE */}

              <section className="review-section">

                <div className="section-title">
                  Progress Title
                </div>

                <div className="content-box">
                  {selectedWeek.progressTitle || "-"}
                </div>

              </section>


              {/* WORK COMPLETED */}

              <section className="review-section">

                <div className="section-title">
                  What Did the Student Complete?
                </div>

                <div className="content-box large-text">
                  {selectedWeek.workCompleted ||
                    selectedWeek.tasks ||
                    "No task completion details provided."}
                </div>

              </section>


              {/* CHALLENGES */}

              <section className="review-section">

                <div className="section-title">
                  Challenges Faced
                </div>

                <div className="content-box large-text">
                  {selectedWeek.challenges || "No challenges reported."}
                </div>

              </section>


              {/* NEXT PLAN */}

              <section className="review-section">

                <div className="section-title">
                  Plan for Next Week
                </div>

                <div className="content-box large-text">
                  {selectedWeek.nextPlan || "No next week plan submitted."}
                </div>

              </section>


              {/* FILE */}

              <section className="review-section">

                <div className="section-title">
                  Submitted File
                </div>

                <div className="content-box">
                  {selectedWeek.fileName ? (
                    <div className="file-info-row">
                      <span className="file-name-text">
                        📄 {selectedWeek.fileName.split("/").pop().split("\\").pop()}
                      </span>
                      <a
                        href={`http://localhost:8081/api/files/download?path=${encodeURIComponent(
                          selectedWeek.fileName
                        )}&studentId=${selectedWeek.studentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="download-file-btn"
                      >
                        ⬇ Download File
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: "#64748b", fontStyle: "italic" }}>
                      No file submitted
                    </span>
                  )}
                </div>

              </section>


              {/* GITHUB */}

              <section className="review-section">

                <div className="section-title">
                  GitHub Repository
                </div>

                <div className="content-box">
                  {selectedWeek.githubUrl ? (
                    <a
                      className="github-link"
                      href={selectedWeek.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 {selectedWeek.githubUrl}
                    </a>
                  ) : (
                    <span style={{ color: "#64748b", fontStyle: "italic" }}>
                      No GitHub repository provided.
                    </span>
                  )}
                </div>

              </section>


              {/* FACULTY FEEDBACK */}

              <section className="review-section feedback-section">

                <div className="section-title">
                  Faculty Feedback
                </div>

                <textarea
                  className="faculty-feedback"
                  placeholder="Write your review feedback for the student..."
                  value={feedback}
                  onChange={(e) =>
                    setFeedback(e.target.value)
                  }
                  disabled={saving}
                />

              </section>

            </div>


            {/* =================================================
                FOOTER ACTIONS
            ================================================= */}

            <div className="review-modal-footer">

              <button
                className="approve-btn"
                disabled={saving}
                onClick={() =>
                  submitReview("Approved")
                }
              >
                {saving
                  ? "Saving..."
                  : "✓ Approve"}
              </button>


              <button
                className="improve-btn"
                disabled={saving}
                onClick={() =>
                  submitReview(
                    "Needs Improvement"
                  )
                }
              >
                {saving
                  ? "Saving..."
                  : "✎ Request Changes"}
              </button>


              <button
                className="close-btn"
                disabled={saving}
                onClick={closeModal}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default WeeklyReview;
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./WeeklyProgress.css";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaFilePdf,
  FaFileAlt,
  FaTimes,
  FaUpload,
  FaDownload,
  FaCloudUploadAlt,
  FaEdit,
  FaExclamationTriangle,
  FaPlusCircle,
  FaInfoCircle,
  FaEye,
  FaClipboardList,
} from "react-icons/fa";
import { getStoredStudent, getOrRecoverStudent } from "../../utils/studentSession";

function WeeklyProgress() {
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const [detailsModalItem, setDetailsModalItem] = useState(null);

  const [form, setForm] = useState({
    studentId: "",
    week: "Week 1",
    title: "",
    completed: "",
    status: "Completed",
    percentage: "",
    challenges: "",
    nextPlan: "",
    file: null,
  });

  const [projectTitle, setProjectTitle] = useState("Loading project title...");
  const [weeklyList, setWeeklyList] = useState([]);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingWeek, setEditingWeek] = useState(null);

  const allWeeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];

  // Helper to extract clean filename
  const getCleanFileName = (path) => {
    if (!path) return "Document.pdf";
    const name = path.split("/").pop().split("\\").pop();
    if (name.includes("_")) {
      return name.substring(name.indexOf("_") + 1);
    }
    return name;
  };

  // Helper to format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
    return (bytes / 1024).toFixed(1) + " KB";
  };

  // Fetch student, project title, and all submitted weekly reports
  const fetchWeeklyData = async (studentId) => {
    if (!studentId) return [];
    try {
      const res = await fetch(`http://localhost:8081/api/weekly-progress/student/${studentId}?requestingStudentId=${studentId}`, {
        headers: {
          "X-Student-Id": String(studentId),
        },
      });
      if (res.ok) {
        const list = await res.json();
        const safeList = Array.isArray(list) ? list : [];
        setWeeklyList(safeList);
        return safeList;
      }
    } catch (err) {
      console.warn("Could not fetch weekly progress:", err);
    }
    return [];
  };

  // Populates the form to edit an existing week
  const handleEditWeek = (weekItem, shouldScroll = true) => {
    if (!weekItem) return;
    setEditingWeek(weekItem.week);
    setForm((prev) => ({
      ...prev,
      studentId: String(weekItem.studentId || prev.studentId),
      week: weekItem.week,
      title: weekItem.progressTitle || "",
      completed: weekItem.workCompleted || "",
      status: weekItem.status || "Completed",
      percentage: String(weekItem.percentage || 10),
      challenges: weekItem.challenges || "",
      nextPlan: weekItem.nextPlan || "",
      file: null,
    }));
    setErrors({});
    setTouched({});

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (shouldScroll && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Switches to a new unsubmitted week
  const handleSelectNewWeek = (targetWeek, shouldScroll = true) => {
    setEditingWeek(null);
    setForm((prev) => ({
      ...prev,
      week: targetWeek,
      title: "",
      completed: "",
      status: "Completed",
      percentage: "10",
      challenges: "",
      nextPlan: "",
      file: null,
    }));
    setErrors({});
    setTouched({});

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (shouldScroll && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      let student = getStoredStudent();
      if (!student || !student.id) {
        student = await getOrRecoverStudent();
      }

      const activeStudentId =
        student?.id ||
        student?.studentId ||
        student?.Id ||
        localStorage.getItem("studentId") ||
        sessionStorage.getItem("studentId");

      if (isMounted && activeStudentId) {
        setForm((prev) => ({
          ...prev,
          studentId: String(activeStudentId),
        }));

        // 1. Fetch dynamic project title from proposal
        try {
          const propRes = await fetch(`http://localhost:8081/proposal/student/${activeStudentId}`);
          if (propRes.ok) {
            const propData = await propRes.json();
            if (propData && propData.projectTitle) {
              setProjectTitle(propData.projectTitle);
            } else {
              setProjectTitle(student?.projectTitle || student?.project || "My Academic Project");
            }
          } else {
            setProjectTitle(student?.projectTitle || student?.project || "My Academic Project");
          }
        } catch {
          setProjectTitle(student?.projectTitle || student?.project || "My Academic Project");
        }

        // 2. Fetch all submitted weeks for this student
        const list = await fetchWeeklyData(activeStudentId);

        // 3. Intelligently select and populate week
        if (list && list.length > 0) {
          const submittedWeekNames = list.map((w) => (w.week || "").trim());
          const needsWork = list.find((w) => w.status === "Needs Improvement");
          const nextUnsubmitted = allWeeks.find((w) => !submittedWeekNames.includes(w));

          if (needsWork) {
            handleEditWeek(needsWork, false);
          } else if (nextUnsubmitted) {
            handleSelectNewWeek(nextUnsubmitted, false);
          } else {
            // All weeks submitted: populate with first or latest submitted week
            const target = list[0] || list[list.length - 1];
            handleEditWeek(target, false);
          }
        }
      }

      if (isMounted) setLoading(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Strict field validation
  const validateField = (name, value) => {
    switch (name) {
      case "week":
        if (!value || !value.trim()) return "Please select a week.";
        return "";
      case "title":
        if (!value || !value.trim()) return "Progress title is required.";
        if (value.trim().length < 3) return "Title must be at least 3 characters.";
        return "";
      case "completed":
        if (!value || !value.trim()) return "Work completed description is required.";
        if (value.trim().length < 10) return "Please provide at least 10 characters.";
        return "";
      case "status":
        if (!value || !value.trim()) return "Please select a status.";
        return "";
      case "percentage":
        if (value === "" || value === null || isNaN(value)) {
          return "Completion percentage is required.";
        }
        const num = Number(value);
        if (num <= 0) {
          return "Percentage must be greater than 0%.";
        }
        if (num > 10) {
          return "Weekly completion cannot exceed 10%. (1% to 10% allowed)";
        }
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (touched[name]) {
      const err = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  // User chooses a file
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".zip"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      alert("Invalid file type! Allowed: PDF, PNG, JPG, DOCX, ZIP");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("File is too large! Maximum allowed file size is 25 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      file: file,
    }));
  };

  // User cancels selected file
  const handleCancelFile = () => {
    setForm((prev) => ({
      ...prev,
      file: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const validateAll = () => {
    const requiredKeys = ["week", "title", "completed", "status", "percentage"];
    const newErrors = {};
    const newTouched = {};

    requiredKeys.forEach((key) => {
      newTouched[key] = true;
      const err = validateField(key, form[key]);
      if (err) newErrors[key] = err;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.studentId) {
      alert("Student ID missing. Please log in again.");
      return;
    }

    const validationErrors = validateAll();
    if (Object.keys(validationErrors).length > 0) {
      const firstField = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) el.focus();
      return;
    }

    setSubmitting(true);

    const formDataPayload = new FormData();
    formDataPayload.append("studentId", form.studentId);
    formDataPayload.append("week", form.week.trim());
    formDataPayload.append(
      "projectTitle",
      projectTitle && projectTitle !== "Loading project title..."
        ? projectTitle
        : "Project"
    );
    formDataPayload.append("progressTitle", form.title.trim());
    formDataPayload.append("workCompleted", form.completed.trim());
    formDataPayload.append("status", form.status.trim());
    formDataPayload.append("percentage", Number(form.percentage));
    formDataPayload.append("challenges", form.challenges ? form.challenges.trim() : "");
    formDataPayload.append("nextPlan", form.nextPlan ? form.nextPlan.trim() : "");
    if (form.file) {
      formDataPayload.append("file", form.file);
    }

    try {
      const response = await fetch("http://localhost:8081/api/weekly-progress/submit", {
        method: "POST",
        headers: {
          "X-Student-Id": form.studentId,
        },
        body: formDataPayload,
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        const text = await response.text().catch(() => "");
        result = { message: text };
      }

      setSubmitting(false);

      if (!response.ok) {
        alert(result?.message || "Weekly progress submission failed!");
        return;
      }

      const wasChangesRequested = currentWeekRecord?.status === "Needs Improvement";
      alert(
        wasChangesRequested
          ? `${form.week} Resubmitted Successfully! Status is now Submitted (Pending Faculty Review).`
          : editingWeek
          ? `${form.week} Progress Updated Successfully!`
          : `${form.week} Progress Submitted Successfully!`
      );

      // Refresh student weekly reports list
      const updatedList = await fetchWeeklyData(form.studentId);

      // Reset form or pick next unsubmitted week
      const submittedWeekNames = (updatedList || []).map((w) => (w.week || "").trim());
      const nextUnsubmitted = allWeeks.find((w) => !submittedWeekNames.includes(w));

      if (nextUnsubmitted) {
        handleSelectNewWeek(nextUnsubmitted, false);
      } else {
        const currentUpdated = (updatedList || []).find(
          (w) => (w.week || "").trim().toLowerCase() === form.week.trim().toLowerCase()
        );
        if (currentUpdated) {
          handleEditWeek(currentUpdated, false);
        }
      }
    } catch (err) {
      setSubmitting(false);
      console.error("Submission error:", err);
      alert("Cannot connect to server. Please verify backend is running.");
    }
  };

  // Find submitted data for current form week (if any)
  const currentWeekRecord = weeklyList.find(
    (w) => (w.week || "").trim().toLowerCase() === (form.week || "").trim().toLowerCase()
  );

  // Total accumulated percentage (sum of submitted weeks, max 60% across 6 weeks)
  const totalCompletedPercentage = weeklyList.reduce((acc, curr) => acc + (Number(curr.percentage) || 0), 0);

  return (
    <div className="weekly-container">
      <div className="weekly-card">
        <div className="weekly-header">
          <h1>📅 Weekly Progress & Reviews</h1>
          <p className="weekly-subtitle">
            Submit and track your weekly milestone reports for <strong>{projectTitle}</strong>
          </p>
        </div>

        {/* WEEKLY SUMMARY BANNER */}
        <div className="weekly-summary-quick-banner">
          <div className="summary-banner-left">
            <FaClipboardList className="banner-summary-icon" />
            <div>
              <h4>Generate Weekly Progress Summary</h4>
              <p>Generate a consolidated academic summary report of all weekly milestone submissions and faculty reviews.</p>
            </div>
          </div>
          <Link to="/student-portal/weekly-summary" className="banner-summary-btn">
            <FaClipboardList /> View & Generate Summary
          </Link>
        </div>

        {/* PROGRESS OVERVIEW BAR */}
        <div className="weekly-progress-summary">
          <div className="summary-stat-row">
            <div>
              <span className="summary-title">Total Milestones Submitted</span>
              <h3>
                {weeklyList.length} of {allWeeks.length} Weeks Complete
              </h3>
            </div>
            <div className="summary-percent-pill">
              <span>{totalCompletedPercentage}% Total Progress</span>
            </div>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, (totalCompletedPercentage / 60) * 100)}%` }}
            ></div>
          </div>
        </div>


        {/* =========================================================
            SUBMISSION & UPDATE FORM
           ========================================================= */}
        <div className="submission-form-section" ref={formRef}>
          <div className="form-header-bar">
            <h2>
              {currentWeekRecord?.status === "Needs Improvement"
                ? `✏️ Edit & Resubmit ${form.week} Progress`
                : currentWeekRecord || editingWeek
                ? `✏️ Update ${form.week} Progress`
                : `📝 Submit ${form.week} Progress`}
            </h2>
            <span className="form-notice">
              {currentWeekRecord?.status === "Needs Improvement"
                ? `Faculty requested changes for ${form.week}. Review feedback above, revise your work, and resubmit.`
                : currentWeekRecord || editingWeek
                ? `You are modifying previously submitted details for ${form.week}`
                : `Fill in tasks completed for ${form.week}`}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Week & Project Title */}
            <div className="grid">
              <div className="weekly-field-group">
                <label htmlFor="week">
                  Select Week <span className="req-star">*</span>
                </label>
                <select
                  id="week"
                  name="week"
                  value={form.week}
                  onChange={(e) => {
                    const selWeek = e.target.value;
                    const existing = weeklyList.find(
                      (w) => (w.week || "").trim().toLowerCase() === selWeek.toLowerCase()
                    );
                    if (existing) {
                      handleEditWeek(existing);
                    } else {
                      handleSelectNewWeek(selWeek);
                    }
                  }}
                  onBlur={handleBlur}
                  className={touched.week && errors.week ? "input-error" : ""}
                  required
                >
                  {allWeeks.map((w) => {
                    const isSub = weeklyList.some(
                      (item) => (item.week || "").trim().toLowerCase() === w.toLowerCase()
                    );
                    return (
                      <option key={w} value={w}>
                        {w} {isSub ? "✓ (Submitted)" : ""}
                      </option>
                    );
                  })}
                </select>
                {touched.week && errors.week && (
                  <span className="field-error">{errors.week}</span>
                )}
              </div>

              <div>
                <label>Project Title</label>
                <input
                  type="text"
                  value={projectTitle}
                  readOnly
                  className="readonly-input"
                />
              </div>
            </div>

            {/* Progress Title */}
            <div className="weekly-field-group">
              <label htmlFor="title">
                Progress Title <span className="req-star">*</span>
              </label>
              <input
                id="title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Example: User Authentication & Database Setup"
                className={touched.title && errors.title ? "input-error" : ""}
                required
              />
              {touched.title && errors.title && (
                <span className="field-error">{errors.title}</span>
              )}
            </div>

            {/* Work Completed */}
            <div className="weekly-field-group">
              <div className="label-with-hint">
                <label htmlFor="completed">
                  Work Completed <span className="req-star">*</span>
                </label>
                <span className="char-hint">Min 10 characters</span>
              </div>
              <textarea
                id="completed"
                name="completed"
                value={form.completed}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Describe specific tasks completed this week in detail..."
                className={touched.completed && errors.completed ? "input-error" : ""}
                rows="4"
                required
              />
              {touched.completed && errors.completed && (
                <span className="field-error">{errors.completed}</span>
              )}
            </div>

            {/* Status & Completion Percentage (Max 10%) */}
            <div className="grid">
              <div className="weekly-field-group">
                <label htmlFor="status">
                  Progress Status <span className="req-star">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={touched.status && errors.status ? "input-error" : ""}
                  required
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                </select>
                {touched.status && errors.status && (
                  <span className="field-error">{errors.status}</span>
                )}
              </div>

              {/* STRICT 10% COMPLETION VALIDATION */}
              <div className="weekly-field-group">
                <div className="label-with-hint">
                  <label htmlFor="percentage">
                    Weekly Completion (%) <span className="req-star">* (Max 10%)</span>
                  </label>
                  <span className="ten-percent-badge">Max 10% allowed</span>
                </div>
                <input
                  id="percentage"
                  type="number"
                  name="percentage"
                  min="1"
                  max="10"
                  step="1"
                  value={form.percentage}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter 1 - 10"
                  className={touched.percentage && errors.percentage ? "input-error" : ""}
                  required
                />
                {touched.percentage && errors.percentage ? (
                  <span className="field-error">{errors.percentage}</span>
                ) : (
                  <span className="helper-text">
                    <FaInfoCircle className="helper-icon" />
                    Each week adds up to 10% towards your semester milestone (1% to 10% allowed).
                  </span>
                )}
              </div>
            </div>

            {/* Challenges & Next Plan */}
            <div className="weekly-field-group">
              <label htmlFor="challenges">Challenges Faced (Optional)</label>
              <textarea
                id="challenges"
                name="challenges"
                value={form.challenges}
                onChange={handleChange}
                placeholder="Mention any technical blockers or issues faced..."
                rows="2"
              />
            </div>

            <div className="weekly-field-group">
              <label htmlFor="nextPlan">Next Week Plan (Optional)</label>
              <textarea
                id="nextPlan"
                name="nextPlan"
                value={form.nextPlan}
                onChange={handleChange}
                placeholder="What will you work on in the upcoming week?"
                rows="2"
              />
            </div>

            {/* =========================================================
                DOCUMENT UPLOAD & "CANCEL FILE" FEATURE
               ========================================================= */}
            <div className="weekly-field-group upload-section-wrap">
              <label>Upload Document / Screenshot (Optional)</label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                name="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.zip"
                style={{ display: "none" }}
                onChange={handleFile}
              />

              {/* Case 1: User just selected a new file from their device */}
              {form.file ? (
                <div className="file-active-box file-new-selected">
                  <div className="file-left-side">
                    <div className="file-icon-square new-doc-icon">
                      <FaFilePdf />
                    </div>
                    <div className="file-info-text">
                      <div className="file-name-line">
                        <span className="file-title-bold">{form.file.name}</span>
                        <span className="file-status-pill new-pill">New Selected File</span>
                      </div>
                      <span className="file-size-sub">
                        {formatFileSize(form.file.size)} • Ready to upload with {form.week}
                      </span>
                    </div>
                  </div>

                  <div className="file-right-side">
                    {/* CANCEL FILE BUTTON */}
                    <button
                      type="button"
                      className="cancel-doc-btn"
                      onClick={handleCancelFile}
                      title="Cancel and remove this file"
                    >
                      <FaTimes /> Cancel File
                    </button>
                  </div>
                </div>
              ) : currentWeekRecord && currentWeekRecord.fileName ? (
                /* Case 2: Existing file previously uploaded for this week */
                <div className="file-active-box file-existing-saved">
                  <div className="file-left-side">
                    <div className="file-icon-square existing-doc-icon">
                      <FaFileAlt />
                    </div>
                    <div className="file-info-text">
                      <div className="file-name-line">
                        <span className="file-title-bold">
                          {getCleanFileName(currentWeekRecord.fileName)}
                        </span>
                        <span className="file-status-pill saved-pill">Currently Uploaded</span>
                      </div>
                      <span className="file-size-sub">
                        Saved on server. You can keep this file or choose a new file to replace it.
                      </span>
                    </div>
                  </div>

                  <div className="file-right-side">
                    <a
                      href={`http://localhost:8081/api/files/download?path=${encodeURIComponent(
                        currentWeekRecord.fileName
                      )}&studentId=${form.studentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-doc-btn"
                    >
                      <FaDownload /> Download
                    </a>
                    <button
                      type="button"
                      className="replace-doc-btn"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                      <FaUpload /> Upload New File
                    </button>
                  </div>
                </div>
              ) : (
                /* Case 3: No file selected yet */
                <div
                  className="doc-dropzone"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <FaCloudUploadAlt className="dropzone-cloud-icon" />
                  <h4>Click or drag & drop to attach document / screenshot</h4>
                  <p>Supports PDF, PNG, JPG, DOCX, ZIP up to 25 MB</p>
                  <button
                    type="button"
                    className="browse-doc-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current && fileInputRef.current.click();
                    }}
                  >
                    <FaUpload /> Browse Computer
                  </button>
                </div>
              )}
            </div>

            {/* Submit / Update / Resubmit Button */}
            <button
              type="submit"
              className={`weekly-submit-btn ${
                currentWeekRecord?.status === "Needs Improvement"
                  ? "resubmit-mode"
                  : currentWeekRecord || editingWeek
                  ? "update-mode"
                  : ""
              }`}
              disabled={submitting}
            >
              {submitting
                ? "Processing..."
                : currentWeekRecord?.status === "Needs Improvement"
                ? `Resubmit ${form.week} Progress`
                : currentWeekRecord || editingWeek
                ? `Update ${form.week} Progress`
                : `Submit ${form.week} Progress`}
            </button>
          </form>
        </div>

        {/* DETAILS MODAL */}
        {detailsModalItem && (
          <div className="weekly-details-modal-overlay" onClick={() => setDetailsModalItem(null)}>
            <div className="weekly-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-top">
                <div className="modal-title-wrap">
                  <span className="modal-week-badge">{detailsModalItem.week}</span>
                  <h3>{detailsModalItem.progressTitle || "Weekly Milestone Report"}</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setDetailsModalItem(null)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="modal-content-body">
                <div className="modal-meta-row">
                  <div>
                    <strong>Status: </strong>
                    <span className="modal-status-text">{detailsModalItem.status}</span>
                  </div>
                  <div>
                    <strong>Completion: </strong>
                    <span>+{detailsModalItem.percentage}%</span>
                  </div>
                </div>

                <div className="modal-section">
                  <label>Tasks Completed:</label>
                  <p>{detailsModalItem.workCompleted}</p>
                </div>

                {detailsModalItem.challenges && (
                  <div className="modal-section">
                    <label>Challenges Faced:</label>
                    <p>{detailsModalItem.challenges}</p>
                  </div>
                )}

                {detailsModalItem.nextPlan && (
                  <div className="modal-section">
                    <label>Next Plan:</label>
                    <p>{detailsModalItem.nextPlan}</p>
                  </div>
                )}

                {detailsModalItem.fileName && (
                  <div className="modal-section">
                    <label>Deliverable File:</label>
                    <div className="modal-file-bar">
                      <FaFilePdf />
                      <span>{getCleanFileName(detailsModalItem.fileName)}</span>
                      <a
                        href={`http://localhost:8081/api/files/download?path=${encodeURIComponent(
                          detailsModalItem.fileName
                        )}&studentId=${detailsModalItem.studentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-dl-btn"
                      >
                        <FaDownload /> Download
                      </a>
                    </div>
                  </div>
                )}

                {detailsModalItem.facultyFeedback && (
                  <div className="modal-feedback-box">
                    <label>Faculty Feedback:</label>
                    <p>{detailsModalItem.facultyFeedback}</p>
                    {detailsModalItem.reviewedAt && (
                      <small>Reviewed on: {new Date(detailsModalItem.reviewedAt).toLocaleString()}</small>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-edit-btn"
                  onClick={() => {
                    const item = detailsModalItem;
                    setDetailsModalItem(null);
                    handleEditWeek(item, true);
                  }}
                >
                  <FaEdit /> Load & Edit in Form Below
                </button>
                <button
                  type="button"
                  className="modal-done-btn"
                  onClick={() => setDetailsModalItem(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WeeklyProgress;
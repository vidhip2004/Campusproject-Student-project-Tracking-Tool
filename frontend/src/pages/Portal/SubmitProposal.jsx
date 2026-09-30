import { useState, useEffect, useRef } from "react";
import "./SubmitProposal.css";
import {
  FaFilePdf,
  FaTimes,
  FaUpload,
  FaCloudUploadAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaDownload,
  FaExclamationTriangle,
} from "react-icons/fa";
import { getStoredStudent, getOrRecoverStudent } from "../../utils/studentSession";

function SubmitProposal() {
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    studentId: "",
    studentName: "",
    enrollment: "",
    projectTitle: "",
    projectDomain: "",
    technologyStack: [],
    otherTechnology: "",
    member2Name: "",
    member2Enrollment: "",
    member3Name: "",
    member3Enrollment: "",
    description: "",
    proposal: null,
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [proposalStatus, setProposalStatus] = useState("");
  const [proposalId, setProposalId] = useState(null);
  const [guideName, setGuideName] = useState("");
  const [existingFileName, setExistingFileName] = useState("");
  const [facultyRemarks, setFacultyRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper to extract clean human-readable filename from storage path
  const getCleanFileName = (path) => {
    if (!path) return "Project_Proposal.pdf";
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

  // Load student & existing proposal data on mount
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      setLoading(true);
      // Retrieve or auto-recover active student
      let student = getStoredStudent();
      if (!student || !student.id) {
        student = await getOrRecoverStudent();
      }

      if (isMounted && student) {
        const studentId = student.id || student.Id;
        const studentName = student.fullName || "";
        const enrollment = student.enrollmentNo || "";

        setFormData((prev) => ({
          ...prev,
          studentId: studentId,
          studentName: studentName,
          enrollment: enrollment,
        }));

        // Fetch existing proposal for this student
        if (studentId) {
          try {
            const response = await fetch(`http://localhost:8081/proposal/student/${studentId}`);
            if (response.ok) {
              const data = await response.json();
              if (data && data.proposalId) {
                setIsSubmitted(true);
                setProposalStatus(data.status || "Submitted");
                setProposalId(data.proposalId);
                setGuideName(data.guideName || "Not Assigned");
                setExistingFileName(data.proposalFile || "");
                setFacultyRemarks(data.comments || "");

                // Parse technology stack
                let techList = [];
                if (data.technologyStack) {
                  techList = data.technologyStack
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                }

                setFormData({
                  studentId: studentId,
                  studentName: studentName,
                  enrollment: enrollment,
                  projectTitle: data.projectTitle || "",
                  projectDomain: data.projectDomain || "",
                  technologyStack: techList,
                  otherTechnology: data.otherTechnology || "",
                  member2Name: data.member2Name || "",
                  member2Enrollment: data.member2Enrollment || "",
                  member3Name: data.member3Name || "",
                  member3Enrollment: data.member3Enrollment || "",
                  description: data.projectDescription || "",
                  proposal: null,
                });
              }
            }
          } catch (err) {
            console.warn("Proposal fetch error:", err);
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTechnologyChange = (e) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          technologyStack: [...prev.technologyStack, value],
        };
      } else {
        return {
          ...prev,
          technologyStack: prev.technologyStack.filter((tech) => tech !== value),
        };
      }
    });
  };

  // User chooses a file
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are allowed. Please select a valid .pdf file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert("File is too large! Maximum allowed PDF file size is 25 MB.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      proposal: file,
    }));
  };

  // User cancels / removes selected file
  const handleCancelFile = () => {
    setFormData((prev) => ({
      ...prev,
      proposal: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.studentId) {
      alert("Student ID not found. Please log in again.");
      return;
    }

    if (!formData.projectTitle || formData.projectTitle.trim().length < 5) {
      alert("Project Title must be at least 5 characters long.");
      return;
    }

    if (formData.projectTitle.trim().length > 200) {
      alert("Project Title cannot exceed 200 characters.");
      return;
    }

    if (!formData.projectDomain || !formData.projectDomain.trim()) {
      alert("Please select a Project Domain.");
      return;
    }

    if (!formData.technologyStack || formData.technologyStack.length === 0) {
      alert("Please select at least one technology from the Technology Stack.");
      return;
    }

    const desc = formData.description ? formData.description.trim() : "";
    if (!desc || desc.length < 30) {
      alert(
        `Project Description must contain at least 30 characters.\nCurrently entered: ${desc.length} characters.`
      );
      return;
    }

    if (desc.length > 2000) {
      alert("Project Description cannot exceed 2000 characters.");
      return;
    }

    // If new proposal, file is required. If update and has previous file, optional
    if (!isSubmitted && !formData.proposal) {
      alert("Please upload your project proposal PDF file.");
      return;
    }

    // Team Member 2 Validations
    if (formData.member2Name && formData.member2Name.trim()) {
      if (!formData.member2Enrollment || !formData.member2Enrollment.trim()) {
        alert("Please enter Member 2 Enrollment Number.");
        return;
      }
      if (
        formData.member2Enrollment.trim().toLowerCase() ===
        String(formData.enrollment).trim().toLowerCase()
      ) {
        alert("You cannot add yourself (Team Leader) as Member 2.");
        return;
      }
    }

    // Team Member 3 Validations
    if (formData.member3Name && formData.member3Name.trim()) {
      if (!formData.member3Enrollment || !formData.member3Enrollment.trim()) {
        alert("Please enter Member 3 Enrollment Number.");
        return;
      }
      if (
        formData.member3Enrollment.trim().toLowerCase() ===
        String(formData.enrollment).trim().toLowerCase()
      ) {
        alert("You cannot add yourself (Team Leader) as Member 3.");
        return;
      }
      if (
        formData.member2Enrollment &&
        formData.member3Enrollment.trim().toLowerCase() ===
          formData.member2Enrollment.trim().toLowerCase()
      ) {
        alert("Member 3 cannot have the same enrollment number as Member 2.");
        return;
      }
    }

    setSubmitting(true);

    const payload = new FormData();
    payload.append("studentId", formData.studentId);
    payload.append("projectTitle", formData.projectTitle.trim());
    payload.append("projectDomain", formData.projectDomain.trim());
    payload.append("technologyStack", formData.technologyStack.join(","));
    if (formData.otherTechnology) payload.append("otherTechnology", formData.otherTechnology.trim());
    if (formData.member2Name) payload.append("member2Name", formData.member2Name.trim());
    if (formData.member2Enrollment) payload.append("member2Enrollment", formData.member2Enrollment.trim());
    if (formData.member3Name) payload.append("member3Name", formData.member3Name.trim());
    if (formData.member3Enrollment) payload.append("member3Enrollment", formData.member3Enrollment.trim());
    payload.append("projectDescription", desc);
    if (formData.proposal) {
      payload.append("proposalFile", formData.proposal);
    }

    try {
      const response = await fetch("http://localhost:8081/proposal/submit", {
        method: "POST",
        body: payload,
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
        alert(result?.message || `Proposal submission failed (Status: ${response.status})`);
        return;
      }

      // Mark as submitted and update state
      setIsSubmitted(true);
      setProposalStatus(result.status || "Submitted");
      if (result.proposalId) setProposalId(result.proposalId);
      if (result.guideName) setGuideName(result.guideName);
      if (result.proposalFile) setExistingFileName(result.proposalFile);
      if (result.comments !== undefined) setFacultyRemarks(result.comments || "");

      // Clear the local file reference since it is now saved on server
      setFormData((prev) => ({
        ...prev,
        proposal: null,
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert(
        isSubmitted
          ? "Project Proposal Updated Successfully!"
          : "Project Proposal Submitted Successfully!"
      );
    } catch (err) {
      setSubmitting(false);
      console.error("Submission error:", err);
      alert("Cannot connect to server. Please verify that your backend is running.");
    }
  };

  const getStatusBadgeClass = (statusStr) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("approv")) return "status-approved";
    if (s.includes("reject")) return "status-rejected";
    if (s.includes("change") || s.includes("request")) return "status-changes";
    return "status-submitted";
  };

  return (
    <div className="proposal-container">
      <div className="proposal-card">
        <h1>📄 Submit Project Proposal</h1>

        {/* STATUS BANNER */}
        {isSubmitted && (
          <div className="proposal-status-banner">
            <div className="status-header-row">
              <div className="status-badge-wrap">
                <span className="status-title-label">Current Status:</span>
                <span className={`status-pill ${getStatusBadgeClass(proposalStatus)}`}>
                  <FaCheckCircle className="status-icon" />
                  {proposalStatus === "CHANGES_REQUESTED"
                    ? "Changes Requested"
                    : proposalStatus || "Submitted"}
                </span>
                {proposalId && <span className="proposal-id-tag">ID: #{proposalId}</span>}
              </div>

              {guideName && guideName !== "Not Assigned" && (
                <div className="guide-badge">
                  <span>Assigned Guide: <strong>{guideName}</strong></span>
                </div>
              )}
            </div>

            {/* FACULTY REMARKS / REQUESTED CHANGES BOX */}
            {facultyRemarks && (
              <div className="proposal-faculty-feedback-card">
                <div className="feedback-card-header">
                  <FaExclamationTriangle className="feedback-warning-icon" />
                  <strong>Faculty Remarks / Requested Changes:</strong>
                </div>
                <div className="feedback-card-body">
                  <p>{facultyRemarks}</p>
                </div>
                <span className="feedback-card-hint">
                  Please review the faculty's requested changes above, modify the relevant fields or replace your proposal document below, and click <strong>Update Proposal</strong> to submit your revisions.
                </span>
              </div>
            )}

            <p className="status-description-text">
              <FaInfoCircle className="info-icon" />
              Your proposal has been recorded. All submitted details are pre-filled below. You can update any field or upload a new proposal PDF at any time.
            </p>
          </div>
        )}

        {loading && (
          <div className="proposal-loading">
            <span>Loading proposal details...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Student Information */}
          <h2 className="section-title">Student Information</h2>

          <div className="grid">
            <div>
              <label>Student Name</label>
              <input type="text" value={formData.studentName} readOnly />
            </div>

            <div>
              <label>Enrollment Number</label>
              <input type="text" value={formData.enrollment} readOnly />
            </div>
          </div>

          {/* Project Information */}
          <h2 className="section-title">Project Information</h2>

          <label>Project Title <span className="req-star">*</span></label>
          <input
            type="text"
            name="projectTitle"
            placeholder="Enter Project Title"
            value={formData.projectTitle}
            onChange={handleChange}
            required
          />

          <label>Project Domain <span className="req-star">*</span></label>
          <select
            name="projectDomain"
            value={formData.projectDomain}
            onChange={handleChange}
            required
          >
            <option value="">Select Domain</option>
            <option value="Web Development">Web Development</option>
            <option value="Android Development">Android Development</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Machine Learning">Machine Learning</option>
            <option value="Cloud Computing">Cloud Computing</option>
            <option value="Cyber Security">Cyber Security</option>
            <option value="Data Science">Data Science</option>
            <option value="Internet of Things">Internet of Things</option>
          </select>

          {/* Technology Stack */}
          <h2 className="section-title">Technology Stack <span className="req-star">*</span></h2>

          <div className="technology-category">
            <h3>🎨 Frontend</h3>
            <div className="technology-grid">
              {["React.js", "Angular", "Thymeleaf", "HTML", "CSS", "JavaScript"].map((tech) => (
                <label key={tech} className={formData.technologyStack.includes(tech) ? "tech-selected" : ""}>
                  <input
                    type="checkbox"
                    value={tech}
                    checked={formData.technologyStack.includes(tech)}
                    onChange={handleTechnologyChange}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </div>

          <div className="technology-category">
            <h3>⚙️ Backend</h3>
            <div className="technology-grid">
              {["Node.js", "Spring Boot", "Django", "ASP.NET", "Python", "Java"].map((tech) => (
                <label key={tech} className={formData.technologyStack.includes(tech) ? "tech-selected" : ""}>
                  <input
                    type="checkbox"
                    value={tech}
                    checked={formData.technologyStack.includes(tech)}
                    onChange={handleTechnologyChange}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </div>

          <div className="technology-category">
            <h3>🗄️ Database</h3>
            <div className="technology-grid">
              {["MongoDB", "MySQL", "PostgreSQL", "Mongoose"].map((tech) => (
                <label key={tech} className={formData.technologyStack.includes(tech) ? "tech-selected" : ""}>
                  <input
                    type="checkbox"
                    value={tech}
                    checked={formData.technologyStack.includes(tech)}
                    onChange={handleTechnologyChange}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </div>

          <div className="technology-category">
            <h3>📊 Data Science & AI</h3>
            <div className="technology-grid">
              {["Data Science", "Machine Learning", "Artificial Intelligence", "Pandas", "NumPy"].map((tech) => (
                <label key={tech} className={formData.technologyStack.includes(tech) ? "tech-selected" : ""}>
                  <input
                    type="checkbox"
                    value={tech}
                    checked={formData.technologyStack.includes(tech)}
                    onChange={handleTechnologyChange}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </div>

          <div className="technology-category">
            <h3>☁️ DevOps & Cloud</h3>
            <div className="technology-grid">
              {["AWS", "Docker", "Jenkins", "Git", "GitHub", "Terraform"].map((tech) => (
                <label key={tech} className={formData.technologyStack.includes(tech) ? "tech-selected" : ""}>
                  <input
                    type="checkbox"
                    value={tech}
                    checked={formData.technologyStack.includes(tech)}
                    onChange={handleTechnologyChange}
                  />
                  {tech}
                </label>
              ))}
            </div>
          </div>

          <label>Other Technology (Optional)</label>
          <input
            type="text"
            name="otherTechnology"
            placeholder="Enter Other Technology (e.g. Redis, GraphQL)"
            value={formData.otherTechnology}
            onChange={handleChange}
          />

          {/* Team Members */}
          <h2 className="section-title">Team Members</h2>

          <div className="member-box">
            <h3>👑 Team Leader</h3>
            <div className="grid">
              <input type="text" value={formData.studentName} readOnly />
              <input type="text" value={formData.enrollment} readOnly />
            </div>
          </div>

          <div className="member-box">
            <h3>Member 2 (Optional)</h3>
            <div className="grid">
              <input
                type="text"
                name="member2Name"
                placeholder="Member 2 Full Name"
                value={formData.member2Name}
                onChange={handleChange}
              />
              <input
                type="text"
                name="member2Enrollment"
                placeholder="Member 2 Enrollment Number"
                value={formData.member2Enrollment}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="member-box">
            <h3>Member 3 (Optional)</h3>
            <div className="grid">
              <input
                type="text"
                name="member3Name"
                placeholder="Member 3 Full Name"
                value={formData.member3Name}
                onChange={handleChange}
              />
              <input
                type="text"
                name="member3Enrollment"
                placeholder="Member 3 Enrollment Number"
                value={formData.member3Enrollment}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: "20px",
              marginBottom: "8px",
            }}
          >
            <label style={{ margin: 0, fontWeight: "600", color: "#173B63" }}>
              Project Description <span className="req-star">* (Min 30 characters)</span>
            </label>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: (formData.description?.trim().length || 0) >= 30 ? "#16a34a" : "#dc2626",
              }}
            >
              {formData.description?.trim().length || 0} / 30 min chars (max 2000)
            </span>
          </div>

          <textarea
            rows="6"
            name="description"
            placeholder="Write a clear summary of your project idea, problem statement, and objectives (at least 30 characters)..."
            value={formData.description}
            onChange={handleChange}
            required
          ></textarea>

          {/* UPLOAD PROPOSAL PDF & CANCEL FILE SECTION */}
          <h2 className="section-title">
            Project Proposal Document <span className="req-star">*</span>
          </h2>

          <div className="file-upload-container">
            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: "none" }}
              onChange={handleFile}
            />

            {/* CASE 1: User just picked a new file */}
            {formData.proposal ? (
              <div className="file-active-card new-file-card">
                <div className="file-card-left">
                  <div className="file-icon-box new-pdf-icon">
                    <FaFilePdf />
                  </div>
                  <div className="file-details">
                    <div className="file-title-row">
                      <span className="file-name-text">{formData.proposal.name}</span>
                      <span className="file-badge new-badge">New Selected File</span>
                    </div>
                    <span className="file-size-text">
                      {formatFileSize(formData.proposal.size)} • Ready to upload with proposal
                    </span>
                  </div>
                </div>

                <div className="file-card-right">
                  <button
                    type="button"
                    className="cancel-file-btn"
                    onClick={handleCancelFile}
                    title="Cancel and remove this file"
                  >
                    <FaTimes /> Cancel File
                  </button>
                </div>
              </div>
            ) : existingFileName ? (
              /* CASE 2: Proposal previously submitted with a file on the server */
              <div className="file-active-card existing-file-card">
                <div className="file-card-left">
                  <div className="file-icon-box existing-pdf-icon">
                    <FaFilePdf />
                  </div>
                  <div className="file-details">
                    <div className="file-title-row">
                      <span className="file-name-text">{getCleanFileName(existingFileName)}</span>
                      <span className="file-badge existing-badge">Uploaded Proposal</span>
                    </div>
                    <span className="file-size-text">
                      Previously saved on server. You can keep this file or upload a new one to replace it.
                    </span>
                  </div>
                </div>

                <div className="file-card-right">
                  <a
                    href={`http://localhost:8081/api/files/download?path=${encodeURIComponent(
                      existingFileName
                    )}&studentId=${formData.studentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-file-btn"
                    title="Download current proposal PDF"
                  >
                    <FaDownload /> Download
                  </a>
                  <button
                    type="button"
                    className="replace-file-btn"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <FaUpload /> Upload New File
                  </button>
                </div>
              </div>
            ) : (
              /* CASE 3: No file yet */
              <div
                className="dropzone-box"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <FaCloudUploadAlt className="dropzone-icon" />
                <h4 className="dropzone-title">Click to Select Project Proposal PDF</h4>
                <p className="dropzone-hint">
                  Only PDF files are supported • Max file size: 25 MB
                </p>
                <button
                  type="button"
                  className="browse-btn"
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

          {/* Submit / Update Button */}
          <button
            type="submit"
            className={`submit-btn ${isSubmitted ? "update-btn" : ""}`}
            disabled={submitting}
          >
            {submitting
              ? isSubmitted
                ? "Updating Proposal..."
                : "Submitting Proposal..."
              : isSubmitted
              ? "Update Proposal"
              : "Submit Proposal"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SubmitProposal;

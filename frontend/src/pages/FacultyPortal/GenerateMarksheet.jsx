import { useEffect, useMemo, useRef, useState } from "react";
import "./GenerateMarksheet.css";
import html2pdf from "html2pdf.js";
import { FaDownload, FaPrint, FaArrowLeft, FaAward, FaFileAlt } from "react-icons/fa";

const API_BASE_URL = "http://localhost:8081/api/generate-marksheet";

function GenerateMarksheet() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [subject, setSubject] = useState("Software Development Project");
  const [finalVivaDate, setFinalVivaDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const marksheetPdfRef = useRef(null);

  const getFacultyInfo = () => {
    const stored =
      JSON.parse(localStorage.getItem("faculty")) ||
      JSON.parse(localStorage.getItem("user")) ||
      {};
    return {
      facultyId:
        stored.facultyId ||
        stored.id ||
        localStorage.getItem("facultyId") ||
        "",
      facultyName:
        stored.facultyName ||
        stored.name ||
        localStorage.getItem("facultyName") ||
        "",
    };
  };

  // =========================================================
  // LOAD STUDENTS WITH MARKS
  // =========================================================
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const { facultyId, facultyName } = getFacultyInfo();
      const params = new URLSearchParams();
      if (facultyId) params.append("facultyId", facultyId);
      if (facultyName) params.append("facultyName", facultyName);

      const response = await fetch(
        `${API_BASE_URL}/students?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to load students with marks.");
      }

      const data = await response.json();
      setStudents(data);

      if (data.length > 0) {
        setSelectedStudentId(data[0].studentId);
        setSelectedStudent(data[0]);
        setRemarks(data[0].overallComments || "");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SELECT STUDENT
  // =========================================================
  const handleStudentChange = async (event) => {
    const studentId = Number(event.target.value);
    setSelectedStudentId(studentId);
    setShowPreview(false);

    try {
      setLoadingStudent(true);
      setError("");

      const { facultyId, facultyName } = getFacultyInfo();
      const params = new URLSearchParams();
      if (facultyId) params.append("facultyId", facultyId);
      if (facultyName) params.append("facultyName", facultyName);

      const response = await fetch(
        `${API_BASE_URL}/student/${studentId}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Unable to load student's marks.");
      }

      const data = await response.json();
      setSelectedStudent(data);
      setRemarks(data.overallComments || "");
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load student marks.");
      setSelectedStudent(null);
    } finally {
      setLoadingStudent(false);
    }
  };

  // =========================================================
  // EVALUATION COMPONENTS & MARKS CALCULATION
  // Component Max Marks:
  // - Proposal: 20
  // - Weekly Review: 30
  // - Final Report: 10
  // - Presentation & Viva: 20
  // - Source Code: 20
  // Total Maximum = 100
  // =========================================================
  const evaluationComponents = useMemo(() => {
    if (!selectedStudent) return [];
    return [
      {
        id: 1,
        title: "Project Proposal & Scope Definition",
        shortTitle: "Proposal",
        maxMarks: 20,
        obtained: Number(selectedStudent.proposalMarks || 0),
      },
      {
        id: 2,
        title: "Weekly Progress & Continuous Review",
        shortTitle: "Weekly Review",
        maxMarks: 30,
        obtained: Number(selectedStudent.weeklyProgressMarks || 0),
      },
      {
        id: 3,
        title: "Final Project Report & Documentation",
        shortTitle: "Final Report",
        maxMarks: 10,
        obtained: Number(selectedStudent.finalReportMarks || 0),
      },
      {
        id: 4,
        title: "Presentation & Viva Voce",
        shortTitle: "Presentation / Viva",
        maxMarks: 20,
        obtained: Number(selectedStudent.presentationVivaMarks || 0),
      },
      {
        id: 5,
        title: "Source Code & Implementation Quality",
        shortTitle: "Source Code",
        maxMarks: 20,
        obtained: Number(selectedStudent.sourceCodeMarks || 0),
      },
    ];
  }, [selectedStudent]);

  const totalMaxMarks = 100;

  // Total Obtained Marks calculated strictly from components
  const totalObtained = useMemo(() => {
    if (!selectedStudent) return 0;
    return evaluationComponents.reduce(
      (sum, comp) => sum + Number(comp.obtained || 0),
      0
    );
  }, [selectedStudent, evaluationComponents]);

  // Percentage calculated accurately: (totalObtained / totalMaxMarks) * 100
  const percentage = useMemo(() => {
    if (!selectedStudent) return "0.00";

    let raw = Number(selectedStudent.percentage);
    if (!isNaN(raw) && raw > 0) {
      // If legacy data stored 0.89 for 89 marks, convert to 89.00
      if (raw <= 1.0 && totalObtained > 1.0) {
        raw = raw * 100;
      }
      return raw.toFixed(2);
    }

    const calculated = (totalObtained / totalMaxMarks) * 100;
    return calculated.toFixed(2);
  }, [selectedStudent, totalObtained, totalMaxMarks]);

  // Grade calculated accurately from total / percentage
  const grade = useMemo(() => {
    if (
      selectedStudent?.grade &&
      selectedStudent.grade !== "-" &&
      selectedStudent.grade.trim() !== ""
    ) {
      return selectedStudent.grade;
    }
    const marks = Number(totalObtained);
    if (marks >= 90) return "A+";
    if (marks >= 80) return "A";
    if (marks >= 70) return "B+";
    if (marks >= 60) return "B";
    if (marks >= 50) return "C";
    if (marks >= 40) return "D";
    return "F";
  }, [selectedStudent, totalObtained]);

  // Result: PASS if total >= 40, else FAIL
  const result = useMemo(() => {
    if (
      selectedStudent?.result &&
      selectedStudent.result !== "Pending" &&
      selectedStudent.result.trim() !== ""
    ) {
      return selectedStudent.result.toUpperCase();
    }
    return totalObtained >= 40 ? "PASS" : "FAIL";
  }, [selectedStudent, totalObtained]);

  // =========================================================
  // ACTIONS
  // =========================================================
  const handleGenerate = (event) => {
    event.preventDefault();
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }
    setError("");
    setShowPreview(true);

    // Scroll to preview smoothly
    setTimeout(() => {
      const previewEl = document.getElementById("marksheet-preview-section");
      if (previewEl) {
        previewEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleReset = () => {
    setShowPreview(false);
  };

  // =========================================================
  // DOWNLOAD PDF (USES ONLY THE STATIC MARKSHEET DOM ELEMENT)
  // THE DOWNLOAD BUTTON LIVES EXCLUSIVELY OUTSIDE THIS CONTAINER
  // =========================================================
  const handleDownload = async () => {
    const element = marksheetPdfRef.current;
    if (!element) {
      alert("Please generate the marksheet first.");
      return;
    }

    try {
      setDownloading(true);

      const safeStudentName = (
        selectedStudent?.studentName || "Student"
      ).replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `${safeStudentName}_Official_Marksheet.pdf`;

      const options = {
        margin: [10, 10, 10, 10], // 10mm margins all around
        filename: filename,
        image: {
          type: "jpeg",
          quality: 0.98,
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
        },
      };

      await html2pdf().set(options).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="gm-container">
      {/* PAGE HEADER */}
      <div className="gm-header">
        <h1>Generate Marksheet</h1>
        <p>
          Select an evaluated student to preview their official academic marksheet
          and download a print-ready PDF certificate.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="gm-error-alert" role="alert">
          {error}
        </div>
      )}

      {/* SELECTION & PARAMETERS FORM */}
      <form onSubmit={handleGenerate} className="gm-form">
        <div className="gm-grid-2">
          {/* STUDENT SELECT */}
          <label className="gm-label">
            Select Student
            <select
              value={selectedStudentId}
              onChange={handleStudentChange}
              className="gm-input"
              disabled={loading || loadingStudent}
            >
              {loading ? (
                <option>Loading students...</option>
              ) : students.length === 0 ? (
                <option>No students with marks available</option>
              ) : (
                students.map((student) => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.studentName} — {student.enrollment}
                  </option>
                ))
              )}
            </select>
          </label>

          {/* SUBJECT */}
          <label className="gm-label">
            Subject / Course
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="gm-input"
              placeholder="e.g. Software Development Project"
            />
          </label>

          {/* VIVA DATE */}
          <label className="gm-label">
            Final Viva Date
            <input
              type="date"
              value={finalVivaDate}
              onChange={(event) => setFinalVivaDate(event.target.value)}
              className="gm-input"
            />
          </label>

          {/* PROJECT TITLE */}
          <label className="gm-label">
            Project Title
            <input
              type="text"
              value={selectedStudent?.projectTitle || "Not Specified"}
              disabled
              className="gm-input gm-disabled"
            />
          </label>
        </div>

        {loadingStudent && (
          <p className="gm-loading-text">Loading student marks and details...</p>
        )}

        {/* MARKS SUMMARY GRID */}
        {selectedStudent && !loadingStudent && (
          <>
            <div className="gm-grid-3">
              <label className="gm-label">
                Proposal (Max: 20)
                <input
                  type="text"
                  value={selectedStudent.proposalMarks ?? 0}
                  disabled
                  className="gm-input gm-disabled"
                />
              </label>

              <label className="gm-label">
                Weekly Review (Max: 30)
                <input
                  type="text"
                  value={selectedStudent.weeklyProgressMarks ?? 0}
                  disabled
                  className="gm-input gm-disabled"
                />
              </label>

              <label className="gm-label">
                Final Report (Max: 10)
                <input
                  type="text"
                  value={selectedStudent.finalReportMarks ?? 0}
                  disabled
                  className="gm-input gm-disabled"
                />
              </label>
            </div>

            <div className="gm-grid-3">
              <label className="gm-label">
                Presentation / Viva (Max: 20)
                <input
                  type="text"
                  value={selectedStudent.presentationVivaMarks ?? 0}
                  disabled
                  className="gm-input gm-disabled"
                />
              </label>

              <label className="gm-label">
                Source Code (Max: 20)
                <input
                  type="text"
                  value={selectedStudent.sourceCodeMarks ?? 0}
                  disabled
                  className="gm-input gm-disabled"
                />
              </label>

              <label className="gm-label">
                Total (Max: 100)
                <input
                  type="text"
                  value={`${totalObtained} / 100`}
                  disabled
                  className="gm-input gm-disabled gm-strong-input"
                />
              </label>
            </div>

            {/* REMARKS INPUT */}
            <label className="gm-label">
              Faculty Remarks & Observations
              <textarea
                rows="3"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                className="gm-textarea"
                placeholder="Enter remarks to appear on the official marksheet..."
              />
            </label>

            {/* FORM ACTIONS */}
            <div className="gm-actions">
              <button
                type="button"
                onClick={handleReset}
                className="gm-btn gm-btn-outline"
              >
                Reset
              </button>

              <button
                type="submit"
                className="gm-btn gm-btn-primary"
                disabled={!selectedStudent}
              >
                Generate Marksheet
              </button>
            </div>
          </>
        )}
      </form>

      {/* =====================================================
          PREVIEW SECTION
          Contains:
          1. Dedicated Action Toolbar (OUTSIDE the PDF)
          2. Pure Printable Official Marksheet (INSIDE the PDF)
          ===================================================== */}
      {showPreview && selectedStudent && (
        <section
          id="marksheet-preview-section"
          className="gm-preview-container"
        >
          {/* ACTION TOOLBAR — LOCATED EXCLUSIVELY OUTSIDE THE PDF */}
          <div className="gm-preview-toolbar">
            <div className="gm-toolbar-left">
              <span className="gm-toolbar-badge">
                <FaFileAlt style={{ marginRight: 6 }} /> Official Preview
              </span>
              <span className="gm-toolbar-title">
                {selectedStudent.studentName} ({selectedStudent.enrollment})
              </span>
            </div>

            <div className="gm-toolbar-right">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="gm-btn gm-btn-download"
                title="Download official PDF document"
              >
                <FaDownload style={{ marginRight: 8 }} />
                {downloading ? "Generating PDF..." : "Download Official PDF"}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="gm-btn gm-btn-print"
                title="Print marksheet"
              >
                <FaPrint style={{ marginRight: 6 }} /> Print
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="gm-btn gm-btn-secondary"
                title="Close preview"
              >
                <FaArrowLeft style={{ marginRight: 6 }} /> Close Preview
              </button>
            </div>
          </div>

          {/* ===================================================
              OFFICIAL PRINTABLE MARKSHEET CONTAINER
              THIS IS THE EXACT CONTAINER PASSED TO html2pdf.
              IT CONTAINS ABSOLUTELY ZERO BUTTONS OR UI CONTROLS.
              =================================================== */}
          <div className="gm-paper-wrapper">
            <div
              ref={marksheetPdfRef}
              className="official-marksheet-document"
              id="official-marksheet-document"
            >
              {/* 1. UNIVERSITY HEADER */}
              <div className="om-header">
                <div className="om-emblem">
                  <div className="om-emblem-crest">SVGU</div>
                </div>

                <div className="om-header-text">
                  <h1 className="om-univ-name">
                    SARDAR VALLABHBHAI GLOBAL UNIVERSITY
                  </h1>
                  <h2 className="om-dept-name">
                    Department of Computer Applications
                  </h2>
                  <p className="om-program-name">
                    Project Work Examination & Grade Statement
                  </p>
                </div>
              </div>

              {/* ORNAMENTAL DOUBLE RULE */}
              <div className="om-divider-double"></div>

              {/* DOCUMENT TITLE BADGE */}
              <div className="om-title-bar">
                <span>OFFICIAL STATEMENT OF MARKS</span>
              </div>

              {/* 2. STUDENT & PROJECT INFORMATION */}
              <div className="om-meta-section">
                <table className="om-meta-table">
                  <tbody>
                    <tr>
                      <td className="om-meta-label">Student Name</td>
                      <td className="om-meta-value om-bold">
                        {selectedStudent.studentName}
                      </td>
                      <td className="om-meta-label">Enrollment No.</td>
                      <td className="om-meta-value om-bold">
                        {selectedStudent.enrollment}
                      </td>
                    </tr>
                    <tr>
                      <td className="om-meta-label">Project Title</td>
                      <td className="om-meta-value" colSpan="3">
                        {selectedStudent.projectTitle || "Not Specified"}
                      </td>
                    </tr>
                    <tr>
                      <td className="om-meta-label">Faculty Guide</td>
                      <td className="om-meta-value">
                        {selectedStudent.guideName || "Faculty Mentor"}
                      </td>
                      <td className="om-meta-label">Subject</td>
                      <td className="om-meta-value">{subject}</td>
                    </tr>
                    <tr>
                      <td className="om-meta-label">Final Viva Date</td>
                      <td className="om-meta-value">
                        {finalVivaDate
                          ? new Date(finalVivaDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "Not Specified"}
                      </td>
                      <td className="om-meta-label">Academic Status</td>
                      <td className="om-meta-value">Regular / Full-Time</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. MARKS TABLE */}
              <div className="om-table-section">
                <table className="om-marks-table">
                  <thead>
                    <tr>
                      <th className="om-col-sr">Sr. No.</th>
                      <th className="om-col-comp">Evaluation Component</th>
                      <th className="om-col-max">Max Marks</th>
                      <th className="om-col-obt">Marks Obtained</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluationComponents.map((comp) => (
                      <tr key={comp.id}>
                        <td className="om-text-center">{comp.id}</td>
                        <td className="om-comp-title">{comp.title}</td>
                        <td className="om-text-right">{comp.maxMarks}</td>
                        <td className="om-text-right om-bold">
                          {comp.obtained}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="om-total-row">
                      <td colSpan="2" className="om-total-label">
                        TOTAL
                      </td>
                      <td className="om-text-right om-bold">
                        {totalMaxMarks}
                      </td>
                      <td className="om-text-right om-bold om-total-obtained">
                        {totalObtained}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 4. PERFORMANCE SUMMARY */}
              <div className="om-summary-grid">
                <div className="om-summary-card">
                  <span className="om-summary-label">Percentage</span>
                  <span className="om-summary-value">{percentage}%</span>
                </div>

                <div className="om-summary-card">
                  <span className="om-summary-label">Grade</span>
                  <span className="om-summary-value">{grade}</span>
                </div>

                <div className="om-summary-card">
                  <span className="om-summary-label">Result</span>
                  <span
                    className={`om-summary-value om-result-badge ${
                      result === "PASS" ? "pass" : "fail"
                    }`}
                  >
                    {result}
                  </span>
                </div>
              </div>

              {/* 5. REMARKS */}
              <div className="om-remarks-box">
                <div className="om-remarks-label">
                  Faculty Remarks & Observations:
                </div>
                <div className="om-remarks-content">
                  {remarks && remarks.trim()
                    ? remarks
                    : "The candidate has demonstrated commendable technical competence and satisfactory understanding of project objectives during viva voce examination."}
                </div>
              </div>

              {/* 6. SIGNATURE AREA */}
              <div className="om-signature-row">
                <div className="om-sig-block">
                  <div className="om-sig-space"></div>
                  <div className="om-sig-line"></div>
                  <p className="om-sig-name">
                    {selectedStudent.guideName || "Internal Guide"}
                  </p>
                  <p className="om-sig-designation">
                    Faculty Guide / Examiner
                  </p>
                </div>

                <div className="om-sig-block">
                  <div className="om-sig-space"></div>
                  <div className="om-sig-line"></div>
                  <p className="om-sig-name">External Examiner</p>
                  <p className="om-sig-designation">
                    University Examination Panel
                  </p>
                </div>

                <div className="om-sig-block">
                  <div className="om-sig-space"></div>
                  <div className="om-sig-line"></div>
                  <p className="om-sig-name">Head of Department</p>
                  <p className="om-sig-designation">
                    Department of Computer Applications
                  </p>
                </div>
              </div>

              {/* 7. FOOTER NOTE */}
              <div className="om-footer">
                <span>
                  This is an authentic marksheet issued by Sardar Vallabhbhai
                  Global University Examination Authority.
                </span>
                <span>Generated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default GenerateMarksheet;
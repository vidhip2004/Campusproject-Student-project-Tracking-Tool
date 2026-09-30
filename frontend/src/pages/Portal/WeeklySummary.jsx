import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./WeeklySummary.css";
import {
  FaArrowLeft,
  FaDownload,
  FaPrint,
  FaSyncAlt,
  FaFilePdf,
} from "react-icons/fa";
import html2pdf from "html2pdf.js";
import { getStoredStudent, getOrRecoverStudent } from "../../utils/studentSession";

function WeeklySummary() {
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [weeklyList, setWeeklyList] = useState([]);

  // Fixed goals as defined in institutional progress report (Image 2)
  const standardGoals = [
    {
      srNo: 1,
      week: "Week 1",
      goal: "Define Project title, Problem statement, scope and objectives",
    },
    {
      srNo: 2,
      week: "Week 2",
      goal: "Prepare the system design (flowchart, Use Case & Activity diagrams, system architecture)",
    },
    {
      srNo: 3,
      week: "Week 3",
      goal: "Prepare the Sequence & Class diagrams and Data Dictionary",
    },
    {
      srNo: 4,
      week: "Week 4",
      goal: "Design the front-end and implement the core modules",
    },
    {
      srNo: 5,
      week: "Week 5",
      goal: "Complete the project, perform testing, and prepare for the final demonstration.",
    },
    {
      srNo: 6,
      week: "Week 6",
      goal: "Prepare project documentation, presentation, final review, and submission.",
    },
  ];

  // Helper to format date as DD/MM/YY
  const formatDateDDMMYY = (dateStr, fallbackIndex) => {
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yy = String(d.getFullYear()).slice(-2);
          return `${dd}/${mm}/${yy}`;
        }
      } catch (e) {}
    }
    // Fallback: estimate based on current academic semester
    const base = new Date();
    base.setDate(base.getDate() - (6 - fallbackIndex) * 7);
    const dd = String(base.getDate()).padStart(2, "0");
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const yy = String(base.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };

  const loadAllData = async () => {
    setLoading(true);
    let st = getStoredStudent();
    if (!st || !st.id) {
      st = await getOrRecoverStudent();
    }

    const activeId =
      st?.id ||
      st?.studentId ||
      st?.Id ||
      localStorage.getItem("studentId") ||
      sessionStorage.getItem("studentId");

    setStudent(st);

    if (activeId) {
      // 1. Fetch Proposal for Project & Member details
      try {
        const propRes = await fetch(`http://localhost:8081/proposal/student/${activeId}`);
        if (propRes.ok) {
          const propData = await propRes.json();
          if (propData) {
            setProposal(propData);
          }
        }
      } catch (err) {
        console.warn("Could not fetch proposal:", err);
      }

      // 2. Fetch Weekly Progress
      try {
        const res = await fetch(
          `http://localhost:8081/api/weekly-progress/student/${activeId}?requestingStudentId=${activeId}`,
          {
            headers: {
              "X-Student-Id": String(activeId),
            },
          }
        );
        if (res.ok) {
          const list = await res.json();
          setWeeklyList(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.warn("Could not fetch weekly progress:", err);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  // Proper PDF Download via html2pdf.js (Strictly 2 Pages, No Blank Pages)
  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    setDownloading(true);

    const element = pdfRef.current;
    // Activate PDF export mode to remove screen gaps/shadows
    element.classList.add("pdf-export-mode");

    const filename = `${(proposal?.projectTitle || "Project").replace(/\s+/g, "_")}_Progress_Report.pdf`;

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        windowWidth: 794,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css"] },
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback to print
      window.print();
    } finally {
      element.classList.remove("pdf-export-mode");
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group members array (Member 1 is primary student, Members 2 & 3 from proposal)
  const groupMembers = [
    {
      srNo: 1,
      enrollmentNo: student?.enrollmentNo || "45",
      name: student?.fullName || "dishika patel",
      email: student?.email || "umaretiyavidhi1234@gmail.com",
      mobileNo: student?.mobileNo || "8780642473",
      sign: "✍️",
    },
    {
      srNo: 2,
      enrollmentNo: proposal?.member2Enrollment || "46",
      name: proposal?.member2Name || "priya",
      email: proposal?.member2Email || (proposal?.member2Name ? `${proposal.member2Name.toLowerCase().replace(/\s+/g, "")}@gmail.com` : ""),
      mobileNo: proposal?.member2Mobile || "9876543210",
      sign: proposal?.member2Name ? "✍️" : "",
    },
    {
      srNo: 3,
      enrollmentNo: proposal?.member3Enrollment || "47",
      name: proposal?.member3Name || "het",
      email: proposal?.member3Email || (proposal?.member3Name ? `${proposal.member3Name.toLowerCase().replace(/\s+/g, "")}@gmail.com` : ""),
      mobileNo: proposal?.member3Mobile || "9876543211",
      sign: proposal?.member3Name ? "✍️" : "",
    },
  ];

  const groupNo = proposal?.proposalId ? `GRP-${proposal.proposalId}` : "GRP-01";
  const projectTitle = proposal?.projectTitle || student?.projectTitle || "event management";
  const technologyStack = proposal?.technologyStack || "React.js, Spring Boot, MySQL";
  const guideName = proposal?.guideName || "Disha Patel";

  return (
    <div className="weekly-summary-page">
      {/* Top Navigation & Action Bar (Hidden in Print) */}
      <div className="summary-nav-header no-print">
        <div className="summary-breadcrumbs">
          <Link to="/student-portal/weekly-progress" className="back-link">
            <FaArrowLeft /> Back to Weekly Progress
          </Link>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Project Progress Report</span>
        </div>

        <div className="summary-top-actions">
          <button
            type="button"
            className="action-btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh latest data"
          >
            <FaSyncAlt className={refreshing ? "spin-icon" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="action-btn-primary download-btn"
            onClick={handleDownloadPDF}
            disabled={downloading}
            title="Download report in proper PDF format"
          >
            <FaDownload />
            <span>{downloading ? "Generating PDF..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            className="action-btn-primary print-btn"
            onClick={handlePrint}
            title="Print or Save as PDF via browser"
          >
            <FaPrint />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="summary-loading-container">
          <div className="summary-spinner"></div>
          <p>Loading Project Progress Report...</p>
        </div>
      ) : (
        /* The Official Document Container formatted for A4 PDF */
        <div className="pdf-document-wrapper" id="pdf-report-document" ref={pdfRef}>
          {/* ========================================================
              PAGE 1: PROJECT INFORMATION & GROUP MEMBER DETAILS
             ======================================================== */}
          <div className="pdf-page pdf-page-1">
            {/* Watermark */}
            <div className="pdf-watermark-overlay">
              <div className="watermark-emblem">
                <svg viewBox="0 0 100 100" className="watermark-svg">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                  <path d="M50 20 L50 80 M25 50 L75 50" stroke="#dc2626" strokeWidth="2" />
                  <polygon points="50,22 57,38 75,38 60,49 66,66 50,55 34,66 40,49 25,38 43,38" fill="#e0e7ff" opacity="0.5" />
                </svg>
              </div>
              <div className="watermark-name-text">
                <span>Sardar Vallabhbhai</span>
                <span>Global University</span>
              </div>
              <div className="watermark-abbr">SVGU</div>
            </div>

            {/* Document Title */}
            <h2 className="report-main-title">Project Progress Report</h2>

            {/* Section 1: PROJECT INFORMATION */}
            <div className="report-section-block">
              <h3 className="section-title-heading">1. PROJECT INFORMATION</h3>

              <div className="info-fields-container">
                <div className="info-line-row">
                  <span className="info-field-label">GROUP NO.:</span>
                  <span className="info-field-value">{groupNo}</span>
                  <div className="info-field-underline"></div>
                </div>

                <div className="info-line-row">
                  <span className="info-field-label">PROJECT TITLE:</span>
                  <span className="info-field-value">{projectTitle}</span>
                  <div className="info-field-underline"></div>
                </div>

                <div className="info-line-row">
                  <span className="info-field-label">TECHNOLOGY STACK:</span>
                  <span className="info-field-value">{technologyStack}</span>
                  <div className="info-field-underline"></div>
                </div>

                <div className="info-line-row">
                  <span className="info-field-label">GUIDE NAME:</span>
                  <span className="info-field-value">{guideName}</span>
                  <div className="info-field-underline"></div>
                </div>
              </div>
            </div>

            {/* Section 2: GROUP MEMBER DETAILS */}
            <div className="report-section-block">
              <h3 className="section-title-heading">2. GROUP MEMBER DETAILS</h3>

              <table className="institutional-table member-details-table">
                <thead>
                  <tr>
                    <th style={{ width: "8%" }}>Sr. No</th>
                    <th style={{ width: "16%" }}>Enrol. No.</th>
                    <th style={{ width: "24%" }}>Name</th>
                    <th style={{ width: "26%" }}>E-mail ID</th>
                    <th style={{ width: "14%" }}>Mobile No.</th>
                    <th style={{ width: "12%" }}>Student Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {groupMembers.map((m) => (
                    <tr key={m.srNo}>
                      <td className="text-center font-bold">{m.srNo}</td>
                      <td className="text-center">{m.enrollmentNo}</td>
                      <td>{m.name}</td>
                      <td>{m.email}</td>
                      <td className="text-center">{m.mobileNo}</td>
                      <td className="text-center sign-mark-cell">
                        {m.name ? <span className="cursive-sign">✍️</span> : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Page 1 Footer */}
            <div className="pdf-page-footer">
              <span>Page <strong>1</strong> of <strong>2</strong></span>
            </div>
          </div>

          {/* ========================================================
              PAGE 2: PROGRESS REPORT (* TOTAL 5 REPORTING SESSIONS - MANDATORY)
             ======================================================== */}
          <div className="pdf-page pdf-page-2">
            {/* Watermark */}
            <div className="pdf-watermark-overlay">
              <div className="watermark-emblem">
                <svg viewBox="0 0 100 100" className="watermark-svg">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#dc2626" strokeWidth="2.5" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#2563eb" strokeWidth="1.5" />
                  <path d="M50 20 L50 80 M25 50 L75 50" stroke="#dc2626" strokeWidth="2" />
                  <polygon points="50,22 57,38 75,38 60,49 66,66 50,55 34,66 40,49 25,38 43,38" fill="#e0e7ff" opacity="0.5" />
                </svg>
              </div>
              <div className="watermark-name-text">
                <span>Sardar Vallabhbhai</span>
                <span>Global University</span>
              </div>
              <div className="watermark-abbr">SVGU</div>
            </div>

            {/* Section 3 Heading */}
            <div className="report-section-block">
              <h3 className="section-title-heading">
                3. PROGRESS REPORT (* TOTAL 5 REPORTING SESSIONS - MANDATORY)
              </h3>

              {/* Progress Table */}
              <table className="institutional-table progress-sessions-table">
                <thead>
                  <tr>
                    <th style={{ width: "6%" }}>Sr.<br />No</th>
                    <th style={{ width: "12%" }}>Reporting Date<br />DD/MM/YY</th>
                    <th style={{ width: "25%" }}>Goal</th>
                    <th style={{ width: "24%" }}>Work Done<br />(Summary)</th>
                    <th style={{ width: "15%" }}>Feedback</th>
                    <th style={{ width: "9%" }}>Reporting Status<br />(On Time/<br />Late/AB)</th>
                    <th style={{ width: "4.5%" }}>Student<br />Sign</th>
                    <th style={{ width: "4.5%" }}>Faculty<br />Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {standardGoals.map((row) => {
                    // Match student submission for this week
                    const submission = weeklyList.find(
                      (item) => (item.week || "").trim().toLowerCase() === row.week.toLowerCase()
                    );

                    const workDoneText = submission?.workCompleted || "";
                    const feedbackText = submission?.facultyFeedback || "";
                    const reportingDate = submission
                      ? formatDateDDMMYY(submission.reviewedAt || submission.createdAt, row.srNo)
                      : "";

                    const reportingStatus = submission ? "On Time" : "";
                    const isApproved = submission?.status === "Approved";
                    const isReviewed = !!submission?.facultyFeedback || isApproved;

                    return (
                      <tr key={row.srNo}>
                        <td className="text-center font-bold">{row.srNo}</td>
                        <td className="text-center date-cell">{reportingDate}</td>
                        <td className="goal-cell-text">{row.goal}</td>
                        <td className="work-cell-text">{workDoneText}</td>
                        <td className="feedback-cell-text">{feedbackText}</td>
                        <td className="text-center status-cell">{reportingStatus}</td>
                        <td className="text-center student-multi-sign-cell">
                          <div className="multi-sign-stack">
                            <span>✍️ 1</span>
                            <span>✍️ 2</span>
                            <span>✍️ 3</span>
                          </div>
                        </td>
                        <td className="text-center faculty-sign-cell">
                          {isReviewed ? <span className="faculty-sign-mark">✍️</span> : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Page 2 Footer */}
            <div className="pdf-page-footer">
              <span>Page <strong>2</strong> of <strong>2</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklySummary;

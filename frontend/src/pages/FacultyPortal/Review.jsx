import { useEffect, useState } from "react";
import axios from "axios";
import "./Review.css";
import PdfModal from "../../components/FileViewer/PdfModal";

function Review() {

  // =====================================================
  // STATES
  // =====================================================

  const [proposals, setProposals] = useState([]);

  const [selectedProposal, setSelectedProposal] = useState(null);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [previewPdfPath, setPreviewPdfPath] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);


  // =====================================================
  // BACKEND API URL & FACULTY INFO
  // =====================================================

  const API_URL = "http://localhost:8081/review-proposal";

  const getFacultyInfo = () => {
    const stored = JSON.parse(localStorage.getItem("faculty")) || JSON.parse(localStorage.getItem("user")) || {};
    return {
      facultyId: stored.facultyId || stored.id || localStorage.getItem("facultyId") || "",
      facultyName: stored.facultyName || stored.name || localStorage.getItem("facultyName") || ""
    };
  };

  // =====================================================
  // GET ALL PROPOSALS
  // =====================================================

  useEffect(() => {

    fetchProposals();

  }, []);


  const fetchProposals = async () => {

    try {

      setLoading(true);
      setError("");

      const { facultyId, facultyName } = getFacultyInfo();

      const response = await axios.get(API_URL, {
        params: {
          facultyId: facultyId || undefined,
          facultyName: facultyName || undefined,
        }
      });

      console.log("Review proposals:", response.data);

      setProposals(response.data);

    } catch (error) {

      console.error(
        "Error fetching review proposals:",
        error
      );

      setError(
        "Unable to load proposals. Please make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }
  };


  // =====================================================
  // VIEW SINGLE PROPOSAL
  // =====================================================

  const handleViewProposal = async (reviewProposalId) => {

    try {

      setError("");
      setModalError("");
      const { facultyId, facultyName } = getFacultyInfo();

      const response = await axios.get(
        `${API_URL}/${reviewProposalId}`,
        {
          params: {
            facultyId: facultyId || undefined,
            facultyName: facultyName || undefined,
          }
        }
      );

      console.log(
        "Selected proposal:",
        response.data
      );

      setSelectedProposal(response.data);
      setFeedback(response.data.comments || "");

    } catch (error) {

      console.error(
        "Error fetching proposal:",
        error
      );

      alert("Unable to load proposal.");

    }
  };


  // =====================================================
  // UPDATE PROPOSAL STATUS
  // =====================================================

  const handleStatusChange = async (
    reviewProposalId,
    status
  ) => {
    if (status === "CHANGES_REQUESTED" && (!feedback || !feedback.trim())) {
      setModalError("Please write the requested changes in the feedback box below before submitting.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setModalError("");
      const { facultyId, facultyName } = getFacultyInfo();

      const response = await axios.put(
        `${API_URL}/${reviewProposalId}/status`,
        {
          status: status,
          comments: feedback ? feedback.trim() : "",
        },
        {
          params: {
            facultyId: facultyId || undefined,
            facultyName: facultyName || undefined,
          }
        }
      );

      console.log("Updated proposal:", response.data);

      // Update proposal in the cards
      setProposals((previousProposals) =>
        previousProposals.map((proposal) =>
          proposal.reviewProposalId ===
          response.data.reviewProposalId
            ? response.data
            : proposal
        )
      );

      // Close the modal automatically
      setSelectedProposal(null);
      setFeedback("");

    } catch (error) {
      console.error(
        "Error updating proposal status:",
        error
      );

      setError(
        error.response?.data?.message ||
        "Unable to update proposal status."
      );
    } finally {
      setSaving(false);
    }
  };


  // =====================================================
  // SEARCH + FILTER
  // =====================================================

  const filteredProposals = proposals.filter(
    (proposal) => {

      const searchText =
        search.toLowerCase().trim();


      const matchSearch =
        proposal.projectTitle
          ?.toLowerCase()
          .includes(searchText) ||

        String(proposal.studentId)
          .includes(searchText);


      const matchFilter =
        filter === "All" ||
        proposal.status === filter;


      return matchSearch && matchFilter;
    }
  );


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="review-page">

        <div className="review-header">

          <h1>
            Project Proposal Review
          </h1>

          <p>
            Loading student proposals...
          </p>

        </div>

      </div>

    );
  }


  // =====================================================
  // MAIN UI
  // =====================================================

  return (

    <div className="review-page">


      {/* =================================================
          HEADER
      ================================================== */}

      <div className="review-header">

        <h1>
          Project Proposal Review
        </h1>

        <p>
          Review, approve or reject student project proposals.
        </p>

      </div>


      {/* =================================================
          ERROR MESSAGE
      ================================================== */}

      {error && (

        <div className="error-message">

          <p>{error}</p>

          <button onClick={fetchProposals}>
            Retry
          </button>

        </div>

      )}


      {/* =================================================
          SEARCH + FILTER
      ================================================== */}

      <div className="review-toolbar">

        <input
          type="text"
          placeholder="Search Student / Project..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />


        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        >

          <option value="All">
            All
          </option>

          <option value="PENDING">
            Pending
          </option>

          <option value="APPROVED">
            Approved
          </option>

          <option value="REJECTED">
            Rejected
          </option>

          <option value="CHANGES_REQUESTED">
            Request Changes
          </option>

        </select>

      </div>


      {/* =================================================
          PROPOSAL GRID
      ================================================== */}

      <div className="proposal-grid">

        {filteredProposals.length === 0 ? (

          <p>
            No proposals found.
          </p>

        ) : (

          filteredProposals.map((proposal) => (

            <div
              className="proposal-card"
              key={proposal.reviewProposalId}
            >


              {/* =========================================
                  CARD TOP
              ========================================== */}

              <div className="proposal-top">

                <h3>
                  {proposal.projectTitle}
                </h3>


                <span
                  className={`status ${proposal.status
                    ?.toLowerCase()
                    .replace("_", "-")}`}
                >

                  {proposal.status === "CHANGES_REQUESTED"
                    ? "Request Changes"
                    : proposal.status}

                </span>

              </div>


              {/* =========================================
                  STUDENT
              ========================================== */}

              <p>

                <strong>
                  Student :
                </strong>{" "}

                {proposal.studentId}

              </p>


              {/* =========================================
                  DOMAIN
              ========================================== */}

              <p>

                <strong>
                  Domain :
                </strong>{" "}

                {proposal.projectDomain}

              </p>


              {/* =========================================
                  TECHNOLOGY
              ========================================== */}

              <p>

                <strong>
                  Technology :
                </strong>{" "}

                {proposal.technologyStack}

              </p>


              {/* =========================================
                  VIEW BUTTON
              ========================================== */}

              <button
                className="view-btn"
                onClick={() =>
                  handleViewProposal(
                    proposal.reviewProposalId
                  )
                }
              >

                View Proposal

              </button>

            </div>

          ))

        )}

      </div>


      {/* =================================================
          PROPOSAL REVIEW MODAL
      ================================================== */}

      {selectedProposal && (
        <div className="proposal-modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="proposal-modal-card" onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="proposal-modal-header">
              <div>
                <h2>{selectedProposal.projectTitle}</h2>
                <p>Project Proposal Review</p>
              </div>
              <button
                type="button"
                className="modal-x-btn"
                onClick={() => setSelectedProposal(null)}
                disabled={saving}
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="proposal-modal-body">

              {/* Quick Info Grid (Rectangular Stat Cards) */}
              <div className="proposal-meta-grid">
                <div className="meta-card">
                  <span className="meta-label">Student ID</span>
                  <strong className="meta-value">{selectedProposal.studentId}</strong>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Domain</span>
                  <strong className="meta-value">{selectedProposal.projectDomain || "-"}</strong>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Technology Stack</span>
                  <div className="tech-tags-wrap">
                    {selectedProposal.technologyStack ? (
                      selectedProposal.technologyStack.split(",").map((tech, i) => (
                        <span key={i} className="tech-tag-pill">{tech.trim()}</span>
                      ))
                    ) : (
                      "-"
                    )}
                    {selectedProposal.otherTechnology && (
                      <span className="tech-tag-pill other-tech">{selectedProposal.otherTechnology}</span>
                    )}
                  </div>
                </div>

                <div className="meta-card">
                  <span className="meta-label">Current Status</span>
                  <div>
                    <span className={`status-pill ${
                      selectedProposal.status === "APPROVED"
                        ? "status-approved"
                        : selectedProposal.status === "REJECTED"
                        ? "status-rejected"
                        : selectedProposal.status === "CHANGES_REQUESTED"
                        ? "status-changes"
                        : "status-pending"
                    }`}>
                      {selectedProposal.status === "CHANGES_REQUESTED"
                        ? "Changes Requested"
                        : selectedProposal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team Members if present */}
              {(selectedProposal.member2Name || selectedProposal.member3Name) && (
                <div className="proposal-detail-section">
                  <div className="section-label">Team Members</div>
                  <div className="members-box">
                    {selectedProposal.member2Name && (
                      <div className="member-row">
                        <span className="member-badge">Member 2</span>
                        <strong>{selectedProposal.member2Name}</strong>
                        {selectedProposal.member2Enrollment && (
                          <span className="enroll-badge">({selectedProposal.member2Enrollment})</span>
                        )}
                      </div>
                    )}
                    {selectedProposal.member3Name && (
                      <div className="member-row">
                        <span className="member-badge">Member 3</span>
                        <strong>{selectedProposal.member3Name}</strong>
                        {selectedProposal.member3Enrollment && (
                          <span className="enroll-badge">({selectedProposal.member3Enrollment})</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Project Description */}
              <div className="proposal-detail-section">
                <div className="section-label">Project Description</div>
                <div className="proposal-content-box description-box">
                  {selectedProposal.projectDescription || "No description provided."}
                </div>
              </div>

              {/* Proposal Document */}
              <div className="proposal-detail-section">
                <div className="section-label">Proposal Document (PDF)</div>
                <div className="proposal-content-box">
                  <div className="file-box-inner">
                    <div className="file-info-col">
                      <span style={{ fontSize: "18px" }}>📄</span>
                      <span>
                        {selectedProposal.proposalFile
                          ? selectedProposal.proposalFile.split("/").pop().split("\\").pop()
                          : "No file attached"}
                      </span>
                    </div>

                    {selectedProposal.proposalFile && (
                      <div className="file-action-buttons">
                        <button
                          type="button"
                          className="btn-view-pdf"
                          onClick={() => setPreviewPdfPath(selectedProposal.proposalFile)}
                        >
                          👁 View Proposal PDF
                        </button>
                        <a
                          href={`http://localhost:8081/api/files/download?path=${encodeURIComponent(
                            selectedProposal.proposalFile
                          )}&facultyId=${getFacultyInfo().facultyId}&facultyName=${encodeURIComponent(
                            getFacultyInfo().facultyName
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-download-pdf"
                        >
                          ⬇ Download PDF
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Faculty Feedback & Requested Changes Textbox */}
              <div className="proposal-detail-section">
                <div className="section-label">
                  Faculty Feedback & Requested Changes{" "}
                  <span className="feedback-hint">(Required when clicking "Request Changes")</span>
                </div>
                {modalError && (
                  <div style={{ padding: "10px 14px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", color: "#991b1b", fontSize: "13.5px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⚠️</span>
                    <span>{modalError}</span>
                  </div>
                )}
                <textarea
                  className="proposal-feedback-textarea"
                  placeholder="Write your feedback or specific changes required for the student..."
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (modalError) setModalError("");
                  }}
                  disabled={saving}
                  rows={4}
                />
              </div>

            </div>

            {/* Modal Sticky Footer */}
            <div className="proposal-modal-footer">
              <button
                type="button"
                className="btn-approve"
                onClick={() =>
                  handleStatusChange(
                    selectedProposal.reviewProposalId,
                    "APPROVED"
                  )
                }
                disabled={saving || selectedProposal.status === "APPROVED"}
              >
                ✓ Approve
              </button>

              <button
                type="button"
                className="btn-reject"
                onClick={() =>
                  handleStatusChange(
                    selectedProposal.reviewProposalId,
                    "REJECTED"
                  )
                }
                disabled={saving || selectedProposal.status === "REJECTED"}
              >
                ✕ Reject
              </button>

              <button
                type="button"
                className="btn-request-changes"
                onClick={() =>
                  handleStatusChange(
                    selectedProposal.reviewProposalId,
                    "CHANGES_REQUESTED"
                  )
                }
                disabled={saving}
              >
                ✎ Request Changes
              </button>

              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSelectedProposal(null)}
                disabled={saving}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* PDF PREVIEW MODAL */}
      {/* ================================================= */}
      {previewPdfPath && (
        <PdfModal
          filePath={previewPdfPath}
          title="Project Proposal Preview"
          facultyId={getFacultyInfo().facultyId}
          facultyName={getFacultyInfo().facultyName}
          onClose={() => setPreviewPdfPath(null)}
        />
      )}

    </div>

  );
}

export default Review;
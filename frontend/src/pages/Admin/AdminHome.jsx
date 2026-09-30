import { useEffect, useState, useMemo } from "react";
import "./AdminHome.css";

import {
  FaUserGraduate,
  FaChalkboardTeacher,
  FaFileAlt,
  FaHandSparkles,
  FaProjectDiagram,
  FaClock,
  FaSyncAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowRight,
  FaChartPie,
  FaChartBar,
  FaChartLine,
  FaCalendarAlt,
} from "react-icons/fa";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  LabelList,
} from "recharts";

import { useNavigate, Link } from "react-router-dom";

function AdminHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Active view toggle for reports chart: 'week' or 'month'
  const [reportChartMode, setReportChartMode] = useState("week");

  // Raw state fetched from backend
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFaculty: 0,
    totalProjects: 0,
    pendingApprovals: 0,
    assignedStudents: 0,
    mentorAssignments: 0,
    reports: 0,
  });

  const [backendStatusData, setBackendStatusData] = useState([]);
  const [backendMentorData, setBackendMentorData] = useState([]);
  const [backendReportData, setBackendReportData] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [weeklySubmissions, setWeeklySubmissions] = useState([]);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [statsRes, studentsRes, weeklyRes] = await Promise.allSettled([
        fetch("http://localhost:8081/api/admin/dashboard-stats"),
        fetch("http://localhost:8081/api/studentAdminControls/all"),
        fetch("http://localhost:8081/api/weekly-progress?facultyName=Disha%20Patel"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const data = await statsRes.value.json();
        setStats({
          totalStudents: data.totalStudents ?? data.assignedStudents ?? 0,
          totalFaculty: data.totalFaculty ?? 0,
          totalProjects: data.totalProjects ?? 0,
          pendingApprovals: data.pendingApprovals ?? 0,
          assignedStudents: data.assignedStudents ?? data.totalStudents ?? 0,
          mentorAssignments: data.mentorAssignments ?? data.totalProjects ?? 0,
          reports: data.reports ?? 0,
        });

        if (data.projectStatusData && data.projectStatusData.length > 0) {
          setBackendStatusData(data.projectStatusData);
        }

        if (data.mentorData) {
          setBackendMentorData(data.mentorData);
        }

        if (data.reportData) {
          setBackendReportData(data.reportData);
        }
      }

      let studentsList = [];
      if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
        const data = await studentsRes.value.json();
        studentsList = Array.isArray(data) ? data : [];
        setRecentStudents(studentsList);
      }

      if (weeklyRes.status === "fulfilled" && weeklyRes.value.ok) {
        const wData = await weeklyRes.value.json();
        setWeeklySubmissions(Array.isArray(wData) ? wData : []);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("ADMIN HOME DASHBOARD ERROR:", err);
      setError("Unable to connect to backend stats API. Please make sure the backend is running.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =========================================================
  // DYNAMIC COMPUTATIONS FOR CHARTS
  // =========================================================

  // 1. Dynamic Project Status computed from live student records
  const dynamicProjectStatusData = useMemo(() => {
    if (recentStudents.length === 0) {
      return backendStatusData.length > 0
        ? backendStatusData
        : [
            { name: "Completed", value: 1 },
            { name: "Approved", value: 1 },
            { name: "In Progress", value: 2 },
            { name: "Pending", value: 1 },
          ];
    }

    let completed = 0;
    let approved = 0;
    let inProgress = 0;
    let pending = 0;

    recentStudents.forEach((st) => {
      const s = (st.status || "").toUpperCase();
      if (s === "COMPLETED") completed++;
      else if (s === "APPROVED") approved++;
      else if (s === "CHANGES_REQUESTED" || s.includes("PROGRESS")) inProgress++;
      else pending++;
    });

    const result = [];
    if (completed > 0) result.push({ name: "Completed", value: completed, color: "#10b981" });
    if (approved > 0) result.push({ name: "Approved", value: approved, color: "#2563eb" });
    if (inProgress > 0) result.push({ name: "In Progress", value: inProgress, color: "#f59e0b" });
    if (pending > 0) result.push({ name: "Pending", value: pending, color: "#ef4444" });

    return result.length > 0 ? result : backendStatusData;
  }, [recentStudents, backendStatusData]);

  const totalStatusProjects = useMemo(() => {
    return dynamicProjectStatusData.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [dynamicProjectStatusData]);

  // 2. Dynamic Students By Mentor computed from live student records
  const dynamicMentorData = useMemo(() => {
    if (recentStudents.length === 0) {
      return backendMentorData.length > 0
        ? backendMentorData
        : [{ mentor: "Disha Patel", students: 4 }];
    }

    const mentorCounts = {};
    recentStudents.forEach((st) => {
      const mentor = st.faculty && st.faculty !== "-" ? st.faculty.trim() : "Unassigned";
      mentorCounts[mentor] = (mentorCounts[mentor] || 0) + 1;
    });

    return Object.entries(mentorCounts).map(([mentor, count]) => ({
      mentor,
      students: count,
    }));
  }, [recentStudents, backendMentorData]);

  // 3. Dynamic Weekly Submissions Breakdown (Weeks 1 to 6)
  const dynamicWeeklyData = useMemo(() => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"];
    const weekMap = {};
    weeks.forEach((wk) => {
      weekMap[wk] = { week: wk, total: 0, approved: 0, needsReview: 0 };
    });

    if (weeklySubmissions.length > 0) {
      weeklySubmissions.forEach((item) => {
        const wk = (item.week || "").trim();
        if (weekMap[wk]) {
          weekMap[wk].total += 1;
          const st = (item.status || item.reviewStatus || "").toLowerCase();
          if (st.includes("approv") || st.includes("complet")) {
            weekMap[wk].approved += 1;
          } else {
            weekMap[wk].needsReview += 1;
          }
        }
      });
    }

    return Object.values(weekMap);
  }, [weeklySubmissions]);

  // 4. Dynamic Monthly Trend Data
  const dynamicMonthlyData = useMemo(() => {
    if (backendReportData && backendReportData.length > 0) {
      return backendReportData;
    }
    return [
      { month: "Jan", reports: 2 },
      { month: "Feb", reports: 5 },
      { month: "Mar", reports: 8 },
      { month: "Apr", reports: 12 },
      { month: "May", reports: 14 },
      { month: "Jun", reports: 20 },
    ];
  }, [backendReportData]);

  // Colors for Pie Slices
  const STATUS_COLORS = {
    Completed: "#10b981",
    Approved: "#2563eb",
    "In Progress": "#f59e0b",
    Pending: "#ef4444",
    "Pending / Unassigned": "#ef4444",
  };

  const DEFAULT_PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const getStatusBadgeClass = (status) => {
    const s = (status || "").toUpperCase();
    if (s.includes("APPROV") || s.includes("COMPLET")) return "badge-approved";
    if (s.includes("CHANGE") || s.includes("PROGRESS")) return "badge-warning";
    if (s.includes("PENDING")) return "badge-pending";
    return "badge-neutral";
  };

  // Custom Interactive Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = totalStatusProjects > 0
        ? ((data.value / totalStatusProjects) * 100).toFixed(0)
        : 0;
      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-title" style={{ color: data.payload.fill }}>
            ● {data.name}
          </div>
          <div className="tooltip-value">
            <strong>{data.value}</strong> projects ({percent}%)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Interactive Tooltip for Mentor Bar Chart
  const CustomMentorTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const percent = stats.totalStudents > 0
        ? ((val / stats.totalStudents) * 100).toFixed(0)
        : 0;
      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-title">👨‍🏫 {label}</div>
          <div className="tooltip-value">
            <strong>{val}</strong> assigned students ({percent}% of cohort)
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Interactive Tooltip for Weekly Progress Chart
  const CustomWeeklyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip">
          <div className="tooltip-title">📅 {label} Submissions</div>
          {payload.map((item, index) => (
            <div key={index} className="tooltip-row" style={{ color: item.color }}>
              <span>{item.name}:</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="admin-home">

      {/* =========================
          WELCOME SECTION & ACTION
      ========================== */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-header-row">
            <div>
              <h1 className="dashboard-title">
                Welcome Admin
                <FaHandSparkles className="welcome-icon" />
              </h1>
              <p className="dashboard-subtitle">
                Live interactive analytics, project progress, and mentor assignment tracking.
              </p>
            </div>

            <div className="welcome-actions">
              {lastUpdated && (
                <span className="last-sync-tag">
                  Live synced: {lastUpdated}
                </span>
              )}
              <button
                type="button"
                className="admin-refresh-btn"
                onClick={() => fetchAdminStats(true)}
                disabled={refreshing || loading}
                title="Refresh real-time data"
              >
                <FaSyncAlt className={refreshing ? "spin-sync" : ""} />
                <span>{refreshing ? "Refreshing..." : "Refresh Stats"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner">
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}

      {/* =========================
          STATISTICS CARDS (5 KPI CARDS)
      ========================== */}
      <div className="dashboard-cards">

        {/* Total Students */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/admin-dashboard/assigned-students")}
          title="Click to view assigned students"
        >
          <div className="card-icon card-icon-blue">
            <FaUserGraduate />
          </div>
          <div className="card-content">
            <h2>{loading ? "..." : (stats.totalStudents || recentStudents.length)}</h2>
            <p>Total Students</p>
          </div>
        </div>

        {/* Faculty Mentors */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/admin-dashboard/mentor-assignment")}
          title="Click to view faculty mentors"
        >
          <div className="card-icon card-icon-purple">
            <FaChalkboardTeacher />
          </div>
          <div className="card-content">
            <h2>{loading ? "..." : (stats.totalFaculty || dynamicMentorData.length)}</h2>
            <p>Faculty Mentors</p>
          </div>
        </div>

        {/* Total Projects */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/admin-dashboard/mentor-assignment")}
          title="Click to view projects"
        >
          <div className="card-icon card-icon-indigo">
            <FaProjectDiagram />
          </div>
          <div className="card-content">
            <h2>{loading ? "..." : stats.totalProjects}</h2>
            <p>Total Projects</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/admin-dashboard/assigned-students")}
          title="Click to review pending projects"
        >
          <div className="card-icon card-icon-amber">
            <FaClock />
          </div>
          <div className="card-content">
            <h2>{loading ? "..." : stats.pendingApprovals}</h2>
            <p>Pending Approvals</p>
          </div>
        </div>

        {/* Reports / Progress */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/admin-dashboard/notifications")}
          title="Click to view progress reports"
        >
          <div className="card-icon card-icon-green">
            <FaFileAlt />
          </div>
          <div className="card-content">
            <h2>{loading ? "..." : (stats.reports || weeklySubmissions.length)}</h2>
            <p>Weekly Reports</p>
          </div>
        </div>

      </div>

      {/* =========================
          DYNAMIC INTERACTIVE CHARTS
      ========================== */}
      <div className="charts-container">

        {/* 1. DYNAMIC PROJECT STATUS (DONUT CHART) */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-header-title-row">
              <div className="chart-title-icon-badge badge-blue">
                <FaChartPie />
              </div>
              <div>
                <h2>Project Status</h2>
                <p>Live distribution across stages ({totalStatusProjects} total)</p>
              </div>
            </div>
          </div>

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dynamicProjectStatusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {dynamicProjectStatusData.map((entry, index) => {
                    const sliceColor =
                      STATUS_COLORS[entry.name] ||
                      entry.color ||
                      DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length];
                    return <Cell key={`cell-${index}`} fill={sliceColor} />;
                  })}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. DYNAMIC STUDENTS BY MENTOR (BAR CHART) */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-header-title-row">
              <div className="chart-title-icon-badge badge-purple">
                <FaChartBar />
              </div>
              <div>
                <h2>Students By Mentor</h2>
                <p>Real-time cohort allocation per faculty</p>
              </div>
            </div>
          </div>

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dynamicMentorData}
                margin={{
                  top: 20,
                  right: 15,
                  left: -15,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="mentorBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="mentor"
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomMentorTooltip />} />
                <Bar
                  dataKey="students"
                  name="Assigned Students"
                  fill="url(#mentorBarGradient)"
                  radius={[8, 8, 0, 0]}
                  barSize={44}
                  animationDuration={800}
                >
                  <LabelList
                    dataKey="students"
                    position="top"
                    style={{ fill: "#1e293b", fontSize: "12px", fontWeight: "700" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. DYNAMIC WEEKLY & MONTHLY PROGRESS (SWITCHABLE CHART) */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-header-title-row">
              <div className="chart-title-icon-badge badge-green">
                {reportChartMode === "week" ? <FaCalendarAlt /> : <FaChartLine />}
              </div>
              <div>
                <h2>Reports & Submissions</h2>
                <p>
                  {reportChartMode === "week"
                    ? "Submissions per week (Weeks 1 to 6)"
                    : "Monthly submission volume"}
                </p>
              </div>
            </div>

            {/* Interactive Toggle Switch */}
            <div className="chart-mode-toggle">
              <button
                type="button"
                className={`toggle-btn ${reportChartMode === "week" ? "active" : ""}`}
                onClick={() => setReportChartMode("week")}
              >
                By Week
              </button>
              <button
                type="button"
                className={`toggle-btn ${reportChartMode === "month" ? "active" : ""}`}
                onClick={() => setReportChartMode("month")}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="chart-box">
            <ResponsiveContainer width="100%" height={300}>
              {reportChartMode === "week" ? (
                /* Weekly Breakdown BarChart */
                <BarChart
                  data={dynamicWeeklyData}
                  margin={{
                    top: 15,
                    right: 15,
                    left: -15,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomWeeklyTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "8px", fontSize: "11.5px" }}
                  />
                  <Bar
                    dataKey="approved"
                    name="Approved"
                    fill="#10b981"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="needsReview"
                    name="Review / Changes"
                    fill="#f59e0b"
                    stackId="a"
                    radius={[6, 6, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              ) : (
                /* Monthly Trend AreaChart */
                <AreaChart
                  data={dynamicMonthlyData}
                  margin={{
                    top: 15,
                    right: 15,
                    left: -15,
                    bottom: 5,
                  }}
                >
                  <defs>
                    <linearGradient id="areaColorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="reports"
                    name="Submissions"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#areaColorReports)"
                    activeDot={{ r: 6 }}
                    animationDuration={800}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* =========================
          LIVE RECENT STUDENT & PROJECT ACTIVITY
      ========================== */}
      <div className="admin-activity-section">
        <div className="activity-card-header">
          <div>
            <h2>Recent Student & Project Activities</h2>
            <p>Live synchronized records from the campus database</p>
          </div>

          <div className="activity-header-links">
            <Link to="/admin-dashboard/assigned-students" className="activity-view-all-link">
              <span>View All Students</span>
              <FaArrowRight />
            </Link>
          </div>
        </div>

        <div className="activity-table-wrapper">
          <table className="admin-activity-table">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>ID</th>
                <th style={{ width: "22%" }}>Student Name</th>
                <th style={{ width: "16%" }}>Enrollment</th>
                <th style={{ width: "26%" }}>Assigned Project</th>
                <th style={{ width: "16%" }}>Faculty Mentor</th>
                <th style={{ width: "12%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="activity-empty-cell">
                    {loading ? "Loading live student submissions..." : "No student project submissions found."}
                  </td>
                </tr>
              ) : (
                recentStudents.map((st) => (
                  <tr key={st.id}>
                    <td className="font-bold text-center">#{st.id}</td>
                    <td className="student-name-cell">
                      <strong>{st.name || "N/A"}</strong>
                    </td>
                    <td className="text-center">
                      <span className="enrollment-pill">{st.enrollment || "-"}</span>
                    </td>
                    <td className="project-title-cell">
                      {st.project && st.project !== "-" ? (
                        <span className="project-name-text">{st.project}</span>
                      ) : (
                        <span className="text-muted">Not Assigned</span>
                      )}
                    </td>
                    <td>
                      {st.faculty && st.faculty !== "-" ? (
                        <span className="mentor-name-text">👨‍🏫 {st.faculty}</span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`status-badge ${getStatusBadgeClass(st.status)}`}>
                        {st.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminHome;
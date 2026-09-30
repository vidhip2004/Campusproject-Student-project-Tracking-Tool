import { NavLink } from "react-router-dom";
import "./Sidebar.css";

import {
  FaUniversity,
  FaHome,
  FaUser,
  FaFileAlt,
  FaCalendarAlt,
  FaClipboardList,
  FaFolderOpen,
  FaAward,
  FaBell,
  FaSignOutAlt,
} from "react-icons/fa";

function Sidebar({ sidebarOpen }) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : "close"}`}>

      {/* Logo / Brand */}
<div className="stu-sidebar-header">

  

  <div className="sidebar-logo">
  <FaUniversity className="project-logo-icon" />
  <span>CampusProject</span>
</div>

</div>

      {/* Navigation */}
      <nav className="stu-sidebar-menu">

        <NavLink
          to="/student-portal"
          end
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaHome />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/student-portal/profile"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaUser />
          <span>My Profile</span>
        </NavLink>

        <NavLink
          to="/student-portal/proposal"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaFileAlt />
          <span>Submit Proposal</span>
        </NavLink>

        <NavLink
          to="/student-portal/weekly-progress"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaCalendarAlt />
          <span>Weekly Progress</span>
        </NavLink>

        <NavLink
          to="/student-portal/weekly-summary"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaClipboardList />
          <span>Weekly Summary</span>
        </NavLink>

        <NavLink
          to="/student-portal/final-submission"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaFolderOpen />
          <span>Final Submission</span>
        </NavLink>

        <NavLink
          to="/student-portal/marks"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaAward />
          <span>My Marks</span>
        </NavLink>

        <NavLink
          to="/student-portal/notification"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <FaBell />
          <span>Notifications</span>
        </NavLink>

      </nav>

      {/* Logout */}
      <div className="stu-logout-area">
        <NavLink to="/">
          <FaSignOutAlt />
          <span>Logout</span>
        </NavLink>
      </div>

    </aside>
  );
}

export default Sidebar;
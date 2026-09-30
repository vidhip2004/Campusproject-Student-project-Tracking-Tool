import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Services from "./pages/Services/Services";
import FacultyCommentSection from "./pages/FacultyPortal/FacultyCommentSection";

// ================= STUDENT =================
import StudentRegister from "./pages/Student/StudentRegister";
import StudentLogin from "./pages/Student/StudentLogin";

import StudentPortal from "./pages/Portal/StudentPortal";
import Dashboard from "./pages/Portal/Dashboard";
import Profile from "./pages/Portal/Profile";
import SubmitProposal from "./pages/Portal/SubmitProposal";
import WeeklyProgress from "./pages/Portal/WeeklyProgress";
import WeeklySummary from "./pages/Portal/WeeklySummary";
import FinalSubmission from "./pages/Portal/FinalSubmission";
import Marks from "./pages/Portal/Marks";
import Notifications from "./pages/Portal/Notifications";

// ================= ADMIN =================
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminLayout from "./layouts/AdminLayout";
import AdminHome from "./pages/Admin/AdminHome";
import AssignedStudents from "./pages/Admin/AssignedStudents";
import AssignedFaculty from "./pages/Admin/AssignedFaculty";
import MentorAssignment from "./pages/Admin/MentorAssignment";
import FacultyStudentAllocation from "./pages/Admin/FacultyStudentAllocation";
import ForgotPassword from "./pages/Admin/ForgotPassword";

// ================= FACULTY =================
import FacultyLogin from "./pages/Faculty/FacultyLogin";
import FacultyRegister from "./pages/Faculty/FacultyRegister";

import FacultyPortal from "./pages/FacultyPortal/FacultyPortal";
import FacultyDashboard from "./pages/FacultyPortal/FacultyDashboard";
import AssignedStudentToFaculty from "./pages/FacultyPortal/AssignedStudentToFaculty";
// import FacultyCommentSection from "./pages/FacultyPortal/FacultyCommentSection";
import FacultyNotifications from "./pages/FacultyPortal/FacultyNotifications";
import GenerateMarksheet from "./pages/FacultyPortal/GenerateMarksheet";
import MarkManagement from "./pages/FacultyPortal/MarkManagement";
import Review from "./pages/FacultyPortal/Review";
import WeeklyReview from "./pages/FacultyPortal/WeeklyReview";
import FinalSubmissionReview from "./pages/FacultyPortal/FinalSubmissionReview";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =====================================================
            PUBLIC PAGES
        ===================================================== */}

        <Route path="/" element={<Home />} />

        <Route path="/about" element={<About />} />

        <Route path="/services" element={<Services />} />

        <Route path="/faculty/comments" element={<FacultyCommentSection />} />

        {/* =====================================================
            STUDENT AUTHENTICATION
        ===================================================== */}

        <Route path="/student-register" element={<StudentRegister />} />

        <Route path="/student-login" element={<StudentLogin />} />

        <Route path="/register" element={<StudentRegister />} />

        {/* =====================================================
            STUDENT PORTAL
        ===================================================== */}

        <Route path="/student-portal" element={<StudentPortal />}>
          {/* Student Dashboard */}
          <Route index element={<Dashboard />} />

          {/* Profile */}
          <Route path="profile" element={<Profile />} />

          {/* Submit Proposal */}
          <Route path="proposal" element={<SubmitProposal />} />

          {/* Weekly Progress */}
          <Route path="weekly-progress" element={<WeeklyProgress />} />

          {/* Weekly Summary */}
          <Route path="weekly-summary" element={<WeeklySummary />} />

          {/* Final Submission */}
          <Route path="final-submission" element={<FinalSubmission />} />

          {/* Marks */}
          <Route path="marks" element={<Marks />} />

          {/* Notifications */}
          <Route path="notification" element={<Notifications />} />
        </Route>

        {/* =====================================================
            ADMIN AUTHENTICATION
        ===================================================== */}

        <Route path="/admin-login" element={<AdminLogin />} />

        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* =====================================================
            ADMIN PORTAL
        ===================================================== */}

        <Route path="/admin-dashboard" element={<AdminLayout />}>
          {/* Admin Dashboard */}
          <Route index element={<AdminHome />} />

          {/* Student Management */}
          <Route path="assigned-students" element={<AssignedStudents />} />

          {/* Faculty Management */}
          <Route path="assigned-faculty" element={<AssignedFaculty />} />

          {/* Mentor Assignment */}
          <Route path="mentor-assignment" element={<MentorAssignment />} />

          {/* Reports */}
          <Route path="notifications" element={<FacultyStudentAllocation />} />
        </Route>

        {/* =====================================================
            FACULTY AUTHENTICATION
        ===================================================== */}

        <Route path="/faculty-login" element={<FacultyLogin />} />

        <Route path="/faculty-register" element={<FacultyRegister />} />

        {/* =====================================================
            FACULTY PORTAL
        ===================================================== */}

        <Route path="/faculty-portal" element={<FacultyPortal />}>
          {/* Faculty Dashboard */}
          <Route path="faculty-dashboard" element={<FacultyDashboard />} /> *
          <Route index element={<FacultyDashboard />} />
          {/* Assigned Students */}
          <Route
            path="assigned-students"
            element={<AssignedStudentToFaculty />}
          />
          {/* Faculty Comments */}
          {/* Faculty Comments */}
          <Route path="comments" element={<FacultyCommentSection />} />
          {/* Notifications */}
          <Route path="notifications" element={<FacultyNotifications />} />
          {/* Generate Marksheet */}
          <Route path="generate-marksheet" element={<GenerateMarksheet />} />
          {/* Mark Management */}
          <Route path="mark-management" element={<MarkManagement />} />
          {/* Review */}
          <Route path="review" element={<Review />} />
          {/* Weekly Review */}
          <Route path="weekly-review" element={<WeeklyReview />} />
          {/* Final Submissions */}
          <Route path="final-submissions" element={<FinalSubmissionReview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

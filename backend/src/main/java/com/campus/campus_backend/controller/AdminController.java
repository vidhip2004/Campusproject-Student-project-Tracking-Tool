package com.campus.campus_backend.controller;

import com.campus.campus_backend.dto.adminLogin.*;
import com.campus.campus_backend.service.AdminService;
import com.campus.campus_backend.dto.dashboard.AdminDashboardDTO;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final AdminService adminService;
    private final StudentRepository studentRepository;
    private final FacultyRepository facultyRepository;
    private final SubmitProposalRepository submitProposalRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final WeeklyProgressRepository weeklyProgressRepository;
    private final WeeklyReviewRepository weeklyReviewRepository;

    public AdminController(
            AdminService adminService,
            StudentRepository studentRepository,
            FacultyRepository facultyRepository,
            SubmitProposalRepository submitProposalRepository,
            MentorAssignmentRepository mentorAssignmentRepository,
            WeeklyProgressRepository weeklyProgressRepository,
            WeeklyReviewRepository weeklyReviewRepository
    ) {
        this.adminService = adminService;
        this.studentRepository = studentRepository;
        this.facultyRepository = facultyRepository;
        this.submitProposalRepository = submitProposalRepository;
        this.mentorAssignmentRepository = mentorAssignmentRepository;
        this.weeklyProgressRepository = weeklyProgressRepository;
        this.weeklyReviewRepository = weeklyReviewRepository;
    }


    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequestDTO request) {

        return adminService.login(request);
    }


    // =========================================================
    // RESET PASSWORD
    // =========================================================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @RequestBody ResetPasswordRequestDTO request) {

        return adminService.resetPassword(request);
    }

    // =========================================================
    // DASHBOARD STATS
    // =========================================================

    @GetMapping("/dashboard-stats")
    public ResponseEntity<AdminDashboardDTO> getDashboardStats() {
        long totalStudents = studentRepository.count();
        long totalFaculty = facultyRepository.count();
        long totalProjects = submitProposalRepository.count();

        List<SubmitProposal> allProposals = submitProposalRepository.findAll();
        long pendingApprovals = allProposals
                .stream()
                .filter(p -> p.getStatus() == null || p.getStatus().trim().isEmpty() || p.getStatus().equalsIgnoreCase("Pending"))
                .count();

        long completedProjects = allProposals
                .stream()
                .filter(p -> p.getStatus() != null && (p.getStatus().equalsIgnoreCase("Approved") || p.getStatus().equalsIgnoreCase("Completed")))
                .count();

        long inProgressProjects = allProposals
                .stream()
                .filter(p -> p.getStatus() != null && (p.getStatus().equalsIgnoreCase("Changes Requested") || p.getStatus().equalsIgnoreCase("In Progress")))
                .count();

        long unsubmittedCount = Math.max(0, totalStudents - allProposals.size());
        long pendingCount = pendingApprovals + unsubmittedCount;

        AdminDashboardDTO dto = new AdminDashboardDTO(
                totalStudents,
                totalFaculty,
                totalProjects,
                pendingApprovals
        );

        long mentorAssignedCount = mentorAssignmentRepository.count();
        List<com.campus.campus_backend.entity.WeeklyProgress> allWeekly = weeklyProgressRepository.findAll();
        List<com.campus.campus_backend.entity.WeeklyReview> allReviews = weeklyReviewRepository.findAll();
        long totalWeeklyProgressCount = allWeekly.size();

        dto.setAssignedStudents(mentorAssignedCount > 0 ? mentorAssignedCount : totalStudents);
        dto.setMentorAssignments(mentorAssignedCount > 0 ? mentorAssignedCount : totalProjects);
        dto.setReports(totalWeeklyProgressCount);

        // 1. DYNAMIC PROJECT STATUS DATA
        List<AdminDashboardDTO.ProjectStatusItem> statusList = new ArrayList<>();
        statusList.add(new AdminDashboardDTO.ProjectStatusItem("Completed", completedProjects));
        statusList.add(new AdminDashboardDTO.ProjectStatusItem("In Progress", inProgressProjects));
        statusList.add(new AdminDashboardDTO.ProjectStatusItem("Pending / Unassigned", pendingCount));
        dto.setProjectStatusData(statusList);

        // 2. DYNAMIC STUDENTS BY MENTOR
        Map<String, Long> mentorMap = new java.util.LinkedHashMap<>();
        facultyRepository.findAll().forEach(f -> mentorMap.put(f.getFacultyName(), 0L));

        for (var ma : mentorAssignmentRepository.findAll()) {
            if (ma.getMentor() != null && !ma.getMentor().trim().isEmpty()) {
                String mName = ma.getMentor().trim();
                mentorMap.put(mName, mentorMap.getOrDefault(mName, 0L) + 1);
            }
        }

        List<AdminDashboardDTO.MentorDataItem> mentorItems = mentorMap.entrySet().stream()
                .map(e -> new AdminDashboardDTO.MentorDataItem(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        dto.setMentorData(mentorItems);

        // 3. DYNAMIC WEEKLY PROGRESS BREAKDOWN (Weeks 1 to 6)
        Map<Integer, com.campus.campus_backend.entity.WeeklyReview> reviewMap = allReviews.stream()
                .collect(Collectors.toMap(
                        com.campus.campus_backend.entity.WeeklyReview::getProgressId,
                        r -> r,
                        (r1, r2) -> r1
                ));

        String[] standardWeeks = {"Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"};
        List<AdminDashboardDTO.WeeklyProgressItem> weeklyList = new ArrayList<>();
        for (String wk : standardWeeks) {
            List<com.campus.campus_backend.entity.WeeklyProgress> listForWk = allWeekly.stream()
                    .filter(w -> w.getWeek() != null && w.getWeek().trim().equalsIgnoreCase(wk))
                    .collect(Collectors.toList());

            long totalWk = listForWk.size();
            long approvedWk = listForWk.stream()
                    .filter(w -> {
                        var rev = reviewMap.get(w.getProgressId());
                        String s = rev != null ? rev.getReviewStatus() : w.getStatus();
                        return s != null && s.equalsIgnoreCase("Approved");
                    })
                    .count();

            long needsImpWk = listForWk.stream()
                    .filter(w -> {
                        var rev = reviewMap.get(w.getProgressId());
                        String s = rev != null ? rev.getReviewStatus() : w.getStatus();
                        return s != null && (s.equalsIgnoreCase("Needs Improvement") || s.equalsIgnoreCase("CHANGES_REQUESTED"));
                    })
                    .count();

            long pendingWk = Math.max(0, totalWk - approvedWk - needsImpWk);

            weeklyList.add(new AdminDashboardDTO.WeeklyProgressItem(wk, totalWk, approvedWk, needsImpWk, pendingWk));
        }
        dto.setWeeklyProgressData(weeklyList);

        // 4. DYNAMIC MONTHLY REPORTS DATA
        Map<String, Long> monthlyCounts = new java.util.LinkedHashMap<>();
        String[] defaultMonths = {"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        for (String m : defaultMonths) {
            monthlyCounts.put(m, 0L);
        }

        java.time.format.DateTimeFormatter monthFmt = java.time.format.DateTimeFormatter.ofPattern("MMM", java.util.Locale.ENGLISH);
        long recordedMonthCount = 0;
        for (var r : allReviews) {
            if (r.getReviewedAt() != null) {
                String mName = r.getReviewedAt().format(monthFmt);
                monthlyCounts.put(mName, monthlyCounts.getOrDefault(mName, 0L) + 1);
                recordedMonthCount++;
            }
        }
        long unassignedProgress = totalWeeklyProgressCount - recordedMonthCount;
        if (unassignedProgress > 0) {
            String currMonth = java.time.LocalDateTime.now().format(monthFmt);
            monthlyCounts.put(currMonth, monthlyCounts.getOrDefault(currMonth, 0L) + unassignedProgress);
        }

        List<AdminDashboardDTO.ReportDataItem> reportItems = monthlyCounts.entrySet().stream()
                .map(e -> new AdminDashboardDTO.ReportDataItem(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        dto.setReportData(reportItems);

        return ResponseEntity.ok(dto);
    }
}
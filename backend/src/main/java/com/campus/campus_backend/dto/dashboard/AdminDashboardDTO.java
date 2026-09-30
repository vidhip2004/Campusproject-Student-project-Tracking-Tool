package com.campus.campus_backend.dto.dashboard;

import java.util.ArrayList;
import java.util.List;

public class AdminDashboardDTO {

    private long totalStudents;
    private long totalFaculty;
    private long totalProjects;
    private long pendingApprovals;

    private long assignedStudents;
    private long mentorAssignments;
    private long reports;

    private List<ProjectStatusItem> projectStatusData = new ArrayList<>();
    private List<MentorDataItem> mentorData = new ArrayList<>();
    private List<ReportDataItem> reportData = new ArrayList<>();
    private List<WeeklyProgressItem> weeklyProgressData = new ArrayList<>();

    public AdminDashboardDTO() {
    }

    public AdminDashboardDTO(long totalStudents, long totalFaculty, long totalProjects, long pendingApprovals) {
        this.totalStudents = totalStudents;
        this.totalFaculty = totalFaculty;
        this.totalProjects = totalProjects;
        this.pendingApprovals = pendingApprovals;
        this.assignedStudents = totalStudents;
        this.mentorAssignments = totalProjects;
        this.reports = totalProjects;
    }

    public long getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(long totalStudents) {
        this.totalStudents = totalStudents;
    }

    public long getTotalFaculty() {
        return totalFaculty;
    }

    public void setTotalFaculty(long totalFaculty) {
        this.totalFaculty = totalFaculty;
    }

    public long getTotalProjects() {
        return totalProjects;
    }

    public void setTotalProjects(long totalProjects) {
        this.totalProjects = totalProjects;
    }

    public long getPendingApprovals() {
        return pendingApprovals;
    }

    public void setPendingApprovals(long pendingApprovals) {
        this.pendingApprovals = pendingApprovals;
    }

    public long getAssignedStudents() {
        return assignedStudents;
    }

    public void setAssignedStudents(long assignedStudents) {
        this.assignedStudents = assignedStudents;
    }

    public long getMentorAssignments() {
        return mentorAssignments;
    }

    public void setMentorAssignments(long mentorAssignments) {
        this.mentorAssignments = mentorAssignments;
    }

    public long getReports() {
        return reports;
    }

    public void setReports(long reports) {
        this.reports = reports;
    }

    public List<ProjectStatusItem> getProjectStatusData() {
        return projectStatusData;
    }

    public void setProjectStatusData(List<ProjectStatusItem> projectStatusData) {
        this.projectStatusData = projectStatusData;
    }

    public List<MentorDataItem> getMentorData() {
        return mentorData;
    }

    public void setMentorData(List<MentorDataItem> mentorData) {
        this.mentorData = mentorData;
    }

    public List<ReportDataItem> getReportData() {
        return reportData;
    }

    public void setReportData(List<ReportDataItem> reportData) {
        this.reportData = reportData;
    }

    public List<WeeklyProgressItem> getWeeklyProgressData() {
        return weeklyProgressData;
    }

    public void setWeeklyProgressData(List<WeeklyProgressItem> weeklyProgressData) {
        this.weeklyProgressData = weeklyProgressData;
    }

    public static class WeeklyProgressItem {
        private String week;
        private long total;
        private long approved;
        private long needsImprovement;
        private long pending;

        public WeeklyProgressItem() {}
        public WeeklyProgressItem(String week, long total, long approved, long needsImprovement, long pending) {
            this.week = week;
            this.total = total;
            this.approved = approved;
            this.needsImprovement = needsImprovement;
            this.pending = pending;
        }

        public String getWeek() { return week; }
        public void setWeek(String week) { this.week = week; }
        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
        public long getApproved() { return approved; }
        public void setApproved(long approved) { this.approved = approved; }
        public long getNeedsImprovement() { return needsImprovement; }
        public void setNeedsImprovement(long needsImprovement) { this.needsImprovement = needsImprovement; }
        public long getPending() { return pending; }
        public void setPending(long pending) { this.pending = pending; }
    }

    public static class ProjectStatusItem {
        private String name;
        private long value;

        public ProjectStatusItem() {}
        public ProjectStatusItem(String name, long value) {
            this.name = name;
            this.value = value;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public long getValue() { return value; }
        public void setValue(long value) { this.value = value; }
    }

    public static class MentorDataItem {
        private String mentor;
        private long students;

        public MentorDataItem() {}
        public MentorDataItem(String mentor, long students) {
            this.mentor = mentor;
            this.students = students;
        }

        public String getMentor() { return mentor; }
        public void setMentor(String mentor) { this.mentor = mentor; }
        public long getStudents() { return students; }
        public void setStudents(long students) { this.students = students; }
    }

    public static class ReportDataItem {
        private String month;
        private long reports;

        public ReportDataItem() {}
        public ReportDataItem(String month, long reports) {
            this.month = month;
            this.reports = reports;
        }

        public String getMonth() { return month; }
        public void setMonth(String month) { this.month = month; }
        public long getReports() { return reports; }
        public void setReports(long reports) { this.reports = reports; }
    }
}

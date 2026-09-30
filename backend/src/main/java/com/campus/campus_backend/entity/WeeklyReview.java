package com.campus.campus_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "weekly_review")
public class WeeklyReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "weekly_review_id")
    private Integer weeklyReviewId;

    @Column(name = "progress_id", nullable = false, unique = true)
    private Integer progressId;

    @Column(name = "faculty_feedback", columnDefinition = "TEXT")
    private String facultyFeedback;

    @Column(name = "review_status")
    private String reviewStatus;

    @Column(name = "reviewed_at")
    private java.time.LocalDateTime reviewedAt;

    public WeeklyReview() {
    }

    public Integer getWeeklyReviewId() {
        return weeklyReviewId;
    }

    public void setWeeklyReviewId(Integer weeklyReviewId) {
        this.weeklyReviewId = weeklyReviewId;
    }

    public Integer getProgressId() {
        return progressId;
    }

    public void setProgressId(Integer progressId) {
        this.progressId = progressId;
    }

    public String getFacultyFeedback() {
        return facultyFeedback;
    }

    public void setFacultyFeedback(String facultyFeedback) {
        this.facultyFeedback = facultyFeedback;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public java.time.LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(java.time.LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
package com.campus.campus_backend.dto.WeeklyReview;

public class WeeklyReviewResponseDTO {

    private Integer weeklyReviewId;

    private Integer progressId;

    private String status;

    private String facultyFeedback;

    private java.time.LocalDateTime reviewedAt;


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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }


    public String getFacultyFeedback() {
        return facultyFeedback;
    }

    public void setFacultyFeedback(String facultyFeedback) {
        this.facultyFeedback = facultyFeedback;
    }

    public java.time.LocalDateTime getReviewedAt() {
        return reviewedAt;
    }

    public void setReviewedAt(java.time.LocalDateTime reviewedAt) {
        this.reviewedAt = reviewedAt;
    }
}
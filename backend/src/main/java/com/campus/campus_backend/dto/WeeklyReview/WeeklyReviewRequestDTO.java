package com.campus.campus_backend.dto.WeeklyReview;

public class WeeklyReviewRequestDTO {

    private Integer progressId;

    private String status;

    private String facultyFeedback;


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
}
package com.campus.campus_backend.dto.ReviewProposal;

public class ReviewStatusRequestDTO {

    private String status;
    private String comments;

    public ReviewStatusRequestDTO() {
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }
}
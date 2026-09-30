package com.campus.campus_backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name="Submit_Proposal")
public class SubmitProposal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer proposalId;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(length = 200, nullable = false)
    private String projectTitle;

    @Column(length = 100, nullable = false)
    private String projectDomain;

    @Column(name = "guide_name", nullable = true)
    private String guideName = "Not Assigned";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String technologyStack;

    @Column(length = 255)
    private String otherTechnology;

    @Column(length = 100)
    private String member2Name;

    @Column(length = 20)
    private String member2Enrollment;

    @Column(length = 100)
    private String member3Name;

    @Column(length = 20)
    private String member3Enrollment;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String projectDescription;

    @Column(length = 255, nullable = false)
    private String proposalFile;

    private String status;
    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    public SubmitProposal() {
    }

    public Integer getProposalId() {
        return proposalId;
    }

    public void setProposalId(Integer proposalId) {
        this.proposalId = proposalId;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public String getProjectTitle() {
        return projectTitle;
    }

    public void setProjectTitle(String projectTitle) {
        this.projectTitle = projectTitle;
    }

    public String getProjectDomain() {
        return projectDomain;
    }

    public void setProjectDomain(String projectDomain) {
        this.projectDomain = projectDomain;
    }

    public String getGuideName() {
        return guideName;
    }

    public void setGuideName(String guideName) {
        this.guideName = guideName;
    }

    public String getTechnologyStack() {
        return technologyStack;
    }

    public void setTechnologyStack(String technologyStack) {
        this.technologyStack = technologyStack;
    }

    public String getOtherTechnology() {
        return otherTechnology;
    }

    public void setOtherTechnology(String otherTechnology) {
        this.otherTechnology = otherTechnology;
    }

    public String getMember2Name() {
        return member2Name;
    }

    public void setMember2Name(String member2Name) {
        this.member2Name = member2Name;
    }

    public String getMember2Enrollment() {
        return member2Enrollment;
    }

    public void setMember2Enrollment(String member2Enrollment) {
        this.member2Enrollment = member2Enrollment;
    }

    public String getMember3Name() {
        return member3Name;
    }

    public void setMember3Name(String member3Name) {
        this.member3Name = member3Name;
    }

    public String getMember3Enrollment() {
        return member3Enrollment;
    }

    public void setMember3Enrollment(String member3Enrollment) {
        this.member3Enrollment = member3Enrollment;
    }

    public String getProjectDescription() {
        return projectDescription;
    }

    public void setProjectDescription(String projectDescription) {
        this.projectDescription = projectDescription;
    }

    public String getProposalFile() {
        return proposalFile;
    }

    public void setProposalFile(String proposalFile) {
        this.proposalFile = proposalFile;
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

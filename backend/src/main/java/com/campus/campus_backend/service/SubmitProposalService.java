package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.praporsal.ProposalRequestDTO;
import com.campus.campus_backend.dto.praporsal.ProposalResponseDTO;
import com.campus.campus_backend.entity.MentorAssignment;
import com.campus.campus_backend.entity.ReviewProposal;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.MentorAssignmentRepository;
import com.campus.campus_backend.repository.ReviewProposalRepository;
import com.campus.campus_backend.repository.StudentRepository;
import com.campus.campus_backend.repository.SubmitProposalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
public class SubmitProposalService {

    @Autowired
    private SubmitProposalRepository submitProposalRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ReviewProposalRepository reviewProposalRepository;

    @Autowired
    private MentorAssignmentRepository mentorAssignmentRepository;

    @Autowired
    private FileStorageService fileStorageService;

    // =========================================================
    // SUBMIT PROPOSAL WITH MULTIPART FILE
    // =========================================================

    @Transactional
    public ProposalResponseDTO submitProposalMultipart(
            Integer studentId,
            String projectTitle,
            String projectDomain,
            String technologyStack,
            String otherTechnology,
            String member2Name,
            String member2Enrollment,
            String member3Name,
            String member3Enrollment,
            String projectDescription,
            MultipartFile proposalFile
    ) {
        String storedFilePath = null;
        if (proposalFile != null && !proposalFile.isEmpty()) {
            String originalFilename = proposalFile.getOriginalFilename();
            if (originalFilename == null || !originalFilename.toLowerCase().endsWith(".pdf")) {
                throw new RuntimeException("Only PDF proposal files are allowed.");
            }
            // Store file safely
            storedFilePath = fileStorageService.storeFile(proposalFile, "proposals", "pdf");
        }

        ProposalRequestDTO requestDTO = new ProposalRequestDTO();
        requestDTO.setStudentId(studentId);
        requestDTO.setProjectTitle(projectTitle);
        requestDTO.setProjectDomain(projectDomain);
        requestDTO.setTechnologyStack(technologyStack);
        requestDTO.setOtherTechnology(otherTechnology);
        requestDTO.setMember2Name(member2Name);
        requestDTO.setMember2Enrollment(member2Enrollment);
        requestDTO.setMember3Name(member3Name);
        requestDTO.setMember3Enrollment(member3Enrollment);
        requestDTO.setProjectDescription(projectDescription);
        requestDTO.setProposalFile(storedFilePath);

        return processProposalSubmission(requestDTO, storedFilePath);
    }

    // =========================================================
    // SUBMIT PROPOSAL (JSON FALLBACK)
    // =========================================================

    @Transactional
    public ProposalResponseDTO submitProposal(ProposalRequestDTO requestDTO) {
        return processProposalSubmission(requestDTO, requestDTO.getProposalFile());
    }

    private ProposalResponseDTO processProposalSubmission(ProposalRequestDTO requestDTO, String storedFilePath) {
        // 1. STUDENT VALIDATION
        Student student = studentRepository
                .findById(requestDTO.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found."));

        // 2. CHECK IF PROPOSAL ALREADY EXISTS FOR THIS STUDENT (SUPPORT UPDATING)
        SubmitProposal existingProposal = submitProposalRepository.findByStudent(student).orElse(null);
        boolean isUpdate = (existingProposal != null);

        // 3. PROJECT TITLE VALIDATION
        if (requestDTO.getProjectTitle() == null || requestDTO.getProjectTitle().trim().isEmpty()) {
            throw new RuntimeException("Project title is required.");
        }

        String projectTitle = requestDTO.getProjectTitle().trim();
        if (projectTitle.length() < 5 || projectTitle.length() > 200) {
            throw new RuntimeException("Project title must be between 5 and 200 characters.");
        }

        // 4. DUPLICATE PROJECT TITLE (ALLOW KEEPING SAME TITLE IF UPDATING OWN PROPOSAL)
        java.util.Optional<SubmitProposal> existingWithTitle = submitProposalRepository.findByProjectTitle(projectTitle);
        if (existingWithTitle.isPresent()) {
            if (!isUpdate || !existingWithTitle.get().getProposalId().equals(existingProposal.getProposalId())) {
                throw new RuntimeException("Project title already exists.");
            }
        }

        // 5. PROJECT DOMAIN VALIDATION
        if (requestDTO.getProjectDomain() == null || requestDTO.getProjectDomain().trim().isEmpty()) {
            throw new RuntimeException("Please select project domain.");
        }
        String projectDomain = requestDTO.getProjectDomain().trim();

        // 6. TECHNOLOGY STACK VALIDATION
        if (requestDTO.getTechnologyStack() == null || requestDTO.getTechnologyStack().trim().isEmpty()) {
            throw new RuntimeException("Select at least one technology.");
        }
        String technologyStack = requestDTO.getTechnologyStack().trim();

        // 7. PROJECT DESCRIPTION VALIDATION
        if (requestDTO.getProjectDescription() == null || requestDTO.getProjectDescription().trim().isEmpty()) {
            throw new RuntimeException("Project description is required.");
        }
        String projectDescription = requestDTO.getProjectDescription().trim();
        if (projectDescription.length() < 30) {
            throw new RuntimeException("Project description must contain at least 30 characters.");
        }
        if (projectDescription.length() > 2000) {
            throw new RuntimeException("Project description cannot exceed 2000 characters.");
        }

        // 8. PROPOSAL FILE VALIDATION
        if (storedFilePath == null || storedFilePath.trim().isEmpty()) {
            if (isUpdate && existingProposal.getProposalFile() != null && !existingProposal.getProposalFile().trim().isEmpty()) {
                // Keep the previously uploaded file
                storedFilePath = existingProposal.getProposalFile();
            } else {
                throw new RuntimeException("Proposal PDF file is required.");
            }
        }

        // 9. MEMBER 2 VALIDATION
        if (requestDTO.getMember2Name() != null && !requestDTO.getMember2Name().trim().isEmpty()) {
            if (requestDTO.getMember2Enrollment() == null || requestDTO.getMember2Enrollment().trim().isEmpty()) {
                throw new RuntimeException("Member 2 enrollment number is required.");
            }
            if (requestDTO.getMember2Enrollment().trim().equalsIgnoreCase(student.getEnrollmentNo())) {
                throw new RuntimeException("You cannot add yourself as Member 2.");
            }
        }

        // 10. MEMBER 3 VALIDATION
        if (requestDTO.getMember3Name() != null && !requestDTO.getMember3Name().trim().isEmpty()) {
            if (requestDTO.getMember3Enrollment() == null || requestDTO.getMember3Enrollment().trim().isEmpty()) {
                throw new RuntimeException("Member 3 enrollment number is required.");
            }
            if (requestDTO.getMember3Enrollment().trim().equalsIgnoreCase(student.getEnrollmentNo())) {
                throw new RuntimeException("You cannot add yourself as Member 3.");
            }
        }

        // 11. DUPLICATE TEAM MEMBER VALIDATION
        if (requestDTO.getMember2Enrollment() != null && requestDTO.getMember3Enrollment() != null &&
                !requestDTO.getMember2Enrollment().trim().isEmpty() &&
                !requestDTO.getMember3Enrollment().trim().isEmpty() &&
                requestDTO.getMember2Enrollment().trim().equalsIgnoreCase(requestDTO.getMember3Enrollment().trim())) {
            throw new RuntimeException("Duplicate team members are not allowed.");
        }

        // 12. CREATE OR UPDATE SUBMIT PROPOSAL ENTITY
        SubmitProposal proposal = isUpdate ? existingProposal : new SubmitProposal();
        proposal.setStudent(student);
        proposal.setProjectTitle(projectTitle);
        proposal.setProjectDomain(projectDomain);
        proposal.setTechnologyStack(technologyStack);
        proposal.setOtherTechnology(requestDTO.getOtherTechnology() == null ? null : requestDTO.getOtherTechnology().trim());
        proposal.setMember2Name(requestDTO.getMember2Name() == null ? null : requestDTO.getMember2Name().trim());
        proposal.setMember2Enrollment(requestDTO.getMember2Enrollment() == null ? null : requestDTO.getMember2Enrollment().trim());
        proposal.setMember3Name(requestDTO.getMember3Name() == null ? null : requestDTO.getMember3Name().trim());
        proposal.setMember3Enrollment(requestDTO.getMember3Enrollment() == null ? null : requestDTO.getMember3Enrollment().trim());
        proposal.setProjectDescription(projectDescription);
        proposal.setProposalFile(storedFilePath);
        if (proposal.getStatus() == null || proposal.getStatus().trim().isEmpty() || "CHANGES_REQUESTED".equalsIgnoreCase(proposal.getStatus())) {
            proposal.setStatus("PENDING");
        }

        SubmitProposal savedProposal = submitProposalRepository.save(proposal);

        // 13. CREATE OR UPDATE FACULTY REVIEW PROPOSAL
        ReviewProposal reviewProposal = reviewProposalRepository
                .findByProposalId(savedProposal.getProposalId())
                .orElseGet(ReviewProposal::new);

        reviewProposal.setProposalId(savedProposal.getProposalId());
        reviewProposal.setStudentId(savedProposal.getStudent().getId());
        reviewProposal.setProjectTitle(savedProposal.getProjectTitle());
        reviewProposal.setProjectDomain(savedProposal.getProjectDomain());
        reviewProposal.setTechnologyStack(savedProposal.getTechnologyStack());
        reviewProposal.setOtherTechnology(savedProposal.getOtherTechnology());
        reviewProposal.setMember2Name(savedProposal.getMember2Name());
        reviewProposal.setMember2Enrollment(savedProposal.getMember2Enrollment());
        reviewProposal.setMember3Name(savedProposal.getMember3Name());
        reviewProposal.setMember3Enrollment(savedProposal.getMember3Enrollment());
        reviewProposal.setProjectDescription(savedProposal.getProjectDescription());
        reviewProposal.setProposalFile(storedFilePath);
        if (reviewProposal.getStatus() == null || reviewProposal.getStatus().trim().isEmpty() || "CHANGES_REQUESTED".equalsIgnoreCase(reviewProposal.getStatus())) {
            reviewProposal.setStatus("PENDING");
        }

        reviewProposalRepository.save(reviewProposal);

        // 14. CREATE OR UPDATE MENTOR ASSIGNMENT
        MentorAssignment mentorAssignment = mentorAssignmentRepository
                .findByGroupNumber(savedProposal.getProposalId())
                .orElseGet(() -> {
                    List<MentorAssignment> byStudent = mentorAssignmentRepository.findByStudent_Id(student.getId());
                    if (!byStudent.isEmpty()) {
                        return byStudent.get(0);
                    }
                    MentorAssignment ma = new MentorAssignment();
                    int nextGroup = savedProposal.getProposalId();
                    while (mentorAssignmentRepository.existsByGroupNumber(nextGroup)) {
                        nextGroup++;
                    }
                    ma.setGroupNumber(nextGroup);
                    return ma;
                });

        mentorAssignment.setProject(savedProposal.getProjectTitle());
        if (mentorAssignment.getMentor() == null || mentorAssignment.getMentor().trim().isEmpty()) {
            mentorAssignment.setMentor("Not Assigned");
        }
        if (mentorAssignment.getStatus() == null || mentorAssignment.getStatus().trim().isEmpty()) {
            mentorAssignment.setStatus("Pending");
        }
        mentorAssignment.setDepartment(student.getDepartment());
        mentorAssignment.setStudent(student);

        mentorAssignmentRepository.save(mentorAssignment);

        // 15. CREATE RESPONSE DTO
        ProposalResponseDTO responseDTO = new ProposalResponseDTO();
        responseDTO.setProposalId(savedProposal.getProposalId());
        responseDTO.setStudentId(savedProposal.getStudent().getId());
        responseDTO.setProjectTitle(savedProposal.getProjectTitle());
        responseDTO.setProjectDomain(savedProposal.getProjectDomain());
        responseDTO.setTechnologyStack(savedProposal.getTechnologyStack());
        responseDTO.setOtherTechnology(savedProposal.getOtherTechnology());
        responseDTO.setMember2Name(savedProposal.getMember2Name());
        responseDTO.setMember2Enrollment(savedProposal.getMember2Enrollment());
        responseDTO.setMember3Name(savedProposal.getMember3Name());
        responseDTO.setMember3Enrollment(savedProposal.getMember3Enrollment());
        responseDTO.setProjectDescription(savedProposal.getProjectDescription());
        responseDTO.setProposalFile(savedProposal.getProposalFile());
        responseDTO.setStatus(savedProposal.getStatus());
        responseDTO.setComments(savedProposal.getComments());
        responseDTO.setGuideName(mentorAssignment.getMentor());

        return responseDTO;
    }

    // =========================================================
    // GET PROPOSAL BY STUDENT
    // =========================================================

    public ProposalResponseDTO getProposalByStudent(Integer studentId) {
        Student student = studentRepository
                .findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found."));

        SubmitProposal proposal = submitProposalRepository
                .findByStudent(student)
                .orElse(null);

        if (proposal == null && student.getEnrollmentNo() != null && !student.getEnrollmentNo().trim().isEmpty()) {
            String enroll = student.getEnrollmentNo().trim();
            proposal = submitProposalRepository.findFirstByMember2EnrollmentOrderByProposalIdDesc(enroll)
                    .orElseGet(() -> submitProposalRepository.findFirstByMember3EnrollmentOrderByProposalIdDesc(enroll).orElse(null));
        }

        if (proposal == null) {
            throw new RuntimeException("Proposal not found for this student.");
        }

        ProposalResponseDTO responseDTO = new ProposalResponseDTO();
        responseDTO.setProposalId(proposal.getProposalId());
        if (proposal.getStudent() != null) {
            responseDTO.setStudentId(proposal.getStudent().getId());
        } else {
            responseDTO.setStudentId(studentId);
        }
        responseDTO.setProjectTitle(proposal.getProjectTitle());
        responseDTO.setProjectDomain(proposal.getProjectDomain());
        responseDTO.setTechnologyStack(proposal.getTechnologyStack());
        responseDTO.setOtherTechnology(proposal.getOtherTechnology());
        responseDTO.setMember2Name(proposal.getMember2Name());
        responseDTO.setMember2Enrollment(proposal.getMember2Enrollment());
        responseDTO.setMember3Name(proposal.getMember3Name());
        responseDTO.setMember3Enrollment(proposal.getMember3Enrollment());
        responseDTO.setProjectDescription(proposal.getProjectDescription());
        responseDTO.setProposalFile(proposal.getProposalFile());
        // Sync guideName from MentorAssignment if currently unassigned
        String guideName = proposal.getGuideName();
        if (guideName == null || guideName.trim().isEmpty() || guideName.equalsIgnoreCase("Not Assigned")) {
            MentorAssignment ma = null;
            if (proposal.getStudent() != null) {
                ma = mentorAssignmentRepository.findByStudent_Id(proposal.getStudent().getId()).stream().findFirst().orElse(null);
            }
            if (ma == null && proposal.getProposalId() != null) {
                ma = mentorAssignmentRepository.findByGroupNumber(proposal.getProposalId()).orElse(null);
            }
            if (ma == null && proposal.getProjectTitle() != null) {
                ma = mentorAssignmentRepository.findFirstByProject(proposal.getProjectTitle()).orElse(null);
            }
            if (ma != null && ma.getMentor() != null && !ma.getMentor().trim().isEmpty() && !ma.getMentor().equalsIgnoreCase("Not Assigned")) {
                guideName = ma.getMentor().trim();
                proposal.setGuideName(guideName);
                submitProposalRepository.save(proposal);
            }
        }

        responseDTO.setGuideName(guideName != null && !guideName.trim().isEmpty() ? guideName : "Not Assigned");
        responseDTO.setStatus(proposal.getStatus() != null ? proposal.getStatus() : "Submitted");

        String comments = proposal.getComments();
        if ((comments == null || comments.trim().isEmpty()) && proposal.getProposalId() != null) {
            comments = reviewProposalRepository.findByProposalId(proposal.getProposalId())
                    .map(ReviewProposal::getComments)
                    .orElse(null);
        }
        responseDTO.setComments(comments);

        return responseDTO;
    }
}
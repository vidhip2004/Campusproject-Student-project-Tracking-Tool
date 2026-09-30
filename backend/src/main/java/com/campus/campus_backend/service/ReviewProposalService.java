package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.ReviewProposal.ReviewProposalResponseDTO;
import com.campus.campus_backend.entity.ReviewProposal;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.ReviewProposalRepository;
import com.campus.campus_backend.repository.SubmitProposalRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ReviewProposalService {

    private final ReviewProposalRepository reviewProposalRepository;
    private final SubmitProposalRepository submitProposalRepository;
    private final FacultyAuthorizationService facultyAuthorizationService;

    public ReviewProposalService(
            ReviewProposalRepository reviewProposalRepository,
            SubmitProposalRepository submitProposalRepository,
            FacultyAuthorizationService facultyAuthorizationService
    ) {
        this.reviewProposalRepository = reviewProposalRepository;
        this.submitProposalRepository = submitProposalRepository;
        this.facultyAuthorizationService = facultyAuthorizationService;
    }

    // GET ALL REVIEW PROPOSALS (FACULTY-SCOPED)
    public List<ReviewProposalResponseDTO> getAllReviewProposals(Long facultyId, String facultyName) {
        List<ReviewProposal> proposals = reviewProposalRepository.findAll();

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            Set<Integer> assignedStudentIds = facultyAuthorizationService.getAssignedStudentIds(facultyId, facultyName);
            return proposals.stream()
                    .filter(p -> p.getStudentId() != null && assignedStudentIds.contains(p.getStudentId()))
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        }

        return proposals.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // GET ONE REVIEW PROPOSAL (WITH AUTHORIZATION)
    public ReviewProposalResponseDTO getReviewProposalById(
            Integer reviewProposalId,
            Long facultyId,
            String facultyName
    ) {
        ReviewProposal proposal = reviewProposalRepository.findById(reviewProposalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review proposal not found with id: " + reviewProposalId));

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            facultyAuthorizationService.validateFacultyAccessToStudent(proposal.getStudentId(), facultyId, facultyName);
        }

        return convertToDTO(proposal);
    }

    // UPDATE STATUS (WITH AUTHORIZATION & COMMENTS)
    public ReviewProposalResponseDTO updateStatus(
            Integer reviewProposalId,
            String status,
            String comments,
            Long facultyId,
            String facultyName
    ) {
        ReviewProposal proposal = reviewProposalRepository.findById(reviewProposalId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Review proposal not found with id: " + reviewProposalId));

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            facultyAuthorizationService.validateFacultyAccessToStudent(proposal.getStudentId(), facultyId, facultyName);
        }

        if (!status.equals("PENDING")
                && !status.equals("APPROVED")
                && !status.equals("REJECTED")
                && !status.equals("CHANGES_REQUESTED")) {
            throw new IllegalArgumentException(
                    "Invalid status. Allowed values: PENDING, APPROVED, REJECTED, CHANGES_REQUESTED"
            );
        }

        proposal.setStatus(status);
        if (comments != null) {
            proposal.setComments(comments.trim());
        }

        if (!status.equals("PENDING")) {
            proposal.setReviewedAt(LocalDateTime.now());
        }

        ReviewProposal updatedProposal = reviewProposalRepository.save(proposal);

        // Also sync status and comments back to SubmitProposal entity
        SubmitProposal sp = null;
        if (proposal.getProposalId() != null) {
            sp = submitProposalRepository.findById(proposal.getProposalId()).orElse(null);
        }
        if (sp == null && proposal.getStudentId() != null) {
            sp = submitProposalRepository.findFirstByStudentIdOrderByProposalIdDesc(proposal.getStudentId()).orElse(null);
        }
        if (sp != null) {
            sp.setStatus(status);
            if (comments != null) {
                sp.setComments(comments.trim());
            }
            submitProposalRepository.save(sp);
        }

        return convertToDTO(updatedProposal);
    }

    public ReviewProposalResponseDTO updateStatus(
            Integer reviewProposalId,
            String status,
            Long facultyId,
            String facultyName
    ) {
        return updateStatus(reviewProposalId, status, null, facultyId, facultyName);
    }

    // CONVERT ENTITY -> DTO
    private ReviewProposalResponseDTO convertToDTO(ReviewProposal proposal) {
        ReviewProposalResponseDTO dto = new ReviewProposalResponseDTO();
        dto.setReviewProposalId(proposal.getReviewProposalId());
        dto.setProposalId(proposal.getProposalId());
        dto.setStudentId(proposal.getStudentId());
        dto.setProjectTitle(proposal.getProjectTitle());
        dto.setProjectDomain(proposal.getProjectDomain());
        dto.setTechnologyStack(proposal.getTechnologyStack());
        dto.setOtherTechnology(proposal.getOtherTechnology());
        dto.setMember2Name(proposal.getMember2Name());
        dto.setMember2Enrollment(proposal.getMember2Enrollment());
        dto.setMember3Name(proposal.getMember3Name());
        dto.setMember3Enrollment(proposal.getMember3Enrollment());
        dto.setProjectDescription(proposal.getProjectDescription());
        dto.setProposalFile(proposal.getProposalFile());
        dto.setStatus(proposal.getStatus());
        dto.setComments(proposal.getComments());
        dto.setReviewedAt(proposal.getReviewedAt());

        return dto;
    }
}
package com.campus.campus_backend.controller;

import com.campus.campus_backend.dto.ReviewProposal.ReviewProposalResponseDTO;
import com.campus.campus_backend.dto.ReviewProposal.ReviewStatusRequestDTO;
import com.campus.campus_backend.service.ReviewProposalService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/review-proposal")
@CrossOrigin(origins = "http://localhost:5173")
public class ReviewProposalController {

    private final ReviewProposalService reviewProposalService;

    public ReviewProposalController(ReviewProposalService reviewProposalService) {
        this.reviewProposalService = reviewProposalService;
    }

    // ==========================================
    // GET ALL PROPOSALS (FACULTY-SCOPED)
    // ==========================================

    @GetMapping
    public ResponseEntity<List<ReviewProposalResponseDTO>> getAllReviewProposals(
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        return ResponseEntity.ok(
                reviewProposalService.getAllReviewProposals(facultyId, facultyName)
        );
    }

    // ==========================================
    // GET ONE PROPOSAL (WITH AUTHORIZATION)
    // ==========================================

    @GetMapping("/{id}")
    public ResponseEntity<ReviewProposalResponseDTO> getReviewProposalById(
            @PathVariable Integer id,
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        return ResponseEntity.ok(
                reviewProposalService.getReviewProposalById(id, facultyId, facultyName)
        );
    }

    // ==========================================
    // APPROVE / REJECT / REQUEST CHANGES (WITH AUTHORIZATION)
    // ==========================================

    @PutMapping("/{id}/status")
    public ResponseEntity<ReviewProposalResponseDTO> updateStatus(
            @PathVariable Integer id,
            @RequestBody ReviewStatusRequestDTO request,
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        return ResponseEntity.ok(
                reviewProposalService.updateStatus(
                        id,
                        request.getStatus(),
                        request.getComments(),
                        facultyId,
                        facultyName
                )
        );
    }
}
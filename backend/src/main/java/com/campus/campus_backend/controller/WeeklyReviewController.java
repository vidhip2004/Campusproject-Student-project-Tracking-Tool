package com.campus.campus_backend.controller;

import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewRequestDTO;
import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewResponseDTO;
import com.campus.campus_backend.service.WeeklyReviewService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weekly-review")
@CrossOrigin(origins = "*")
public class WeeklyReviewController {

    private final WeeklyReviewService weeklyReviewService;

    public WeeklyReviewController(
            WeeklyReviewService weeklyReviewService) {
        this.weeklyReviewService = weeklyReviewService;
    }

    // =====================================================
    // GET REVIEW BY PROGRESS ID
    // =====================================================

    @GetMapping("/progress/{progressId}")
    public ResponseEntity<?> getReviewByProgressId(
            @PathVariable Integer progressId,
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName,
            @RequestHeader(value = "X-Student-Id", required = false) Integer requestingStudentId,
            @RequestParam(required = false) Integer studentId
    ) {
        try {
            Integer effectiveStudentId = requestingStudentId != null ? requestingStudentId : studentId;
            return ResponseEntity.ok(
                    weeklyReviewService.getReviewByProgressId(progressId, facultyId, facultyName, effectiveStudentId)
            );
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity
                    .status(e.getStatusCode())
                    .body(Map.of("message", e.getReason() != null ? e.getReason() : e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error retrieving weekly review."));
        }
    }

    // =====================================================
    // CREATE OR UPDATE REVIEW (ATOMIC)
    // =====================================================

    @PutMapping("/progress/{progressId}")
    public ResponseEntity<?> saveReview(
            @PathVariable Integer progressId,
            @RequestBody WeeklyReviewRequestDTO request,
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        try {
            if (request == null) {
                request = new WeeklyReviewRequestDTO();
            }
            request.setProgressId(progressId);
            WeeklyReviewResponseDTO response =
                    weeklyReviewService.saveReview(request, facultyId, facultyName);

            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity
                    .status(e.getStatusCode())
                    .body(Map.of("message", e.getReason() != null ? e.getReason() : e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error saving weekly review."));
        }
    }
}
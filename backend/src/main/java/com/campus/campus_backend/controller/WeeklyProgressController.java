package com.campus.campus_backend.controller;

import com.campus.campus_backend.dto.weekly.WeeklyProgressRequestDTO;
import com.campus.campus_backend.dto.weekly.WeeklyProgressResponseDTO;
import com.campus.campus_backend.service.WeeklyProgressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/weekly-progress")
@CrossOrigin(origins = "http://localhost:5173")
public class WeeklyProgressController {

    @Autowired
    private WeeklyProgressService weeklyProgressService;

    // =====================================================
    // STUDENT - GET WEEKLY PROGRESS BY STUDENT ID
    // =====================================================

    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getProgressByStudent(
            @PathVariable Integer studentId,
            @RequestHeader(value = "X-Student-Id", required = false) Integer requestingStudentId,
            @RequestParam(value = "requestingStudentId", required = false) Integer reqStudentId
    ) {
        Integer effectiveStudentId = requestingStudentId != null ? requestingStudentId : reqStudentId;
        if (effectiveStudentId != null && !effectiveStudentId.equals(studentId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied: You cannot access another student's weekly progress."));
        }
        return ResponseEntity.ok(
                weeklyProgressService.getProgressByStudentId(studentId)
        );
    }

    // =====================================================
    // STUDENT - SUBMIT WEEKLY PROGRESS (MULTIPART WITH FILE)
    // =====================================================

    @PostMapping(value = "/submit", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitProgressMultipart(
            @RequestParam("studentId") Integer studentId,
            @RequestParam("week") String week,
            @RequestParam(value = "projectTitle", required = false) String projectTitle,
            @RequestParam("progressTitle") String progressTitle,
            @RequestParam("workCompleted") String workCompleted,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam("percentage") Integer percentage,
            @RequestParam(value = "challenges", required = false) String challenges,
            @RequestParam(value = "nextPlan", required = false) String nextPlan,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @RequestHeader(value = "X-Student-Id", required = false) Integer requestingStudentId
    ) {
        if (requestingStudentId != null && !requestingStudentId.equals(studentId)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied: You cannot submit progress for another student."));
        }
        try {
            WeeklyProgressResponseDTO response = weeklyProgressService.submitProgressMultipart(
                    studentId, week, projectTitle, progressTitle, workCompleted, status, percentage, challenges, nextPlan, file
            );
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() != null ? e.getReason() : e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error processing submission."));
        }
    }

    // =====================================================
    // STUDENT - SUBMIT WEEKLY PROGRESS (JSON FALLBACK)
    // =====================================================

    @PostMapping(value = "/submit", consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> submitProgressJson(
            @RequestBody WeeklyProgressRequestDTO requestDTO,
            @RequestHeader(value = "X-Student-Id", required = false) Integer requestingStudentId) {
        if (requestDTO != null && requestingStudentId != null && requestDTO.getStudentId() != null && !requestingStudentId.equals(requestDTO.getStudentId())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Access denied: You cannot submit progress for another student."));
        }
        try {
            WeeklyProgressResponseDTO response =
                    weeklyProgressService.submitProgress(requestDTO);
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() != null ? e.getReason() : e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error processing submission."));
        }
    }

    // =====================================================
    // FACULTY - GET ALL WEEKLY PROGRESS (SCOPED)
    // =====================================================

    @GetMapping
    public ResponseEntity<List<WeeklyProgressResponseDTO>> getAllProgress(
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        return ResponseEntity.ok(
                weeklyProgressService.getAllProgress(facultyId, facultyName)
        );
    }

    // =====================================================
    // FACULTY - UPDATE STATUS
    // =====================================================

    @PutMapping("/{progressId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Integer progressId,
            @RequestBody Map<String, String> request,
            @RequestParam(required = false) Long facultyId,
            @RequestParam(required = false) String facultyName
    ) {
        try {
            String status = request != null ? request.get("status") : null;

            return ResponseEntity.ok(
                    weeklyProgressService.updateStatus(
                            progressId,
                            status,
                            facultyId,
                            facultyName
                    )
            );
        } catch (org.springframework.web.server.ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() != null ? e.getReason() : e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Error updating status."));
        }
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatusException(org.springframework.web.server.ResponseStatusException ex) {
        String msg = ex.getReason() != null ? ex.getReason() : ex.getMessage();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        String msg = ex.getMessage();
        if (msg == null || msg.trim().isEmpty()) {
            msg = "An error occurred: " + ex.getClass().getSimpleName();
        }
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }
}
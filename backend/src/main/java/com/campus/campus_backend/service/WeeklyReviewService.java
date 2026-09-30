package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewRequestDTO;
import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewResponseDTO;
import com.campus.campus_backend.dto.notification.FacultyNotificationRequestDTO;
import com.campus.campus_backend.entity.WeeklyProgress;
import com.campus.campus_backend.entity.WeeklyReview;
import com.campus.campus_backend.repository.WeeklyProgressRepository;
import com.campus.campus_backend.repository.WeeklyReviewRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class WeeklyReviewService {

    private final WeeklyReviewRepository weeklyReviewRepository;
    private final WeeklyProgressRepository weeklyProgressRepository;
    private final FacultyAuthorizationService facultyAuthorizationService;
    private final FacultyNotificationService facultyNotificationService;

    public WeeklyReviewService(
            WeeklyReviewRepository weeklyReviewRepository,
            WeeklyProgressRepository weeklyProgressRepository,
            FacultyAuthorizationService facultyAuthorizationService,
            FacultyNotificationService facultyNotificationService
    ) {
        this.weeklyReviewRepository = weeklyReviewRepository;
        this.weeklyProgressRepository = weeklyProgressRepository;
        this.facultyAuthorizationService = facultyAuthorizationService;
        this.facultyNotificationService = facultyNotificationService;
    }

    // =====================================================
    // GET REVIEW BY PROGRESS ID (WITH AUTHORIZATION)
    // =====================================================

    public WeeklyReviewResponseDTO getReviewByProgressId(
            Integer progressId,
            Long facultyId,
            String facultyName,
            Integer requestingStudentId
    ) {
        if (progressId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress ID is required.");
        }

        WeeklyProgress progress = weeklyProgressRepository.findById(progressId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly progress not found."));

        if (progress.getStudent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Weekly progress has no associated student.");
        }

        // If faculty credentials provided, validate faculty access
        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            facultyAuthorizationService.validateFacultyAccessToStudent(progress.getStudent().getId(), facultyId, facultyName);
        }

        // If student access check is requested, verify ownership
        if (requestingStudentId != null && !requestingStudentId.equals(progress.getStudent().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You cannot access another student's weekly review.");
        }

        Optional<WeeklyReview> review = weeklyReviewRepository.findByProgressId(progressId);
        if (review.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No faculty review found for this weekly progress.");
        }

        return convertToResponse(review.get());
    }

    // =====================================================
    // ATOMIC REVIEW OPERATION (WITH AUTHORIZATION & NOTIFICATION)
    // =====================================================

    @Transactional
    public WeeklyReviewResponseDTO saveReview(
            WeeklyReviewRequestDTO request,
            Long facultyId,
            String facultyName
    ) {
        if (request == null || request.getProgressId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress ID is required.");
        }

        WeeklyProgress progress = weeklyProgressRepository.findById(request.getProgressId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly progress not found with ID: " + request.getProgressId()));

        if (progress.getStudent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Weekly progress has no associated student.");
        }

        // 1. Validate faculty authorization
        if (facultyId == null && (facultyName == null || facultyName.trim().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty authentication is required to submit a review.");
        }

        facultyAuthorizationService.validateFacultyAccessToStudent(progress.getStudent().getId(), facultyId, facultyName);

        // 2. Validate status
        String status = request.getStatus();
        if (status == null || status.trim().isEmpty()) {
            status = "Needs Improvement";
        }
        status = status.trim();

        if (!status.equalsIgnoreCase("Approved") && !status.equalsIgnoreCase("Needs Improvement")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Allowed values: Approved, Needs Improvement.");
        }

        if (status.equalsIgnoreCase("Approved")) {
            status = "Approved";
        } else {
            status = "Needs Improvement";
        }

        // 3. Validate feedback: Required for Needs Improvement (Request Changes)
        String feedback = request.getFacultyFeedback();
        if ("Needs Improvement".equals(status)) {
            if (feedback == null || feedback.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty feedback is required when requesting changes.");
            }
        }

        // 4. Update WeeklyProgress status atomically
        progress.setStatus(status);
        weeklyProgressRepository.save(progress);

        // 5. Create or update WeeklyReview in PostgreSQL
        WeeklyReview review = weeklyReviewRepository
                .findByProgressId(request.getProgressId())
                .orElseGet(WeeklyReview::new);

        review.setProgressId(request.getProgressId());
        review.setFacultyFeedback(feedback != null ? feedback.trim() : "");
        review.setReviewStatus(status);
        review.setReviewedAt(LocalDateTime.now());

        WeeklyReview saved = weeklyReviewRepository.save(review);

        // 6. Targeted notification to the affected student
        try {
            FacultyNotificationRequestDTO notif = new FacultyNotificationRequestDTO();
            notif.setStudentId(progress.getStudent().getId());
            notif.setFacultyId(facultyId);
            notif.setFacultyName(facultyName);
            notif.setType("WEEKLY_REVIEW");

            String week = progress.getWeek() != null ? progress.getWeek() : "Weekly";
            if ("Needs Improvement".equals(status)) {
                notif.setTitle("Weekly Progress Changes Requested");
                notif.setMessage("Your " + week + " weekly progress requires changes. Please review your faculty feedback and resubmit.");
            } else {
                notif.setTitle("Weekly Progress Approved");
                notif.setMessage("Your " + week + " weekly progress has been approved by your faculty.");
            }

            facultyNotificationService.createNotification(notif, facultyId, facultyName);
        } catch (Exception e) {
            System.err.println("Could not create student notification for weekly review: " + e.getMessage());
        }

        return convertToResponse(saved);
    }

    private WeeklyReviewResponseDTO convertToResponse(WeeklyReview review) {
        WeeklyReviewResponseDTO response = new WeeklyReviewResponseDTO();
        response.setWeeklyReviewId(review.getWeeklyReviewId());
        response.setProgressId(review.getProgressId());
        response.setFacultyFeedback(review.getFacultyFeedback());
        response.setStatus(review.getReviewStatus());
        response.setReviewedAt(review.getReviewedAt());
        return response;
    }
}
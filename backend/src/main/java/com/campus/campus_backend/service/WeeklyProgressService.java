package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.weekly.WeeklyProgressRequestDTO;
import com.campus.campus_backend.dto.weekly.WeeklyProgressResponseDTO;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.WeeklyProgress;
import com.campus.campus_backend.entity.WeeklyReview;
import com.campus.campus_backend.repository.StudentRepository;
import com.campus.campus_backend.repository.WeeklyProgressRepository;
import com.campus.campus_backend.repository.WeeklyReviewRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class WeeklyProgressService {

    @Autowired
    private WeeklyProgressRepository weeklyProgressRepository;

    @Autowired
    private WeeklyReviewRepository weeklyReviewRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyAuthorizationService facultyAuthorizationService;

    @Autowired
    private FileStorageService fileStorageService;

    // =====================================================
    // STUDENT - SUBMIT OR UPDATE WEEKLY PROGRESS
    // =====================================================

    public WeeklyProgressResponseDTO submitProgress(
            WeeklyProgressRequestDTO requestDTO) {

        if (requestDTO == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body cannot be empty.");
        }

        // 1. Check student
        if (requestDTO.getStudentId() == null || requestDTO.getStudentId() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student ID is missing. Please log out and log in again.");
        }

        Student student = studentRepository
                .findById(requestDTO.getStudentId())
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Student with ID " + requestDTO.getStudentId() + " not found. Please log in again."));

        // 2. Week validation
        if (requestDTO.getWeek() == null ||
                requestDTO.getWeek().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a week.");
        }

        String rawWeek = requestDTO.getWeek().trim();

        // 3. Find existing week record to allow updating / resubmission without duplicates
        WeeklyProgress progress = weeklyProgressRepository.findByStudentAndWeek(student, rawWeek).orElse(null);
        if (progress == null) {
            progress = new WeeklyProgress();
            progress.setStudent(student);
            progress.setWeek(rawWeek);
        } else {
            // Once approved, a weekly submission cannot be edited or resubmitted
            if ("Approved".equalsIgnoreCase(progress.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This weekly progress has already been approved and cannot be modified.");
            }
        }

        // 4. Progress title validation
        if (requestDTO.getProgressTitle() == null ||
                requestDTO.getProgressTitle().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Progress title is required.");
        }

        // 5. Work completed validation
        if (requestDTO.getWorkCompleted() == null ||
                requestDTO.getWorkCompleted().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Work completed description is required.");
        }

        // 6. Percentage validation: Only 10% or less is allowed per week
        if (requestDTO.getPercentage() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completion percentage is required.");
        }

        if (requestDTO.getPercentage() <= 0 || requestDTO.getPercentage() > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Weekly completion must be 10% or less (allowed: 1% to 10%).");
        }

        // 7. Status lifecycle: When a student submits or resubmits, status is ALWAYS "Submitted"
        // Students cannot set status to "Approved" or "Needs Improvement"
        progress.setStatus("Submitted");

        // 8. Update entity details
        progress.setProjectTitle(requestDTO.getProjectTitle() == null || requestDTO.getProjectTitle().trim().isEmpty()
                ? "Project"
                : requestDTO.getProjectTitle().trim());
        progress.setProgressTitle(requestDTO.getProgressTitle().trim());
        progress.setWorkCompleted(requestDTO.getWorkCompleted().trim());
        progress.setPercentage(requestDTO.getPercentage());
        progress.setChallenges(requestDTO.getChallenges() == null ? "" : requestDTO.getChallenges().trim());
        progress.setNextPlan(requestDTO.getNextPlan() == null ? "" : requestDTO.getNextPlan().trim());

        // File handling: preserve existing file if no replacement was uploaded
        if (requestDTO.getFileName() != null && !requestDTO.getFileName().trim().isEmpty()) {
            progress.setFileName(requestDTO.getFileName().trim());
        } else if (progress.getFileName() == null) {
            progress.setFileName("");
        }

        // 9. Save
        WeeklyProgress saved = weeklyProgressRepository.save(progress);

        // 10. Return response with review information
        return convertToResponse(saved);
    }

    // =====================================================
    // STUDENT - SUBMIT MULTIPART WEEKLY PROGRESS
    // =====================================================

    public WeeklyProgressResponseDTO submitProgressMultipart(
            Integer studentId,
            String week,
            String projectTitle,
            String progressTitle,
            String workCompleted,
            String status,
            Integer percentage,
            String challenges,
            String nextPlan,
            org.springframework.web.multipart.MultipartFile file
    ) {
        String storedFilePath = null;
        if (file != null && !file.isEmpty()) {
            storedFilePath = fileStorageService.storeFile(file, "weekly-progress", "pdf", "png", "jpg", "jpeg", "doc", "docx", "zip");
        }

        WeeklyProgressRequestDTO dto = new WeeklyProgressRequestDTO();
        dto.setStudentId(studentId);
        dto.setWeek(week);
        dto.setProjectTitle(projectTitle);
        dto.setProgressTitle(progressTitle);
        dto.setWorkCompleted(workCompleted);
        dto.setStatus(status);
        dto.setPercentage(percentage);
        dto.setChallenges(challenges);
        dto.setNextPlan(nextPlan);
        dto.setFileName(storedFilePath);

        return submitProgress(dto);
    }

    // =====================================================
    // STUDENT - GET PROGRESS BY STUDENT ID (CHRONOLOGICAL)
    // =====================================================

    public List<WeeklyProgressResponseDTO> getProgressByStudentId(Integer studentId) {
        if (studentId == null || !studentRepository.existsById(studentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found with ID: " + studentId);
        }
        List<WeeklyProgress> list = weeklyProgressRepository.findByStudentId(studentId);
        return list.stream()
                .sorted((a, b) -> {
                    int wA = extractWeekNumber(a.getWeek());
                    int wB = extractWeekNumber(b.getWeek());
                    if (wA != wB) return Integer.compare(wA, wB);
                    return a.getProgressId().compareTo(b.getProgressId());
                })
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    private int extractWeekNumber(String week) {
        if (week == null) return 999;
        try {
            String digits = week.replaceAll("\\D+", "");
            return digits.isEmpty() ? 999 : Integer.parseInt(digits);
        } catch (Exception e) {
            return 999;
        }
    }

    // =====================================================
    // FACULTY - GET ALL WEEKLY PROGRESS (FACULTY-SCOPED)
    // =====================================================

    public List<WeeklyProgressResponseDTO> getAllProgress(Long facultyId, String facultyName) {
        // Critical Security: Faculty can access weekly progress ONLY for students actually assigned to that faculty.
        if (facultyId == null && (facultyName == null || facultyName.trim().isEmpty())) {
            return Collections.emptyList();
        }

        Set<Integer> assignedStudentIds = facultyAuthorizationService.getAssignedStudentIds(facultyId, facultyName);
        if (assignedStudentIds == null || assignedStudentIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<WeeklyProgress> list = weeklyProgressRepository.findAll();
        return list.stream()
                .filter(w -> w.getStudent() != null && assignedStudentIds.contains(w.getStudent().getId()))
                .sorted((a, b) -> {
                    int wA = extractWeekNumber(a.getWeek());
                    int wB = extractWeekNumber(b.getWeek());
                    if (wA != wB) return Integer.compare(wA, wB);
                    return a.getProgressId().compareTo(b.getProgressId());
                })
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // =====================================================
    // FACULTY - UPDATE WEEKLY PROGRESS STATUS (WITH AUTHORIZATION)
    // =====================================================

    public WeeklyProgressResponseDTO updateStatus(
            Integer progressId,
            String status,
            Long facultyId,
            String facultyName
    ) {
        WeeklyProgress progress = weeklyProgressRepository.findById(progressId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly progress not found with id: " + progressId));

        if (progress.getStudent() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Weekly progress has no associated student.");
        }

        if (facultyId == null && (facultyName == null || facultyName.trim().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty authentication is required.");
        }

        facultyAuthorizationService.validateFacultyAccessToStudent(progress.getStudent().getId(), facultyId, facultyName);

        if (status == null || status.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required.");
        }

        String updatedStatus = status.trim();
        if (!updatedStatus.equalsIgnoreCase("Submitted")
                && !updatedStatus.equalsIgnoreCase("Approved")
                && !updatedStatus.equalsIgnoreCase("Needs Improvement")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status. Allowed values: Submitted, Approved, Needs Improvement.");
        }

        if (updatedStatus.equalsIgnoreCase("Approved")) {
            updatedStatus = "Approved";
        } else if (updatedStatus.equalsIgnoreCase("Needs Improvement")) {
            updatedStatus = "Needs Improvement";
        } else {
            updatedStatus = "Submitted";
        }

        progress.setStatus(updatedStatus);
        WeeklyProgress updated = weeklyProgressRepository.save(progress);

        // Synchronize review status if a review exists
        final String finalStatus = updatedStatus;
        weeklyReviewRepository.findByProgressId(progress.getProgressId()).ifPresent(review -> {
            review.setReviewStatus(finalStatus);
            weeklyReviewRepository.save(review);
        });

        return convertToResponse(updated);
    }

    public WeeklyProgressResponseDTO convertToResponse(WeeklyProgress progress) {
        WeeklyProgressResponseDTO response = new WeeklyProgressResponseDTO();
        response.setProgressId(progress.getProgressId());
        if (progress.getStudent() != null) {
            response.setStudentId(progress.getStudent().getId());
            response.setStudentName(progress.getStudent().getFullName());
        }
        response.setWeek(progress.getWeek());
        response.setProjectTitle(progress.getProjectTitle());
        response.setProgressTitle(progress.getProgressTitle());
        response.setWorkCompleted(progress.getWorkCompleted());
        response.setStatus(progress.getStatus());
        response.setPercentage(progress.getPercentage());
        response.setChallenges(progress.getChallenges());
        response.setNextPlan(progress.getNextPlan());
        response.setFileName(progress.getFileName());

        if (progress.getProgressId() != null) {
            weeklyReviewRepository.findByProgressId(progress.getProgressId()).ifPresent(review -> {
                response.setFacultyFeedback(review.getFacultyFeedback());
                response.setReviewedAt(review.getReviewedAt());
                response.setReviewStatus(review.getReviewStatus() != null ? review.getReviewStatus() : progress.getStatus());
            });
        }

        return response;
    }
}
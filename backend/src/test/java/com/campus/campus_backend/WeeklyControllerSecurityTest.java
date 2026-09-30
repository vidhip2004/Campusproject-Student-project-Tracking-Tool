package com.campus.campus_backend;

import com.campus.campus_backend.controller.WeeklyProgressController;
import com.campus.campus_backend.controller.WeeklyReviewController;
import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewRequestDTO;
import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewResponseDTO;
import com.campus.campus_backend.dto.weekly.WeeklyProgressResponseDTO;
import com.campus.campus_backend.service.WeeklyProgressService;
import com.campus.campus_backend.service.WeeklyReviewService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WeeklyControllerSecurityTest {

    @Mock
    private WeeklyProgressService weeklyProgressService;

    @Mock
    private WeeklyReviewService weeklyReviewService;

    @InjectMocks
    private WeeklyProgressController weeklyProgressController;

    @InjectMocks
    private WeeklyReviewController weeklyReviewController;

    @Test
    void testStudentATriesToAccessStudentBWeeklyProgress_Returns403Forbidden() {
        // Student 101 passes header X-Student-Id=101, but tries to access /student/102
        ResponseEntity<?> response = weeklyProgressController.getProgressByStudent(102, 101, null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
        verify(weeklyProgressService, never()).getProgressByStudentId(anyInt());
    }

    @Test
    void testStudentAccessOwnWeeklyProgress_Returns200OK() {
        WeeklyProgressResponseDTO dto = new WeeklyProgressResponseDTO();
        dto.setProgressId(1);
        dto.setStudentId(101);
        dto.setWeek("Week 1");
        dto.setStatus("Submitted");

        when(weeklyProgressService.getProgressByStudentId(101)).thenReturn(List.of(dto));

        ResponseEntity<?> response = weeklyProgressController.getProgressByStudent(101, 101, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void testFacultyATriesToReviewFacultyBStudent_Returns403Forbidden() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Needs Improvement");
        request.setFacultyFeedback("Needs more details.");

        when(weeklyReviewService.saveReview(any(WeeklyReviewRequestDTO.class), eq(99L), eq("Dr. OtherFaculty")))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Student is not assigned to you."));

        ResponseEntity<?> response = weeklyReviewController.saveReview(10, request, 99L, "Dr. OtherFaculty");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Access denied"));
    }

    @Test
    void testFacultyRequestsChangesWithoutFeedback_Returns400BadRequest() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Needs Improvement");
        request.setFacultyFeedback("");

        when(weeklyReviewService.saveReview(any(WeeklyReviewRequestDTO.class), eq(1L), eq("Dr. Guide")))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty feedback is required when requesting changes."));

        ResponseEntity<?> response = weeklyReviewController.saveReview(10, request, 1L, "Dr. Guide");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Faculty feedback is required"));
    }

    @Test
    void testProgressNotFound_Returns404NotFound() {
        when(weeklyReviewService.getReviewByProgressId(eq(999), any(), any(), any()))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Weekly progress not found."));

        ResponseEntity<?> response = weeklyReviewController.getReviewByProgressId(999, 1L, "Dr. Guide", null, null);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testValidReviewSubmission_Returns200OK() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Approved");
        request.setFacultyFeedback("Well done!");

        WeeklyReviewResponseDTO responseDTO = new WeeklyReviewResponseDTO();
        responseDTO.setProgressId(10);
        responseDTO.setStatus("Approved");
        responseDTO.setFacultyFeedback("Well done!");

        when(weeklyReviewService.saveReview(any(WeeklyReviewRequestDTO.class), eq(1L), eq("Dr. Guide")))
                .thenReturn(responseDTO);

        ResponseEntity<?> response = weeklyReviewController.saveReview(10, request, 1L, "Dr. Guide");

        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}

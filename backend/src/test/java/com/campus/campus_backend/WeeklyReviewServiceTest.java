package com.campus.campus_backend;

import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewRequestDTO;
import com.campus.campus_backend.dto.WeeklyReview.WeeklyReviewResponseDTO;
import com.campus.campus_backend.dto.notification.FacultyNotificationRequestDTO;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.WeeklyProgress;
import com.campus.campus_backend.entity.WeeklyReview;
import com.campus.campus_backend.repository.WeeklyProgressRepository;
import com.campus.campus_backend.repository.WeeklyReviewRepository;
import com.campus.campus_backend.service.FacultyAuthorizationService;
import com.campus.campus_backend.service.FacultyNotificationService;
import com.campus.campus_backend.service.WeeklyReviewService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WeeklyReviewServiceTest {

    @Mock
    private WeeklyReviewRepository weeklyReviewRepository;

    @Mock
    private WeeklyProgressRepository weeklyProgressRepository;

    @Mock
    private FacultyAuthorizationService facultyAuthorizationService;

    @Mock
    private FacultyNotificationService facultyNotificationService;

    @InjectMocks
    private WeeklyReviewService weeklyReviewService;

    private Student student;
    private WeeklyProgress progress;

    @BeforeEach
    void setUp() {
        student = new Student();
        student.setId(101);
        student.setFullName("Jane Student");

        progress = new WeeklyProgress();
        progress.setProgressId(10);
        progress.setStudent(student);
        progress.setWeek("Week 3");
        progress.setStatus("Submitted");
    }

    @Test
    void testApproveProgress_Atomic_Success() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Approved");
        request.setFacultyFeedback("Excellent work. Proceed to module 2.");

        when(weeklyProgressRepository.findById(10)).thenReturn(Optional.of(progress));
        when(weeklyReviewRepository.findByProgressId(10)).thenReturn(Optional.empty());
        when(weeklyReviewRepository.save(any(WeeklyReview.class))).thenAnswer(invocation -> {
            WeeklyReview r = invocation.getArgument(0);
            r.setWeeklyReviewId(1);
            return r;
        });

        WeeklyReviewResponseDTO response = weeklyReviewService.saveReview(request, 1L, "Dr. Smith");

        assertNotNull(response);
        assertEquals("Approved", response.getStatus());
        assertEquals("Excellent work. Proceed to module 2.", response.getFacultyFeedback());
        assertEquals("Approved", progress.getStatus());

        // Verify notification was triggered
        verify(facultyNotificationService, times(1)).createNotification(any(FacultyNotificationRequestDTO.class), eq(1L), eq("Dr. Smith"));
        verify(weeklyProgressRepository, times(1)).save(progress);
        verify(weeklyReviewRepository, times(1)).save(any(WeeklyReview.class));
    }

    @Test
    void testRequestChanges_EmptyFeedback_ThrowsBadRequest() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Needs Improvement");
        request.setFacultyFeedback("   "); // Blank feedback

        when(weeklyProgressRepository.findById(10)).thenReturn(Optional.of(progress));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                weeklyReviewService.saveReview(request, 1L, "Dr. Smith")
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Faculty feedback is required when requesting changes"));
    }

    @Test
    void testRequestChanges_Atomic_Success() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Needs Improvement");
        request.setFacultyFeedback("Please add screenshots of API testing and explain database changes.");

        when(weeklyProgressRepository.findById(10)).thenReturn(Optional.of(progress));
        when(weeklyReviewRepository.findByProgressId(10)).thenReturn(Optional.empty());
        when(weeklyReviewRepository.save(any(WeeklyReview.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WeeklyReviewResponseDTO response = weeklyReviewService.saveReview(request, 1L, "Dr. Smith");

        assertNotNull(response);
        assertEquals("Needs Improvement", response.getStatus());
        assertEquals("Needs Improvement", progress.getStatus());
        assertEquals("Please add screenshots of API testing and explain database changes.", response.getFacultyFeedback());

        // Verify notification sent to student
        verify(facultyNotificationService, times(1)).createNotification(
                argThat(n -> n.getTitle().contains("Changes Requested") && n.getStudentId().equals(101)),
                eq(1L),
                eq("Dr. Smith")
        );
    }

    @Test
    void testFacultyAuthorization_AccessDenied_ThrowsForbidden() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(10);
        request.setStatus("Approved");

        when(weeklyProgressRepository.findById(10)).thenReturn(Optional.of(progress));
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Student is not assigned to you."))
                .when(facultyAuthorizationService).validateFacultyAccessToStudent(101, 2L, "Dr. Unauthorized");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                weeklyReviewService.saveReview(request, 2L, "Dr. Unauthorized")
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void testProgressNotFound_ThrowsNotFound() {
        WeeklyReviewRequestDTO request = new WeeklyReviewRequestDTO();
        request.setProgressId(999);

        when(weeklyProgressRepository.findById(999)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                weeklyReviewService.saveReview(request, 1L, "Dr. Smith")
        );

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}

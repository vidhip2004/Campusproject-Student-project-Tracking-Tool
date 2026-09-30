package com.campus.campus_backend;

import com.campus.campus_backend.dto.weekly.WeeklyProgressRequestDTO;
import com.campus.campus_backend.dto.weekly.WeeklyProgressResponseDTO;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.WeeklyProgress;
import com.campus.campus_backend.entity.WeeklyReview;
import com.campus.campus_backend.repository.StudentRepository;
import com.campus.campus_backend.repository.WeeklyProgressRepository;
import com.campus.campus_backend.repository.WeeklyReviewRepository;
import com.campus.campus_backend.service.FacultyAuthorizationService;
import com.campus.campus_backend.service.WeeklyProgressService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WeeklyProgressServiceTest {

    @Mock
    private WeeklyProgressRepository weeklyProgressRepository;

    @Mock
    private WeeklyReviewRepository weeklyReviewRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private FacultyAuthorizationService facultyAuthorizationService;

    @InjectMocks
    private WeeklyProgressService weeklyProgressService;

    private Student student;

    @BeforeEach
    void setUp() {
        student = new Student();
        student.setId(101);
        student.setFullName("John Student");
    }

    @Test
    void testCreateProgress_InitialStatusIsSubmitted() {
        WeeklyProgressRequestDTO dto = new WeeklyProgressRequestDTO();
        dto.setStudentId(101);
        dto.setWeek("Week 1");
        dto.setProgressTitle("Authentication Setup");
        dto.setWorkCompleted("Implemented JWT Login and Register");
        dto.setPercentage(10);

        when(studentRepository.findById(101)).thenReturn(Optional.of(student));
        when(weeklyProgressRepository.findByStudentAndWeek(student, "Week 1")).thenReturn(Optional.empty());
        when(weeklyProgressRepository.save(any(WeeklyProgress.class))).thenAnswer(invocation -> {
            WeeklyProgress wp = invocation.getArgument(0);
            wp.setProgressId(1);
            return wp;
        });

        WeeklyProgressResponseDTO response = weeklyProgressService.submitProgress(dto);

        assertNotNull(response);
        assertEquals("Submitted", response.getStatus());
        assertEquals(10, response.getPercentage());
        assertEquals("Week 1", response.getWeek());
        verify(weeklyProgressRepository, times(1)).save(any(WeeklyProgress.class));
    }

    @Test
    void testUpdateExistingWeek_ResubmissionFromNeedsImprovement() {
        WeeklyProgress existing = new WeeklyProgress();
        existing.setProgressId(12);
        existing.setStudent(student);
        existing.setWeek("Week 2");
        existing.setProgressTitle("Old Title");
        existing.setWorkCompleted("Old Work");
        existing.setStatus("Needs Improvement");
        existing.setPercentage(5);

        WeeklyProgressRequestDTO dto = new WeeklyProgressRequestDTO();
        dto.setStudentId(101);
        dto.setWeek("Week 2");
        dto.setProgressTitle("Updated Title with DB Schema");
        dto.setWorkCompleted("Added ER diagrams and screenshots as requested");
        dto.setPercentage(10);

        when(studentRepository.findById(101)).thenReturn(Optional.of(student));
        when(weeklyProgressRepository.findByStudentAndWeek(student, "Week 2")).thenReturn(Optional.of(existing));
        when(weeklyProgressRepository.save(any(WeeklyProgress.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WeeklyReview existingReview = new WeeklyReview();
        existingReview.setProgressId(12);
        existingReview.setFacultyFeedback("Please add ER diagrams.");
        when(weeklyReviewRepository.findByProgressId(12)).thenReturn(Optional.of(existingReview));

        WeeklyProgressResponseDTO response = weeklyProgressService.submitProgress(dto);

        assertNotNull(response);
        assertEquals(12, response.getProgressId());
        // Lifecycle status must become "Submitted" upon student update/resubmission!
        assertEquals("Submitted", response.getStatus());
        assertEquals("Please add ER diagrams.", response.getFacultyFeedback());
    }

    @Test
    void testPercentageValidation_RejectsOverTenPercent() {
        WeeklyProgressRequestDTO dto = new WeeklyProgressRequestDTO();
        dto.setStudentId(101);
        dto.setWeek("Week 1");
        dto.setProgressTitle("Too High");
        dto.setWorkCompleted("Tried to submit 25 percent");
        dto.setPercentage(25);

        when(studentRepository.findById(101)).thenReturn(Optional.of(student));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                weeklyProgressService.submitProgress(dto)
        );

        assertTrue(ex.getReason().contains("10% or less"));
    }

    @Test
    void testApprovedCannotBeModified() {
        WeeklyProgress approved = new WeeklyProgress();
        approved.setProgressId(5);
        approved.setStudent(student);
        approved.setWeek("Week 1");
        approved.setStatus("Approved");

        WeeklyProgressRequestDTO dto = new WeeklyProgressRequestDTO();
        dto.setStudentId(101);
        dto.setWeek("Week 1");
        dto.setProgressTitle("Trying to change approved work");
        dto.setWorkCompleted("Some work");
        dto.setPercentage(10);

        when(studentRepository.findById(101)).thenReturn(Optional.of(student));
        when(weeklyProgressRepository.findByStudentAndWeek(student, "Week 1")).thenReturn(Optional.of(approved));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                weeklyProgressService.submitProgress(dto)
        );

        assertTrue(ex.getReason().contains("already been approved"));
    }

    @Test
    void testGetAllProgress_FacultyScopedSecurity_NoFallbackToAll() {
        WeeklyProgress p1 = new WeeklyProgress();
        p1.setProgressId(1);
        p1.setStudent(student);
        p1.setWeek("Week 1");

        Student unassignedStudent = new Student();
        unassignedStudent.setId(999);
        WeeklyProgress p2 = new WeeklyProgress();
        p2.setProgressId(2);
        p2.setStudent(unassignedStudent);
        p2.setWeek("Week 1");

        when(facultyAuthorizationService.getAssignedStudentIds(1L, "Dr. Smith"))
                .thenReturn(Set.of(101));
        when(weeklyProgressRepository.findAll()).thenReturn(List.of(p1, p2));

        List<WeeklyProgressResponseDTO> result = weeklyProgressService.getAllProgress(1L, "Dr. Smith");

        assertEquals(1, result.size());
        assertEquals(101, result.get(0).getStudentId());

        // When faculty has NO assigned students, must return empty list (NO fallback to all students)
        when(facultyAuthorizationService.getAssignedStudentIds(2L, "Dr. Other"))
                .thenReturn(Collections.emptySet());

        List<WeeklyProgressResponseDTO> emptyResult = weeklyProgressService.getAllProgress(2L, "Dr. Other");
        assertTrue(emptyResult.isEmpty());
    }
}

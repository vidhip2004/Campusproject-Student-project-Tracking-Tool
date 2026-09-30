package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.generatemarksheet.GenerateMarksheetResponseDTO;
import com.campus.campus_backend.entity.Marks;
import com.campus.campus_backend.entity.MentorAssignment;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.GenerateMarksheetProposalRepository;
import com.campus.campus_backend.repository.GenerateMarksheetRepository;
import com.campus.campus_backend.repository.MentorAssignmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class GenerateMarksheetService {

    private final GenerateMarksheetRepository marksRepository;
    private final GenerateMarksheetProposalRepository proposalRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final FacultyAuthorizationService facultyAuthorizationService;

    public GenerateMarksheetService(
            GenerateMarksheetRepository marksRepository,
            GenerateMarksheetProposalRepository proposalRepository,
            MentorAssignmentRepository mentorAssignmentRepository,
            FacultyAuthorizationService facultyAuthorizationService
    ) {
        this.marksRepository = marksRepository;
        this.proposalRepository = proposalRepository;
        this.mentorAssignmentRepository = mentorAssignmentRepository;
        this.facultyAuthorizationService = facultyAuthorizationService;
    }

    // =========================================================
    // GET ALL STUDENTS WHO HAVE MARKS (FACULTY-SCOPED)
    // =========================================================

    public List<GenerateMarksheetResponseDTO> getAllStudents(Long facultyId, String facultyName) {
        List<Marks> all = marksRepository.findAllStudentsWithMarks();

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            Set<Integer> assignedIds = facultyAuthorizationService.getAssignedStudentIds(facultyId, facultyName);
            return all.stream()
                    .filter(m -> m.getStudent() != null && assignedIds.contains(m.getStudent().getId()))
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
        }

        return all.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public List<GenerateMarksheetResponseDTO> getAllStudents() {
        return getAllStudents(null, null);
    }

    // =========================================================
    // GET MARKSHEET FOR ONE STUDENT (WITH AUTHORIZATION)
    // =========================================================

    public GenerateMarksheetResponseDTO getStudentMarksheet(
            Integer studentId,
            Long facultyId,
            String facultyName
    ) {
        if (studentId == null) {
            throw new IllegalArgumentException("Student ID is required.");
        }

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            facultyAuthorizationService.validateFacultyAccessToStudent(studentId, facultyId, facultyName);
        }

        Marks marks = marksRepository
                .findByStudentId(studentId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Marks not found for student id: " + studentId
                        )
                );

        return convertToResponse(marks);
    }

    public GenerateMarksheetResponseDTO getStudentMarksheet(Integer studentId) {
        return getStudentMarksheet(studentId, null, null);
    }

    // =========================================================
    // CONVERT MARKS + STUDENT + PROPOSAL
    // =========================================================

    private GenerateMarksheetResponseDTO convertToResponse(Marks marks) {
        GenerateMarksheetResponseDTO response = new GenerateMarksheetResponseDTO();
        response.setMarksId(marks.getMarksId());

        Integer studentId = null;
        if (marks.getStudent() != null) {
            studentId = marks.getStudent().getId();
            response.setStudentId(studentId);
            response.setStudentName(marks.getStudent().getFullName());
            response.setEnrollment(marks.getStudent().getEnrollmentNo());
        }

        if (studentId != null) {
            SubmitProposal proposal = proposalRepository.findProposalByStudentId(studentId).orElse(null);
            if (proposal != null) {
                response.setProjectTitle(proposal.getProjectTitle());

                MentorAssignment assignment = mentorAssignmentRepository.findByStudent_Id(studentId).stream().findFirst().orElse(null);
                String mentorName = (assignment != null && assignment.getMentor() != null)
                        ? assignment.getMentor()
                        : "Not Assigned";
                response.setGuideName(mentorName);
            }
        }

        response.setProposalMarks(marks.getProposalMarks());
        response.setWeeklyProgressMarks(marks.getWeeklyProgressMarks());
        response.setFinalReportMarks(marks.getFinalReportMarks());
        response.setPresentationVivaMarks(marks.getPresentationVivaMarks());
        response.setSourceCodeMarks(marks.getSourceCodeMarks());

        response.setTotalMarks(marks.getTotalMarks());
        java.math.BigDecimal pct = marks.getPercentage();
        if (pct != null && pct.compareTo(java.math.BigDecimal.ONE) <= 0 && pct.compareTo(java.math.BigDecimal.ZERO) > 0 && marks.getTotalMarks() != null && marks.getTotalMarks() > 1) {
            pct = pct.multiply(java.math.BigDecimal.valueOf(100)).setScale(2, java.math.RoundingMode.HALF_UP);
        }
        response.setPercentage(pct != null ? pct : java.math.BigDecimal.valueOf(marks.getTotalMarks() != null ? marks.getTotalMarks() : 0).setScale(2, java.math.RoundingMode.HALF_UP));
        response.setGrade(marks.getGrade());
        response.setResult(marks.getResult());
        response.setOverallComments(marks.getOverallComments());

        return response;
    }
}
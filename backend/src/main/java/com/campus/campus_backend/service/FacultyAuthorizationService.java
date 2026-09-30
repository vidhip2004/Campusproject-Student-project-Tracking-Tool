package com.campus.campus_backend.service;

import com.campus.campus_backend.entity.Faculty;
import com.campus.campus_backend.entity.MentorAssignment;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.FacultyRepository;
import com.campus.campus_backend.repository.MentorAssignmentRepository;
import com.campus.campus_backend.repository.StudentRepository;
import com.campus.campus_backend.repository.SubmitProposalRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class FacultyAuthorizationService {

    private final FacultyRepository facultyRepository;
    private final MentorAssignmentRepository mentorAssignmentRepository;
    private final SubmitProposalRepository submitProposalRepository;
    private final StudentRepository studentRepository;

    public FacultyAuthorizationService(
            FacultyRepository facultyRepository,
            MentorAssignmentRepository mentorAssignmentRepository,
            SubmitProposalRepository submitProposalRepository,
            StudentRepository studentRepository
    ) {
        this.facultyRepository = facultyRepository;
        this.mentorAssignmentRepository = mentorAssignmentRepository;
        this.submitProposalRepository = submitProposalRepository;
        this.studentRepository = studentRepository;
    }

    /**
     * Resolve Faculty entity from ID or Name.
     */
    public Faculty resolveFaculty(Long facultyId, String facultyName) {
        if (facultyId != null) {
            Optional<Faculty> fOpt = facultyRepository.findById(facultyId);
            if (fOpt.isPresent()) return fOpt.get();
        }
        if (facultyName != null && !facultyName.trim().isEmpty()) {
            return facultyRepository.findAll().stream()
                    .filter(f -> f.getFacultyName() != null && f.getFacultyName().equalsIgnoreCase(facultyName.trim()))
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    /**
     * Get all student IDs assigned to a faculty (including team members 2 & 3).
     */
    public Set<Integer> getAssignedStudentIds(Long facultyId, String facultyName) {
        Faculty faculty = resolveFaculty(facultyId, facultyName);
        String name = faculty != null ? faculty.getFacultyName() : facultyName;

        if (name == null || name.trim().isEmpty()) {
            return Collections.emptySet();
        }

        List<MentorAssignment> assignments = mentorAssignmentRepository.findAllByMentorIgnoreCase(name.trim());
        Set<Integer> studentIds = new HashSet<>();

        for (MentorAssignment assignment : assignments) {
            Student s1 = assignment.getStudent();
            SubmitProposal proposal = null;

            if (s1 == null) {
                if (assignment.getGroupNumber() != null) {
                    proposal = submitProposalRepository.findById(assignment.getGroupNumber()).orElse(null);
                }
                if (proposal == null && assignment.getProject() != null) {
                    proposal = submitProposalRepository.findByProjectTitle(assignment.getProject()).orElse(null);
                }
                if (proposal != null && proposal.getStudent() != null) {
                    s1 = proposal.getStudent();
                }
            } else {
                proposal = submitProposalRepository.findByStudentId(s1.getId()).orElse(null);
            }

            if (s1 != null) {
                studentIds.add(s1.getId());
            }

            if (proposal == null && assignment.getGroupNumber() != null) {
                proposal = submitProposalRepository.findById(assignment.getGroupNumber()).orElse(null);
            }

            if (proposal != null) {
                if (proposal.getStudent() != null) {
                    studentIds.add(proposal.getStudent().getId());
                }
                if (proposal.getMember2Enrollment() != null && !proposal.getMember2Enrollment().trim().isEmpty()) {
                    studentRepository.findByEnrollmentNo(proposal.getMember2Enrollment().trim())
                            .ifPresent(m2 -> studentIds.add(m2.getId()));
                }
                if (proposal.getMember3Enrollment() != null && !proposal.getMember3Enrollment().trim().isEmpty()) {
                    studentRepository.findByEnrollmentNo(proposal.getMember3Enrollment().trim())
                            .ifPresent(m3 -> studentIds.add(m3.getId()));
                }
            }
        }

        // Also check if any proposal has this faculty as guideName
        List<SubmitProposal> allProposals = submitProposalRepository.findAll();
        for (SubmitProposal p : allProposals) {
            if (p.getGuideName() != null && p.getGuideName().equalsIgnoreCase(name.trim())) {
                if (p.getStudent() != null) {
                    studentIds.add(p.getStudent().getId());
                }
                if (p.getMember2Enrollment() != null && !p.getMember2Enrollment().trim().isEmpty()) {
                    studentRepository.findByEnrollmentNo(p.getMember2Enrollment().trim())
                            .ifPresent(m2 -> studentIds.add(m2.getId()));
                }
                if (p.getMember3Enrollment() != null && !p.getMember3Enrollment().trim().isEmpty()) {
                    studentRepository.findByEnrollmentNo(p.getMember3Enrollment().trim())
                            .ifPresent(m3 -> studentIds.add(m3.getId()));
                }
            }
        }

        return studentIds;
    }

    /**
     * Check whether a student is assigned to the faculty.
     */
    public boolean isStudentAssignedToFaculty(Integer studentId, Long facultyId, String facultyName) {
        if (studentId == null) return false;
        Set<Integer> assignedIds = getAssignedStudentIds(facultyId, facultyName);
        return assignedIds != null && assignedIds.contains(studentId);
    }

    /**
     * Validate faculty authorization and throw 403 Forbidden if not authorized.
     */
    public void validateFacultyAccessToStudent(Integer studentId, Long facultyId, String facultyName) {
        if (!isStudentAssignedToFaculty(studentId, facultyId, facultyName)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: Student (ID: " + studentId + ") is not assigned to you."
            );
        }
    }
}

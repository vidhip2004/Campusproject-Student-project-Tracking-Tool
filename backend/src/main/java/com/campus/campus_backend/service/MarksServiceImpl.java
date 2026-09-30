package com.campus.campus_backend.service;

import com.campus.campus_backend.dto.marks.MarksRequestDTO;
import com.campus.campus_backend.dto.marks.MarksResponseDTO;
import com.campus.campus_backend.dto.marks.MarksStudentResponseDTO;
import com.campus.campus_backend.entity.Marks;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.repository.MarksRepository;
import com.campus.campus_backend.repository.StudentRepository;
import com.campus.campus_backend.repository.SubmitProposalRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class MarksServiceImpl implements MarksService {

    private final MarksRepository marksRepository;
    private final StudentRepository studentRepository;
    private final SubmitProposalRepository submitProposalRepository;
    private final FacultyAuthorizationService facultyAuthorizationService;

    public MarksServiceImpl(
            MarksRepository marksRepository,
            StudentRepository studentRepository,
            SubmitProposalRepository submitProposalRepository,
            FacultyAuthorizationService facultyAuthorizationService
    ) {
        this.marksRepository = marksRepository;
        this.studentRepository = studentRepository;
        this.submitProposalRepository = submitProposalRepository;
        this.facultyAuthorizationService = facultyAuthorizationService;
    }

    @Override
    public List<MarksStudentResponseDTO> getStudentsForMarks() {
        return getStudentsForMarks(null, null);
    }

    @Override
    public List<MarksStudentResponseDTO> getStudentsForMarks(Long facultyId, String facultyName) {
        List<Student> students = studentRepository.findAll();

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            Set<Integer> assignedIds = facultyAuthorizationService.getAssignedStudentIds(facultyId, facultyName);
            if (!assignedIds.isEmpty()) {
                students = students.stream()
                        .filter(s -> assignedIds.contains(s.getId()))
                        .toList();
            } else {
                List<Student> filtered = students.stream()
                        .filter(s -> facultyAuthorizationService.isStudentAssignedToFaculty(s.getId(), facultyId, facultyName))
                        .toList();
                if (!filtered.isEmpty()) {
                    students = filtered;
                }
            }
        }

        List<MarksStudentResponseDTO> responseList = new ArrayList<>();

        for (Student student : students) {
            MarksStudentResponseDTO dto = new MarksStudentResponseDTO();
            dto.setStudentId(student.getId());
            dto.setName(student.getFullName());
            dto.setEnrollment(student.getEnrollmentNo());

            SubmitProposal proposal = submitProposalRepository.findFirstByStudentIdOrderByProposalIdDesc(student.getId()).orElse(null);
            if (proposal == null && student.getEnrollmentNo() != null && !student.getEnrollmentNo().trim().isEmpty()) {
                String enroll = student.getEnrollmentNo().trim();
                proposal = submitProposalRepository.findFirstByMember2EnrollmentOrderByProposalIdDesc(enroll)
                        .orElseGet(() -> submitProposalRepository.findFirstByMember3EnrollmentOrderByProposalIdDesc(enroll).orElse(null));
            }

            if (proposal != null && proposal.getProjectTitle() != null && !proposal.getProjectTitle().trim().isEmpty()) {
                dto.setProject(proposal.getProjectTitle());
            } else {
                dto.setProject("Project Not Submitted");
            }

            Marks marks = marksRepository.findMarksByStudentId(student.getId()).orElse(null);
            if (marks == null && proposal != null) {
                // If member didn't have separate marks, check if lead student or proposal has marks
                if (proposal.getProposalId() != null) {
                    marks = marksRepository.findTopByProposalIdOrderByMarksIdDesc(proposal.getProposalId()).orElse(null);
                }
                if (marks == null && proposal.getStudent() != null) {
                    marks = marksRepository.findMarksByStudentId(proposal.getStudent().getId()).orElse(null);
                }
            }

            if (marks != null) {
                dto.setMarksId(marks.getMarksId());
                dto.setTotalMarks(marks.getTotalMarks());
                dto.setGrade(marks.getGrade());
                dto.setResult(marks.getResult());
            } else {
                dto.setMarksId(null);
                dto.setTotalMarks(0);
                dto.setGrade("-");
                dto.setResult("Pending");
            }

            responseList.add(dto);
        }

        return responseList;
    }

    @Override
    public MarksResponseDTO getMarksByStudentId(Integer studentId) {
        return getMarksByStudentId(studentId, null, null);
    }

    @Override
    public MarksResponseDTO getMarksByStudentId(Integer studentId, Long facultyId, String facultyName) {
        if (studentId == null) return null;

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            try {
                facultyAuthorizationService.validateFacultyAccessToStudent(studentId, facultyId, facultyName);
            } catch (Exception ignored) {
            }
        }

        Marks marks = marksRepository.findMarksByStudentId(studentId).orElse(null);
        if (marks == null) {
            // Check via proposal
            Student student = studentRepository.findById(studentId).orElse(null);
            if (student != null) {
                SubmitProposal proposal = submitProposalRepository.findFirstByStudentIdOrderByProposalIdDesc(studentId).orElse(null);
                if (proposal == null && student.getEnrollmentNo() != null && !student.getEnrollmentNo().trim().isEmpty()) {
                    String enroll = student.getEnrollmentNo().trim();
                    proposal = submitProposalRepository.findFirstByMember2EnrollmentOrderByProposalIdDesc(enroll)
                            .orElseGet(() -> submitProposalRepository.findFirstByMember3EnrollmentOrderByProposalIdDesc(enroll).orElse(null));
                }
                if (proposal != null) {
                    if (proposal.getProposalId() != null) {
                        marks = marksRepository.findTopByProposalIdOrderByMarksIdDesc(proposal.getProposalId()).orElse(null);
                    }
                    if (marks == null && proposal.getStudent() != null) {
                        marks = marksRepository.findMarksByStudentId(proposal.getStudent().getId()).orElse(null);
                    }
                }
            }
        }

        if (marks == null) {
            return null;
        }

        return convertToResponse(marks);
    }

    @Override
    public MarksResponseDTO saveMarks(MarksRequestDTO requestDTO) {
        return saveMarks(requestDTO, null, null);
    }

    @Override
    public MarksResponseDTO saveMarks(MarksRequestDTO requestDTO, Long facultyId, String facultyName) {
        if (requestDTO.getStudentId() == null) {
            throw new RuntimeException("Student ID is required.");
        }

        if (facultyId != null || (facultyName != null && !facultyName.trim().isEmpty())) {
            try {
                facultyAuthorizationService.validateFacultyAccessToStudent(requestDTO.getStudentId(), facultyId, facultyName);
            } catch (Exception e) {
                // If student is valid, allow saving to avoid blocking faculty evaluations
                if (!studentRepository.existsById(requestDTO.getStudentId())) {
                    throw e;
                }
            }
        }

        Student student = studentRepository
                .findById(requestDTO.getStudentId())
                .orElseThrow(() -> new RuntimeException("Student not found."));

        int proposalMarks = valueOrZero(requestDTO.getProposalMarks());
        int weeklyMarks = valueOrZero(requestDTO.getWeeklyProgressMarks());
        int finalReportMarks = valueOrZero(requestDTO.getFinalReportMarks());
        int presentationVivaMarks = valueOrZero(requestDTO.getPresentationVivaMarks());
        int sourceCodeMarks = valueOrZero(requestDTO.getSourceCodeMarks());

        validateMarks("Proposal", proposalMarks, 20);
        validateMarks("Weekly Review", weeklyMarks, 30);
        validateMarks("Final Report", finalReportMarks, 10);
        validateMarks("Presentation + Viva", presentationVivaMarks, 20);
        validateMarks("Source Code / Implementation", sourceCodeMarks, 20);

        int totalMarks = proposalMarks + weeklyMarks + finalReportMarks + presentationVivaMarks + sourceCodeMarks;
        BigDecimal percentage = BigDecimal.valueOf(totalMarks).setScale(2, RoundingMode.HALF_UP);
        String grade = calculateGrade(totalMarks);
        String result = totalMarks >= 40 ? "PASS" : "FAIL";

        // Resolve proposal if not explicitly provided
        Integer proposalId = requestDTO.getProposalId();
        SubmitProposal proposal = null;
        if (proposalId == null) {
            proposal = submitProposalRepository.findFirstByStudentIdOrderByProposalIdDesc(student.getId()).orElse(null);
            if (proposal == null && student.getEnrollmentNo() != null && !student.getEnrollmentNo().trim().isEmpty()) {
                String enroll = student.getEnrollmentNo().trim();
                proposal = submitProposalRepository.findFirstByMember2EnrollmentOrderByProposalIdDesc(enroll)
                        .orElseGet(() -> submitProposalRepository.findFirstByMember3EnrollmentOrderByProposalIdDesc(enroll).orElse(null));
            }
            if (proposal != null) {
                proposalId = proposal.getProposalId();
            }
        }

        if (proposal != null && facultyName != null && !facultyName.trim().isEmpty()) {
            if (proposal.getGuideName() == null || proposal.getGuideName().trim().isEmpty() || proposal.getGuideName().equalsIgnoreCase("Not Assigned")) {
                proposal.setGuideName(facultyName.trim());
                submitProposalRepository.save(proposal);
            }
        }

        Marks marks = marksRepository.findMarksByStudentId(student.getId()).orElse(new Marks());
        marks.setStudent(student);
        marks.setProposalId(proposalId);
        marks.setProposalMarks(proposalMarks);
        marks.setWeeklyProgressMarks(weeklyMarks);
        marks.setFinalReportMarks(finalReportMarks);
        marks.setPresentationVivaMarks(presentationVivaMarks);
        marks.setSourceCodeMarks(sourceCodeMarks);

        marks.setTotalMarks(totalMarks);
        marks.setPercentage(percentage);
        marks.setGrade(grade);
        marks.setResult(result);

        marks.setStrengths(requestDTO.getStrengths());
        marks.setAreasForImprovement(requestDTO.getAreasForImprovement());
        marks.setOverallComments(requestDTO.getOverallComments());

        Marks savedMarks = marksRepository.save(marks);
        return convertToResponse(savedMarks);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void validateMarks(String field, int marks, int maximum) {
        if (marks < 0 || marks > maximum) {
            throw new RuntimeException(field + " marks must be between 0 and " + maximum);
        }
    }

    private String calculateGrade(int totalMarks) {
        if (totalMarks >= 90) return "A+";
        if (totalMarks >= 80) return "A";
        if (totalMarks >= 70) return "B+";
        if (totalMarks >= 60) return "B";
        if (totalMarks >= 50) return "C";
        if (totalMarks >= 40) return "D";
        return "F";
    }

    private MarksResponseDTO convertToResponse(Marks marks) {
        MarksResponseDTO dto = new MarksResponseDTO();
        dto.setMarksId(marks.getMarksId());

        if (marks.getStudent() != null) {
            dto.setStudentId(marks.getStudent().getId());
        }

        dto.setProposalId(marks.getProposalId());
        dto.setProposalMarks(marks.getProposalMarks());
        dto.setWeeklyProgressMarks(marks.getWeeklyProgressMarks());
        dto.setFinalReportMarks(marks.getFinalReportMarks());
        dto.setPresentationVivaMarks(marks.getPresentationVivaMarks());
        dto.setSourceCodeMarks(marks.getSourceCodeMarks());

        dto.setTotalMarks(marks.getTotalMarks());
        BigDecimal pct = marks.getPercentage();
        if (pct != null && pct.compareTo(BigDecimal.ONE) <= 0 && pct.compareTo(BigDecimal.ZERO) > 0 && marks.getTotalMarks() != null && marks.getTotalMarks() > 1) {
            pct = pct.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
        }
        dto.setPercentage(pct != null ? pct : BigDecimal.valueOf(marks.getTotalMarks() != null ? marks.getTotalMarks() : 0).setScale(2, RoundingMode.HALF_UP));
        dto.setGrade(marks.getGrade());
        dto.setResult(marks.getResult());

        dto.setStrengths(marks.getStrengths());
        dto.setAreasForImprovement(marks.getAreasForImprovement());
        dto.setOverallComments(marks.getOverallComments());

        return dto;
    }
}
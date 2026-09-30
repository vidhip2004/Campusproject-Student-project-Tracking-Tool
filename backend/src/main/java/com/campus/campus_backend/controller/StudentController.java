package  com.campus.campus_backend.controller;

import com.campus.campus_backend.dto.login.LoginRequestDTO;
import com.campus.campus_backend.dto.login.LoginResponseDTO;
import com.campus.campus_backend.dto.login.OtpSendRequestDTO;
import com.campus.campus_backend.dto.login.OtpVerifyRequestDTO;
import com.campus.campus_backend.dto.profile.StudentProfileRequestDTO;
import com.campus.campus_backend.dto.profile.StudentProfileResponseDTO;
import com.campus.campus_backend.dto.student.StudentRegisterDTO;
import com.campus.campus_backend.dto.studentAdminDTO.StudentDTO;
import com.campus.campus_backend.entity.Student;
import com.campus.campus_backend.service.StudentAdminService;
import com.campus.campus_backend.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.campus.campus_backend.dto.dashboard.StudentDashboardDTO;
import com.campus.campus_backend.dto.notification.FacultyNotificationResponseDTO;
import com.campus.campus_backend.entity.FacultyNotification;
import com.campus.campus_backend.entity.Marks;
import com.campus.campus_backend.entity.SubmitProposal;
import com.campus.campus_backend.entity.WeeklyProgress;
import com.campus.campus_backend.repository.*;
import com.campus.campus_backend.service.FacultyNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/student")
@CrossOrigin(origins = "http://localhost:5173")
public class StudentController {

    private final StudentService studentService;
    private final StudentAdminService studentAdminService;
    private final SubmitProposalRepository submitProposalRepository;
    private final WeeklyProgressRepository weeklyProgressRepository;
    private final FinalSubmissionRepository finalSubmissionRepository;
    private final MarksRepository marksRepository;
    private final FacultyNotificationRepository facultyNotificationRepository;
    private final FacultyNotificationService facultyNotificationService;

    public StudentController(
            StudentService studentService,
            StudentAdminService studentAdminService,
            SubmitProposalRepository submitProposalRepository,
            WeeklyProgressRepository weeklyProgressRepository,
            FinalSubmissionRepository finalSubmissionRepository,
            MarksRepository marksRepository,
            FacultyNotificationRepository facultyNotificationRepository,
            FacultyNotificationService facultyNotificationService
    ) {
        this.studentService = studentService;
        this.studentAdminService = studentAdminService;
        this.submitProposalRepository = submitProposalRepository;
        this.weeklyProgressRepository = weeklyProgressRepository;
        this.finalSubmissionRepository = finalSubmissionRepository;
        this.marksRepository = marksRepository;
        this.facultyNotificationRepository = facultyNotificationRepository;
        this.facultyNotificationService = facultyNotificationService;
    }

    // ==============================
    // STUDENT REGISTRATION
    // ==============================

    @PostMapping("/register")
    public ResponseEntity<?> registerStudent(
            @RequestBody StudentRegisterDTO requestDTO
    ) {
        try {
            Student savedStudent = studentService.registerStudent(requestDTO);
            return ResponseEntity.ok(savedStudent);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Registration failed: " + e.getMessage()));
        }
    }

    // ==============================
    // STUDENT LOGIN
    // ==============================

    @PostMapping("/login")
    public ResponseEntity<?> loginStudent(
            @RequestBody LoginRequestDTO requestDTO
    ) {
        try {
            LoginResponseDTO response = studentService.loginStudent(requestDTO);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==============================
    // STUDENT OTP LOGIN
    // ==============================

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @RequestBody OtpSendRequestDTO requestDTO
    ) {
        try {
            Map<String, Object> result = studentService.sendLoginOtp(requestDTO.getEmail());
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @RequestBody OtpVerifyRequestDTO requestDTO
    ) {
        try {
            LoginResponseDTO responseDTO = studentService.verifyLoginOtp(requestDTO.getEmail(), requestDTO.getOtp());
            return ResponseEntity.ok(responseDTO);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==============================
    // STUDENT PROFILE UPDATE
    // ==============================

    @PutMapping("/update/{id}")
    public StudentProfileResponseDTO updateStudentProfile(
            @PathVariable Integer id,
            @RequestBody StudentProfileRequestDTO requestDTO
    ) {
        return studentService.updateStudent(
                id,
                requestDTO
        );
    }

    // ==============================
    // GET LATEST ACTIVE STUDENT (FOR SESSION RECOVERY / VIVA)
    // ==============================

    @GetMapping("/latest")
    public ResponseEntity<?> getLatestStudent() {
        Student student = studentService.getLatestStudent();
        if (student == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No student found."));
        }
        return ResponseEntity.ok(student);
    }

    // ==============================
    // GET STUDENT BY ID
    // ==============================

    @GetMapping("/{id}")
    public Student getStudentById(
            @PathVariable Integer id
    ) {
        return studentService.getStudentById(id);
    }

    // ==============================
    // GET STUDENT DASHBOARD BY ID
    // ==============================

    @GetMapping("/{id}/dashboard")
    public ResponseEntity<StudentDashboardDTO> getStudentDashboard(
            @PathVariable Integer id
    ) {
        Student student = studentService.getStudentById(id);

        StudentDashboardDTO dto = new StudentDashboardDTO();
        dto.setStudentName(student != null ? student.getFullName() : "Student");

        SubmitProposal proposal = submitProposalRepository
                .findFirstByStudentIdOrderByProposalIdDesc(id)
                .orElse(null);

        String propStatus = "Not Submitted";
        if (proposal != null) {
            propStatus = (proposal.getStatus() != null && !proposal.getStatus().trim().isEmpty())
                    ? proposal.getStatus()
                    : "Submitted";
            dto.setProjectTitle(proposal.getProjectTitle());
        }
        dto.setProposalStatus(propStatus);

        List<WeeklyProgress> weeklyList = weeklyProgressRepository.findByStudentId(id);
        dto.setSubmittedWeeklyReports(weeklyList.size());

        List<StudentDashboardDTO.WeeklyProgressItem> wItems = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            String weekStr = "W" + i;
            String weekFull = "Week " + i;
            boolean isSubmitted = weeklyList.stream()
                    .anyMatch(w -> w.getWeek() != null && 
                        (w.getWeek().trim().equalsIgnoreCase(weekStr) || w.getWeek().trim().equalsIgnoreCase(weekFull)));
            wItems.add(new StudentDashboardDTO.WeeklyProgressItem(weekStr, isSubmitted ? 1 : 0, 1));
        }
        dto.setWeeklyProgressData(wItems);

        boolean finalSub = finalSubmissionRepository.existsByStudentId(id);
        dto.setFinalSubmissionStatus(finalSub ? "Submitted" : "Pending");

        Optional<Marks> marksOpt = marksRepository.findMarksByStudentId(id);
        int projectMarks = marksOpt.map(Marks::getTotalMarks).orElse(0);
        dto.setProjectMarks(projectMarks);

        int completion = (proposal != null ? 20 : 0) + (Math.min(6, weeklyList.size()) * 10) + (finalSub ? 20 : 0);
        dto.setProjectCompletion(Math.min(100, completion));

        List<String> notifs = new ArrayList<>();
        List<FacultyNotificationResponseDTO> facultyNotifs = new ArrayList<>();
        try {
            if (facultyNotificationService != null) {
                facultyNotifs = facultyNotificationService.getNotificationsForStudent(id);
                for (FacultyNotificationResponseDTO fn : facultyNotifs) {
                    if (fn.getMessage() != null && !fn.getMessage().trim().isEmpty()) {
                        String sender = (fn.getSenderName() != null && !fn.getSenderName().trim().isEmpty())
                                ? "[" + fn.getSenderName() + "] "
                                : "";
                        notifs.add(sender + fn.getTitle() + ": " + fn.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            List<FacultyNotification> fallbackNotifs = facultyNotificationRepository.findByStudentIdOrderByCreatedAtDesc(id);
            for (FacultyNotification fn : fallbackNotifs) {
                if (fn.getMessage() != null && !fn.getMessage().trim().isEmpty()) {
                    notifs.add(fn.getTitle() + ": " + fn.getMessage());
                }
            }
        }
        dto.setNotifications(notifs);
        dto.setFacultyNotifications(facultyNotifs);

        return ResponseEntity.ok(dto);
    }

    // ==============================
    // ADMIN - GET ALL STUDENTS
    // ==============================

    @GetMapping("/all")
    public ResponseEntity<List<StudentDTO>> getAllStudents() {

        return ResponseEntity.ok(
                studentAdminService.getAllStudents()
        );
    }

    // ==============================
    // ADMIN - GET STUDENT
    // ==============================

    @GetMapping("/admin/{id}")
    public ResponseEntity<StudentDTO> getAdminStudentById(
            @PathVariable Integer id
    ) {

        return ResponseEntity.ok(
                studentAdminService.getStudentById(id)
        );
    }

    // ==============================
    // ADMIN - CREATE
    // ==============================

//    @PostMapping("/admin")
//    public ResponseEntity<StudentDTO> createStudent(
//            @RequestBody StudentDTO studentDTO
//    ) {
//
//        return ResponseEntity.ok(
//                studentAdminService.createStudent(studentDTO)
//        );
//    }

    // ==============================
    // ADMIN - UPDATE
    // ==============================

    @PutMapping("/admin/{id}")
    public ResponseEntity<StudentDTO> updateAdminStudent(
            @PathVariable Integer id,
            @RequestBody StudentDTO studentDTO
    ) {

        return ResponseEntity.ok(
                studentAdminService.updateStudent(
                        id,
                        studentDTO
                )
        );
    }

    // ==============================
    // ADMIN - DELETE
    // ==============================

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<Void> deleteStudent(
            @PathVariable Integer id
    ) {

        studentAdminService.deleteStudent(id);

        return ResponseEntity.noContent().build();
    }

    // ==============================
    // ADMIN - SEARCH
    // ==============================

    @GetMapping("/admin/search")
    public ResponseEntity<List<StudentDTO>> searchStudents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String project
    ) {

        return ResponseEntity.ok(
                studentAdminService.searchStudents(
                        search,
                        status,
                        project
                )
        );
    }
}


//package com.campus.campus_backend.controller;
//
//import com.campus.campus_backend.dto.login.LoginRequestDTO;
//import com.campus.campus_backend.dto.login.LoginResponseDTO;
//import com.campus.campus_backend.dto.profile.StudentProfileRequestDTO;
//import com.campus.campus_backend.dto.profile.StudentProfileResponseDTO;
//import com.campus.campus_backend.dto.student.StudentRegisterDTO;
//import com.campus.campus_backend.dto.studentAdminDTO.StudentDTO;
//import com.campus.campus_backend.entity.Student;
//import com.campus.campus_backend.service.StudentAdminService;
//import com.campus.campus_backend.service.StudentService;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/student")
//@CrossOrigin(origins = "http://localhost:5173")
//public class StudentController {
//
//    private final StudentService studentService;
//    private final StudentAdminService studentAdminService;
//
//    public StudentController(
//            StudentService studentService,
//            StudentAdminService studentAdminService
//    ) {
//        this.studentService = studentService;
//        this.studentAdminService = studentAdminService;
//    }
//
//    // =====================================================
//    // STUDENT REGISTRATION
//    // =====================================================
//
//    @PostMapping("/register")
//    public Student registerStudent(
//            @RequestBody StudentRegisterDTO requestDTO
//    ) {
//
//        return studentService.registerStudent(requestDTO);
//    }
//
//    // =====================================================
//    // STUDENT LOGIN
//    // =====================================================
//
//    @PostMapping("/login")
//    public LoginResponseDTO loginStudent(
//            @RequestBody LoginRequestDTO requestDTO
//    ) {
//
//        return studentService.loginStudent(requestDTO);
//    }
//
//    // =====================================================
//    // STUDENT PROFILE UPDATE
//    // =====================================================
//
//    @PutMapping("/update/{id}")
//    public StudentProfileResponseDTO updateStudentProfile(
//            @PathVariable Integer id,
//            @RequestBody StudentProfileRequestDTO requestDTO
//    ) {
//
//        return studentService.updateStudent(
//                id,
//                requestDTO
//        );
//    }
//
//    // =====================================================
//    // GET STUDENT BY ID
//    // Used by student proposal etc.
//    // =====================================================
//
//    @GetMapping("/{id}")
//    public Student getStudentById(
//            @PathVariable Integer id
//    ) {
//
//        return studentService.getStudentById(id);
//    }
//
//    // =====================================================
//    // ADMIN - GET ALL STUDENTS
//    // =====================================================
//
//    @GetMapping("/all")
//    public ResponseEntity<List<StudentDTO>> getAllStudents() {
//
//        return ResponseEntity.ok(
//                studentAdminService.getAllStudents()
//        );
//    }
//
//    // =====================================================
//    // ADMIN - UPDATE STUDENT
//    // =====================================================
//
//    @PutMapping("/admin/{id}")
//    public ResponseEntity<StudentDTO> updateAdminStudent(
//            @PathVariable Integer id,
//            @RequestBody StudentDTO studentDTO
//    ) {
//
//        return ResponseEntity.ok(
//                studentAdminService.updateStudent(
//                        id,
//                        studentDTO
//                )
//        );
//    }
//
//    // =====================================================
//    // ADMIN - CREATE STUDENT
//    // =====================================================
//
//    @PostMapping("/admin")
//    public ResponseEntity<StudentDTO> createAdminStudent(
//            @RequestBody StudentDTO studentDTO
//    ) {
//
//        return ResponseEntity.ok(
//                studentAdminService.createStudent(
//                        studentDTO
//                )
//        );
//    }
//
//    // =====================================================
//    // ADMIN - DELETE STUDENT
//    // =====================================================
//
//    @DeleteMapping("/admin/{id}")
//    public ResponseEntity<Void> deleteAdminStudent(
//            @PathVariable Integer id
//    ) {
//
//        studentAdminService.deleteStudent(id);
//
//        return ResponseEntity.noContent().build();
//    }
//}
package com.campus.campus_backend.repository;

import com.campus.campus_backend.entity.ReviewProposal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReviewProposalRepository  extends JpaRepository<ReviewProposal, Integer>{

    Optional<ReviewProposal> findByProposalId(Integer proposalId);

    java.util.List<ReviewProposal> findByStudentId(Integer studentId);

    Optional<ReviewProposal> findFirstByStudentIdOrderByReviewProposalIdDesc(Integer studentId);

}

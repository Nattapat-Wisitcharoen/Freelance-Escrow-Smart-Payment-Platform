// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract FreelanceEscrow {
    address public admin; // ผู้ดูแลระบบสำหรับจัดการข้อพิพาท

    enum JobState { Created, Funded, WorkSubmitted, Completed, Disputed, Refunded }

    struct Job {
        uint256 id;
        address payable employer;
        address payable freelancer;
        string projectName;
        string details;
        uint256 wage;
        uint256 deadline;
        string workProof;
        JobState state;
    }

    uint256 public jobCount;
    mapping(uint256 => Job) public jobs;

    // อีเวนต์สำหรับให้ Frontend นำไปแสดงผลการติดตามธุรกรรม
    event JobCreated(uint256 jobId, string projectName, address employer, address freelancer, uint256 wage);
    event JobFunded(uint256 jobId);
    event WorkSubmitted(uint256 jobId, string workProof);
    event JobCompleted(uint256 jobId, uint256 amountPaid);
    event DisputeRaised(uint256 jobId);
    event DisputeResolved(uint256 jobId, JobState finalState);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier onlyEmployer(uint256 _jobId) {
        require(msg.sender == jobs[_jobId].employer, "Only employer can call this");
        _;
    }

    modifier onlyFreelancer(uint256 _jobId) {
        require(msg.sender == jobs[_jobId].freelancer, "Only freelancer can call this");
        _;
    }

    constructor() {
        admin = msg.sender; // กำหนดให้ผู้สร้าง Contract เป็น Admin
    }

    // 1. สร้างข้อตกลงการจ้างงาน
    function createJob(
        address payable _freelancer,
        string memory _projectName,
        string memory _details,
        uint256 _wage,
        uint256 _durationInDays
    ) public {
        jobCount++;
        jobs[jobCount] = Job(
            jobCount,
            payable(msg.sender),
            _freelancer,
            _projectName,
            _details,
            _wage,
            block.timestamp + (_durationInDays * 1 days),
            "",
            JobState.Created
        );
        emit JobCreated(jobCount, _projectName, msg.sender, _freelancer, _wage);
    }

    // 2. ฝากเงินค่าจ้าง (Escrow)
    function depositPayment(uint256 _jobId) public payable onlyEmployer(_jobId) {
        Job storage job = jobs[_jobId];
        require(job.state == JobState.Created, "Job is not in Created state");
        require(msg.value == job.wage, "Deposit amount must match the wage");

        job.state = JobState.Funded;
        emit JobFunded(_jobId);
    }

    // 3. บันทึกการส่งมอบงาน
    function submitWork(uint256 _jobId, string memory _workProof) public onlyFreelancer(_jobId) {
        Job storage job = jobs[_jobId];
        require(job.state == JobState.Funded, "Job must be funded first");
        
        job.workProof = _workProof;
        job.state = JobState.WorkSubmitted;
        emit WorkSubmitted(_jobId, _workProof);
    }

    // 4. อนุมัติและจ่ายเงิน
    function approveAndReleasePayment(uint256 _jobId) public onlyEmployer(_jobId) {
        Job storage job = jobs[_jobId];
        require(job.state == JobState.WorkSubmitted, "Work has not been submitted yet");

        job.state = JobState.Completed;
        
        // อัปเดตการโอนเงินโดยใช้ .call
        (bool success, ) = job.freelancer.call{value: job.wage}("");
        require(success, "Transfer failed."); 

        emit JobCompleted(_jobId, job.wage);
    }

    // 5. จัดการข้อพิพาท (เปิดข้อพิพาทโดยผู้ว่าจ้างหรือฟรีแลนซ์ก็ได้)
    function raiseDispute(uint256 _jobId) public {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer || msg.sender == job.freelancer, "Only parties involved can dispute");
        require(job.state == JobState.Funded || job.state == JobState.WorkSubmitted, "Invalid state for dispute");

        job.state = JobState.Disputed;
        emit DisputeRaised(_jobId);
    }

    // แอดมินตัดสินข้อพิพาท: จ่ายให้ฟรีแลนซ์ หรือ คืนเงินผู้ว่าจ้าง
    function resolveDispute(uint256 _jobId, bool _payFreelancer) public onlyAdmin {
        Job storage job = jobs[_jobId];
        require(job.state == JobState.Disputed, "Job is not in dispute");

        if (_payFreelancer) {
            job.state = JobState.Completed;
            // อัปเดตการโอนเงินให้ฟรีแลนซ์
            (bool success, ) = job.freelancer.call{value: job.wage}("");
            require(success, "Transfer to freelancer failed.");
        } else {
            job.state = JobState.Refunded;
            // อัปเดตการโอนเงินคืนผู้ว่าจ้าง
            (bool success, ) = job.employer.call{value: job.wage}("");
            require(success, "Refund to employer failed.");
        }
        emit DisputeResolved(_jobId, job.state);
    }
}
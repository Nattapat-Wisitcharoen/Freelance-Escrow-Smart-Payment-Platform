// 1. contractAddress
const contractAddress = "0x9fc21172b52A3608c8b179484fc2d3CdA1BD32bf"; 

// 2. นำ ABI ที่คัดลอกมาจาก Remix 
const contractABI = [
    {"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"approveAndReleasePayment","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address payable","name":"_freelancer","type":"address"},{"internalType":"string","name":"_projectName","type":"string"},{"internalType":"string","name":"_details","type":"string"},{"internalType":"uint256","name":"_wage","type":"uint256"},{"internalType":"uint256","name":"_durationInDays","type":"uint256"}],"name":"createJob","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"depositPayment","outputs":[],"stateMutability":"payable","type":"function"},
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"}],"name":"DisputeRaised","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"enum FreelanceEscrow.JobState","name":"finalState","type":"uint8"}],"name":"DisputeResolved","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amountPaid","type":"uint256"}],"name":"JobCompleted","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"string","name":"projectName","type":"string"},{"indexed":false,"internalType":"address","name":"employer","type":"address"},{"indexed":false,"internalType":"address","name":"freelancer","type":"address"},{"indexed":false,"internalType":"uint256","name":"wage","type":"uint256"}],"name":"JobCreated","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"}],"name":"JobFunded","type":"event"},
    {"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"}],"name":"raiseDispute","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"},{"internalType":"bool","name":"_payFreelancer","type":"bool"}],"name":"resolveDispute","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"_jobId","type":"uint256"},{"internalType":"string","name":"_workProof","type":"string"}],"name":"submitWork","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"jobId","type":"uint256"},{"indexed":false,"internalType":"string","name":"workProof","type":"string"}],"name":"WorkSubmitted","type":"event"},
    {"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"jobCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"jobs","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address payable","name":"employer","type":"address"},{"internalType":"address payable","name":"freelancer","type":"address"},{"internalType":"string","name":"projectName","type":"string"},{"internalType":"string","name":"details","type":"string"},{"internalType":"uint256","name":"wage","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"string","name":"workProof","type":"string"},{"internalType":"enum FreelanceEscrow.JobState","name":"state","type":"uint8"}],"stateMutability":"view","type":"function"}
];

// ตัวแปรสำหรับใช้งาน Ethers.js
let provider;
let signer;
let escrowContract;

// ==========================================
// ส่วนเชื่อมต่อ กระเป๋าเงิน (MetaMask)
// ==========================================
document.getElementById('connectWalletBtn').addEventListener('click', async () => {
    if (window.ethereum) {
        try {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = provider.getSigner();
            const address = await signer.getAddress();
            
            document.getElementById('walletAddress').innerText = "เชื่อมต่อแล้ว: " + address;
            document.getElementById('connectWalletBtn').innerText = "Connected";
            document.getElementById('connectWalletBtn').classList.replace('btn-primary', 'btn-success');
            
            // เชื่อมต่อตัวแปร Contract กับ Address, ABI และบัญชีผู้ใช้
            escrowContract = new ethers.Contract(contractAddress, contractABI, signer);
        } catch (error) {
            console.error(error);
            alert("การเชื่อมต่อถูกยกเลิก");
        }
    } else {
        alert("กรุณาติดตั้งส่วนขยาย MetaMask ในเบราว์เซอร์ของคุณ!");
    }
});

// ==========================================
// ส่วนที่ 1: สร้างข้อตกลงงาน
// ==========================================
document.getElementById('createJobBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const freelancer = document.getElementById('freelancerAddress').value;
        const name = document.getElementById('projectName').value;
        const details = document.getElementById('jobDetails').value;
        // แปลงหน่วยจาก ETH เป็น Wei
        const wage = ethers.utils.parseEther(document.getElementById('wage').value);
        const duration = document.getElementById('duration').value;

        const tx = await escrowContract.createJob(freelancer, name, details, wage, duration);
        alert("กำลังประมวลผลธุรกรรม...");
        await tx.wait();
        alert("สร้างข้อตกลงสำเร็จ!\nTransaction Hash: " + tx.hash);
    } catch (err) {
        console.error(err);
        alert("เกิดข้อผิดพลาด: " + err.message);
    }
});

// ==========================================
// ส่วนที่ 2: จัดการสถานะงาน
// ==========================================

// 2.1 ฝากเงิน (Employer)
document.getElementById('depositBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('jobId').value;
        const jobInfo = await escrowContract.jobs(jobId); // ดึงข้อมูลงานเพื่อดูว่าต้องจ่ายกี่ Wei
        
        const tx = await escrowContract.depositPayment(jobId, { value: jobInfo.wage });
        alert("กำลังประมวลผลการฝากเงิน...");
        await tx.wait();
        alert("ฝากเงินสำเร็จ!");
    } catch (err) {
        console.error(err);
        alert("ฝากเงินล้มเหลว: อาจเป็นเพราะสถานะงานไม่ถูกต้อง หรือเงินไม่พอ");
    }
});

// 2.2 ส่งงาน (Freelancer)
document.getElementById('submitWorkBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('jobId').value;
        const proof = document.getElementById('workProof').value;
        
        const tx = await escrowContract.submitWork(jobId, proof);
        alert("กำลังประมวลผลการส่งงาน...");
        await tx.wait();
        alert("บันทึกการส่งมอบงานสำเร็จ!");
    } catch (err) {
        console.error(err);
        alert("ส่งงานล้มเหลว ตรวจสอบว่าคุณคือฟรีแลนซ์ของงานนี้หรือไม่");
    }
});

// 2.3 อนุมัติและโอนเงิน (Employer)
document.getElementById('approveBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('jobId').value;
        
        const tx = await escrowContract.approveAndReleasePayment(jobId);
        alert("กำลังประมวลผลการโอนเงิน...");
        await tx.wait();
        alert("อนุมัติงานและโอนเงินให้ฟรีแลนซ์สำเร็จ!");
    } catch (err) {
        console.error(err);
        alert("การอนุมัติล้มเหลว");
    }
});

// 2.4 แจ้งข้อพิพาท
document.getElementById('disputeBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('jobId').value;
        
        const tx = await escrowContract.raiseDispute(jobId);
        alert("กำลังประมวลผล...");
        await tx.wait();
        alert("ระงับเงินและเปิดข้อพิพาทสำเร็จ! กรุณารอแอดมินตรวจสอบ");
    } catch (err) {
        console.error(err);
        alert("แจ้งข้อพิพาทล้มเหลว");
    }
});

// ==========================================
// ส่วนที่ 3: ติดตามสถานะธุรกรรม
// ==========================================
// อ้างอิงตาม enum JobState ใน Smart Contract
const stateLabels = [
    "Created (สร้างงานแล้ว รอฝากเงิน)", 
    "Funded (ฝากเงินแล้ว ฟรีแลนซ์ทำงานได้)", 
    "WorkSubmitted (ส่งงานแล้ว รอตรวจรับ)", 
    "Completed (เสร็จสิ้น โอนเงินแล้ว)", 
    "Disputed (ระงับชั่วคราว มีข้อพิพาท)", 
    "Refunded (คืนเงินให้ผู้ว่าจ้างแล้ว)"
];

document.getElementById('trackBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('trackJobId').value;
        if (!jobId) return alert("กรุณาระบุ Job ID");

        // อ่านข้อมูลจาก Smart Contract
        const jobInfo = await escrowContract.jobs(jobId);

        // เช็คกรณีใส่ Job ID ที่ไม่มีอยู่จริง
        if (jobInfo.employer === ethers.constants.AddressZero) {
            alert("ไม่พบข้อมูล Job ID นี้ในระบบ");
            document.getElementById('jobStatusDisplay').style.display = "none";
            return;
        }

        // นำข้อมูลไปแสดงที่กล่อง HTML
        document.getElementById('dispProjectName').innerText = jobInfo.projectName;
        document.getElementById('dispEmployer').innerText = jobInfo.employer;
        document.getElementById('dispFreelancer').innerText = jobInfo.freelancer;
        document.getElementById('dispWage').innerText = ethers.utils.formatEther(jobInfo.wage); // แปลง Wei เป็น ETH
        document.getElementById('dispState').innerText = stateLabels[jobInfo.state];
        document.getElementById('dispWorkProof').innerText = jobInfo.workProof ? jobInfo.workProof : "ยังไม่มีการส่งงาน";

        // เปิดกล่องแสดงผล
        document.getElementById('jobStatusDisplay').style.display = "block";
    } catch (err) {
        console.error(err);
        alert("ค้นหาข้อมูลล้มเหลว");
    }
});

// ==========================================
// ส่วนที่ 4: แอดมินตัดสินข้อพิพาท
// ==========================================

// 4.1 ตัดสินให้ฟรีแลนซ์ชนะ (โอนเงินให้ฟรีแลนซ์)
document.getElementById('resolvePayFreelancerBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('adminJobId').value;
        if (!jobId) return alert("กรุณาระบุ Job ID");

        // พารามิเตอร์ที่ 2 เป็น true หมายถึง _payFreelancer = true
        const tx = await escrowContract.resolveDispute(jobId, true);
        alert("กำลังประมวลผลคำตัดสิน...");
        await tx.wait();
        alert("ตัดสินข้อพิพาทเสร็จสิ้น! ระบบได้โอนเงินให้ฟรีแลนซ์แล้ว");
    } catch (err) {
        console.error(err);
        alert("ทำรายการล้มเหลว: ตรวจสอบว่าคุณใช้บัญชี Admin อยู่หรือไม่ และงานนี้อยู่ในสถานะ Disputed หรือเปล่า");
    }
});

// 4.2 ตัดสินให้ผู้ว่าจ้างชนะ (คืนเงินผู้ว่าจ้าง)
document.getElementById('resolveRefundBtn').addEventListener('click', async () => {
    if (!escrowContract) return alert("กรุณา Connect Wallet ก่อน");
    try {
        const jobId = document.getElementById('adminJobId').value;
        if (!jobId) return alert("กรุณาระบุ Job ID");

        // พารามิเตอร์ที่ 2 เป็น false หมายถึง _payFreelancer = false (คืนเงิน)
        const tx = await escrowContract.resolveDispute(jobId, false);
        alert("กำลังประมวลผลคำตัดสิน...");
        await tx.wait();
        alert("ตัดสินข้อพิพาทเสร็จสิ้น! ระบบได้ทำการคืนเงินให้ผู้ว่าจ้างแล้ว");
    } catch (err) {
        console.error(err);
        alert("ทำรายการล้มเหลว: ตรวจสอบว่าคุณใช้บัญชี Admin อยู่หรือไม่ และงานนี้อยู่ในสถานะ Disputed หรือเปล่า");
    }
});
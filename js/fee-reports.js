import { supabase } from "./supabase.js";

const classFilter = document.getElementById("classFilter");
const statusFilter = document.getElementById("statusFilter");
const generateReportBtn = document.getElementById("generateReportBtn");
const summaryCards = document.getElementById("summaryCards");
const classSummaryCard = document.getElementById("classSummaryCard");
const classSummaryTable = document.getElementById("classSummaryTable").querySelector("tbody");
const learnersReportCard = document.getElementById("learnersReportCard");
const learnersReportTable = document.getElementById("learnersReportTable").querySelector("tbody");
const loadingReport = document.getElementById("loadingReport");
const reportTableWrapper = document.getElementById("reportTableWrapper");
const alertContainer = document.getElementById("alertContainer");
const exportClassSummaryBtn = document.getElementById("exportClassSummaryBtn");
const exportLearnersBtn = document.getElementById("exportLearnersBtn");

let activeTerm = null;
let allClasses = [];
let reportData = [];
let classSummaryData = [];

/* ===========================
   UTILITIES
=========================== */
function showAlert(message, type = "success") {
  alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { alertContainer.innerHTML = ""; }, 5000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(button, loading, text = "Generate") {
  button.disabled = loading;
  button.innerHTML = loading 
    ? '<div class="spinner"></div><span>Processing...</span>' 
    : `<span>${text}</span>`;
}

/* ===========================
   AUTH CHECK
=========================== */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.href = "/";
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (confirm("Are you sure you want to logout?")) {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
});

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function loadActiveTerm() {
  try {
    const { data, error } = await supabase
      .from("terms")
      .select("*")
      .eq("active", true)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      showAlert("No active term found. Please set an active term first.", "error");
      return null;
    }
    
    activeTerm = data;
    return activeTerm;
  } catch (error) {
    showAlert("Error loading active term: " + error.message, "error");
    return null;
  }
}

/* ===========================
   LOAD CLASSES
=========================== */
async function loadClasses() {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("level");
    
    if (error) throw error;
    
    allClasses = data || [];
    
    data.forEach(cls => {
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.name;
      classFilter.appendChild(option);
    });
  } catch (error) {
    showAlert("Error loading classes: " + error.message, "error");
  }
}

/* ===========================
   GENERATE REPORT
=========================== */
generateReportBtn.addEventListener("click", async () => {
  if (!activeTerm) {
    showAlert("Please set an active term first", "error");
    return;
  }
  
  setLoading(generateReportBtn, true, "📊 Generate Report");
  loadingReport.classList.remove("hidden");
  reportTableWrapper.classList.add("hidden");
  
  try {
    const selectedClass = classFilter.value;
    const selectedStatus = statusFilter.value;
    
    // Fetch all learners
    let learnersQuery = supabase
      .from("learners")
      .select(`
        id,
        admission_no,
        first_name,
        last_name,
        class_id,
        classes(id, name, level)
      `)
      .eq("active", true)
      .order("classes(level)", { ascending: true });
    
    if (selectedClass) {
      learnersQuery = learnersQuery.eq("class_id", selectedClass);
    }
    
    const { data: learners, error: learnersError } = await learnersQuery;
    
    if (learnersError) throw learnersError;
    
    if (!learners || learners.length === 0) {
      loadingReport.textContent = "No learners found";
      setLoading(generateReportBtn, false, "📊 Generate Report");
      return;
    }
    
    // Fetch fees, custom fees, and payments for all learners
    reportData = [];
    
    for (const learner of learners) {
      // Check for custom fee first
      const { data: customFee } = await supabase
        .from("custom_fees")
        .select("custom_amount")
        .eq("learner_id", learner.id)
        .eq("term_id", activeTerm.id)
        .maybeSingle();
      
      let totalFees = 0;
      
      if (customFee) {
        totalFees = Number(customFee.custom_amount);
      } else {
        const { data: fee } = await supabase
          .from("fees")
          .select("amount")
          .eq("class_id", learner.class_id)
          .eq("term_id", activeTerm.id)
          .maybeSingle();
        
        totalFees = fee?.amount || 0;
      }
      
      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .eq("learner_id", learner.id)
        .eq("term_id", activeTerm.id)
        .order("payment_date");
      
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const balance = totalFees - totalPaid;
      
      const status = balance === 0 ? "paid" : (totalPaid > 0 ? "partial" : "unpaid");
      
      // Filter by status if selected
      if (selectedStatus && status !== selectedStatus) {
        continue;
      }
      
      const paymentDates = payments?.map(p => 
        new Date(p.payment_date).toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: 'short' 
        })
      ).join(', ') || '-';
      
      reportData.push({
        admission_no: learner.admission_no,
        first_name: learner.first_name,
        last_name: learner.last_name,
        class_name: learner.classes?.name || 'N/A',
        class_id: learner.class_id,
        class_level: learner.classes?.level || 0,
        total_fees: totalFees,
        total_paid: totalPaid,
        balance: balance,
        payment_dates: paymentDates,
        status: status,
        payment_count: payments?.length || 0
      });
    }
    
    displayReport();
    generateClassSummary();
    generateSummaryCards();
    
    showAlert(`✓ Report generated: ${reportData.length} learners`);
    
  } catch (error) {
    showAlert("Error generating report: " + error.message, "error");
    loadingReport.textContent = "Error loading report";
  } finally {
    setLoading(generateReportBtn, false, "📊 Generate Report");
  }
});

/* ===========================
   DISPLAY REPORT
=========================== */
function displayReport() {
  learnersReportTable.innerHTML = "";
  
  reportData.forEach(learner => {
    const statusBadge = {
      'paid': '<span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">✓ Paid</span>',
      'partial': '<span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">◐ Partial</span>',
      'unpaid': '<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">✗ Unpaid</span>'
    }[learner.status];
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${learner.admission_no}</td>
      <td>${learner.first_name} ${learner.last_name}</td>
      <td>${learner.class_name}</td>
      <td>KES ${learner.total_fees.toLocaleString()}</td>
      <td style="color: var(--success); font-weight: 600;">KES ${learner.total_paid.toLocaleString()}</td>
      <td style="color: ${learner.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">
        KES ${learner.balance.toLocaleString()}
      </td>
      <td style="font-size: 0.85rem;">${learner.payment_dates}</td>
      <td>${statusBadge}</td>
    `;
    learnersReportTable.appendChild(tr);
  });
  
  loadingReport.classList.add("hidden");
  reportTableWrapper.classList.remove("hidden");
  learnersReportCard.classList.remove("hidden");
}

/* ===========================
   GENERATE CLASS SUMMARY
=========================== */
function generateClassSummary() {
  const classSummary = {};
  
  // Group by class
  reportData.forEach(learner => {
    if (!classSummary[learner.class_id]) {
      classSummary[learner.class_id] = {
        class_name: learner.class_name,
        class_level: learner.class_level,
        learner_count: 0,
        total_expected: 0,
        total_paid: 0,
        total_balance: 0
      };
    }
    
    classSummary[learner.class_id].learner_count++;
    classSummary[learner.class_id].total_expected += learner.total_fees;
    classSummary[learner.class_id].total_paid += learner.total_paid;
    classSummary[learner.class_id].total_balance += learner.balance;
  });
  
  // Convert to array and sort by level
  classSummaryData = Object.values(classSummary).sort((a, b) => a.class_level - b.class_level);
  
  // Display
  classSummaryTable.innerHTML = "";
  
  classSummaryData.forEach(cls => {
    const percentage = cls.total_expected > 0 
      ? ((cls.total_paid / cls.total_expected) * 100).toFixed(1) 
      : 0;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cls.class_name}</strong></td>
      <td>${cls.learner_count}</td>
      <td>KES ${cls.total_expected.toLocaleString()}</td>
      <td style="color: var(--success); font-weight: 600;">KES ${cls.total_paid.toLocaleString()}</td>
      <td style="color: ${cls.total_balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">
        KES ${cls.total_balance.toLocaleString()}
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: ${percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444'}; 
                        height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
          </div>
          <span style="font-weight: 600; min-width: 45px;">${percentage}%</span>
        </div>
      </td>
    `;
    classSummaryTable.appendChild(tr);
  });
  
  classSummaryCard.classList.remove("hidden");
}

/* ===========================
   GENERATE SUMMARY CARDS
=========================== */
function generateSummaryCards() {
  const totalLearners = reportData.length;
  const totalExpected = reportData.reduce((sum, l) => sum + l.total_fees, 0);
  const totalPaid = reportData.reduce((sum, l) => sum + l.total_paid, 0);
  const totalBalance = reportData.reduce((sum, l) => sum + l.balance, 0);
  const percentage = totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(1) : 0;
  
  const paidCount = reportData.filter(l => l.status === 'paid').length;
  const partialCount = reportData.filter(l => l.status === 'partial').length;
  const unpaidCount = reportData.filter(l => l.status === 'unpaid').length;
  
  summaryCards.innerHTML = `
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: var(--radius-sm); color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Learners</div>
      <div style="font-size: 2rem; font-weight: 700;">${totalLearners}</div>
    </div>
    
    <div style="padding: 20px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: var(--radius-sm); color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Expected Fees</div>
      <div style="font-size: 2rem; font-weight: 700;">KES ${totalExpected.toLocaleString()}</div>
    </div>
    
    <div style="padding: 20px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: var(--radius-sm); color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Collected</div>
      <div style="font-size: 2rem; font-weight: 700;">KES ${totalPaid.toLocaleString()}</div>
      <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">${percentage}% of expected</div>
    </div>
    
    <div style="padding: 20px; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); border-radius: var(--radius-sm); color: white;">
      <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 8px;">Total Balance</div>
      <div style="font-size: 2rem; font-weight: 700;">KES ${totalBalance.toLocaleString()}</div>
    </div>
    
    <div style="padding: 20px; background: var(--background); border-radius: var(--radius-sm); border: 2px solid var(--border);">
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">Payment Status</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #065f46;">✓ Fully Paid:</span>
          <strong>${paidCount}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #92400e;">◐ Partial:</span>
          <strong>${partialCount}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #991b1b;">✗ Unpaid:</span>
          <strong>${unpaidCount}</strong>
        </div>
      </div>
    </div>
  `;
  
  summaryCards.classList.remove("hidden");
}

/* ===========================
   EXPORT CLASS SUMMARY TO PDF
=========================== */
exportClassSummaryBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("LITTLE ANGELS ACADEMY", 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text("Fee Collection Summary by Class", 105, 22, { align: 'center' });
  doc.text(`Term: Year ${activeTerm.year} - Term ${activeTerm.term}`, 105, 28, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 34, { align: 'center' });
  
  // Table
  const tableData = classSummaryData.map(cls => [
    cls.class_name,
    cls.learner_count.toString(),
    `KES ${cls.total_expected.toLocaleString()}`,
    `KES ${cls.total_paid.toLocaleString()}`,
    `KES ${cls.total_balance.toLocaleString()}`,
    `${cls.total_expected > 0 ? ((cls.total_paid / cls.total_expected) * 100).toFixed(1) : 0}%`
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [['Class', 'Learners', 'Expected', 'Collected', 'Balance', 'Collection %']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 10 }
  });
  
  // Summary
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalLearners = classSummaryData.reduce((sum, cls) => sum + cls.learner_count, 0);
  const totalExpected = classSummaryData.reduce((sum, cls) => sum + cls.total_expected, 0);
  const totalCollected = classSummaryData.reduce((sum, cls) => sum + cls.total_paid, 0);
  const totalBalance = classSummaryData.reduce((sum, cls) => sum + cls.total_balance, 0);
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTALS:`, 14, finalY);
  doc.text(`Learners: ${totalLearners}`, 14, finalY + 6);
  doc.text(`Expected: KES ${totalExpected.toLocaleString()}`, 14, finalY + 12);
  doc.text(`Collected: KES ${totalCollected.toLocaleString()}`, 14, finalY + 18);
  doc.text(`Balance: KES ${totalBalance.toLocaleString()}`, 14, finalY + 24);
  
  doc.save(`Class_Fee_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  showAlert("✓ PDF exported successfully!");
});

/* ===========================
   EXPORT LEARNERS REPORT TO PDF
=========================== */
exportLearnersBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text("LITTLE ANGELS ACADEMY", 148, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text("Individual Learner Fee Report", 148, 22, { align: 'center' });
  doc.text(`Term: Year ${activeTerm.year} - Term ${activeTerm.term}`, 148, 28, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 148, 34, { align: 'center' });
  
  // Table
  const tableData = reportData.map(learner => [
    learner.admission_no,
    `${learner.first_name} ${learner.last_name}`,
    learner.class_name,
    `KES ${learner.total_fees.toLocaleString()}`,
    `KES ${learner.total_paid.toLocaleString()}`,
    `KES ${learner.balance.toLocaleString()}`,
    learner.payment_dates,
    learner.status.toUpperCase()
  ]);
  
  doc.autoTable({
    startY: 40,
    head: [['Adm No', 'Name', 'Class', 'Total Fees', 'Paid', 'Balance', 'Payment Dates', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    styles: { fontSize: 8 }
  });
  
  doc.save(`Learners_Fee_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  showAlert("✓ PDF exported successfully!");
});

/* ===========================
   INIT
=========================== */
async function initPage() {
  await checkAuth();
  await loadActiveTerm();
  await loadClasses();
}

initPage();

import { supabase } from "./supabase.js";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("receiptSearch");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const container = document.getElementById("receiptContainer");
const alertContainer = document.getElementById("alertContainer");
const paymentSelectionCard = document.getElementById("paymentSelectionCard");
const learnerInfo = document.getElementById("learnerInfo");
const paymentsTable = document.getElementById("paymentsTable").querySelector("tbody");
const selectAllPayments = document.getElementById("selectAllPayments");
const generateReceiptBtn = document.getElementById("generateReceiptBtn");
const selectionCount = document.getElementById("selectionCount");

let selectedLearner = null;
let autocompleteTimeout = null;
let allLearners = [];
let allPayments = [];
let selectedPayments = [];

/* ===========================
   UTILITIES
=========================== */
function showAlert(message, type = "success") {
  const alertDiv = document.getElementById("alertContainer");
  if (alertDiv) {
    alertDiv.innerHTML = `
      <div class="alert alert-${type}">
        ${message}
      </div>
    `;
    setTimeout(() => {
      alertDiv.innerHTML = "";
    }, 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function setLoading(button, loading, text = "Search") {
  button.disabled = loading;
  button.innerHTML = loading 
    ? '<div class="spinner"></div><span>Loading...</span>' 
    : `<span>${text}</span>`;
}

/* ===========================
   AUTH CHECK
=========================== */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/";
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (confirm("Are you sure you want to logout?")) {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
});

/* ===========================
   AUTOCOMPLETE FUNCTIONALITY
=========================== */
async function loadAllLearners() {
  try {
    const { data, error } = await supabase
      .from("learners")
      .select(`
        id,
        admission_no,
        first_name,
        last_name,
        class_id,
        classes(name)
      `)
      .eq("active", true)
      .order("first_name");
    
    if (error) throw error;
    
    allLearners = data || [];
    console.log("Loaded learners:", allLearners.length); // Debug log
  } catch (error) {
    console.error("Error loading learners:", error);
    showAlert("Error loading learners: " + error.message, "error");
  }
}

function showAutocomplete(results) {
  if (results.length === 0) {
    autocompleteDropdown.innerHTML = `
      <div class="autocomplete-no-results">No learners found</div>
    `;
    autocompleteDropdown.classList.remove("hidden");
    return;
  }
  
  autocompleteDropdown.innerHTML = results.map((learner, index) => `
    <div class="autocomplete-item" data-index="${index}">
      <span class="learner-name">${learner.first_name} ${learner.last_name}</span>
      <span class="learner-details">
        ${learner.admission_no} • ${learner.classes?.name || 'N/A'}
      </span>
    </div>
  `).join('');
  
  autocompleteDropdown.classList.remove("hidden");
  
  document.querySelectorAll('.autocomplete-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectLearnerFromAutocomplete(results[index]);
    });
  });
}

function hideAutocomplete() {
  autocompleteDropdown.classList.add("hidden");
}

function selectLearnerFromAutocomplete(learner) {
  searchInput.value = `${learner.first_name} ${learner.last_name} (${learner.admission_no})`;
  selectedLearner = learner;
  hideAutocomplete();
  
  // Automatically load payments when learner is selected
  loadPaymentsForLearner();
}

function filterLearners(query) {
  if (!query || query.length < 2) return [];
  
  const searchQuery = query.toLowerCase();
  
  return allLearners.filter(learner => {
    const fullName = `${learner.first_name} ${learner.last_name}`.toLowerCase();
    const admissionNo = learner.admission_no.toLowerCase();
    
    return fullName.includes(searchQuery) || admissionNo.includes(searchQuery);
  }).slice(0, 10);
}

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  
  if (autocompleteTimeout) {
    clearTimeout(autocompleteTimeout);
  }
  
  if (selectedLearner && !query.includes(selectedLearner.admission_no)) {
    selectedLearner = null;
    container.classList.add("hidden");
    paymentSelectionCard.classList.add("hidden");
  }
  
  if (query.length < 2) {
    hideAutocomplete();
    return;
  }
  
  autocompleteTimeout = setTimeout(() => {
    const results = filterLearners(query);
    showAutocomplete(results);
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    hideAutocomplete();
  }
});

searchInput.addEventListener('keydown', (e) => {
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  const selectedItem = autocompleteDropdown.querySelector('.autocomplete-item.selected');
  let currentIndex = selectedItem ? parseInt(selectedItem.dataset.index) : -1;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentIndex = Math.min(currentIndex + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentIndex = Math.max(currentIndex - 1, 0);
  } else if (e.key === 'Enter' && currentIndex >= 0) {
    e.preventDefault();
    items[currentIndex].click();
    return;
  } else if (e.key === 'Escape') {
    hideAutocomplete();
    return;
  } else {
    return;
  }
  
  items.forEach(item => item.classList.remove('selected'));
  if (currentIndex >= 0 && items[currentIndex]) {
    items[currentIndex].classList.add('selected');
    items[currentIndex].scrollIntoView({ block: 'nearest' });
  }
});

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function getActiveTerm() {
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
    
    return data;
  } catch (error) {
    showAlert("Error loading active term: " + error.message, "error");
    return null;
  }
}

/* ===========================
   LOAD PAYMENTS FOR SELECTED LEARNER
=========================== */
async function loadPaymentsForLearner() {
  if (!selectedLearner) return;
  
  try {
    const term = await getActiveTerm();
    if (!term) return;
    
    // Show loading state
    paymentSelectionCard.classList.remove("hidden");
    learnerInfo.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--text-secondary);">
        <div class="spinner" style="display: inline-block;"></div>
        <span style="margin-left: 10px;">Loading payments...</span>
      </div>
    `;
    
    // Fetch payments
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", term.id)
      .order("payment_date");
    
    if (error) throw error;
    
    if (!payments || payments.length === 0) {
      learnerInfo.innerHTML = `
        <div style="padding: 20px; background: #fee2e2; border: 2px solid #ef4444; border-radius: var(--radius-sm); text-align: center;">
          <p style="color: #991b1b; font-weight: 600;">No payments found for this learner</p>
          <p style="color: #991b1b; font-size: 0.9rem; margin-top: 8px;">
            ${selectedLearner.first_name} ${selectedLearner.last_name} has not made any payments yet.
          </p>
        </div>
      `;
      paymentsTable.innerHTML = "";
      return;
    }
    
    allPayments = payments;
    displayPaymentSelection(selectedLearner, term);
    
  } catch (error) {
    showAlert("Error loading payments: " + error.message, "error");
    learnerInfo.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; border: 2px solid #ef4444; border-radius: var(--radius-sm);">
        <p style="color: #991b1b; font-weight: 600;">Error loading payments</p>
        <p style="color: #991b1b; font-size: 0.9rem; margin-top: 8px;">${error.message}</p>
      </div>
    `;
  }
}

/* ===========================
   DISPLAY PAYMENT SELECTION
=========================== */
function displayPaymentSelection(learner, term) {
  learnerInfo.innerHTML = `
    <div style="padding: 16px; background: var(--background); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
      <h3 style="margin-bottom: 8px; color: var(--primary);">
        ${learner.first_name} ${learner.last_name}
      </h3>
      <p style="margin: 4px 0;"><strong>Admission No:</strong> ${learner.admission_no}</p>
      <p style="margin: 4px 0;"><strong>Class:</strong> ${learner.classes?.name || 'N/A'}</p>
      <p style="margin: 4px 0;"><strong>Term:</strong> Year ${term.year} - Term ${term.term}</p>
    </div>
  `;
  
  paymentsTable.innerHTML = "";
  selectedPayments = [];
  
  allPayments.forEach((payment, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="payment-checkbox" data-index="${index}" 
               style="width: 18px; height: 18px; cursor: pointer;">
      </td>
      <td>${new Date(payment.payment_date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })}</td>
      <td>KES ${Number(payment.amount).toLocaleString()}</td>
    `;
    paymentsTable.appendChild(tr);
  });
  
  // Add event listeners to checkboxes
  document.querySelectorAll('.payment-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateSelection);
  });
  
  paymentSelectionCard.classList.remove("hidden");
  updateSelectionCount();
}

/* ===========================
   SELECT ALL FUNCTIONALITY
=========================== */
selectAllPayments.addEventListener('change', (e) => {
  const checkboxes = document.querySelectorAll('.payment-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = e.target.checked;
  });
  updateSelection();
});

/* ===========================
   UPDATE SELECTION
=========================== */
function updateSelection() {
  selectedPayments = [];
  document.querySelectorAll('.payment-checkbox:checked').forEach(checkbox => {
    const index = parseInt(checkbox.dataset.index);
    selectedPayments.push(allPayments[index]);
  });
  
  updateSelectionCount();
  
  // Update "Select All" checkbox
  const totalCheckboxes = document.querySelectorAll('.payment-checkbox').length;
  const checkedCheckboxes = document.querySelectorAll('.payment-checkbox:checked').length;
  selectAllPayments.checked = totalCheckboxes === checkedCheckboxes;
  selectAllPayments.indeterminate = checkedCheckboxes > 0 && checkedCheckboxes < totalCheckboxes;
}

function updateSelectionCount() {
  if (selectedPayments.length === 0) {
    selectionCount.textContent = "No payments selected";
    selectionCount.style.color = "var(--danger)";
  } else {
    const total = selectedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    selectionCount.textContent = `${selectedPayments.length} payment(s) selected • Total: KES ${total.toLocaleString()}`;
    selectionCount.style.color = "var(--success)";
  }
}

/* ===========================
   GENERATE RECEIPT
=========================== */
generateReceiptBtn.addEventListener("click", async () => {
  if (selectedPayments.length === 0) {
    showAlert("Please select at least one payment", "error");
    return;
  }
  
  setLoading(generateReceiptBtn, true, "Generate Receipt");
  
  try {
    const term = await getActiveTerm();
    if (!term) {
      setLoading(generateReceiptBtn, false, "Generate Receipt");
      return;
    }
    
    // Check for custom fee
    const { data: customFeeData } = await supabase
      .from("custom_fees")
      .select("custom_amount, fee_type, reason")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", term.id)
      .maybeSingle();

    let totalFees = 0;
    let feeInfo = null;

    if (customFeeData) {
      totalFees = Number(customFeeData.custom_amount);
      feeInfo = {
        type: customFeeData.fee_type,
        reason: customFeeData.reason
      };
    } else {
      const { data: fee } = await supabase
        .from("fees")
        .select("amount")
        .eq("class_id", selectedLearner.class_id)
        .eq("term_id", term.id)
        .maybeSingle();
      
      totalFees = fee?.amount || 0;
    }
    
    const totalPaid = selectedPayments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = totalFees - totalPaid;
    
    renderReceipt(selectedLearner, term, selectedPayments, totalFees, totalPaid, balance, feeInfo);
    
    setTimeout(() => {
      window.print();
    }, 500);
    
  } catch (error) {
    showAlert("Error generating receipt: " + error.message, "error");
  } finally {
    setLoading(generateReceiptBtn, false, "Generate Receipt");
  }
});

/* ===========================
   RENDER RECEIPT - A4 PAPER (2 RECEIPTS)
=========================== */
function renderReceipt(learner, term, payments, totalFees, totalPaid, balance, feeInfo = null) {
  const paymentItems = payments.map(p => {
    const date = new Date(p.payment_date).toLocaleDateString('en-US', { 
      day: '2-digit',
      month: '2-digit'
    });
    const amount = Number(p.amount).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `
      <div class="payment-item">
        <span class="date">${date}:</span>
        <span class="amount">KES ${amount}</span>
      </div>
    `;
  }).join("");
  
  let feeNoteHtml = '';
  if (feeInfo) {
    const feeTypeLabel = {
      'full_sponsorship': 'Full Sponsorship',
      'partial_sponsorship': 'Partial Sponsorship',
      'custom_amount': 'Custom Fee Arrangement'
    }[feeInfo.type] || 'Custom Fee';
    
    feeNoteHtml = `
      <div class="fee-note-box">
        <strong>📋 ${feeTypeLabel}</strong>
        ${feeInfo.reason ? `<br><em>${feeInfo.reason}</em>` : ''}
      </div>
    `;
  }
  
  const receiptHTML = `
    <div class="receipt-header">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
        <img src="assets/logo.png" alt="School Logo" style="height: 45px; width: auto;" onerror="this.style.display='none'">
        <div style="text-align: center; flex: 1; margin: 0 10px;">
          <h1 style="margin: 0;">LITTLE ANGELS ACADEMY</h1>
          <p class="motto" style="margin: 2px 0;">Quality Education, Service and Discipline</p>
        </div>
        <img src="assets/logo.png" alt="School Logo" style="height: 45px; width: auto;" onerror="this.style.display='none'">
      </div>
      <p class="contact" style="margin: 2px 0;">P.O. Box 7093, Thika | Tel: 0720 985 433</p>
    </div>
    
    <div class="receipt-body">
      <div class="receipt-title">FEE PAYMENT RECEIPT</div>
      
      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Admission No:</div>
          <div class="info-value">${learner.admission_no}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Student Name:</div>
          <div class="info-value">${learner.first_name} ${learner.last_name}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Class:</div>
          <div class="info-value">${learner.classes?.name || 'N/A'}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Academic Term:</div>
          <div class="info-value">Year ${term.year} - Term ${term.term}</div>
        </div>
      </div>
      
      ${feeNoteHtml}
      
      <div class="payments-horizontal">
        <h3>Payments Received:</h3>
        <div class="payment-items">
          ${paymentItems}
        </div>
      </div>
      
      <div class="summary-section">
        <div class="summary-row">
          <span>Total Fees for Term:</span>
          <span><strong>KES ${totalFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
        </div>
        <div class="summary-row">
          <span>Total Amount Paid:</span>
          <span><strong>KES ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
        </div>
        <div class="summary-row total">
          <span>Balance ${balance > 0 ? 'Due' : balance < 0 ? 'Overpayment' : 'Cleared'}:</span>
          <span>KES ${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Received By</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Date: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</div>
        </div>
      </div>
    </div>
    
    <div class="receipt-footer">
      <p><strong>Thank you for your payment</strong></p>
      <p>This is an official receipt from Little Angels Academy. Please retain for your records.</p>
      <p>Printed: ${new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
  `;
  
  container.innerHTML = `
    <div class="receipt ${feeInfo ? 'receipt-with-custom-fee' : ''}">${receiptHTML}</div>
    <div class="receipt ${feeInfo ? 'receipt-with-custom-fee' : ''}">${receiptHTML}</div>
  `;
  
  container.classList.remove("hidden");
}

/* ===========================
   INIT
=========================== */
async function initPage() {
  await checkAuth();
  await loadAllLearners();
  console.log("Page initialized with", allLearners.length, "learners");
}

initPage();

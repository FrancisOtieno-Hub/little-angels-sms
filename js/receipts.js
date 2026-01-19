import { supabase } from "./supabase.js";

const btn = document.getElementById("generateReceiptBtn");
const searchInput = document.getElementById("receiptSearch");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const container = document.getElementById("receiptContainer");
const alertContainer = document.getElementById("alertContainer");

let selectedLearner = null;
let autocompleteTimeout = null;
let allLearners = [];

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

function setLoading(button, loading) {
  button.disabled = loading;
  button.innerHTML = loading 
    ? '<div class="spinner"></div><span>Generating...</span>' 
    : '<span>Generate Receipt</span>';
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
  } catch (error) {
    console.error("Error loading learners:", error);
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
  
  // Add click handlers to items
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
}

function filterLearners(query) {
  if (!query || query.length < 2) {
    return [];
  }
  
  const searchQuery = query.toLowerCase();
  
  return allLearners.filter(learner => {
    const fullName = `${learner.first_name} ${learner.last_name}`.toLowerCase();
    const admissionNo = learner.admission_no.toLowerCase();
    
    return fullName.includes(searchQuery) || admissionNo.includes(searchQuery);
  }).slice(0, 10); // Limit to 10 results
}

// Input event for autocomplete
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  
  // Clear previous timeout
  if (autocompleteTimeout) {
    clearTimeout(autocompleteTimeout);
  }
  
  // Reset selected learner if input changes
  if (selectedLearner && !query.includes(selectedLearner.admission_no)) {
    selectedLearner = null;
    container.classList.add("hidden");
  }
  
  if (query.length < 2) {
    hideAutocomplete();
    return;
  }
  
  // Debounce the search
  autocompleteTimeout = setTimeout(() => {
    const results = filterLearners(query);
    showAutocomplete(results);
  }, 300);
});

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    hideAutocomplete();
  }
});

// Keyboard navigation for autocomplete
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
  
  // Update selected class
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
   GENERATE RECEIPT
=========================== */
btn.addEventListener("click", async () => {
  // Use selected learner from autocomplete or search by input
  let learnerToUse = selectedLearner;
  
  if (!learnerToUse) {
    const query = searchInput.value.trim();
    
    if (!query) {
      showAlert("Please select or enter a learner", "error");
      return;
    }
    
    // Try to search if not selected from autocomplete
    setLoading(btn, true);
    
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
        .or(`admission_no.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .eq("active", true)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        showAlert("Learner not found", "error");
        setLoading(btn, false);
        return;
      }
      
      learnerToUse = data;
    } catch (error) {
      showAlert("Error searching learner: " + error.message, "error");
      setLoading(btn, false);
      return;
    }
  } else {
    setLoading(btn, true);
  }
  
  try {
    const term = await getActiveTerm();
    if (!term) {
      setLoading(btn, false);
      return;
    }
    
    // Fetch fees
    const { data: fee } = await supabase
      .from("fees")
      .select("amount")
      .eq("class_id", learnerToUse.class_id)
      .eq("term_id", term.id)
      .maybeSingle();
    
    const totalFees = fee?.amount || 0;
    
    // Fetch payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("learner_id", learnerToUse.id)
      .eq("term_id", term.id)
      .order("payment_date");
    
    if (!payments || payments.length === 0) {
      showAlert("No payments found for this learner", "error");
      setLoading(btn, false);
      return;
    }
    
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = totalFees - totalPaid;
    
    renderReceipt(learnerToUse, term, payments, totalFees, totalPaid, balance);
    
    // Auto-print after a short delay
    setTimeout(() => {
      window.print();
    }, 500);
    
  } catch (error) {
    showAlert("Error generating receipt: " + error.message, "error");
  } finally {
    setLoading(btn, false);
  }
});

// Allow Enter key to generate (only if autocomplete is not visible)
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && autocompleteDropdown.classList.contains('hidden')) {
    btn.click();
  }
});

/* ===========================
   RENDER RECEIPT - 9.5" x 11" PAYSLIP FORMAT
=========================== */
function renderReceipt(learner, term, payments, totalFees, totalPaid, balance) {
  const paymentRows = payments.map(p => {
    const date = new Date(p.payment_date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const ref = p.reference_no || "-";
    const amount = Number(p.amount).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `
      <tr>
        <td>${date}</td>
        <td>${ref}</td>
        <td style="text-align: right;">KES ${amount}</td>
      </tr>
    `;
  }).join("");
  
  container.innerHTML = `
    <div class="receipt-header">
      <h1>LITTLE ANGELS ACADEMY</h1>
      <p><em>Quality Education, Service and Discipline</em></p>
      <p>P.O. Box 7093, Thika</p>
      <p>Tel: 0720 985 433</p>
    </div>
    
    <div class="receipt-body">
      <h2 style="text-align: center; margin: 20px 0; text-decoration: underline;">FEE PAYMENT RECEIPT</h2>
      
      <div class="info-section">
        <div class="info-row">
          <div class="info-label">Admission Number:</div>
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
      
      <h3 style="margin: 25px 0 15px 0;">Payment Details:</h3>
      <table class="payment-table">
        <thead>
          <tr>
            <th>Payment Date</th>
            <th>Reference No.</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${paymentRows}
        </tbody>
      </table>
      
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
          <span style="color: ${balance > 0 ? '#000' : balance < 0 ? '#000' : '#000'};">
            KES ${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            Received By
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            Date: ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>
    </div>
    
    <div class="receipt-footer">
      <p><strong>Thank you for your payment</strong></p>
      <p style="margin-top: 10px; font-size: 8pt;">
        This is an official receipt from Little Angels Academy. Please retain for your records.
      </p>
      <p style="margin-top: 5px; font-size: 8pt;">
        Printed on: ${new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
  `;
  
  container.classList.remove("hidden");
}

/* ===========================
   INIT
=========================== */
checkAuth();
loadAllLearners(); // Load learners for autocomplete

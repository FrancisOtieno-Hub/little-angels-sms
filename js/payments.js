import { supabase } from "./supabase.js";


const searchInput = document.getElementById("searchInput");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const learnerDetails = document.getElementById("learnerDetails");
const paymentCard = document.getElementById("paymentCard");
const historyCard = document.getElementById("historyCard");
const paymentForm = document.getElementById("paymentForm");
const historyTable = document.getElementById("paymentHistory");
const alertContainer = document.getElementById("alertContainer");
const paymentBtn = document.getElementById("paymentBtn");
const paymentDate = document.getElementById("paymentDate");
const referenceNo = document.getElementById("referenceNo");
const amountPaid = document.getElementById("amountPaid");

let selectedLearner = null;
let activeTerm = null;
let autocompleteTimeout = null;
let allLearners = [];


/* ===========================
   UTILITIES
=========================== */
function showAlert(message, type = "success") {
  alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { alertContainer.innerHTML = ""; }, 5000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setLoading(button, loading, text = "Save") {
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
    const { data, error } = await supabase.from("terms").select("*").eq("active", true).maybeSingle();
    if (error) throw error;
    if (!data) {
      showAlert("No active term found! Please set an active term first.", "error");
      return null;
    }
    activeTerm = data;
    return activeTerm;
  } catch (error) {
    showAlert("Error fetching active term: " + error.message, "error");
    return null;
  }
}

/* ===========================
   AUTOCOMPLETE
=========================== */
async function loadAllLearners() {
  try {
    const { data, error } = await supabase
      .from("learners")
      .select("id, admission_no, first_name, last_name, class_id, classes(name)")
      .eq("active", true)
      .order("first_name");
    
    if (error) throw error;
    allLearners = data || [];
    return allLearners;
  } catch (error) {
    console.error("Error loading learners:", error);
    showAlert("Error loading learners: " + error.message, "error");
    return [];
  }
}

function showAutocomplete(results) {
  if (results.length === 0) {
    autocompleteDropdown.innerHTML = '<div class="autocomplete-no-results">No learners found</div>';
    autocompleteDropdown.classList.remove("hidden");
    return;
  }
  
  autocompleteDropdown.innerHTML = results.map((learner, index) => `
    <div class="autocomplete-item" data-index="${index}">
      <span class="learner-name">${learner.first_name} ${learner.last_name}</span>
      <span class="learner-details">${learner.admission_no} • ${learner.classes?.name || 'N/A'}</span>
    </div>
  `).join('');
  
  autocompleteDropdown.classList.remove("hidden");
  
  document.querySelectorAll('.autocomplete-item').forEach((item, index) => {
    item.addEventListener('click', () => selectLearnerFromAutocomplete(results[index]));
  });
}

function hideAutocomplete() {
  autocompleteDropdown.classList.add("hidden");
}

function selectLearnerFromAutocomplete(learner) {
  searchInput.value = `${learner.first_name} ${learner.last_name} (${learner.admission_no})`;
  selectedLearner = learner;
  hideAutocomplete();
  displayLearnerDetails();
  loadPaymentHistory();
  paymentDate.valueAsDate = new Date();
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
  
  if (autocompleteTimeout) clearTimeout(autocompleteTimeout);
  
  if (selectedLearner && !query.includes(selectedLearner.admission_no)) {
    selectedLearner = null;
    learnerDetails.classList.add("hidden");
    paymentCard.classList.add("hidden");
    historyCard.classList.add("hidden");
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
  if (!e.target.closest('.autocomplete-container')) hideAutocomplete();
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
   DISPLAY LEARNER & BALANCE
=========================== */
async function displayLearnerDetails() {
  if (!selectedLearner || !activeTerm) return;

  try {
    const { data: customFeeData } = await supabase
      .from("custom_fees")
      .select("custom_amount, fee_type, reason")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id)
      .maybeSingle();

    let totalFees = 0;
    let feeNote = "";

    if (customFeeData) {
      totalFees = Number(customFeeData.custom_amount);
      const feeTypeLabel = {
        'full_sponsorship': 'Full Sponsorship',
        'partial_sponsorship': 'Partial Sponsorship',
        'custom_amount': 'Custom Fee'
      }[customFeeData.fee_type] || 'Custom Fee';
      
      feeNote = `<br><span style="color: var(--secondary); font-weight: 600;">ℹ️ ${feeTypeLabel}</span>`;
      if (customFeeData.reason) {
        feeNote += `<br><span style="font-size: 0.9rem; color: var(--text-secondary);">${customFeeData.reason}</span>`;
      }
    } else {
      const { data: feeData } = await supabase
        .from("fees")
        .select("amount")
        .eq("class_id", selectedLearner.class_id)
        .eq("term_id", activeTerm.id)
        .maybeSingle();
      totalFees = feeData?.amount || 0;
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id);

    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const balance = totalFees - totalPaid;

    learnerDetails.innerHTML = `
      <div style="padding: 20px; background: var(--background); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
        <h3 style="margin-bottom: 12px; color: var(--primary);">${selectedLearner.first_name} ${selectedLearner.last_name}</h3>
        <p><strong>Admission No:</strong> ${selectedLearner.admission_no}</p>
        <p><strong>Class:</strong> ${selectedLearner.classes?.name || 'N/A'}</p>
        <p><strong>Term:</strong> Year ${activeTerm.year} - Term ${activeTerm.term}${feeNote}</p>
        <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--border);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 16px;">
          <div>
            <p class="text-muted" style="font-size: 0.85rem;">Total Fees</p>
            <p style="font-size: 1.3rem; font-weight: 700;">KES ${totalFees.toLocaleString()}</p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 0.85rem;">Total Paid</p>
            <p style="font-size: 1.3rem; font-weight: 700; color: var(--success);">KES ${totalPaid.toLocaleString()}</p>
          </div>
          <div>
            <p class="text-muted" style="font-size: 0.85rem;">Balance</p>
            <p style="font-size: 1.3rem; font-weight: 700; color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'};">KES ${balance.toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;

    learnerDetails.classList.remove("hidden");
    paymentCard.classList.remove("hidden");
    historyCard.classList.remove("hidden");
  } catch (error) {
    showAlert("Error displaying learner details: " + error.message, "error");
  }
}

/* ===========================
   SAVE PAYMENT
=========================== */
paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedLearner || !activeTerm) {
    showAlert("Please search for a learner first", "error");
    return;
  }

  const amount = parseFloat(amountPaid.value);
  if (amount <= 0) {
    showAlert("Amount must be greater than zero", "error");
    return;
  }

  setLoading(paymentBtn, true, "Save Payment");

  try {
    const payment = {
      learner_id: selectedLearner.id,
      term_id: activeTerm.id,
      payment_date: paymentDate.value,
      reference_no: referenceNo.value.trim() || null,
      amount: amount
    };

    const { error } = await supabase.from("payments").insert([payment]);
    if (error) throw error;

    showAlert(`✓ Payment of KES ${amount.toLocaleString()} recorded successfully for ${selectedLearner.first_name} ${selectedLearner.last_name}`);
    
    await displayLearnerDetails();
    await loadPaymentHistory();
    paymentForm.reset();
    paymentDate.valueAsDate = new Date();
    
    setTimeout(() => resetForNextLearner(), 2000);
  } catch (error) {
    showAlert("Error saving payment: " + error.message, "error");
  } finally {
    setLoading(paymentBtn, false, "Save Payment");
  }
});

/* ===========================
   RESET FOR NEXT LEARNER
=========================== */
function resetForNextLearner() {
  selectedLearner = null;
  searchInput.value = "";
  searchInput.focus();
  learnerDetails.classList.add("hidden");
  paymentCard.classList.add("hidden");
  historyCard.classList.add("hidden");
  paymentForm.reset();
  showAlert("Ready to search for next learner", "info");
}

document.getElementById("nextLearnerBtn").addEventListener("click", () => resetForNextLearner());

/* ===========================
   LOAD PAYMENT HISTORY
=========================== */
async function loadPaymentHistory() {
  if (!selectedLearner || !activeTerm) return;

  try {
    historyTable.innerHTML = "";
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id)
      .order("payment_date", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      historyTable.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No payments recorded yet</td></tr>';
      return;
    }

    data.forEach(p => {
      const dateStr = new Date(p.payment_date + 'T00:00:00')
        .toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dateStr}</td>
        <td>${p.reference_no || "—"}</td>
        <td>KES ${Number(p.amount).toLocaleString()}</td>
        <td style="text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;">
            <button onclick="openEditPayment('${p.id}','${p.payment_date}','${p.reference_no || ''}',${p.amount})"
              style="padding:5px 10px;border:1.5px solid var(--border);border-radius:var(--radius-xs);background:white;cursor:pointer;font-size:.78rem;font-weight:600;color:var(--navy2);transition:all .2s;"
              onmouseover="this.style.borderColor='var(--navy2)'"
              onmouseout="this.style.borderColor='var(--border)'">
              ✏️ Edit
            </button>
            <button onclick="deletePayment('${p.id}', ${p.amount})"
              style="padding:5px 10px;border:1.5px solid var(--border);border-radius:var(--radius-xs);background:white;cursor:pointer;font-size:.78rem;font-weight:600;color:var(--danger);transition:all .2s;"
              onmouseover="this.style.borderColor='var(--danger)'"
              onmouseout="this.style.borderColor='var(--border)'">
              🗑️ Delete
            </button>
          </div>
        </td>
      `;
      historyTable.appendChild(tr);
    });
  } catch (error) {
    showAlert("Error loading payment history: " + error.message, "error");
  }
}

/* ===========================
   EDIT PAYMENT
=========================== */
window.openEditPayment = function(id, date, refNo, amount) {
  document.getElementById('editPaymentId').value   = id;
  document.getElementById('editPaymentDate').value = date;
  document.getElementById('editReferenceNo').value = refNo;
  document.getElementById('editAmount').value      = amount;
  document.getElementById('editPaymentModal').classList.remove('hidden');
};

document.getElementById('cancelEditPaymentBtn').addEventListener('click', () => {
  document.getElementById('editPaymentModal').classList.add('hidden');
});

document.getElementById('editPaymentModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('editPaymentModal')) {
    document.getElementById('editPaymentModal').classList.add('hidden');
  }
});

document.getElementById('editPaymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id     = document.getElementById('editPaymentId').value;
  const date   = document.getElementById('editPaymentDate').value;
  const refNo  = document.getElementById('editReferenceNo').value.trim();
  const amount = parseFloat(document.getElementById('editAmount').value);

  if (!date || !amount || amount <= 0) {
    showAlert("Please fill in a valid date and amount.", "error");
    return;
  }

  const saveBtn = document.getElementById('saveEditPaymentBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const { error } = await supabase
      .from("payments")
      .update({
        payment_date: date,
        reference_no: refNo || null,
        amount:       amount
      })
      .eq("id", id);

    if (error) throw error;

    document.getElementById('editPaymentModal').classList.add('hidden');
    showAlert(`✓ Payment updated successfully.`);
    await displayLearnerDetails();
    await loadPaymentHistory();
  } catch (error) {
    showAlert("Error updating payment: " + error.message, "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Save Changes';
  }
});

/* ===========================
   DELETE PAYMENT
=========================== */
window.deletePayment = async function(id, amount) {
  if (!confirm(`Are you sure you want to delete this payment of KES ${Number(amount).toLocaleString()}?\n\nThis cannot be undone.`)) return;

  try {
    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);

    if (error) throw error;

    showAlert(`✓ Payment of KES ${Number(amount).toLocaleString()} deleted.`);
    await displayLearnerDetails();
    await loadPaymentHistory();
  } catch (error) {
    showAlert("Error deleting payment: " + error.message, "error");
  }
};

/* ===========================
   INIT
=========================== */
async function initPage() {
  try {
    await checkAuth();
    
    await loadActiveTerm();
    
    await loadAllLearners();
  } catch (error) {
    console.error("Init error:", error);
  }
}

initPage();

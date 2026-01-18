import { supabase } from "./supabase.js";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
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

/* ===========================
   UTILITIES
=========================== */
function showAlert(message, type = "success") {
  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
    </div>
  `;
  setTimeout(() => {
    alertContainer.innerHTML = "";
  }, 5000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
      showAlert("No active term found! Please set an active term in the Fees Setup.", "error");
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
   SEARCH LEARNER
=========================== */
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  
  if (!query) {
    showAlert("Please enter an admission number or name", "error");
    return;
  }

  setLoading(searchBtn, true, "Search");

  try {
    // Ensure active term is loaded first
    await loadActiveTerm();
    if (!activeTerm) {
      setLoading(searchBtn, false, "Search");
      return;
    }

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
      learnerDetails.classList.add("hidden");
      paymentCard.classList.add("hidden");
      historyCard.classList.add("hidden");
      setLoading(searchBtn, false, "Search");
      return;
    }

    selectedLearner = data;
    await displayLearnerDetails();
    await loadPaymentHistory();
    
    // Set default payment date to today
    paymentDate.valueAsDate = new Date();
  } catch (error) {
    showAlert("Error searching learner: " + error.message, "error");
  } finally {
    setLoading(searchBtn, false, "Search");
  }
});

// Allow Enter key to search
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

/* ===========================
   DISPLAY LEARNER & BALANCE
=========================== */
async function displayLearnerDetails() {
  if (!selectedLearner || !activeTerm) return;

  try {
    // Fetch fees
    const { data: feeData } = await supabase
      .from("fees")
      .select("amount")
      .eq("class_id", selectedLearner.class_id)
      .eq("term_id", activeTerm.id)
      .maybeSingle();

    const totalFees = feeData?.amount || 0;

    // Fetch payments
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id);

    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const balance = totalFees - totalPaid;

    learnerDetails.innerHTML = `
      <div style="padding: 20px; background: var(--background); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
        <h3 style="margin-bottom: 12px; color: var(--primary);">
          ${selectedLearner.first_name} ${selectedLearner.last_name}
        </h3>
        <p><strong>Admission No:</strong> ${selectedLearner.admission_no}</p>
        <p><strong>Class:</strong> ${selectedLearner.classes?.name || 'N/A'}</p>
        <p><strong>Term:</strong> Year ${activeTerm.year} - Term ${activeTerm.term}</p>
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
            <p style="font-size: 1.3rem; font-weight: 700; color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'};">
              KES ${balance.toLocaleString()}
            </p>
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

    const { error } = await supabase
      .from("payments")
      .insert([payment]);

    if (error) throw error;

    showAlert("Payment recorded successfully");
    paymentForm.reset();
    paymentDate.valueAsDate = new Date();
    await displayLearnerDetails();
    await loadPaymentHistory();
  } catch (error) {
    showAlert("Error saving payment: " + error.message, "error");
  } finally {
    setLoading(paymentBtn, false, "Save Payment");
  }
});

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
      historyTable.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">No payments recorded yet</td>
        </tr>
      `;
      return;
    }

    data.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(p.payment_date).toLocaleDateString()}</td>
        <td>${p.reference_no || "-"}</td>
        <td>KES ${Number(p.amount).toLocaleString()}</td>
      `;
      historyTable.appendChild(tr);
    });
  } catch (error) {
    showAlert("Error loading payment history: " + error.message, "error");
  }
}

/* ===========================
   INIT
=========================== */
checkAuth();
loadActiveTerm();

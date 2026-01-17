import { supabase } from "./supabase.js";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const learnerDetails = document.getElementById("learnerDetails");
const paymentCard = document.getElementById("paymentCard");
const historyCard = document.getElementById("historyCard");
const paymentForm = document.getElementById("paymentForm");
const historyTable = document.getElementById("paymentHistory");

const paymentDate = document.getElementById("paymentDate");
const referenceNo = document.getElementById("referenceNo");
const amountPaid = document.getElementById("amountPaid");

let selectedLearner = null;
let activeTerm = null;

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function loadActiveTerm() {
  const { data: termData, error } = await supabase
    .from("terms")
    .select("*")
    .eq("active", true)
    .single();

  if (error) {
    console.error("Error fetching active term:", error);
    alert("No active term found! Please set an active term in the system.");
    return null;
  }

  if (!termData) {
    alert("No active term found! Please set an active term in the system.");
    return null;
  }

  activeTerm = termData;
  return activeTerm;
}

/* ===========================
   SEARCH LEARNER
=========================== */
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) return;

  // Ensure active term is loaded first
  await loadActiveTerm();
  if (!activeTerm) return;

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
    .maybeSingle(); // Returns null if not found

  if (error) {
    alert(error.message);
    return;
  }

  if (!data) {
    alert("Learner not found");
    return;
  }

  selectedLearner = data;
  displayLearnerDetails();
  loadPaymentHistory();
});

/* ===========================
   DISPLAY LEARNER & BALANCE
=========================== */
async function displayLearnerDetails() {
  if (!selectedLearner || !activeTerm) return;

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
    <strong>${selectedLearner.first_name} ${selectedLearner.last_name}</strong><br>
    Adm No: ${selectedLearner.admission_no}<br>
    Class: ${selectedLearner.classes?.name || 'N/A'}<br><br>

    <strong>Total Fees:</strong> KES ${totalFees.toLocaleString()}<br>
    <strong>Total Paid:</strong> KES ${totalPaid.toLocaleString()}<br>
    <strong>Balance:</strong> 
    <span style="color:${balance > 0 ? 'red' : 'green'}">
      KES ${balance.toLocaleString()}
    </span>
  `;

  learnerDetails.classList.remove("hidden");
  paymentCard.classList.remove("hidden");
  historyCard.classList.remove("hidden");
}

/* ===========================
   SAVE PAYMENT
=========================== */
paymentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedLearner || !activeTerm) {
    alert("Please search a learner first!");
    return;
  }

  const payment = {
    learner_id: selectedLearner.id,
    term_id: activeTerm.id,
    payment_date: paymentDate.value,
    reference_no: referenceNo.value,
    amount: Number(amountPaid.value)
  };

  const { error } = await supabase
    .from("payments")
    .insert([payment]);

  if (error) {
    alert(error.message);
  } else {
    paymentForm.reset();
    displayLearnerDetails();
    loadPaymentHistory();
  }
});

/* ===========================
   LOAD PAYMENT HISTORY
=========================== */
async function loadPaymentHistory() {
  if (!selectedLearner || !activeTerm) return;

  historyTable.innerHTML = "";

  const { data: history } = await supabase
    .from("payments")
    .select("*")
    .eq("learner_id", selectedLearner.id)
    .eq("term_id", activeTerm.id)
    .order("payment_date", { ascending: false });

  history?.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.payment_date}</td>
      <td>${p.reference_no || ""}</td>
      <td>${Number(p.amount).toLocaleString()}</td>
    `;
    historyTable.appendChild(tr);
  });
}

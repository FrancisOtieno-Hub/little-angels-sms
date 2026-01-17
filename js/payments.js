import { supabase } from "./supabase.js";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const learnerDetails = document.getElementById("learnerDetails");
const paymentCard = document.getElementById("paymentCard");
const historyCard = document.getElementById("historyCard");
const paymentForm = document.getElementById("paymentForm");
const historyTable = document.getElementById("paymentHistory");

let selectedLearner = null;
let activeTerm = null;

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function loadActiveTerm() {
  const { data } = await supabase
    .from("terms")
    .select("*")
    .eq("active", true)
    .single();

  activeTerm = data;
}
loadActiveTerm();

/* ===========================
   SEARCH LEARNER
=========================== */
searchBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();

  if (!query) return;

  const { data } = await supabase
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
    .single();

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
  // Fetch fees
  const { data: feeData } = await supabase
    .from("fees")
    .select("amount")
    .eq("class_id", selectedLearner.class_id)
    .eq("term_id", activeTerm.id)
    .single();

  const totalFees = feeData?.amount || 0;

  // Fetch payments
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("learner_id", selectedLearner.id)
    .eq("term_id", activeTerm.id);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = totalFees - totalPaid;

  learnerDetails.innerHTML = `
    <strong>${selectedLearner.first_name} ${selectedLearner.last_name}</strong><br>
    Adm No: ${selectedLearner.admission_no}<br>
    Class: ${selectedLearner.classes.name}<br><br>

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

  const payment = {
    learner_id: selectedLearner.id,
    term_id: activeTerm.id,
    payment_date: paymentDate.value,
    reference_no: referenceNo.value,
    amount: amountPaid.value
  };

  const { error } = await supabase
    .from("payments")
    .insert(payment);

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
  historyTable.innerHTML = "";

  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("learner_id", selectedLearner.id)
    .eq("term_id", activeTerm.id)
    .order("payment_date", { ascending: false });

  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.payment_date}</td>
      <td>${p.reference_no || ""}</td>
      <td>${Number(p.amount).toLocaleString()}</td>
    `;
    historyTable.appendChild(tr);
  });
}

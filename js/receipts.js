import { supabase } from "./supabase.js";

const btn = document.getElementById("generateReceiptBtn");
const searchInput = document.getElementById("receiptSearch");
const container = document.getElementById("receiptContainer");

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function getActiveTerm() {
  const { data } = await supabase
    .from("terms")
    .select("*")
    .eq("active", true)
    .single();
  return data;
}

/* ===========================
   GENERATE RECEIPT
=========================== */
btn.addEventListener("click", async () => {
  const adm = searchInput.value.trim();
  if (!adm) return;

  const term = await getActiveTerm();

  // Learner
  const { data: learner } = await supabase
    .from("learners")
    .select(`
      id,
      admission_no,
      first_name,
      last_name,
      class_id,
      classes(name)
    `)
    .eq("admission_no", adm)
    .single();

  if (!learner) {
    alert("Learner not found");
    return;
  }

  // Fees
  const { data: fee } = await supabase
    .from("fees")
    .select("amount")
    .eq("class_id", learner.class_id)
    .eq("term_id", term.id)
    .single();

  const totalFees = fee?.amount || 0;

  // Payments
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("learner_id", learner.id)
    .eq("term_id", term.id)
    .order("payment_date");

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalFees - totalPaid;

  renderReceipt(learner, term, payments, totalFees, totalPaid, balance);
  window.print();
});

/* ===========================
   RENDER RECEIPT
=========================== */
function renderReceipt(learner, term, payments, totalFees, totalPaid, balance) {

  let paymentLines = payments.map(p =>
    `${p.payment_date}  ${p.reference_no || "-"}  ${Number(p.amount).toLocaleString()}`
  ).join("<br>");

  container.innerHTML = `
    <div style="text-align:center;">
      <strong>LITTLE ANGELS ACADEMY</strong><br>
      Quality Education, Service and Discipline<br>
      P.O. Box 7093, Thika<br>
      Tel: 0720 985 433<br>
      ----------------------------------
    </div>

    Adm No: ${learner.admission_no}<br>
    Name  : ${learner.first_name} ${learner.last_name}<br>
    Class : ${learner.classes.name}<br>
    Term  : ${term.year} - Term ${term.term}<br>
    ----------------------------------<br>

    DATE        REF        AMOUNT<br>
    ${paymentLines}<br>
    ----------------------------------<br>

    Total Fees : ${totalFees.toLocaleString()}<br>
    Total Paid : ${totalPaid.toLocaleString()}<br>
    Balance    : ${balance.toLocaleString()}<br>
    ----------------------------------<br>

    Thank you for your payment.<br><br>

    Printed: ${new Date().toLocaleString()}
  `;

  container.classList.remove("hidden");
}

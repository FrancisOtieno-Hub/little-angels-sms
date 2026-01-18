import { supabase } from "./supabase.js";

const btn = document.getElementById("generateReceiptBtn");
const searchInput = document.getElementById("receiptSearch");
const container = document.getElementById("receiptContainer");
const alertContainer = document.getElementById("alertContainer");

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
  const adm = searchInput.value.trim();
  
  if (!adm) {
    showAlert("Please enter an admission number", "error");
    return;
  }
  
  setLoading(btn, true);
  
  try {
    const term = await getActiveTerm();
    if (!term) {
      setLoading(btn, false);
      return;
    }
    
    // Fetch learner
    const { data: learner, error: learnerError } = await supabase
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
      .maybeSingle();
    
    if (learnerError) throw learnerError;
    
    if (!learner) {
      showAlert("Learner not found", "error");
      setLoading(btn, false);
      return;
    }
    
    // Fetch fees
    const { data: fee } = await supabase
      .from("fees")
      .select("amount")
      .eq("class_id", learner.class_id)
      .eq("term_id", term.id)
      .maybeSingle();
    
    const totalFees = fee?.amount || 0;
    
    // Fetch payments
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("learner_id", learner.id)
      .eq("term_id", term.id)
      .order("payment_date");
    
    if (!payments || payments.length === 0) {
      showAlert("No payments found for this learner", "error");
      setLoading(btn, false);
      return;
    }
    
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const balance = totalFees - totalPaid;
    
    renderReceipt(learner, term, payments, totalFees, totalPaid, balance);
    
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

// Allow Enter key to generate
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    btn.click();
  }
});

/* ===========================
   RENDER RECEIPT
=========================== */
function renderReceipt(learner, term, payments, totalFees, totalPaid, balance) {
  let paymentLines = payments.map(p => {
    const date = new Date(p.payment_date).toLocaleDateString();
    const ref = p.reference_no || "-";
    const amount = Number(p.amount).toLocaleString();
    return `${date.padEnd(15)} ${ref.padEnd(12)} ${amount}`;
  }).join("<br>");
  
  container.innerHTML = `
    <div style="text-align:center; font-family: 'Courier New', monospace; padding: 20px;">
      <strong style="font-size: 16px;">LITTLE ANGELS ACADEMY</strong><br>
      <span style="font-size: 12px;">Quality Education, Service and Discipline</span><br>
      P.O. Box 7093, Thika<br>
      Tel: 0720 985 433<br>
      <div style="margin: 12px 0; border-top: 2px dashed #000;"></div>
      <div style="text-align: left; margin: 16px 0;">
        <strong>FEE RECEIPT</strong><br><br>
        Adm No: <strong>${learner.admission_no}</strong><br>
        Name  : <strong>${learner.first_name} ${learner.last_name}</strong><br>
        Class : <strong>${learner.classes?.name || 'N/A'}</strong><br>
        Term  : <strong>${term.year} - Term ${term.term}</strong><br>
      </div>
      <div style="margin: 12px 0; border-top: 2px dashed #000;"></div>
      <div style="text-align: left; font-size: 11px;">
        <strong>DATE           REF          AMOUNT</strong><br>
        ${paymentLines}
      </div>
      <div style="margin: 12px 0; border-top: 2px dashed #000;"></div>
      <div style="text-align: left;">
        Total Fees: <strong>KES ${totalFees.toLocaleString()}</strong><br>
        Total Paid: <strong>KES ${totalPaid.toLocaleString()}</strong><br>
        Balance   : <strong style="color: ${balance > 0 ? 'red' : 'green'};">KES ${balance.toLocaleString()}</strong><br>
      </div>
      <div style="margin: 12px 0; border-top: 2px dashed #000;"></div>
      <div style="font-size: 11px; margin-top: 16px;">
        Thank you for your payment.<br><br>
        <em>Printed: ${new Date().toLocaleString()}</em>
      </div>
    </div>
  `;
  
  container.classList.remove("hidden");
}

/* ===========================
   INIT
=========================== */
checkAuth();

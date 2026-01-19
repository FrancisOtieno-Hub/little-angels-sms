import { supabase } from "./supabase.js";

const termForm = document.getElementById("termForm");
const activeTermDisplay = document.getElementById("activeTerm");
const feesForm = document.getElementById("feesForm");
const feesClass = document.getElementById("feesClass");
const feesAmount = document.getElementById("feesAmount");
const feesTable = document.getElementById("feesTable");
const feesTableContainer = document.getElementById("feesTableContainer");
const loadingFees = document.getElementById("loadingFees");
const alertContainer = document.getElementById("alertContainer");
const termBtn = document.getElementById("termBtn");
const feesBtn = document.getElementById("feesBtn");

let activeTermId = null;

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
   LOAD CLASSES
=========================== */
async function loadClasses() {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("level");
    
    if (error) throw error;
    
    data.forEach(cls => {
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.name;
      feesClass.appendChild(option);
    });
  } catch (error) {
    showAlert("Error loading classes: " + error.message, "error");
  }
}

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
    
    if (data) {
      activeTermId = data.id;
      activeTermDisplay.innerHTML = `
        ✓ Active Term: <strong>Year ${data.year} - Term ${data.term}</strong>
      `;
      activeTermDisplay.classList.remove("text-muted");
      activeTermDisplay.classList.add("text-success");
    } else {
      activeTermDisplay.textContent = "⚠ No active term set. Please set one below.";
      activeTermDisplay.classList.remove("text-success");
      activeTermDisplay.classList.add("text-muted");
    }
  } catch (error) {
    activeTermDisplay.textContent = "Error loading active term";
    showAlert("Error loading active term: " + error.message, "error");
  }
}

/* ===========================
   SET ACTIVE TERM
=========================== */
termForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const year = document.getElementById("year").value;
  const term = document.getElementById("term").value;
  
  if (!year || !term) {
    showAlert("Please fill in all fields", "error");
    return;
  }
  
  setLoading(termBtn, true, "Set Active Term");
  
  try {
    // Deactivate all terms
    await supabase
      .from("terms")
      .update({ active: false })
      .neq("id", 0);
    
    // Check if term already exists
    const { data: existing } = await supabase
      .from("terms")
      .select("id")
      .eq("year", year)
      .eq("term", term)
      .maybeSingle();
    
    if (existing) {
      // Activate existing term
      await supabase
        .from("terms")
        .update({ active: true })
        .eq("id", existing.id);
    } else {
      // Insert new active term
      await supabase
        .from("terms")
        .insert({ year, term, active: true });
    }
    
    showAlert(`Active term set to Year ${year} - Term ${term}`);
    termForm.reset();
    await loadActiveTerm();
    await loadFees();
  } catch (error) {
    showAlert("Error setting active term: " + error.message, "error");
  } finally {
    setLoading(termBtn, false, "Set Active Term");
  }
});

/* ===========================
   SAVE FEES
=========================== */
feesForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!activeTermId) {
    showAlert("Please set an active term first", "error");
    return;
  }
  
  const classId = feesClass.value;
  const amount = feesAmount.value;
  
  if (!classId || !amount) {
    showAlert("Please fill in all fields", "error");
    return;
  }
  
  setLoading(feesBtn, true, "Save / Update Fees");
  
  try {
    // Check if fee already exists
    const { data: existingFee } = await supabase
      .from("fees")
      .select("id")
      .eq("class_id", classId)
      .eq("term_id", activeTermId)
      .maybeSingle();
    
    let error;
    
    if (existingFee) {
      // Update existing fee
      const result = await supabase
        .from("fees")
        .update({ amount: parseFloat(amount) })
        .eq("id", existingFee.id);
      error = result.error;
    } else {
      // Insert new fee
      const result = await supabase
        .from("fees")
        .insert({
          class_id: classId,
          term_id: activeTermId,
          amount: parseFloat(amount)
        });
      error = result.error;
    }
    
    if (error) throw error;
    
    showAlert("Fees saved successfully");
    feesAmount.value = "";
    feesClass.value = "";
    await loadFees();
  } catch (error) {
    showAlert("Error saving fees: " + error.message, "error");
  } finally {
    setLoading(feesBtn, false, "Save / Update Fees");
  }
});

/* ===========================
   LOAD FEES
=========================== */
async function loadFees() {
  if (!activeTermId) {
    loadingFees.textContent = "No active term set";
    return;
  }
  
  try {
    feesTable.innerHTML = "";
    loadingFees.classList.remove("hidden");
    feesTableContainer.classList.add("hidden");
    
    const { data, error } = await supabase
      .from("fees")
      .select(`
        amount,
        classes(name)
      `)
      .eq("term_id", activeTermId)
      .order("classes(name)");
    
    if (error) throw error;
    
    if (data.length === 0) {
      loadingFees.textContent = "No fees configured yet";
      return;
    }
    
    data.forEach(f => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.classes?.name || 'N/A'}</td>
        <td>KES ${Number(f.amount).toLocaleString()}</td>
      `;
      feesTable.appendChild(tr);
    });
    
    loadingFees.classList.add("hidden");
    feesTableContainer.classList.remove("hidden");
  } catch (error) {
    loadingFees.textContent = "Error loading fees";
    showAlert("Error loading fees: " + error.message, "error");
  }
}

/* ===========================
   INIT
=========================== */
checkAuth();
loadClasses();
loadActiveTerm().then(() => loadFees());

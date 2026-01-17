import { supabase } from "./supabase.js";

const termForm = document.getElementById("termForm");
const activeTermDisplay = document.getElementById("activeTerm");

const feesForm = document.getElementById("feesForm");
const feesClass = document.getElementById("feesClass");
const feesAmount = document.getElementById("feesAmount");
const feesTable = document.getElementById("feesTable");

let activeTermId = null;

/* ===========================
   LOAD CLASSES
=========================== */
async function loadClasses() {
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("level");

  data.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.name;
    feesClass.appendChild(option);
  });
}

/* ===========================
   LOAD ACTIVE TERM
=========================== */
async function loadActiveTerm() {
  const { data } = await supabase
    .from("terms")
    .select("*")
    .eq("active", true)
    .single();

  if (data) {
    activeTermId = data.id;
    activeTermDisplay.textContent =
      `Active Term: Year ${data.year} - Term ${data.term}`;
  }
}

/* ===========================
   SET ACTIVE TERM
=========================== */
termForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const year = document.getElementById("year").value;
  const term = document.getElementById("term").value;

  // Deactivate all terms
  await supabase.from("terms").update({ active: false }).neq("id", "");

  // Insert new active term
  await supabase.from("terms").insert({
    year,
    term,
    active: true
  });

  loadActiveTerm();
  loadFees();
});

/* ===========================
   SAVE FEES
=========================== */
feesForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!activeTermId) {
    alert("Set active term first");
    return;
  }

  const classId = feesClass.value;
  const amount = feesAmount.value;

  // Upsert fees
  await supabase.from("fees").upsert({
    class_id: classId,
    term_id: activeTermId,
    amount
  });

  feesAmount.value = "";
  loadFees();
});

/* ===========================
   LOAD FEES
=========================== */
async function loadFees() {
  if (!activeTermId) return;

  feesTable.innerHTML = "";

  const { data } = await supabase
    .from("fees")
    .select(`
      amount,
      classes(name)
    `)
    .eq("term_id", activeTermId);

  data.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.classes.name}</td>
      <td>${Number(f.amount).toLocaleString()}</td>
    `;
    feesTable.appendChild(tr);
  });
}

/* ===========================
   INIT
=========================== */
loadClasses();
loadActiveTerm().then(loadFees);

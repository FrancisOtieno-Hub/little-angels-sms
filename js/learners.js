import { supabase } from "./supabase.js";

const form = document.getElementById("learnerForm");
const classSelect = document.getElementById("classSelect");
const admissionNoInput = document.getElementById("admissionNo");
const tableBody = document.querySelector("#learnersTable tbody");

/* ===========================
   LOAD CLASSES
=========================== */
async function loadClasses() {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("level");

  if (error) {
    alert("Error loading classes");
    return;
  }

  data.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.name;
    classSelect.appendChild(option);
  });
}

/* ===========================
   GENERATE ADMISSION NUMBER
=========================== */
async function generateAdmissionNo() {
  const year = new Date().getFullYear();

  const { data } = await supabase
    .from("learners")
    .select("admission_no")
    .like("admission_no", `LAA/${year}/%`);

  const nextNumber = data.length + 1;
  const padded = String(nextNumber).padStart(4, "0");

  admissionNoInput.value = `LAA/${year}/${padded}`;
}

/* ===========================
   SAVE LEARNER
=========================== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const learner = {
    admission_no: admissionNoInput.value,
    first_name: firstName.value,
    last_name: lastName.value,
    gender: gender.value,
    date_of_birth: dob.value,
    class_id: classSelect.value
  };

  const { error } = await supabase
    .from("learners")
    .insert([learner]);

  if (error) {
    alert(error.message);
  } else {
    alert("Learner registered successfully");
    form.reset();
    generateAdmissionNo();
    loadLearners();
  }
});

/* ===========================
   LOAD LEARNERS
=========================== */
async function loadLearners() {
  tableBody.innerHTML = "";

  const { data } = await supabase
    .from("learners")
    .select(`
      admission_no,
      first_name,
      last_name,
      gender,
      classes(name)
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  data.forEach(l => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${l.admission_no}</td>
      <td>${l.first_name} ${l.last_name}</td>
      <td>${l.classes.name}</td>
      <td>${l.gender || ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

/* ===========================
   INIT
=========================== */
loadClasses();
generateAdmissionNo();
loadLearners();


/* ===========================
   BULK UPLOAD VARIABLES
=========================== */
const excelFileInput = document.getElementById("excelFile");
const previewBtn = document.getElementById("previewBtn");
const saveBulkBtn = document.getElementById("saveBulkBtn");
const previewTable = document.getElementById("previewTable");
const previewBody = previewTable.querySelector("tbody");
const bulkClassSelect = document.getElementById("bulkClassSelect");

let bulkLearners = [];

/* ===========================
   LOAD BULK CLASS DROPDOWN
=========================== */
async function loadBulkClasses() {
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("level");

  data.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.name;
    bulkClassSelect.appendChild(option);
  });
}

/* ===========================
   PREVIEW EXCEL DATA
=========================== */
previewBtn.addEventListener("click", async () => {
  const file = excelFileInput.files[0];
  if (!file || !bulkClassSelect.value) {
    alert("Select class and Excel file");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const workbook = XLSX.read(e.target.result, { type: "binary" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    previewBody.innerHTML = "";
    bulkLearners = [];

    const year = new Date().getFullYear();
    const { data: existing } = await supabase
      .from("learners")
      .select("admission_no")
      .like("admission_no", `LAA/${year}/%`);

    let counter = existing.length + 1;

    rows.forEach(row => {
      const admissionNo = `LAA/${year}/${String(counter++).padStart(4, "0")}`;

      const learner = {
        admission_no: admissionNo,
        first_name: row.first_name,
        last_name: row.last_name,
        gender: row.gender,
        date_of_birth: row.date_of_birth,
        class_id: bulkClassSelect.value
      };

      bulkLearners.push(learner);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${admissionNo}</td>
        <td>${row.first_name} ${row.last_name}</td>
        <td>${row.gender}</td>
        <td>${row.date_of_birth}</td>
      `;
      previewBody.appendChild(tr);
    });

    previewTable.classList.remove("hidden");
    saveBulkBtn.classList.remove("hidden");
  };

  reader.readAsBinaryString(file);
});

/* ===========================
   SAVE BULK LEARNERS
=========================== */
saveBulkBtn.addEventListener("click", async () => {
  if (bulkLearners.length === 0) return;

  const { error } = await supabase
    .from("learners")
    .insert(bulkLearners);

  if (error) {
    alert(error.message);
  } else {
    alert("Bulk learners saved successfully");
    bulkLearners = [];
    previewTable.classList.add("hidden");
    saveBulkBtn.classList.add("hidden");
    excelFileInput.value = "";
    loadLearners();
  }
});

/* ===========================
   INIT BULK
=========================== */
loadBulkClasses();


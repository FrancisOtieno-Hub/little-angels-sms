import { supabase } from "./supabase.js";

const form = document.getElementById("learnerForm");
const classSelect = document.getElementById("classSelect");
const admissionNoInput = document.getElementById("admissionNo");
const tableBody = document.querySelector("#learnersTable tbody");
const learnersTable = document.getElementById("learnersTable");
const loadingLearners = document.getElementById("loadingLearners");
const alertContainer = document.getElementById("alertContainer");
const saveBtn = document.getElementById("saveBtn");

// Bulk upload elements
const excelFileInput = document.getElementById("excelFile");
const previewBtn = document.getElementById("previewBtn");
const saveBulkBtn = document.getElementById("saveBulkBtn");
const previewTable = document.getElementById("previewTable");
const previewBody = previewTable.querySelector("tbody");
const bulkClassSelect = document.getElementById("bulkClassSelect");

let bulkLearners = [];

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
  
  // Scroll to top to see alert
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
      classSelect.appendChild(option.cloneNode(true));
      bulkClassSelect.appendChild(option);
    });
  } catch (error) {
    showAlert("Error loading classes: " + error.message, "error");
  }
}

/* ===========================
   GENERATE ADMISSION NUMBER
=========================== */
async function generateAdmissionNo() {
  try {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
      .from("learners")
      .select("admission_no")
      .like("admission_no", `LAA/${year}/%`);

    if (error) throw error;

    const nextNumber = data.length + 1;
    const padded = String(nextNumber).padStart(4, "0");

    admissionNoInput.value = `LAA/${year}/${padded}`;
  } catch (error) {
    showAlert("Error generating admission number: " + error.message, "error");
  }
}

/* ===========================
   SAVE LEARNER
=========================== */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  setLoading(saveBtn, true);

  try {
    const learner = {
      admission_no: admissionNoInput.value,
      first_name: document.getElementById("firstName").value.trim(),
      last_name: document.getElementById("lastName").value.trim(),
      gender: document.getElementById("gender").value,
      date_of_birth: document.getElementById("dob").value,
      class_id: classSelect.value
    };

    const { error } = await supabase
      .from("learners")
      .insert([learner]);

    if (error) throw error;

    showAlert("Learner registered successfully!");
    form.reset();
    await generateAdmissionNo();
    await loadLearners();
  } catch (error) {
    showAlert("Error: " + error.message, "error");
  } finally {
    setLoading(saveBtn, false, "Save Learner");
  }
});

/* ===========================
   LOAD LEARNERS
=========================== */
async function loadLearners() {
  try {
    tableBody.innerHTML = "";
    loadingLearners.classList.remove("hidden");
    learnersTable.classList.add("hidden");

    const { data, error } = await supabase
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

    if (error) throw error;

    if (data.length === 0) {
      loadingLearners.textContent = "No learners registered yet.";
      return;
    }

    data.forEach(l => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${l.admission_no}</td>
        <td>${l.first_name} ${l.last_name}</td>
        <td>${l.classes?.name || 'N/A'}</td>
        <td>${l.gender || 'N/A'}</td>
      `;
      tableBody.appendChild(row);
    });

    loadingLearners.classList.add("hidden");
    learnersTable.classList.remove("hidden");
  } catch (error) {
    loadingLearners.textContent = "Error loading learners.";
    showAlert("Error loading learners: " + error.message, "error");
  }
}

/* ===========================
   BULK UPLOAD - PREVIEW
=========================== */
previewBtn.addEventListener("click", async () => {
  const file = excelFileInput.files[0];
  
  if (!file) {
    showAlert("Please select an Excel file", "error");
    return;
  }
  
  if (!bulkClassSelect.value) {
    showAlert("Please select a class for upload", "error");
    return;
  }

  setLoading(previewBtn, true, "Preview Learners");

  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          showAlert("Excel file is empty", "error");
          setLoading(previewBtn, false, "Preview Learners");
          return;
        }

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
            first_name: row.first_name || "",
            last_name: row.last_name || "",
            gender: row.gender || "",
            date_of_birth: row.date_of_birth || null,
            class_id: bulkClassSelect.value
          };

          bulkLearners.push(learner);

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${admissionNo}</td>
            <td>${row.first_name} ${row.last_name}</td>
            <td>${row.gender || 'N/A'}</td>
            <td>${row.date_of_birth || 'N/A'}</td>
          `;
          previewBody.appendChild(tr);
        });

        previewTable.classList.remove("hidden");
        saveBulkBtn.classList.remove("hidden");
        showAlert(`${bulkLearners.length} learners ready to be saved`, "info");
      } catch (error) {
        showAlert("Error reading Excel file: " + error.message, "error");
      } finally {
        setLoading(previewBtn, false, "Preview Learners");
      }
    };

    reader.readAsBinaryString(file);
  } catch (error) {
    showAlert("Error processing file: " + error.message, "error");
    setLoading(previewBtn, false, "Preview Learners");
  }
});

/* ===========================
   BULK UPLOAD - SAVE
=========================== */
saveBulkBtn.addEventListener("click", async () => {
  if (bulkLearners.length === 0) return;

  if (!confirm(`Save ${bulkLearners.length} learners to the database?`)) {
    return;
  }

  setLoading(saveBulkBtn, true, "Save All Learners");

  try {
    const { error } = await supabase
      .from("learners")
      .insert(bulkLearners);

    if (error) throw error;

    showAlert(`Successfully saved ${bulkLearners.length} learners!`);
    bulkLearners = [];
    previewTable.classList.add("hidden");
    saveBulkBtn.classList.add("hidden");
    excelFileInput.value = "";
    await loadLearners();
  } catch (error) {
    showAlert("Error saving bulk learners: " + error.message, "error");
  } finally {
    setLoading(saveBulkBtn, false, "Save All Learners");
  }
});

/* ===========================
   INIT
=========================== */
checkAuth();
loadClasses();
generateAdmissionNo();
loadLearners();

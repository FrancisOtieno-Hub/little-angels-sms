import { supabase } from "./supabase.js";

const form = document.getElementById("learnerForm");
const classSelect = document.getElementById("classSelect");
const admissionNoInput = document.getElementById("admissionNo");
const tableBody = document.querySelector("#learnersTable tbody");
const learnersTable = document.getElementById("learnersTable");
const tableWrapper = document.getElementById("tableWrapper");
const loadingLearners = document.getElementById("loadingLearners");
const alertContainer = document.getElementById("alertContainer");
const saveBtn = document.getElementById("saveBtn");
const classFilter = document.getElementById("classFilter");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const learnerStats = document.getElementById("learnerStats");

// Bulk upload elements
const excelFileInput = document.getElementById("excelFile");
const previewBtn = document.getElementById("previewBtn");
const saveBulkBtn = document.getElementById("saveBulkBtn");
const previewTable = document.getElementById("previewTable");
const previewBody = previewTable.querySelector("tbody");
const bulkClassSelect = document.getElementById("bulkClassSelect");

let bulkLearners = [];
let allLearnersData = [];
let allClassesData = [];

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

// Convert Excel serial date to YYYY-MM-DD format
function excelDateToJSDate(serial) {
  // If it's already a string date, try to parse it
  if (typeof serial === 'string') {
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(serial)) {
      return serial;
    }
    // Try to parse other date formats
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return null;
  }
  
  // If it's a number (Excel serial date)
  if (typeof serial === 'number') {
    // Excel dates start from 1900-01-01 (serial 1)
    // JavaScript dates use milliseconds since 1970-01-01
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms in a day
    
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  return null;
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

    allClassesData = data || [];

    data.forEach(cls => {
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.name;
      classSelect.appendChild(option.cloneNode(true));
      bulkClassSelect.appendChild(option.cloneNode(true));
      
      // Add to filter dropdown
      const filterOption = document.createElement("option");
      filterOption.value = cls.id;
      filterOption.textContent = cls.name;
      classFilter.appendChild(filterOption);
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
    // Get all existing admission numbers to find the highest
    const { data, error } = await supabase
      .from("learners")
      .select("admission_no")
      .order("admission_no", { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    
    if (data && data.length > 0) {
      // Extract number from existing admission number
      const lastAdmNo = data[0].admission_no;
      const lastNumber = parseInt(lastAdmNo);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Generate 4-digit padded number (0001, 0002, etc.)
    const paddedNumber = String(nextNumber).padStart(4, "0");
    admissionNoInput.value = paddedNumber;
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
async function loadLearners(filterClassId = null) {
  try {
    tableBody.innerHTML = "";
    loadingLearners.classList.remove("hidden");
    tableWrapper.classList.add("hidden");

    let query = supabase
      .from("learners")
      .select(`
        admission_no,
        first_name,
        last_name,
        gender,
        date_of_birth,
        class_id,
        classes(id, name, level)
      `)
      .eq("active", true)
      .order("created_at", { ascending: false });

    // Apply filter if specified
    if (filterClassId) {
      query = query.eq("class_id", filterClassId);
    }

    const { data, error } = await query;

    if (error) throw error;

    allLearnersData = data || [];

    if (data.length === 0) {
      loadingLearners.textContent = filterClassId 
        ? "No learners found in this class." 
        : "No learners registered yet.";
      updateLearnerStats([]);
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
    tableWrapper.classList.remove("hidden");
    updateLearnerStats(data);
  } catch (error) {
    loadingLearners.textContent = "Error loading learners.";
    showAlert("Error loading learners: " + error.message, "error");
  }
}

/* ===========================
   UPDATE LEARNER STATISTICS
=========================== */
function updateLearnerStats(learners) {
  const total = learners.length;
  const male = learners.filter(l => l.gender === 'Male').length;
  const female = learners.filter(l => l.gender === 'Female').length;
  
  learnerStats.innerHTML = `
    <div style="padding: 12px 16px; background: var(--background); border-radius: var(--radius-sm); border-left: 3px solid var(--primary);">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">Total Learners</div>
      <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${total}</div>
    </div>
    <div style="padding: 12px 16px; background: var(--background); border-radius: var(--radius-sm); border-left: 3px solid #3b82f6;">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">Male</div>
      <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${male}</div>
    </div>
    <div style="padding: 12px 16px; background: var(--background); border-radius: var(--radius-sm); border-left: 3px solid #ec4899;">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">Female</div>
      <div style="font-size: 1.5rem; font-weight: 700; color: #ec4899;">${female}</div>
    </div>
  `;
}

/* ===========================
   CLASS FILTER CHANGE
=========================== */
classFilter.addEventListener('change', (e) => {
  const selectedClass = e.target.value;
  loadLearners(selectedClass || null);
});

/* ===========================
   EXPORT TO EXCEL
=========================== */
exportExcelBtn.addEventListener('click', async () => {
  try {
    setLoading(exportExcelBtn, true, "Export to Excel");
    
    // Fetch all active learners with class info
    const { data: allLearners, error } = await supabase
      .from("learners")
      .select(`
        admission_no,
        first_name,
        last_name,
        gender,
        date_of_birth,
        classes(id, name, level)
      `)
      .eq("active", true)
      .order("classes(level)", { ascending: true });
    
    if (error) throw error;
    
    if (!allLearners || allLearners.length === 0) {
      showAlert("No learners to export", "error");
      setLoading(exportExcelBtn, false, "Export to Excel");
      return;
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Group learners by class
    const learnersByClass = {};
    
    allLearners.forEach(learner => {
      const className = learner.classes?.name || 'Unassigned';
      if (!learnersByClass[className]) {
        learnersByClass[className] = [];
      }
      learnersByClass[className].push({
        'Admission No': learner.admission_no,
        'First Name': learner.first_name,
        'Last Name': learner.last_name,
        'Gender': learner.gender || '',
        'Date of Birth': learner.date_of_birth || ''
      });
    });
    
    // Sort classes by level
    const sortedClasses = allClassesData
      .map(cls => cls.name)
      .filter(name => learnersByClass[name]);
    
    // Add unassigned if exists
    if (learnersByClass['Unassigned']) {
      sortedClasses.push('Unassigned');
    }
    
    // Create a sheet for each class
    sortedClasses.forEach(className => {
      const learners = learnersByClass[className];
      const ws = XLSX.utils.json_to_sheet(learners);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Admission No
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 10 }, // Gender
        { wch: 15 }  // Date of Birth
      ];
      
      // Add sheet to workbook (limit sheet name to 31 chars)
      const sheetName = className.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `LAA_Learners_${today}.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, filename);
    
    showAlert(`✓ Exported ${allLearners.length} learners across ${sortedClasses.length} classes`);
    
  } catch (error) {
    showAlert("Error exporting to Excel: " + error.message, "error");
    console.error("Export error:", error);
  } finally {
    setLoading(exportExcelBtn, false, "📊 Export to Excel");
  }
});

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
          .order("admission_no", { ascending: false })
          .limit(1);

        let counter = 1;
        
        if (existing && existing.length > 0) {
          const lastNumber = parseInt(existing[0].admission_no);
          if (!isNaN(lastNumber)) {
            counter = lastNumber + 1;
          }
        }

        rows.forEach(row => {
          const admissionNo = String(counter++).padStart(4, "0");

          // Convert Excel date to proper format
          let dateOfBirth = null;
          if (row.date_of_birth) {
            dateOfBirth = excelDateToJSDate(row.date_of_birth);
          }

          const learner = {
            admission_no: admissionNo,
            first_name: row.first_name || "",
            last_name: row.last_name || "",
            gender: row.gender || "",
            date_of_birth: dateOfBirth,
            class_id: bulkClassSelect.value
          };

          bulkLearners.push(learner);

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${admissionNo}</td>
            <td>${row.first_name} ${row.last_name}</td>
            <td>${row.gender || 'N/A'}</td>
            <td>${dateOfBirth || 'N/A'}</td>
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

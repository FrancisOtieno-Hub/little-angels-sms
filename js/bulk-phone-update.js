import { supabase } from "./supabase.js";

/* ===========================
   DOM ELEMENTS
=========================== */
const logoutBtn = document.getElementById("logoutBtn");
const alertContainer = document.getElementById("alertContainer");
const downloadBtn = document.getElementById("downloadBtn");
const downloadStatus = document.getElementById("downloadStatus");
const excelFile = document.getElementById("excelFile");
const previewBtn = document.getElementById("previewBtn");
const previewContainer = document.getElementById("previewContainer");
const previewTable = document.getElementById("previewTable").getElementsByTagName("tbody")[0];
const previewCount = document.getElementById("previewCount");
const updateAllBtn = document.getElementById("updateAllBtn");
const downloadInvalidBtn = document.getElementById("downloadInvalidBtn");
const validationSummary = document.getElementById("validationSummary");
const validCount = document.getElementById("validCount");
const invalidCount = document.getElementById("invalidCount");
const notFoundCount = document.getElementById("notFoundCount");
const totalRows = document.getElementById("totalRows");
const progressLog = document.getElementById("progressLog");

// Manual entry
const manualAdmNo = document.getElementById("manualAdmNo");
const manualPhone = document.getElementById("manualPhone");
const updateSingleBtn = document.getElementById("updateSingleBtn");
const manualResult = document.getElementById("manualResult");

let currentLearnersData = [];
let previewData = [];
let validRecords = [];
let invalidRecords = [];
let notFoundRecords = [];

/* ===========================
   UTILITY FUNCTIONS
=========================== */
function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.innerHTML = "";
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 6000);
}

function setLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = originalText || btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Processing...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || originalText;
  }
}

function logProgress(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const colors = {
    info: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444"
  };
  
  const logEntry = document.createElement("div");
  logEntry.style.color = colors[type];
  logEntry.innerHTML = `[${timestamp}] ${message}`;
  
  if (progressLog.querySelector('.text-muted')) {
    progressLog.innerHTML = '';
  }
  
  progressLog.appendChild(logEntry);
  progressLog.scrollTop = progressLog.scrollHeight;
}

function validatePhoneNumber(phone) {
  if (!phone) {
    return { valid: false, error: "Empty" };
  }
  
  // Clean the phone number
  const cleaned = String(phone).replace(/[\s\-()]/g, '');
  
  // Kenyan phone validation
  // Valid formats: 
  // Mobile: 0712345678, +254712345678, 254712345678
  // Landline: 0101234567, 0201234567, 0411234567, etc.
  const patterns = [
    /^0[17]\d{8}$/,           // Mobile: 0712345678, 0722345678, etc.
    /^0[2-9]\d{8}$/,          // Landline: 0101234567, 0201234567, 0411234567, etc.
    /^\+2540?[17]\d{8}$/,     // Mobile international: +254712345678
    /^2540?[17]\d{8}$/,       // Mobile international: 254712345678
    /^\+2540?[2-9]\d{8}$/,    // Landline international: +254101234567
    /^2540?[2-9]\d{8}$/       // Landline international: 254101234567
  ];
  
  const isValid = patterns.some(pattern => pattern.test(cleaned));
  
  if (!isValid) {
    if (cleaned.length < 10) {
      return { valid: false, error: "Too short" };
    } else if (cleaned.length > 13) {
      return { valid: false, error: "Too long" };
    } else if (!/^[0-9+]/.test(cleaned)) {
      return { valid: false, error: "Invalid characters" };
    } else {
      return { valid: false, error: "Invalid format" };
    }
  }
  
  // Normalize to standard format (0XXXXXXXXX)
  let normalized = cleaned;
  if (cleaned.startsWith('+254')) {
    normalized = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('254')) {
    normalized = '0' + cleaned.substring(3);
  }
  
  return { valid: true, normalized };
}

/* ===========================
   AUTH CHECK
=========================== */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    window.location.href = "/";
  }
}

/* ===========================
   DOWNLOAD CURRENT LEARNERS
=========================== */
async function downloadCurrentLearners() {
  setLoading(downloadBtn, true);
  logProgress("📥 Fetching all learners from database...");
  downloadStatus.textContent = "Fetching data...";

  try {
    const { data: learners, error } = await supabase
      .from("learners")
      .select(`
        admission_no,
        first_name,
        last_name,
        guardian_phone,
        class_id,
        class:classes(name)
      `)
      .order("admission_no");

    if (error) throw error;

    logProgress(`✅ Found ${learners.length} learners`, "success");
    downloadStatus.textContent = `Found ${learners.length} learners. Preparing Excel file...`;

    // Prepare data for Excel
    const excelData = learners.map(learner => ({
      admission_no: learner.admission_no,
      first_name: learner.first_name,
      last_name: learner.last_name,
      class: learner.class?.name || 'N/A',
      guardian_phone: learner.guardian_phone || ''
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 },  // admission_no
      { wch: 20 },  // first_name
      { wch: 20 },  // last_name
      { wch: 15 },  // class
      { wch: 20 }   // guardian_phone
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Learners");

    // Add instructions sheet
    const instructions = [
      ['INSTRUCTIONS FOR ADDING GUARDIAN PHONE NUMBERS'],
      [''],
      ['1. Fill the "guardian_phone" column with phone numbers'],
      ['2. Use format: 0712345678 or 0722345678'],
      ['3. Do NOT change admission_no, first_name, last_name, or class columns'],
      ['4. Save this file when done'],
      ['5. Upload the saved file in Step 2'],
      [''],
      ['VALID PHONE FORMATS:'],
      ['✅ 0712345678'],
      ['✅ 0722345678'],
      ['✅ +254712345678'],
      [''],
      ['INVALID FORMATS:'],
      ['❌ 712345678 (missing leading 0)'],
      ['❌ 07123 (too short)'],
      ['❌ 071234567890 (too long)'],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions");

    // Download file
    XLSX.writeFile(wb, `Little_Angels_Learners_${new Date().toISOString().split('T')[0]}.xlsx`);

    logProgress(`📥 Excel file downloaded successfully`, "success");
    downloadStatus.textContent = `✅ Downloaded ${learners.length} learners`;
    showAlert(`✅ Downloaded ${learners.length} learners. Add phone numbers and upload in Step 2.`, "success");

    // Store current data for comparison
    currentLearnersData = learners;

  } catch (error) {
    logProgress(`❌ Error: ${error.message}`, "error");
    downloadStatus.textContent = "Error downloading data";
    showAlert("Error downloading data: " + error.message, "error");
  } finally {
    setLoading(downloadBtn, false);
  }
}

/* ===========================
   PREVIEW UPLOADED FILE
=========================== */
async function previewUploadedFile() {
  const file = excelFile.files[0];
  
  if (!file) {
    showAlert("Please select an Excel file", "error");
    return;
  }

  setLoading(previewBtn, true);
  logProgress("📄 Reading uploaded Excel file...");

  try {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const uploadedData = XLSX.utils.sheet_to_json(firstSheet);

        logProgress(`📊 Found ${uploadedData.length} rows in Excel file`);

        // Fetch current learners from database
        const { data: dbLearners, error } = await supabase
          .from("learners")
          .select(`
            admission_no,
            first_name,
            last_name,
            guardian_phone,
            class_id,
            class:classes(name)
          `);

        if (error) throw error;

        // Create lookup map
        const learnerMap = new Map();
        dbLearners.forEach(learner => {
          learnerMap.set(learner.admission_no, learner);
        });

        // Process and validate each row
        previewData = [];
        validRecords = [];
        invalidRecords = [];
        notFoundRecords = [];

        uploadedData.forEach((row, index) => {
          const admNo = String(row.admission_no || '').trim();
          const newPhone = String(row.guardian_phone || '').trim();
          
          if (!admNo) {
            logProgress(`⚠️ Row ${index + 2}: Missing admission number`, "warning");
            return;
          }

          const dbLearner = learnerMap.get(admNo);
          
          if (!dbLearner) {
            const record = {
              status: 'notfound',
              admission_no: admNo,
              first_name: row.first_name || '?',
              last_name: row.last_name || '?',
              class: row.class || '?',
              current_phone: 'N/A',
              new_phone: newPhone,
              validation: 'Not found in database'
            };
            previewData.push(record);
            notFoundRecords.push(record);
            return;
          }

          // Validate phone number
          const validation = validatePhoneNumber(newPhone);
          
          const record = {
            status: validation.valid ? 'valid' : 'invalid',
            admission_no: admNo,
            first_name: dbLearner.first_name,
            last_name: dbLearner.last_name,
            class: dbLearner.class?.name || 'N/A',
            current_phone: dbLearner.guardian_phone || 'None',
            new_phone: validation.valid ? validation.normalized : newPhone,
            validation: validation.valid ? '✅ Valid' : `❌ ${validation.error}`,
            db_id: dbLearner.id
          };

          previewData.push(record);
          
          if (validation.valid) {
            validRecords.push(record);
          } else if (newPhone) {
            invalidRecords.push(record);
          }
        });

        // Update summary
        validCount.textContent = validRecords.length;
        invalidCount.textContent = invalidRecords.length + (uploadedData.length - validRecords.length - invalidRecords.length - notFoundRecords.length);
        notFoundCount.textContent = notFoundRecords.length;
        totalRows.textContent = uploadedData.length;

        validationSummary.classList.remove('hidden');
        
        // Render preview table
        renderPreviewTable(previewData);
        
        previewContainer.classList.remove('hidden');
        previewCount.textContent = previewData.length;

        logProgress(`✅ Validation complete: ${validRecords.length} valid, ${invalidRecords.length} invalid, ${notFoundRecords.length} not found`, "success");
        
        if (validRecords.length === 0) {
          showAlert("⚠️ No valid phone numbers found. Please check your Excel file.", "warning");
          updateAllBtn.disabled = true;
        } else {
          showAlert(`✅ Ready to update ${validRecords.length} valid phone numbers`, "success");
          updateAllBtn.disabled = false;
        }

      } catch (error) {
        logProgress(`❌ Error processing file: ${error.message}`, "error");
        showAlert("Error processing Excel file: " + error.message, "error");
      } finally {
        setLoading(previewBtn, false);
      }
    };

    reader.readAsArrayBuffer(file);

  } catch (error) {
    logProgress(`❌ Error: ${error.message}`, "error");
    showAlert("Error reading file: " + error.message, "error");
    setLoading(previewBtn, false);
  }
}

/* ===========================
   RENDER PREVIEW TABLE
=========================== */
function renderPreviewTable(data) {
  previewTable.innerHTML = '';

  data.forEach(record => {
    const tr = document.createElement("tr");
    tr.dataset.status = record.status;
    
    // Status indicator
    let statusIcon = '';
    let statusColor = '';
    
    if (record.status === 'valid') {
      statusIcon = '✅';
      statusColor = '#10b981';
    } else if (record.status === 'invalid') {
      statusIcon = '⚠️';
      statusColor = '#f59e0b';
    } else if (record.status === 'notfound') {
      statusIcon = '❌';
      statusColor = '#ef4444';
    }

    const currentPhoneDisplay = record.current_phone === 'None' ? 
      '<span style="color: #9ca3af;">None</span>' : record.current_phone;
    
    const newPhoneDisplay = record.status === 'valid' ? 
      `<strong style="color: #10b981;">${record.new_phone}</strong>` : record.new_phone;

    tr.innerHTML = `
      <td style="text-align: center; font-size: 18px;">${statusIcon}</td>
      <td>${record.admission_no}</td>
      <td>${record.first_name} ${record.last_name}</td>
      <td>${record.class}</td>
      <td>${currentPhoneDisplay}</td>
      <td>${newPhoneDisplay}</td>
      <td style="color: ${statusColor};">${record.validation}</td>
    `;
    
    previewTable.appendChild(tr);
  });
}

/* ===========================
   FILTER PREVIEW
=========================== */
window.filterPreview = function(filterType) {
  const rows = previewTable.querySelectorAll('tr');
  
  rows.forEach(row => {
    if (filterType === 'all') {
      row.style.display = '';
    } else {
      row.style.display = row.dataset.status === filterType ? '' : 'none';
    }
  });
};

/* ===========================
   UPDATE ALL VALID RECORDS
=========================== */
async function updateAllPhoneNumbers() {
  if (validRecords.length === 0) {
    showAlert("No valid records to update", "error");
    return;
  }

  const confirmMsg = `This will update ${validRecords.length} guardian phone numbers.\n\nThis action cannot be undone. Continue?`;
  
  if (!confirm(confirmMsg)) {
    return;
  }

  setLoading(updateAllBtn, true);
  logProgress(`🚀 Starting update of ${validRecords.length} phone numbers...`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      
      try {
        const { error } = await supabase
          .from("learners")
          .update({ guardian_phone: record.new_phone })
          .eq("admission_no", record.admission_no);

        if (error) throw error;

        successCount++;
        
        if ((i + 1) % 10 === 0 || i === validRecords.length - 1) {
          logProgress(`⏳ Progress: ${i + 1}/${validRecords.length} updated...`);
        }

      } catch (error) {
        errorCount++;
        errors.push({ admission_no: record.admission_no, error: error.message });
        logProgress(`❌ Failed to update ${record.admission_no}: ${error.message}`, "error");
      }
    }

    // Final summary
    if (errorCount === 0) {
      logProgress(`✅ SUCCESS! All ${successCount} phone numbers updated successfully!`, "success");
      showAlert(`✅ Successfully updated ${successCount} phone numbers!`, "success");
    } else {
      logProgress(`⚠️ Completed with errors: ${successCount} succeeded, ${errorCount} failed`, "warning");
      showAlert(`⚠️ Updated ${successCount} numbers, ${errorCount} failed`, "warning");
    }

    // Reset preview
    if (errorCount === 0) {
      setTimeout(() => {
        previewContainer.classList.add('hidden');
        validationSummary.classList.add('hidden');
        excelFile.value = '';
      }, 3000);
    }

  } catch (error) {
    logProgress(`❌ Critical error: ${error.message}`, "error");
    showAlert("Update failed: " + error.message, "error");
  } finally {
    setLoading(updateAllBtn, false);
  }
}

/* ===========================
   DOWNLOAD INVALID RECORDS
=========================== */
function downloadInvalidRecords() {
  if (invalidRecords.length === 0 && notFoundRecords.length === 0) {
    showAlert("No invalid records to download", "info");
    return;
  }

  const allInvalid = [...invalidRecords, ...notFoundRecords];
  
  const ws = XLSX.utils.json_to_sheet(allInvalid.map(r => ({
    admission_no: r.admission_no,
    first_name: r.first_name,
    last_name: r.last_name,
    class: r.class,
    current_phone: r.current_phone,
    new_phone: r.new_phone,
    issue: r.validation
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invalid Records");

  XLSX.writeFile(wb, `Invalid_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  
  showAlert(`Downloaded ${allInvalid.length} invalid records for review`, "info");
  logProgress(`📥 Downloaded ${allInvalid.length} invalid records`, "info");
}

/* ===========================
   MANUAL SINGLE UPDATE
=========================== */
async function updateSingleLearner() {
  const admNo = manualAdmNo.value.trim();
  const phone = manualPhone.value.trim();

  if (!admNo || !phone) {
    showAlert("Please enter both admission number and phone number", "error");
    return;
  }

  // Validate phone
  const validation = validatePhoneNumber(phone);
  
  if (!validation.valid) {
    showAlert(`Invalid phone number: ${validation.error}`, "error");
    return;
  }

  setLoading(updateSingleBtn, true);
  logProgress(`🔍 Looking up ${admNo}...`);

  try {
    // Check if learner exists
    const { data: learner, error: fetchError } = await supabase
      .from("learners")
      .select("admission_no, first_name, last_name, guardian_phone")
      .eq("admission_no", admNo)
      .single();

    if (fetchError || !learner) {
      throw new Error("Learner not found with admission number: " + admNo);
    }

    // Update phone
    const { error: updateError } = await supabase
      .from("learners")
      .update({ guardian_phone: validation.normalized })
      .eq("admission_no", admNo);

    if (updateError) throw updateError;

    logProgress(`✅ Updated ${admNo} (${learner.first_name} ${learner.last_name})`, "success");
    
    manualResult.innerHTML = `
      <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #10b981;">
        <strong>✅ Successfully Updated</strong><br>
        <strong>${learner.first_name} ${learner.last_name}</strong> (${admNo})<br>
        Old Phone: ${learner.guardian_phone || 'None'}<br>
        New Phone: <strong>${validation.normalized}</strong>
      </div>
    `;
    manualResult.classList.remove('hidden');

    // Clear inputs
    manualAdmNo.value = '';
    manualPhone.value = '';

    showAlert(`✅ Updated phone number for ${learner.first_name} ${learner.last_name}`, "success");

  } catch (error) {
    logProgress(`❌ Error: ${error.message}`, "error");
    showAlert("Error: " + error.message, "error");
    
    manualResult.innerHTML = `
      <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border-left: 4px solid #ef4444;">
        <strong>❌ Update Failed</strong><br>
        ${error.message}
      </div>
    `;
    manualResult.classList.remove('hidden');
  } finally {
    setLoading(updateSingleBtn, false);
  }
}

/* ===========================
   EVENT LISTENERS
=========================== */
downloadBtn.addEventListener("click", downloadCurrentLearners);
previewBtn.addEventListener("click", previewUploadedFile);
updateAllBtn.addEventListener("click", updateAllPhoneNumbers);
downloadInvalidBtn.addEventListener("click", downloadInvalidRecords);
updateSingleBtn.addEventListener("click", updateSingleLearner);

logoutBtn.addEventListener("click", async () => {
  if (confirm("Are you sure you want to logout?")) {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
});

/* ===========================
   INIT
=========================== */
checkAuth();
logProgress("Ready to update guardian phone numbers", "info");

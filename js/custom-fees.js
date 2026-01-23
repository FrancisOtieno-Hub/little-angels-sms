import { supabase } from "./supabase.js";

const searchInput = document.getElementById("searchInput");
const autocompleteDropdown = document.getElementById("autocompleteDropdown");
const learnerDetails = document.getElementById("learnerDetails");
const customFeeCard = document.getElementById("customFeeCard");
const customFeeForm = document.getElementById("customFeeForm");
const alertContainer = document.getElementById("alertContainer");
const saveFeeBtn = document.getElementById("saveFeeBtn");
const feeType = document.getElementById("feeType");
const customAmountSection = document.getElementById("customAmountSection");
const customAmount = document.getElementById("customAmount");
const reasonSection = document.getElementById("reasonSection");
const feeReason = document.getElementById("feeReason");
const classFee = document.getElementById("classFee");
const currentCustomFee = document.getElementById("currentCustomFee");
const classFilterCustom = document.getElementById("classFilterCustom");
const typeFilter = document.getElementById("typeFilter");
const customFeesTable = document.getElementById("customFeesTable").querySelector("tbody");
const customFeesTableWrapper = document.getElementById("customFeesTableWrapper");
const loadingCustomFees = document.getElementById("loadingCustomFees");

let selectedLearner = null;
let activeTerm = null;
let autocompleteTimeout = null;
let allLearners = [];

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

    if (!data) {
      showAlert("No active term found! Please set an active term first.", "error");
      return null;
    }

    activeTerm = data;
    return activeTerm;
  } catch (error) {
    showAlert("Error loading active term: " + error.message, "error");
    return null;
  }
}

/* ===========================
   LOAD CLASSES FOR FILTER
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
      classFilterCustom.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading classes:", error);
  }
}

/* ===========================
   AUTOCOMPLETE FUNCTIONALITY
=========================== */
async function loadAllLearners() {
  try {
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
      .eq("active", true)
      .order("first_name");
    
    if (error) throw error;
    
    allLearners = data || [];
    console.log("Loaded learners:", allLearners.length); // Debug log
  } catch (error) {
    console.error("Error loading learners:", error);
    showAlert("Error loading learners: " + error.message, "error");
  }
}

function showAutocomplete(results) {
  if (results.length === 0) {
    autocompleteDropdown.innerHTML = `
      <div class="autocomplete-no-results">No learners found</div>
    `;
    autocompleteDropdown.classList.remove("hidden");
    return;
  }
  
  autocompleteDropdown.innerHTML = results.map((learner, index) => `
    <div class="autocomplete-item" data-index="${index}">
      <span class="learner-name">${learner.first_name} ${learner.last_name}</span>
      <span class="learner-details">
        ${learner.admission_no} • ${learner.classes?.name || 'N/A'}
      </span>
    </div>
  `).join('');
  
  autocompleteDropdown.classList.remove("hidden");
  
  document.querySelectorAll('.autocomplete-item').forEach((item, index) => {
    item.addEventListener('click', () => {
      selectLearnerFromAutocomplete(results[index]);
    });
  });
}

function hideAutocomplete() {
  autocompleteDropdown.classList.add("hidden");
}

function selectLearnerFromAutocomplete(learner) {
  searchInput.value = `${learner.first_name} ${learner.last_name} (${learner.admission_no})`;
  selectedLearner = learner;
  hideAutocomplete();
  
  // Automatically display learner details
  displayLearnerDetails();
}

function filterLearners(query) {
  if (!query || query.length < 2) return [];
  
  const searchQuery = query.toLowerCase();
  
  return allLearners.filter(learner => {
    const fullName = `${learner.first_name} ${learner.last_name}`.toLowerCase();
    const admissionNo = learner.admission_no.toLowerCase();
    
    return fullName.includes(searchQuery) || admissionNo.includes(searchQuery);
  }).slice(0, 10);
}

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.trim();
  
  if (autocompleteTimeout) {
    clearTimeout(autocompleteTimeout);
  }
  
  if (selectedLearner && !query.includes(selectedLearner.admission_no)) {
    selectedLearner = null;
    learnerDetails.classList.add("hidden");
    customFeeCard.classList.add("hidden");
  }
  
  if (query.length < 2) {
    hideAutocomplete();
    return;
  }
  
  autocompleteTimeout = setTimeout(() => {
    const results = filterLearners(query);
    showAutocomplete(results);
  }, 300);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    hideAutocomplete();
  }
});

searchInput.addEventListener('keydown', (e) => {
  const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
  const selectedItem = autocompleteDropdown.querySelector('.autocomplete-item.selected');
  let currentIndex = selectedItem ? parseInt(selectedItem.dataset.index) : -1;
  
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentIndex = Math.min(currentIndex + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentIndex = Math.max(currentIndex - 1, 0);
  } else if (e.key === 'Enter' && currentIndex >= 0) {
    e.preventDefault();
    items[currentIndex].click();
    return;
  } else if (e.key === 'Escape') {
    hideAutocomplete();
    return;
  } else {
    return;
  }
  
  items.forEach(item => item.classList.remove('selected'));
  if (currentIndex >= 0 && items[currentIndex]) {
    items[currentIndex].classList.add('selected');
    items[currentIndex].scrollIntoView({ block: 'nearest' });
  }
});

/* ===========================
   DISPLAY LEARNER DETAILS
=========================== */
async function displayLearnerDetails() {
  if (!selectedLearner || !activeTerm) {
    await loadActiveTerm();
    if (!activeTerm) return;
  }

  try {
    // Fetch class fee
    const { data: feeData } = await supabase
      .from("fees")
      .select("amount")
      .eq("class_id", selectedLearner.class_id)
      .eq("term_id", activeTerm.id)
      .maybeSingle();

    const classFeeAmount = feeData?.amount || 0;

    // Fetch custom fee if exists
    const { data: customFeeData } = await supabase
      .from("custom_fees")
      .select("*")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id)
      .maybeSingle();

    classFee.textContent = `KES ${classFeeAmount.toLocaleString()}`;
    
    if (customFeeData) {
      currentCustomFee.textContent = `KES ${Number(customFeeData.custom_amount).toLocaleString()}`;
      currentCustomFee.style.color = "var(--secondary)";
    } else {
      currentCustomFee.textContent = "None (Using Class Fee)";
      currentCustomFee.style.color = "var(--text-secondary)";
    }

    learnerDetails.innerHTML = `
      <div style="padding: 20px; background: var(--background); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
        <h3 style="margin-bottom: 12px; color: var(--primary);">
          ${selectedLearner.first_name} ${selectedLearner.last_name}
        </h3>
        <p><strong>Admission No:</strong> ${selectedLearner.admission_no}</p>
        <p><strong>Class:</strong> ${selectedLearner.classes?.name || 'N/A'}</p>
        <p><strong>Term:</strong> Year ${activeTerm.year} - Term ${activeTerm.term}</p>
      </div>
    `;

    learnerDetails.classList.remove("hidden");
    customFeeCard.classList.remove("hidden");
  } catch (error) {
    showAlert("Error displaying learner details: " + error.message, "error");
  }
}

/* ===========================
   FEE TYPE CHANGE
=========================== */
feeType.addEventListener('change', (e) => {
  const type = e.target.value;
  
  if (type === 'full_sponsorship') {
    customAmountSection.classList.add('hidden');
    customAmount.value = '0';
    customAmount.required = false;
    reasonSection.classList.remove('hidden');
    feeReason.required = true;
  } else if (type === 'partial_sponsorship' || type === 'custom_amount') {
    customAmountSection.classList.remove('hidden');
    customAmount.required = true;
    reasonSection.classList.remove('hidden');
    feeReason.required = true;
  } else if (type === 'remove_custom') {
    customAmountSection.classList.add('hidden');
    customAmount.required = false;
    reasonSection.classList.add('hidden');
    feeReason.required = false;
  } else {
    customAmountSection.classList.add('hidden');
    reasonSection.classList.add('hidden');
  }
});

/* ===========================
   SAVE CUSTOM FEE
=========================== */
customFeeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedLearner || !activeTerm) {
    showAlert("Please search for a learner first", "error");
    return;
  }

  const type = feeType.value;
  
  if (!type) {
    showAlert("Please select a fee adjustment type", "error");
    return;
  }

  setLoading(saveFeeBtn, true, "Save Custom Fee");

  try {
    // If removing custom fee
    if (type === 'remove_custom') {
      const { error } = await supabase
        .from("custom_fees")
        .delete()
        .eq("learner_id", selectedLearner.id)
        .eq("term_id", activeTerm.id);

      if (error) throw error;

      showAlert(`✓ Custom fee removed for ${selectedLearner.first_name} ${selectedLearner.last_name}. Will now use class fee.`);
      await loadCustomFeesList();
      
      // Auto-refresh after 2 seconds
      setTimeout(() => {
        resetForNextLearner();
      }, 2000);
      
      return;
    }

    // Determine custom amount
    let amount = 0;
    if (type === 'full_sponsorship') {
      amount = 0;
    } else {
      amount = parseFloat(customAmount.value);
      if (isNaN(amount) || amount < 0) {
        showAlert("Please enter a valid amount", "error");
        setLoading(saveFeeBtn, false, "Save Custom Fee");
        return;
      }
    }

    const customFeeData = {
      learner_id: selectedLearner.id,
      term_id: activeTerm.id,
      custom_amount: amount,
      fee_type: type,
      reason: feeReason.value.trim()
    };

    // Check if custom fee already exists
    const { data: existing } = await supabase
      .from("custom_fees")
      .select("id")
      .eq("learner_id", selectedLearner.id)
      .eq("term_id", activeTerm.id)
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from("custom_fees")
        .update(customFeeData)
        .eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("custom_fees")
        .insert([customFeeData]);
      error = result.error;
    }

    if (error) throw error;

    const feeTypeLabel = {
      'full_sponsorship': 'Full Sponsorship',
      'partial_sponsorship': 'Partial Sponsorship',
      'custom_amount': 'Custom Fee'
    }[type] || 'Custom Fee';

    showAlert(`✓ ${feeTypeLabel} of KES ${amount.toLocaleString()} set for ${selectedLearner.first_name} ${selectedLearner.last_name}`);
    
    // Update the list
    await loadCustomFeesList();
    
    // Auto-refresh after 2 seconds for next learner
    setTimeout(() => {
      resetForNextLearner();
    }, 2000);
    
  } catch (error) {
    showAlert("Error saving custom fee: " + error.message, "error");
  } finally {
    setLoading(saveFeeBtn, false, "Save Custom Fee");
  }
});

/* ===========================
   RESET FOR NEXT LEARNER
=========================== */
function resetForNextLearner() {
  // Clear selected learner
  selectedLearner = null;
  
  // Clear search input
  searchInput.value = "";
  searchInput.focus();
  
  // Hide form sections
  learnerDetails.classList.add("hidden");
  customFeeCard.classList.add("hidden");
  
  // Reset form
  customFeeForm.reset();
  customAmountSection.classList.add("hidden");
  reasonSection.classList.add("hidden");
  
  // Show helpful message
  showAlert("Ready to search for next learner", "info");
}

// Next Learner button click handler
document.getElementById("nextLearnerBtn").addEventListener("click", () => {
  resetForNextLearner();
});

/* ===========================
   LOAD CUSTOM FEES LIST
=========================== */
async function loadCustomFeesList(classFilter = null, typeFilterValue = null) {
  try {
    customFeesTable.innerHTML = "";
    loadingCustomFees.classList.remove("hidden");
    customFeesTableWrapper.classList.add("hidden");

    if (!activeTerm) {
      await loadActiveTerm();
      if (!activeTerm) return;
    }

    let query = supabase
      .from("custom_fees")
      .select(`
        id,
        custom_amount,
        fee_type,
        reason,
        learners(
          id,
          admission_no,
          first_name,
          last_name,
          class_id,
          classes(id, name)
        )
      `)
      .eq("term_id", activeTerm.id)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Filter by class and type
    let filteredData = data || [];
    
    if (classFilter) {
      filteredData = filteredData.filter(cf => cf.learners?.class_id === classFilter);
    }
    
    if (typeFilterValue) {
      filteredData = filteredData.filter(cf => cf.fee_type === typeFilterValue);
    }

    if (filteredData.length === 0) {
      loadingCustomFees.textContent = "No custom fees set";
      return;
    }

    for (const cf of filteredData) {
      const learner = cf.learners;
      
      // Fetch class fee for comparison
      const { data: feeData } = await supabase
        .from("fees")
        .select("amount")
        .eq("class_id", learner.class_id)
        .eq("term_id", activeTerm.id)
        .maybeSingle();

      const classFeeAmount = feeData?.amount || 0;

      const feeTypeLabel = {
        'full_sponsorship': '🎓 Full Sponsorship',
        'partial_sponsorship': '💰 Partial Sponsorship',
        'custom_amount': '✏️ Custom Amount'
      }[cf.fee_type] || cf.fee_type;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${learner.admission_no}</td>
        <td>${learner.first_name} ${learner.last_name}</td>
        <td>${learner.classes?.name || 'N/A'}</td>
        <td>KES ${classFeeAmount.toLocaleString()}</td>
        <td style="color: var(--secondary); font-weight: 600;">KES ${Number(cf.custom_amount).toLocaleString()}</td>
        <td>${feeTypeLabel}</td>
        <td style="font-size: 0.85rem; max-width: 200px;">${cf.reason || '-'}</td>
        <td>
          <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85rem;" onclick="removeCustomFee('${cf.id}')">
            Remove
          </button>
        </td>
      `;
      customFeesTable.appendChild(tr);
    }

    loadingCustomFees.classList.add("hidden");
    customFeesTableWrapper.classList.remove("hidden");
  } catch (error) {
    loadingCustomFees.textContent = "Error loading custom fees";
    showAlert("Error loading custom fees: " + error.message, "error");
  }
}

// Make removeCustomFee globally available
window.removeCustomFee = async function(customFeeId) {
  if (!confirm("Remove this custom fee? The learner will use the class fee.")) return;

  try {
    const { error } = await supabase
      .from("custom_fees")
      .delete()
      .eq("id", customFeeId);

    if (error) throw error;

    showAlert("✓ Custom fee removed");
    await loadCustomFeesList(
      classFilterCustom.value || null,
      typeFilter.value || null
    );
  } catch (error) {
    showAlert("Error removing custom fee: " + error.message, "error");
  }
};

/* ===========================
   FILTERS
=========================== */
classFilterCustom.addEventListener('change', () => {
  loadCustomFeesList(
    classFilterCustom.value || null,
    typeFilter.value || null
  );
});

typeFilter.addEventListener('change', () => {
  loadCustomFeesList(
    classFilterCustom.value || null,
    typeFilter.value || null
  );
});

/* ===========================
   INIT
=========================== */
async function initPage() {
  await checkAuth();
  await loadActiveTerm();
  await loadAllLearners();
  await loadClasses();
  await loadCustomFeesList();
  console.log("Page initialized with", allLearners.length, "learners");
}

initPage();

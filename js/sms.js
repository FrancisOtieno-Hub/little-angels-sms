import { supabase } from "./supabase.js";

/* ===========================
   HOSTPINNACLE API CONFIG
=========================== */
const HOSTPINNACLE_CONFIG = {
  apiUrl: 'https://sms.hostpinnacle.co.ke/api/services/sendsms/',
  apiKey: 'YOUR_API_KEY_HERE', // Replace with your actual API key
  partnerId: 'YOUR_PARTNER_ID_HERE', // Replace with your actual partner ID
  shortcode: 'LITTLEANGELS' // Your registered shortcode
};

/* ===========================
   DOM ELEMENTS
=========================== */
const logoutBtn = document.getElementById("logoutBtn");
const alertContainer = document.getElementById("alertContainer");
const smsBalanceEl = document.getElementById("smsBalance");
const refreshBalanceBtn = document.getElementById("refreshBalanceBtn");

// Quick Actions
const feeReminderBtn = document.getElementById("feeReminderBtn");
const generalMessageBtn = document.getElementById("generalMessageBtn");
const customMessageBtn = document.getElementById("customMessageBtn");

// Fee Reminder
const feeReminderSection = document.getElementById("feeReminderSection");
const feeTermSelect = document.getElementById("feeTermSelect");
const feeClassFilter = document.getElementById("feeClassFilter");
const feeBalanceFilter = document.getElementById("feeBalanceFilter");
const feeReminderTemplate = document.getElementById("feeReminderTemplate");
const previewFeeRecipientsBtn = document.getElementById("previewFeeRecipientsBtn");
const sendFeeRemindersBtn = document.getElementById("sendFeeRemindersBtn");
const feePreviewContainer = document.getElementById("feePreviewContainer");
const feeRecipientCount = document.getElementById("feeRecipientCount");
const feeRecipientsTable = document.getElementById("feeRecipientsTable").getElementsByTagName("tbody")[0];

// General Message
const generalMessageSection = document.getElementById("generalMessageSection");
const generalClassFilter = document.getElementById("generalClassFilter");
const generalMessageText = document.getElementById("generalMessageText");
const previewGeneralRecipientsBtn = document.getElementById("previewGeneralRecipientsBtn");
const sendGeneralMessageBtn = document.getElementById("sendGeneralMessageBtn");
const generalPreviewContainer = document.getElementById("generalPreviewContainer");
const generalRecipientCount = document.getElementById("generalRecipientCount");
const generalRecipientsTable = document.getElementById("generalRecipientsTable").getElementsByTagName("tbody")[0];

// Custom Message
const customMessageSection = document.getElementById("customMessageSection");
const customPhoneNumbers = document.getElementById("customPhoneNumbers");
const customMessageText = document.getElementById("customMessageText");
const sendCustomMessageBtn = document.getElementById("sendCustomMessageBtn");

// History
const historyFilter = document.getElementById("historyFilter");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
const smsHistoryTable = document.getElementById("smsHistoryTable").getElementsByTagName("tbody")[0];

let currentUser = null;
let feeRecipients = [];
let generalRecipients = [];

/* ===========================
   UTILITY FUNCTIONS
=========================== */
function showAlert(message, type = "success") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.innerHTML = "";
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
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

function formatPhone(phone) {
  // Convert phone to international format
  if (!phone) return null;
  
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Kenyan numbers (both mobile and landline)
  // Mobile: 07XX, 01XX (Safaricom, Airtel, Telkom)
  // Landline: 02XX (Nairobi), 04XX (Mombasa), 05XX (Nakuru), etc.
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already in correct format
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Assume Kenyan number without leading 0
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(amount);
}

/* ===========================
   AUTH CHECK
=========================== */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    window.location.href = "/";
    return;
  }
  currentUser = session.user;
}

/* ===========================
   HOSTPINNACLE API FUNCTIONS
=========================== */

// Get SMS Balance
async function getSMSBalance() {
  try {
    const response = await fetch(`https://sms.hostpinnacle.co.ke/api/services/getbalance/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: HOSTPINNACLE_CONFIG.apiKey,
        partnerID: HOSTPINNACLE_CONFIG.partnerId
      })
    });

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        balance: data.credit_balance || 0
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to fetch balance'
      };
    }
  } catch (error) {
    console.error('Error fetching SMS balance:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send SMS via HostPinnacle
async function sendSMS(phoneNumber, message) {
  try {
    const formattedPhone = formatPhone(phoneNumber);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number'
      };
    }

    const response = await fetch(HOSTPINNACLE_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: HOSTPINNACLE_CONFIG.apiKey,
        partnerID: HOSTPINNACLE_CONFIG.partnerId,
        message: message,
        shortcode: HOSTPINNACLE_CONFIG.shortcode,
        mobile: formattedPhone
      })
    });

    const data = await response.json();
    
    return {
      success: data.success === true || data.success === 1,
      messageId: data.messageID,
      response: data
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send Bulk SMS
async function sendBulkSMS(recipients, messageTemplate) {
  const results = {
    total: recipients.length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const recipient of recipients) {
    try {
      // Replace placeholders in message
      let message = messageTemplate;
      if (recipient.name) {
        message = message.replace(/\{\{name\}\}/g, recipient.name);
      }
      if (recipient.admission_no) {
        message = message.replace(/\{\{admission_no\}\}/g, recipient.admission_no);
      }
      if (recipient.balance !== undefined) {
        message = message.replace(/\{\{balance\}\}/g, formatCurrency(recipient.balance));
      }
      if (recipient.class_name) {
        message = message.replace(/\{\{class\}\}/g, recipient.class_name);
      }
      if (recipient.term) {
        message = message.replace(/\{\{term\}\}/g, recipient.term);
      }

      const result = await sendSMS(recipient.phone, message);
      
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
      }
      
      results.details.push({
        phone: recipient.phone,
        name: recipient.name,
        success: result.success,
        error: result.error
      });

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      results.failed++;
      results.details.push({
        phone: recipient.phone,
        name: recipient.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/* ===========================
   LOAD FUNCTIONS
=========================== */

async function loadBalance() {
  // Check if API credentials are configured
  if (HOSTPINNACLE_CONFIG.apiKey === 'YOUR_API_KEY_HERE' || 
      HOSTPINNACLE_CONFIG.partnerId === 'YOUR_PARTNER_ID_HERE') {
    smsBalanceEl.textContent = 'Configure API';
    smsBalanceEl.style.color = '#f59e0b';
    return;
  }
  
  setLoading(refreshBalanceBtn, true);
  
  const result = await getSMSBalance();
  
  if (result.success) {
    smsBalanceEl.textContent = `${result.balance} SMS`;
    smsBalanceEl.style.color = '';
  } else {
    smsBalanceEl.textContent = 'Error loading';
    smsBalanceEl.style.color = '#ef4444';
    console.error('Balance error:', result.error);
  }
  
  setLoading(refreshBalanceBtn, false);
}

async function loadTerms() {
  try {
    const { data, error } = await supabase
      .from("terms")
      .select("*")
      .order("year", { ascending: false })
      .order("term", { ascending: false });

    if (error) throw error;

    feeTermSelect.innerHTML = '<option value="">Select Term</option>';
    
    data.forEach(term => {
      const option = document.createElement("option");
      option.value = term.id;
      // Build term name like "Term 1 2026"
      option.textContent = `Term ${term.term} ${term.year}`;
      feeTermSelect.appendChild(option);
    });
  } catch (error) {
    showAlert("Error loading terms: " + error.message, "error");
  }
}

async function loadClasses() {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("level");

    if (error) throw error;

    const classOptions = data.map(cls => 
      `<option value="${cls.id}">${cls.name}</option>`
    ).join('');

    feeClassFilter.innerHTML = '<option value="">All Classes</option>' + classOptions;
    generalClassFilter.innerHTML = '<option value="">All Classes</option>' + classOptions;
  } catch (error) {
    showAlert("Error loading classes: " + error.message, "error");
  }
}

async function loadSMSHistory(filterType = 'all') {
  try {
    let query = supabase
      .from("sms_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterType !== 'all') {
      query = query.eq('message_type', filterType);
    }

    const { data, error } = await query;

    if (error) throw error;

    smsHistoryTable.innerHTML = '';

    data.forEach(record => {
      const tr = document.createElement("tr");
      const messagePreview = record.message_preview.length > 50 
        ? record.message_preview.substring(0, 50) + '...' 
        : record.message_preview;
      
      const statusClass = record.status === 'completed' ? 'success' : 
                         record.status === 'failed' ? 'error' : 'info';
      
      tr.innerHTML = `
        <td>${new Date(record.created_at).toLocaleString()}</td>
        <td>${record.message_type.replace('_', ' ').toUpperCase()}</td>
        <td>${record.total_recipients} (${record.successful_count} sent)</td>
        <td>${messagePreview}</td>
        <td><span class="badge badge-${statusClass}">${record.status}</span></td>
        <td>Admin</td>
      `;
      smsHistoryTable.appendChild(tr);
    });

    if (data.length === 0) {
      smsHistoryTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">No SMS history found</td></tr>';
    }
  } catch (error) {
    console.error("SMS History Error:", error);
    // Don't show error if no history exists yet
    if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
      showAlert("Error loading SMS history: " + error.message, "error");
    }
  }
}

/* ===========================
   FEE REMINDER FUNCTIONS
=========================== */

async function previewFeeRecipients() {
  const termId = feeTermSelect.value;
  const classId = feeClassFilter.value;
  const balanceFilter = feeBalanceFilter.value;

  if (!termId) {
    showAlert("Please select a term", "error");
    return;
  }

  setLoading(previewFeeRecipientsBtn, true);
  feeRecipientsTable.innerHTML = '';
  feeRecipients = [];

  try {
    // Get term details
    const { data: termData } = await supabase
      .from("terms")
      .select("*")
      .eq("id", termId)
      .single();

    // Get learners with fee balances for this term
    let query = supabase
      .from("learner_fee_balances")
      .select("*")
      .eq("term_id", termId);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: learners, error } = await query;

    if (error) throw error;

    // Filter and process learners
    learners.forEach(learner => {
      const balance = learner.balance || 0;

      // Apply balance filter
      if (balanceFilter === 'with_balance' && balance <= 0) return;
      if (balanceFilter === 'overpaid' && balance >= 0) return;

      if (learner.guardian_phone) {
        feeRecipients.push({
          learner_id: learner.learner_id,
          admission_no: learner.admission_no,
          name: `${learner.first_name} ${learner.last_name}`,
          class_name: learner.class_name,
          phone: learner.guardian_phone,
          balance: balance,
          term: `Term ${termData.term} ${termData.year}`
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${learner.admission_no}</td>
          <td>${learner.first_name} ${learner.last_name}</td>
          <td>${learner.class_name}</td>
          <td>${learner.guardian_phone}</td>
          <td>${formatCurrency(balance)}</td>
        `;
        feeRecipientsTable.appendChild(tr);
      }
    });

    feeRecipientCount.textContent = feeRecipients.length;
    feePreviewContainer.classList.remove('hidden');
    sendFeeRemindersBtn.classList.remove('hidden');

    if (feeRecipients.length === 0) {
      showAlert("No recipients found matching the criteria", "info");
      sendFeeRemindersBtn.classList.add('hidden');
    }
  } catch (error) {
    showAlert("Error loading recipients: " + error.message, "error");
  } finally {
    setLoading(previewFeeRecipientsBtn, false);
  }
}

async function sendFeeReminders() {
  if (feeRecipients.length === 0) {
    showAlert("No recipients to send to", "error");
    return;
  }

  const message = feeReminderTemplate.value.trim();
  if (!message) {
    showAlert("Please enter a message", "error");
    return;
  }

  if (!confirm(`Send fee reminders to ${feeRecipients.length} recipient(s)?`)) {
    return;
  }

  setLoading(sendFeeRemindersBtn, true);

  try {
    // Send bulk SMS
    const results = await sendBulkSMS(feeRecipients, message);

    // Save to history
    const { error: historyError } = await supabase
      .from("sms_history")
      .insert({
        message_type: 'fee_reminder',
        message_preview: message.substring(0, 200),
        total_recipients: results.total,
        successful_count: results.successful,
        failed_count: results.failed,
        sent_by: currentUser.id,
        metadata: {
          term_id: feeTermSelect.value,
          class_id: feeClassFilter.value || null,
          balance_filter: feeBalanceFilter.value
        }
      });

    if (historyError) console.error('Error saving history:', historyError);

    showAlert(
      `✓ SMS sent successfully! ${results.successful} sent, ${results.failed} failed`,
      results.failed > 0 ? 'warning' : 'success'
    );

    // Reset
    feePreviewContainer.classList.add('hidden');
    sendFeeRemindersBtn.classList.add('hidden');
    feeRecipients = [];
    
    loadSMSHistory();
    loadBalance();
  } catch (error) {
    showAlert("Error sending SMS: " + error.message, "error");
  } finally {
    setLoading(sendFeeRemindersBtn, false);
  }
}

/* ===========================
   GENERAL MESSAGE FUNCTIONS
=========================== */

async function previewGeneralRecipients() {
  const classId = generalClassFilter.value;

  setLoading(previewGeneralRecipientsBtn, true);
  generalRecipientsTable.innerHTML = '';
  generalRecipients = [];

  try {
    let query = supabase
      .from("learners")
      .select(`
        *,
        class:classes(name)
      `)
      .eq("active", true)
      .not("guardian_phone", "is", null);

    if (classId) {
      query = query.eq("class_id", classId);
    }

    const { data: learners, error } = await query;

    if (error) throw error;

    learners.forEach(learner => {
      if (learner.guardian_phone) {
        generalRecipients.push({
          learner_id: learner.id,
          admission_no: learner.admission_no,
          name: `${learner.first_name} ${learner.last_name}`,
          class_name: learner.class.name,
          phone: learner.guardian_phone
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${learner.admission_no}</td>
          <td>${learner.first_name} ${learner.last_name}</td>
          <td>${learner.class.name}</td>
          <td>${learner.guardian_phone}</td>
        `;
        generalRecipientsTable.appendChild(tr);
      }
    });

    generalRecipientCount.textContent = generalRecipients.length;
    generalPreviewContainer.classList.remove('hidden');
    sendGeneralMessageBtn.classList.remove('hidden');

    if (generalRecipients.length === 0) {
      showAlert("No recipients found", "info");
      sendGeneralMessageBtn.classList.add('hidden');
    }
  } catch (error) {
    showAlert("Error loading recipients: " + error.message, "error");
  } finally {
    setLoading(previewGeneralRecipientsBtn, false);
  }
}

async function sendGeneralMessage() {
  if (generalRecipients.length === 0) {
    showAlert("No recipients to send to", "error");
    return;
  }

  const message = generalMessageText.value.trim();
  if (!message) {
    showAlert("Please enter a message", "error");
    return;
  }

  if (!confirm(`Send message to ${generalRecipients.length} recipient(s)?`)) {
    return;
  }

  setLoading(sendGeneralMessageBtn, true);

  try {
    const results = await sendBulkSMS(generalRecipients, message);

    // Save to history
    const { error: historyError } = await supabase
      .from("sms_history")
      .insert({
        message_type: 'general',
        message_preview: message.substring(0, 200),
        total_recipients: results.total,
        successful_count: results.successful,
        failed_count: results.failed,
        sent_by: currentUser.id,
        metadata: {
          class_id: generalClassFilter.value || null
        }
      });

    if (historyError) console.error('Error saving history:', historyError);

    showAlert(
      `✓ SMS sent successfully! ${results.successful} sent, ${results.failed} failed`,
      results.failed > 0 ? 'warning' : 'success'
    );

    generalPreviewContainer.classList.add('hidden');
    sendGeneralMessageBtn.classList.add('hidden');
    generalRecipients = [];
    
    loadSMSHistory();
    loadBalance();
  } catch (error) {
    showAlert("Error sending SMS: " + error.message, "error");
  } finally {
    setLoading(sendGeneralMessageBtn, false);
  }
}

/* ===========================
   CUSTOM MESSAGE FUNCTIONS
=========================== */

async function sendCustomMessage() {
  const phoneNumbers = customPhoneNumbers.value
    .split(/[\n,]/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const message = customMessageText.value.trim();

  if (phoneNumbers.length === 0) {
    showAlert("Please enter at least one phone number", "error");
    return;
  }

  if (!message) {
    showAlert("Please enter a message", "error");
    return;
  }

  if (!confirm(`Send message to ${phoneNumbers.length} recipient(s)?`)) {
    return;
  }

  setLoading(sendCustomMessageBtn, true);

  try {
    const recipients = phoneNumbers.map(phone => ({ phone, name: '' }));
    const results = await sendBulkSMS(recipients, message);

    // Save to history
    const { error: historyError } = await supabase
      .from("sms_history")
      .insert({
        message_type: 'custom',
        message_preview: message.substring(0, 200),
        total_recipients: results.total,
        successful_count: results.successful,
        failed_count: results.failed,
        sent_by: currentUser.id,
        metadata: {
          phone_numbers: phoneNumbers
        }
      });

    if (historyError) console.error('Error saving history:', historyError);

    showAlert(
      `✓ SMS sent successfully! ${results.successful} sent, ${results.failed} failed`,
      results.failed > 0 ? 'warning' : 'success'
    );

    customPhoneNumbers.value = '';
    customMessageText.value = '';
    
    loadSMSHistory();
    loadBalance();
  } catch (error) {
    showAlert("Error sending SMS: " + error.message, "error");
  } finally {
    setLoading(sendCustomMessageBtn, false);
  }
}

/* ===========================
   EVENT LISTENERS
=========================== */

// Quick Actions
feeReminderBtn.addEventListener("click", () => {
  feeReminderSection.classList.toggle("hidden");
  generalMessageSection.classList.add("hidden");
  customMessageSection.classList.add("hidden");
});

generalMessageBtn.addEventListener("click", () => {
  generalMessageSection.classList.toggle("hidden");
  feeReminderSection.classList.add("hidden");
  customMessageSection.classList.add("hidden");
});

customMessageBtn.addEventListener("click", () => {
  customMessageSection.classList.toggle("hidden");
  feeReminderSection.classList.add("hidden");
  generalMessageSection.classList.add("hidden");
});

// Fee Reminder
previewFeeRecipientsBtn.addEventListener("click", previewFeeRecipients);
sendFeeRemindersBtn.addEventListener("click", sendFeeReminders);

// General Message
previewGeneralRecipientsBtn.addEventListener("click", previewGeneralRecipients);
sendGeneralMessageBtn.addEventListener("click", sendGeneralMessage);

// Custom Message
sendCustomMessageBtn.addEventListener("click", sendCustomMessage);

// Balance
refreshBalanceBtn.addEventListener("click", loadBalance);

// History
historyFilter.addEventListener("change", (e) => loadSMSHistory(e.target.value));
refreshHistoryBtn.addEventListener("click", () => loadSMSHistory(historyFilter.value));

// Logout
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
loadBalance();
loadTerms();
loadClasses();
loadSMSHistory();

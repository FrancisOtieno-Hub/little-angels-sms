import { supabase } from "./supabase.js";

const fromClass = document.getElementById("fromClass");
const previewBtn = document.getElementById("previewBtn");
const promoteBtn = document.getElementById("promoteBtn");
const table = document.getElementById("previewTable");
const tbody = table.querySelector("tbody");
const loadingPreview = document.getElementById("loadingPreview");
const alertContainer = document.getElementById("alertContainer");

let learnersToPromote = [];
let classMap = {};

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

function setLoading(button, loading, text = "Preview") {
  button.disabled = loading;
  button.innerHTML = loading 
    ? '<div class="spinner"></div><span>Loading...</span>' 
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
      classMap[cls.id] = cls;
      const option = document.createElement("option");
      option.value = cls.id;
      option.textContent = cls.name;
      fromClass.appendChild(option);
    });
  } catch (error) {
    showAlert("Error loading classes: " + error.message, "error");
  }
}

/* ===========================
   PREVIEW PROMOTION
=========================== */
previewBtn.addEventListener("click", async () => {
  const classId = fromClass.value;
  
  if (!classId) {
    showAlert("Please select a class", "error");
    return;
  }
  
  setLoading(previewBtn, true, "Preview Learners");
  tbody.innerHTML = "";
  learnersToPromote = [];
  table.classList.add("hidden");
  loadingPreview.classList.remove("hidden");
  promoteBtn.classList.add("hidden");
  
  try {
    const currentClass = classMap[classId];
    
    const { data: learners, error } = await supabase
      .from("learners")
      .select("*")
      .eq("class_id", classId)
      .eq("active", true)
      .eq("graduated", false)
      .order("first_name");
    
    if (error) throw error;
    
    if (!learners || learners.length === 0) {
      loadingPreview.textContent = "No active learners found in this class.";
      setLoading(previewBtn, false, "Preview Learners");
      return;
    }
    
    learners.forEach(l => {
      let nextStatus = "";
      let nextClassId = null;
      
      if (currentClass.name === "Grade 9") {
        nextStatus = "🎓 Graduate";
      } else {
        const nextLevel = currentClass.level + 1;
        const nextClass = Object.values(classMap).find(c => c.level === nextLevel);
        
        if (nextClass) {
          nextClassId = nextClass.id;
          nextStatus = `⬆️ Promote to ${nextClass.name}`;
        } else {
          nextStatus = "⚠️ No next class found";
        }
      }
      
      learnersToPromote.push({
        id: l.id,
        nextClassId,
        graduate: currentClass.name === "Grade 9"
      });
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.admission_no}</td>
        <td>${l.first_name} ${l.last_name}</td>
        <td>${currentClass.name}</td>
        <td>${nextStatus}</td>
      `;
      tbody.appendChild(tr);
    });
    
    loadingPreview.classList.add("hidden");
    table.classList.remove("hidden");
    promoteBtn.classList.remove("hidden");
    
    showAlert(`${learners.length} learner(s) ready for promotion`, "info");
  } catch (error) {
    loadingPreview.textContent = "Error loading learners.";
    showAlert("Error: " + error.message, "error");
  } finally {
    setLoading(previewBtn, false, "Preview Learners");
  }
});

/* ===========================
   EXECUTE PROMOTION
=========================== */
promoteBtn.addEventListener("click", async () => {
  if (learnersToPromote.length === 0) return;
  
  const confirmMsg = `This will promote ${learnersToPromote.length} learner(s). This action cannot be undone. Continue?`;
  
  if (!confirm(confirmMsg)) return;
  
  setLoading(promoteBtn, true, "Promote Learners");
  
  try {
    let successCount = 0;
    let errorCount = 0;
    
    for (const l of learnersToPromote) {
      try {
        if (l.graduate) {
          // Mark as graduated
          await supabase
            .from("learners")
            .update({
              active: false,
              graduated: true
            })
            .eq("id", l.id);
        } else if (l.nextClassId) {
          // Promote to next class
          await supabase
            .from("learners")
            .update({
              class_id: l.nextClassId
            })
            .eq("id", l.id);
        }
        successCount++;
      } catch (err) {
        console.error("Error promoting learner:", err);
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      showAlert(`✓ Successfully promoted ${successCount} learner(s)!`);
    } else {
      showAlert(`Partially completed: ${successCount} succeeded, ${errorCount} failed`, "error");
    }
    
    // Reset UI
    table.classList.add("hidden");
    promoteBtn.classList.add("hidden");
    fromClass.value = "";
    learnersToPromote = [];
  } catch (error) {
    showAlert("Error during promotion: " + error.message, "error");
  } finally {
    setLoading(promoteBtn, false, "Promote Learners");
  }
});

/* ===========================
   INIT
=========================== */
checkAuth();
loadClasses();

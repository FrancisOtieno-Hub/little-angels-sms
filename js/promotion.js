import { supabase } from "./supabase.js";

const fromClass = document.getElementById("fromClass");
const previewBtn = document.getElementById("previewBtn");
const promoteBtn = document.getElementById("promoteBtn");
const table = document.getElementById("previewTable");
const tbody = table.querySelector("tbody");

let learnersToPromote = [];
let classMap = {};

/* ===========================
   LOAD CLASSES
=========================== */
async function loadClasses() {
  const { data } = await supabase
    .from("classes")
    .select("*")
    .order("level");

  data.forEach(cls => {
    classMap[cls.id] = cls;

    const option = document.createElement("option");
    option.value = cls.id;
    option.textContent = cls.name;
    fromClass.appendChild(option);
  });
}

/* ===========================
   PREVIEW PROMOTION
=========================== */
previewBtn.addEventListener("click", async () => {
  tbody.innerHTML = "";
  learnersToPromote = [];

  const classId = fromClass.value;
  if (!classId) return;

  const currentClass = classMap[classId];

  const { data: learners } = await supabase
    .from("learners")
    .select("*")
    .eq("class_id", classId)
    .eq("active", true)
    .eq("graduated", false);

  learners.forEach(l => {
    let nextStatus = "";
    let nextClassId = null;

    if (currentClass.name === "Grade 9") {
      nextStatus = "Graduate";
    } else {
      const nextLevel = currentClass.level + 1;
      const nextClass = Object.values(classMap)
        .find(c => c.level === nextLevel);

      nextClassId = nextClass.id;
      nextStatus = `Promote to ${nextClass.name}`;
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

  table.classList.remove("hidden");
  promoteBtn.classList.remove("hidden");
});

/* ===========================
   EXECUTE PROMOTION
=========================== */
promoteBtn.addEventListener("click", async () => {
  if (!confirm("This action cannot be undone. Continue?")) return;

  for (const l of learnersToPromote) {
    if (l.graduate) {
      await supabase
        .from("learners")
        .update({
          active: false,
          graduated: true
        })
        .eq("id", l.id);
    } else {
      await supabase
        .from("learners")
        .update({
          class_id: l.nextClassId
        })
        .eq("id", l.id);
    }
  }

  alert("Promotion / Graduation completed successfully");
  table.classList.add("hidden");
  promoteBtn.classList.add("hidden");
});

/* ===========================
   INIT
=========================== */
loadClasses();

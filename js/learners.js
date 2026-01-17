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

import { supabase } from "./supabase.js";

const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  });

  if (error) {
    alert(error.message);
  } else {
    // Redirect to dashboard
    window.location.href = "/dashboard.html";
  }
});

import { supabase } from "./supabase.js";

const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const alertContainer = document.getElementById("alertContainer");

function showAlert(message, type = "error") {
  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
    </div>
  `;
  
  setTimeout(() => {
    alertContainer.innerHTML = "";
  }, 5000);
}

function setLoading(loading) {
  loginBtn.disabled = loading;
  if (loading) {
    loginBtn.innerHTML = '<div class="spinner"></div><span>Logging in...</span>';
  } else {
    loginBtn.innerHTML = '<span>Login</span>';
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const emailValue = email.value.trim();
  const passwordValue = password.value;
  
  if (!emailValue || !passwordValue) {
    showAlert("Please fill in all fields");
    return;
  }
  
  setLoading(true);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue
    });
    
    if (error) {
      showAlert(error.message);
      setLoading(false);
    } else {
      showAlert("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "/dashboard.html";
      }, 500);
    }
  } catch (err) {
    showAlert("An unexpected error occurred. Please try again.");
    setLoading(false);
    console.error("Login error:", err);
  }
});

// Check if already logged in
async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    window.location.href = "/dashboard.html";
  }
}

checkExistingSession();

// A single variable for the API base URL for easy switching between local and production
// const API_BASE_URL = "http://localhost:3000"; 
const API_BASE_URL = "https://maydayzsite.onrender.com";

window.supabase = supabase.createClient(
  "https://iacgeepjpcpfwyewaeyo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhY2dlZXBqcGNwZnd5ZXdhZXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjM4NDcsImV4cCI6MjA1NzIzOTg0N30.yaT1H2sp8ic5N9U2mG2QPwmtmYMWHW31CS-rK7xgPBo"
);

// State variables for the current login attempt
let currentLoginIdentifier = null;
let currentLoginType = null;
let currentNewUserId = null;

// --- Helper Functions ---
function showOtpSection(message) {
  document.getElementById("loginFormCustom").style.display = "none";
  document.getElementById("loginFormPhone").style.display = "none";
  document.querySelector(".g_id_signin").style.display = "none";
  document.querySelector(".transparency").style.display = "none";
  otpMessage.textContent = message;
  otpVerificationSection.style.display = "block";
  otpInput.value = "";
  otpInput.focus();
}

function hideOtpSection() {
  otpVerificationSection.style.display = "none";
  document.getElementById("loginFormCustom").style.display = "block";
  document.getElementById("loginFormPhone").style.display = "block";
  document.querySelector(".g_id_signin").style.display = "block";
  document.querySelector(".transparency").style.display = "block";
  currentLoginIdentifier = null;
  currentLoginType = null;
  otpInput.value = "";
}

// --- OTP/Magic Link Login Handlers ---
async function handleLogin(identifier, type) {
  const requestBody = type === 'email' ? { email: identifier } : { phone: identifier };
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const message = await response.text();
      currentLoginIdentifier = identifier;
      currentLoginType = type;
      showOtpSection(message);
    } else {
      const errorMessage = await response.text();
      console.error("Login failed:", errorMessage);
      alert(`Login failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred during login. Please try again later.");
  }
}

async function handleOtpVerification() {
  const otp = otpInput.value.trim();
  if (!otp) {
    alert("Please enter the verification code.");
    return;
  }
  if (!currentLoginIdentifier || !currentLoginType) {
    alert("Error: Login information missing. Please restart the login process.");
    hideOtpSection();
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: currentLoginIdentifier,
        otp: otp,
        type: currentLoginType,
      }),
    });
    const responseText = await response.text();
    if (response.ok) {
      alert("Login successful!");
      window.location.href = "/Index.html";
    } else {
      console.error("OTP Verification failed:", responseText);
      alert(`OTP Verification Failed: ${responseText}`);
      otpInput.value = "";
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    alert("An error occurred during OTP verification. Please try again.");
  }
}

// --- Event Listeners ---
const emailLoginForm = document.getElementById("loginFormCustom");
emailLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  if (email) {
    handleLogin(email, 'email');
  } else {
    alert("Please enter your email.");
  }
});

const phoneLoginForm = document.getElementById("loginFormPhone");
phoneLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const phone = document.getElementById("phone").value.trim();
  if (phone) {
    handleLogin(phone, 'phone');
  } else {
    alert("Please enter your phone number.");
  }
});

otpVerificationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleOtpVerification();
});

resendOtpButton.addEventListener("click", () => {
  if (currentLoginIdentifier && currentLoginType) {
    handleLogin(currentLoginIdentifier, currentLoginType);
    alert("New code sent! Please check again.");
  } else {
    alert("Error: Cannot resend. Please restart the login process.");
    hideOtpSection();
  }
});
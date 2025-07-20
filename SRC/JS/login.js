window.supabase = supabase.createClient(
  "https://iacgeepjpcpfwyewaeyo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhY2dlZXBqcGNwZnd5ZXdhZXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjM4NDcsImV4cCI6MjA1NzIzOTg0N30.yaT1H2sp8ic5N9U2mG2QPwmtmYMWHW31CS-rK7xgPBo"
);

let currentNewUserId = null;

async function submitPhoneNumber() {
  const phoneNumberInput = document.getElementById("phoneNumberInput");
  const phoneNumber = "+1" + phoneNumberInput.value.trim();

  if (!phoneNumber) {
    alert("Please enter your phone number.");
    return;
  }

  if (!currentNewUserId) {
    alert("Error: User ID not found. Please try logging in again.");
    hidePhoneNumberModal();
    return;
  }

  try {
    const { data, error } = await window.supabase
      .from("MaydayzCustomers")
      .update({ phoneNumber: phoneNumber })
      .eq("id", currentNewUserId);

    if (error) {
      console.error("Error updating phone number:", error.message);
      alert("Failed to save phone number: " + error.message);
    } else {
      console.log("Phone number updated successfully:", data);
      alert("Phone number saved! Redirecting to home.");
      hidePhoneNumberModal();
      window.location.href = "/Index.html";
    }
  } catch (updateError) {
    console.error(
      "Unexpected error during phone number update:",
      updateError.message
    );
    alert("An unexpected error occurred. Please try again.");
  }
}

function showPhoneNumberModal() {
  document.getElementById("phoneNumberModal").style.display = "block";
  document.getElementById("phoneNumberInput").focus();
}

function hidePhoneNumberModal() {
  document.getElementById("phoneNumberModal").style.display = "none";
  document.getElementById("phoneNumberInput").value = "";
  currentNewUserId = null;
}

async function handleNewGoogleUser(user) {
  console.log("New Google user detected. Creating profile...");
  try {
    const userName =
      user.user_metadata?.full_name || user.user_metadata?.name || null;
    const userEmail = user.email;
    const userPhoneNumber = "";

    const customerData = {
      id: user.id,
      name: userName,
      email: userEmail,
      phoneNumber: userPhoneNumber,
    };

    const { data, error } = await window.supabase
      .from("MaydayzCustomers")
      .insert([customerData]);

    if (error) {
      console.error(
        "Error creating new profile for Google user:",
        error.message
      );
      if (error.code === "23505") {
        alert(
          "It looks like a profile already exists for this user. Please try logging in."
        );
      } else {
        alert(
          "Failed to create user profile. Please try again: " + error.message
        );
      }
    } else {
      console.log("New user profile created successfully:", data);
      currentNewUserId = user.id;
      showPhoneNumberModal();
    }
  } catch (insertError) {
    console.error(
      "Unexpected error during new profile creation:",
      insertError.message
    );
    alert("An unexpected error occurred during profile setup.");
  }
}

async function verifyGoogleEmailInDatabase() {
  try {
    const {
      data: { user },
    } = await window.supabase.auth.getUser();

    if (user) {
      const userEmail = user.email;

      if (!userEmail) {
        console.warn(
          "User email not available from Supabase authentication. Cannot verify in database."
        );
        return { exists: false, error: "Email not found in user session." };
      }

      const { data: existingProfiles, error } = await window.supabase
        .from("MaydayzCustomers")
        .select("id, email")
        .eq("email", userEmail);

      if (error) {
        console.error("Error checking email in database:", error.message);
        return { exists: false, error: error.message };
      }

      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`Email '${userEmail}' found in the database.`);
        return { exists: true, profile: existingProfiles[0] };
      } else {
        console.log(
          `Email '${userEmail}' NOT found in the database. This might be a new user.`
        );
        return { exists: false, user: user };
      }
    } else {
      console.log("No authenticated user found. User needs to sign in first.");
      return { exists: false, error: "No authenticated user." };
    }
  } catch (error) {
    console.error(
      "An unexpected error occurred during email verification:",
      error.message
    );
    return { exists: false, error: error.message };
  }
}

async function handleSignInWithGoogle(response) {
  console.log("Google ID Token received.");

  const { data, error } = await window.supabase.auth.signInWithIdToken({
    provider: "google",
    token: response.credential,
  });

  if (error) {
    console.error("Supabase Google Sign-In Error:", error);
    alert("Google sign-in failed: " + error.message);
  } else {
    console.log("Supabase Google Sign-In Success:", data);
    alert("Signed in with Google successfully!");

    const verificationResult = await verifyGoogleEmailInDatabase();

    if (verificationResult.exists) {
      console.log(
        "User already exists in MaydayzCustomers table. Welcome Back!"
      );
      window.alert("Welcome Back!!");
      window.location.href = "/Index.html";
    } else {
      console.log("New user via Google sign-in. Creating a new profile entry.");
      if (verificationResult.user) {
        await handleNewGoogleUser(verificationResult.user);
      } else {
        console.error(
          "Could not get user details after Google sign-in to create new profile."
        );
        alert(
          "Sign-in successful, but an issue occurred setting up your profile. Please contact support."
        );
      }
    }
  }
}

const otpVerificationSection = document.getElementById(
  "otpVerificationSection"
);
const otpMessage = document.getElementById("otpMessage");
const otpInput = document.getElementById("otpInput");
const verifyOtpButton = document.getElementById("verifyOtpButton");
const resendOtpButton = document.getElementById("resendOtpButton");
const otpVerificationForm = document.getElementById("otpVerificationForm");

const otpCodeInput = document.getElementById("otpInput");

let currentLoginIdentifier = null;
let currentLoginType = null;

function showOtpSection(message, identifier, type) {
  document.getElementById("loginFormCustom").style.display = "none";
  // document.getElementById("loginFormPhone").style.display = "none";
  document.querySelector(".g_id_signin").style.display = "none";
  document.querySelector(".transparency").style.display = "none";

  otpMessage.textContent = message;
  currentLoginIdentifier = identifier;
  currentLoginType = type;
  otpVerificationSection.style.display = "block";
  otpInput.value = "";
  otpInput.focus();
}

function hideOtpSection() {
  otpVerificationSection.style.display = "none";
  document.getElementById("loginFormCustom").style.display = "block";
  // document.getElementById("loginFormPhone").style.display = "block";
  document.querySelector(".g_id_signin").style.display = "block";
  document.querySelector(".transparency").style.display = "block";

  currentLoginIdentifier = null;
  currentLoginType = null;
  otpInput.value = "";
}

const customLoginForm = document.getElementById("loginFormCustom");
customLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    });

    if (response.ok) {
      showOtpSection(
        "A verification code has been sent to your email.",
        email,
        "email"
      );
    } else {
      const errorMessage = await response.text();
      console.error("Email Login failed:", errorMessage);
      alert(`Login failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error during custom email login:", error);
    alert("An error occurred during login. Please try again later.");
  }
});

otpVerificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // USE YOUR GLOBAL VARIABLES HERE, NOT otpIdentifierInput:
  const identifier = currentLoginIdentifier;
  const type = currentLoginType;
  const otp = otpInput.value.trim(); // Use otpInput to get the code

  if (!otp) {
    alert("Please enter the verification code.");
    return;
  }

  if (!identifier || !type) {
    // Added a check in case identifier/type aren't set
    alert(
      "Error: Login information missing. Please restart the login process."
    );
    console.error("Missing identifier or type for OTP verification.");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier, otp: otp, type: type }),
    });

    const responseText = await response.text();

    if (response.ok) {
      alert("Login successful!");
      console.log("OTP Verification Success:", responseText);
      window.location.href = "/Index.html";
    } else {
      console.error("OTP Verification failed:", responseText);
      alert(`OTP Verification Failed: ${responseText}`);
      otpInput.value = "";
      window.location.href = "/login";
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    alert("An error occurred during OTP verification. Please try again.");
  }
});

const loginFormPhone = document.getElementById("loginFormPhone");
loginFormPhone.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = document.getElementById("phone").value.trim();

  if (!phone) {
    alert("Please enter your phone number");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone }),
    });

    if (response.ok) {
      showOtpSection(
        "A verification code has been sent to your phone.",
        phone,
        "phone"
      );
    } else {
      const errorMessage = await response.text();
      console.error("Phone Login failed:", errorMessage);
      alert(`Login failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error during custom phone login:", error);
    alert("An error occurred during login. Please try again later.");
  }
});

otpVerificationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const otp = otpInput.value.trim();

  if (!otp) {
    alert("Please enter the verification code.");
    return;
  }

  if (!currentLoginIdentifier || !currentLoginType) {
    alert(
      "Error: Login identifier or type missing. Please restart the login process."
    );
    hideOtpSection();
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: currentLoginIdentifier,
        otp: otp,
        type: currentLoginType,
      }),
    });

    if (response.ok) {
      alert("Login successful!");
      window.location.href = "/Index.html";
    } else {
      const errorMessage = await response.text();
      console.error("OTP verification failed:", errorMessage);
      alert(`OTP verification failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error during OTP verification:", error);
    alert("An error occurred during OTP verification. Please try again.");
  }
});

resendOtpButton.addEventListener("submit", async () => {
  if (!currentLoginIdentifier || !currentLoginType) {
    alert("Error: Cannot resend. Please restart the login process.");
    hideOtpSection();
    return;
  }

  try {
    const requestBody = {};
    if (currentLoginType === "email") {
      requestBody.email = currentLoginIdentifier;
    } else if (currentLoginType === "phone") {
      requestBody.phone = currentLoginIdentifier;
    }

    const response = await fetch("http://localhost:3000/SRC/HTML/login.html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      alert("New code sent! Please check again.");
      otpInput.value = "";
    } else {
      const errorMessage = await response.text();
      alert(`Failed to resend code: ${errorMessage}`);
    }
  } catch (error) {
    console.error("Error during resend OTP:", error);
    alert("An error occurred while trying to resend the code.");
  }
});

/* Imports for the server hosted on Render backend
 */
const express = require("express");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const twilio = require("twilio"); // Make sure 'twilio' is installed: npm install twilio

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Express app initialization
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// CORS configuration - ensure all desired origins are listed
const corsOptions = {
  origin: [
    "https://maydayz.com",
    "https://maydayzsite.onrender.com",
    "http://localhost:3000",
    "http://localhost:5500",
  ],
};
app.use(cors(corsOptions));

/* It serves all static files from the current directory
 and applies the specified Cache-Control headers to them.*/
app.use(
  express.static(path.join(__dirname), {
    setHeaders: function (res, filePath, stat) {
      // Renamed 'path' to 'filePath' to avoid confusion with imported 'path' module
      // Check if the file is an HTML, CSS, JS, image, or icon file.
      if (
        filePath.endsWith(".html") ||
        filePath.endsWith(".css") ||
        filePath.endsWith(".js") ||
        filePath.endsWith(".png") ||
        filePath.endsWith(".jpg") ||
        filePath.endsWith(".jpeg") ||
        filePath.endsWith(".gif") ||
        filePath.endsWith(".svg") ||
        filePath.endsWith(".ico")
      ) {
        // Set headers to prevent caching for these files
        res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        res.set("Pragma", "no-cache"); // For HTTP 1.0 backward compatibility
        res.set("Expires", "0"); // For proxies
      }
    },
  })
);

app.get("/", (request, response) => {
  response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.sendFile(path.join(__dirname, "Index.html"));
});

// Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { name, email, phoneNumber, emailOptIn, smsOptIn } = req.body;

    if (!name || !email || !phoneNumber) {
      return res.status(400).send("Missing required fields.");
    }

    // Check for existing user by email or name
    const { data: existingUser, error: checkError } = await supabase
      .from("MaydayzCustomers")
      .select("*")
      .or(`email.eq.${email},name.eq.${name}`); // This assumes 'name' is also unique

    if (checkError) {
      console.error("Error checking for existing user:", checkError);
      return res.status(500).send("Error checking for existing user.");
    }

    if (existingUser.length > 0) {
      // Check which field caused the conflict
      const isEmailConflict = existingUser.some((user) => user.email === email);
      const isNameConflict = existingUser.some((user) => user.name === name);

      if (isEmailConflict && isNameConflict) {
        return res
          .status(409)
          .send("User with this name and email already exists.");
      } else if (isEmailConflict) {
        return res.status(409).send("User with this email already exists.");
      } else if (isNameConflict) {
        return res.status(409).send("User with this name already exists.");
      }
    }

    // Insert new user
    const { data, error } = await supabase.from("MaydayzCustomers").insert([
      {
        name,
        email,
        phoneNumber,
        emailOptIn,
        smsOptIn,
      },
    ]);

    if (error) {
      console.error("Error inserting user:", error);
      // Specific error handling for Supabase unique constraint violations if needed
      if (error.code === "23505") {
        // PostgreSQL unique violation error code
        return res
          .status(409)
          .send("A user with this email or phone number already exists.");
      }
      return res.status(500).send("Error creating user.");
    }

    console.log("User created:", data);
    return res.status(201).send("Signup successful!");
  } catch (err) {
    console.error("Unexpected error during signup:", err);
    return res.status(500).send("An unexpected error occurred.");
  }
});

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send("Missing email or password.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Supabase Login Error:", error);
      // More specific error messages for failed login attempts
      if (error.message.includes("Invalid login credentials")) {
        return res.status(401).send("Invalid email or password.");
      }
      return res.status(401).send(`Login failed: ${error.message}`);
    }

    if (data.user) {
      console.log("User logged in:", data.user);
      return res.status(200).send("Login successful!");
    } else {
      // This path is typically for magic links or other auth methods
      return res
        .status(200)
        .send("Login initiated. Check your email for a magic link!");
    }
  } catch (err) {
    console.error("Unexpected error during login:", err);
    return res.status(500).send("An unexpected error occurred during login.");
  }
});

// Supabase Auth Callback Route
app.get("/auth/callback", async function (req, res) {
  const code = req.query.code;
  const next = req.query.next ?? "/";

  if (code) {
    // Only import createServerClient if needed
    const { createServerClient } = require("@supabase/ssr");

    const supabaseServer = createServerClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY, // Use SUPABASE_ANON_KEY here for client-side functionality
      {
        cookies: {
          getAll: () => req.headers.cookie,
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.appendHeader(
                "Set-Cookie",
                `${name}=${value}; ${Object.entries(options)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; ")}`
              );
            });
          },
        },
      }
    );
    await supabaseServer.auth.exchangeCodeForSession(code);
  }

  res.redirect(303, next);
});

// Twilio SMS Webhook Routes
app.get("/sms-reply", (req, res) => {
  res.send(
    "This endpoint is for Twilio SMS webhooks. Please use POST requests only."
  );
});

app.post("/sms-reply", (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(
    "This number is not meant for orders. Please contact 980-499-8399 TO ORDER!!. STAY SMOKED OUT!!"
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

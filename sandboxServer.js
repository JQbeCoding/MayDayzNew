const express = require("express");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const twilio = require("twilio");

dotenv.config();

const supabaseUrl = "https://iacgeepjpcpfwyewaeyo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhY2dlZXBqcGNwZnd5ZXdhZXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjM4NDcsImV4cCI6MjA1NzIzOTg0N30.yaT1H2sp8ic5N9U2mG2QPwmtmYMWHW31CS-rK7xgPBo";

const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const corsOptions = {
  origin: [
    "https://maydayz.com",
    "https://maydayzsite.onrender.com",
    "http://localhost:3000",
    "http://localhost:5500",
  ],
};
app.use(cors(corsOptions));

app.get("/", (request, response) => {
  response.setHeader("Cache-Control", "no-cache, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.sendFile(path.join(__dirname, "Index.html"));
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, phoneNumber, emailOptIn, smsOptIn } = req.body;

    if (!name || !email || !phoneNumber) {
      return res.status(400).send("Missing required fields.");
    }

    const { data: existingUser, error: checkError } = await supabase
      .from("MaydayzCustomers")
      .select("*")
      .or(`email.eq.${email},name.eq.${name}`);

    if (checkError) {
      console.error("Error checking for existing user:", checkError);
      return res.status(500).send("Error checking for existing user.");
    }

    if (existingUser.length > 0) {
      return res
        .status(409)
        .send("User with this name or email already exists.");
    }

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
      return res.status(500).send("Error creating user.");
    }

    console.log("User created:", data);
    return res.status(201).send("Signup successful!");
  } catch (err) {
    console.error("Unexpected error during signup:", err);
    return res.status(500).send("An unexpected error occurred.");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "SRC", "HTML", "login.html"));
});

app.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Please enter an email");
    }

    const { data, error } = await supabase.auth.signIn({
      email: email,
    });

    if (error) {
      console.error("Supabase Login Error:", error);
      return res.status(401).send(`Login failed: ${error.message}`);
    }

    if (data.user) {
      console.log("User logged in:", data.user);
      return res.status(200).send("Login successful!");
    } else {
      return res.status(200).send("Login initiated!!");
    }
  } catch (err) {
    console.error("Unexpected error during login:", err);
    return res.status(500).send("An unexpected error occurred during login.");
  }
});

app.get("/auth/callback", async function (req, res) {
  const code = req.query.code;
  const next = req.query.next ?? "/";

  if (code) {
    const { createServerClient } = require("@supabase/ssr");

    const supabaseServer = createServerClient(supabaseUrl, supabaseKey, {
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
    });
    await supabaseServer.auth.exchangeCodeForSession(code);
  }

  res.redirect(303, next);
});

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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

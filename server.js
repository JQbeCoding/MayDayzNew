/* Imports for the server hosted on Render backend
 */
const express = require("express");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

//Allows for the env
dotenv.config();
//Reads the env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create a Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

//Initialize express as app
const app = express();
//Uses port from express or local
const port = process.env.PORT || 3000;

//Parses the local JSON file
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

//First instance of cors. Reads from all enviornments
const corsOptions = {
  origin: [
    "https://maydayz.com",
    "https://maydayzsite.onrender.com",
    "http://localhost:3000",
  ],
};
app.use(cors(corsOptions));

app.get("/", (request, response) => {
  response.setHeader("Cache-Control", "no-cache, must-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.sendFile(path.join(__dirname, "Index.html"));
});

//Retrieves the Index file
app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "Index.html"));
});

//console.log('Directory: ', path.join(__dirname, 'index.html')); <-- This was for debugging

// Handle the /signup POST request
app.post("/signup", async (req, res) => {
  try {
    //Reads from the Supabase Postgre DB
    const { data, error } = await supabase
      .from("MaydayzCustomers")
      .insert([req.body]);
    console.log("Customer: ", data);

    //If it doesn't work it sends an error to the catch
    if (error) {
      console.error("Supabase error during signup:", error);
      return res.status(500).send(error.message);
    }
    //Otherwise we send back to the login the sign up was sucessful
    console.log("Signup successful!", data);
    res.send("Signup successful!");
  } catch (error) {
    //If an error was responded, we send that message to the Login page so the user can see the feedback
    console.error("Error during signup:", error);
    res.status(500).send("An error occurred during signup.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

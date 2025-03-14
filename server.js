const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const credentials = require("./credentials.json");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(cors());

const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Store tokens (In a real application, use a database)
let tokens = null;
app.get("/auth", (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
  res.redirect(authUrl);
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens: newTokens } = await oAuth2Client.getToken(code);
    tokens = newTokens;
    oAuth2Client.setCredentials(tokens);
    res.send("Authentication successful! You can close this window.");
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).send("Authentication failed.");
  }
});

app.post("/schedule", async (req, res) => {
  if (!tokens) {
    return res.status(401).send("Not authenticated. Please visit /auth first.");
  }
  const { service, date, time, name, email, phone, notes } = req.body;

  // Input validation
  if (!service || !date || !time || !name || !email || !phone) {
    return res.status(400).send("Missing required fields");
  }
  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const event = {
    summary: `Service: ${service}`,
    description: `Customer: ${name}\nEmail: ${email}\nPhone: ${phone}\nNotes: ${notes}`,
    start: {
      dateTime: `${date}T${time}:00`,
      timeZone: process.env.TIMEZONE || "America/Los_Angeles",
    },
    end: {
      dateTime: `${date}T${time}:00`,
      timeZone: process.env.TIMEZONE || "America/Los_Angeles",
    },
  };

  try {
    await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });
    res.status(200).send("Appointment scheduled successfully!");
  } catch (error) {
    console.error("Error scheduling appointment:", error);
    res.status(500).send("Error scheduling appointment.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

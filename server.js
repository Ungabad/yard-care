const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const credentials = require('./credentials.json'); // Path to your credentials file

const app = express();
app.use(bodyParser.json());

// OAuth2 client setup
const { client_secret, client_id, redirect_uris } = credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Generate auth URL
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.redirect(authUrl);
});

// Callback for OAuth2
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  res.send('Authentication successful! You can close this window.');
});

// Handle form submission
app.post('/schedule', async (req, res) => {
  const { service, date, time, name, email, phone, notes } = req.body;

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = {
    summary: `Service: ${service}`,
    description: `Customer: ${name}\nEmail: ${email}\nPhone: ${phone}\nNotes: ${notes}`,
    start: {
      dateTime: `${date}T${time}:00`,
      timeZone: 'America/Los_Angeles', // Adjust timezone as needed
    },
    end: {
      dateTime: `${date}T${time}:00`,
      timeZone: 'America/Los_Angeles',
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary', // Use 'primary' for the user's primary calendar
      resource: event,
    });
    res.status(200).send('Appointment scheduled successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error scheduling appointment.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
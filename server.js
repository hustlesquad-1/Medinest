const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Connect to Neon PostgreSQL
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_0vWuwgkCZp3B@ep-wispy-bonus-a19rzfci-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false },
});

// Test connection
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL (Neon)"))
  .catch(err => console.error("❌ DB connection error", err));


// POST /api/book
app.post("/api/book", async (req, res) => {
  try {
    const { patient_id, doctor_name, department, appointment_date, appointment_time } = req.body;

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_name, department, appointment_date, appointment_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, doctor_name, department, appointment_date, appointment_time]
    );

    res.json({ success: true, message: "✅ Appointment booked!", appointment: result.rows[0] });
  } catch (error) {
    console.error("❌ Error inserting appointment:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Get all appointments
app.get("/api/appointments", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM appointments ORDER BY appointment_date, appointment_time");

    // Map DB fields -> frontend fields
    const formatted = result.rows.map(app => ({
      id: app.patient_id,
      type: "Consultation", // or leave empty if not in DB
      department: app.department,
      doctor: app.doctor_name,
      date: app.appointment_date,
      time: app.appointment_time
    }));

    res.json(formatted);
  } catch (error) {
    console.error("❌ Error fetching appointments:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ POST route → insert OPD data
app.post("/api/opd", async (req, res) => {
  try {
    const {
      patientID,
      heartbeatRate,
      temperature,
      sugarLevel,
      bloodPressure,
      spo2,
      weight,
      height,
      previousHistory,
    } = req.body;

    const query = `
      INSERT INTO opd_details 
      (patient_id, heartbeat_rate, temperature, sugar_level, blood_pressure, spo2, weight, height, previous_history)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
    `;

    const values = [
      patientID,
      heartbeatRate,
      temperature,
      sugarLevel,
      bloodPressure,
      spo2,
      weight,
      height,
      previousHistory,
    ];

    const result = await pool.query(query, values);

    res.json({ ok: true, id: result.rows[0].id });
  } catch (error) {
    console.error("❌ Database insert error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ✅ GET route → fetch all OPD records
app.get("/api/opd", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM opd_details ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Database fetch error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Root route
app.get("/", (req, res) => {
  res.send("🚀 Express + Neon server is running!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

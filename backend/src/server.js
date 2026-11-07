require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./config/db");
const departmentRoutes = require("./routes/department.routes");
const wardRoutes = require("./routes/ward.routes");
const roomRoutes = require("./routes/room.routes");
const bedRoutes = require("./routes/bed.routes");
const patientRoutes = require("./routes/patient.routes");

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL,
}));

app.use(express.json());
app.use("/api/departments", departmentRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/beds", bedRoutes);
app.use("/api/patients", patientRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to SmartCare API",
    status: "Running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      status: "success",
      message: "SmartCare connected to PostgreSQL!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SmartCare API running at http://localhost:${PORT}`);
});

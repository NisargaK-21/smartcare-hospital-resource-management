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
const roleRoutes = require("./routes/role.routes");
const staffRoutes = require("./routes/staff.routes");

const admissionRoutes = require("./routes/admission.routes");
const bedReservationRoutes = require("./routes/bedReservation.routes");
const transferRoutes = require("./routes/transfer.routes");
const dischargeRoutes = require("./routes/discharge.routes");
const resourceAllocationRoutes = require("./routes/resourceAllocation.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const icuResourceRoutes = require("./routes/icuResource.routes");
const resourceAlertRoutes = require("./routes/resourceAlert.routes");

const dashboardRoutes = require("./routes/dashboard.routes");


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
app.use("/api/roles", roleRoutes);
app.use("/api/staff", staffRoutes);

app.use("/api/admissions", admissionRoutes);
app.use("/api/bed-reservations", bedReservationRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/discharges", dischargeRoutes);
app.use("/api/resource-allocations", resourceAllocationRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/icu-resources", icuResourceRoutes);
app.use("/api/resource-alerts", resourceAlertRoutes);

app.use("/api/dashboard", dashboardRoutes);


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

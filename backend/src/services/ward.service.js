
const pool = require("../config/db");

// CREATE WARD
const createWard = async (data) => {
  const {
    department_id,
    ward_name,
    ward_code,
    ward_type,
    capacity,
  } = data;

  // Check whether department exists and is active
  const department = await pool.query(
    `SELECT department_id
     FROM departments
     WHERE department_id = $1 AND is_active = TRUE`,
    [department_id]
  );

  if (department.rows.length === 0) {
    throw new Error("Department does not exist or is inactive");
  }

  const result = await pool.query(
    `INSERT INTO wards
      (department_id, ward_name, ward_code, ward_type, capacity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      department_id,
      ward_name.trim(),
      ward_code.trim().toUpperCase(),
      ward_type.toUpperCase(),
      capacity,
    ]
  );

  return result.rows[0];
};


// GET ALL WARDS
const getAllWards = async (filters = {}) => {
  const { department_id, ward_type, is_active } = filters;

  let query = `
    SELECT
      w.*,
      d.department_name
    FROM wards w
    JOIN departments d
      ON w.department_id = d.department_id
    WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (department_id) {
    query += ` AND w.department_id = $${index++}`;
    values.push(department_id);
  }

  if (ward_type) {
    query += ` AND w.ward_type = $${index++}`;
    values.push(ward_type.toUpperCase());
  }

  if (is_active !== undefined) {
    query += ` AND w.is_active = $${index++}`;
    values.push(is_active === "true");
  }

  query += ` ORDER BY w.ward_id ASC`;

  const result = await pool.query(query, values);

  return result.rows;
};


// GET WARD BY ID
const getWardById = async (wardId) => {
  const result = await pool.query(
    `SELECT
       w.*,
       d.department_name
     FROM wards w
     JOIN departments d
       ON w.department_id = d.department_id
     WHERE w.ward_id = $1`,
    [wardId]
  );

  return result.rows[0];
};


// UPDATE WARD
const updateWard = async (wardId, data) => {
  const allowedFields = [
    "department_id",
    "ward_name",
    "ward_code",
    "ward_type",
    "capacity",
  ];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      let value = data[field];

      if (field === "ward_name") {
        value = value.trim();
      }

      if (field === "ward_code") {
        value = value.trim().toUpperCase();
      }

      if (field === "ward_type") {
        value = value.toUpperCase();
      }

      values.push(value);
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  if (data.department_id !== undefined) {
    const department = await pool.query(
      `SELECT department_id
       FROM departments
       WHERE department_id = $1 AND is_active = TRUE`,
      [data.department_id]
    );

    if (department.rows.length === 0) {
      throw new Error("Department does not exist or is inactive");
    }
  }

  values.push(wardId);

  const result = await pool.query(
    `UPDATE wards
     SET ${updates.join(", ")},
         updated_at = NOW()
     WHERE ward_id = $${values.length}
     RETURNING *`,
    values
  );

  return result.rows[0];
};


// SOFT DELETE WARD
const deactivateWard = async (wardId) => {
  const result = await pool.query(
    `UPDATE wards
     SET is_active = FALSE,
         updated_at = NOW()
     WHERE ward_id = $1
     RETURNING *`,
    [wardId]
  );

  return result.rows[0];
};


module.exports = {
  createWard,
  getAllWards,
  getWardById,
  updateWard,
  deactivateWard,
};

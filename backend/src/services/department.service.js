
const pool = require("../config/db");

const getAllDepartments = async () => {
  const result = await pool.query(
    `SELECT * FROM public.departments
     ORDER BY department_id`
  );

  return result.rows;
};

const getDepartmentById = async (id) => {
  const result = await pool.query(
    `SELECT * FROM public.departments
     WHERE department_id = $1`,
    [id]
  );

  return result.rows[0];
};

const createDepartment = async (data) => {
  const { department_name, department_code, description } = data;

  const result = await pool.query(
    `INSERT INTO public.departments
      (department_name, department_code, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [department_name, department_code, description ?? null]
  );

  return result.rows[0];
};

const updateDepartment = async (id, data) => {
  const { department_name, department_code, description, is_active } = data;

  const result = await pool.query(
    `UPDATE public.departments
     SET department_name = COALESCE($1, department_name),
         department_code = COALESCE($2, department_code),
         description = COALESCE($3, description),
         is_active = COALESCE($4, is_active),
         updated_at = NOW()
     WHERE department_id = $5
     RETURNING *`,
    [department_name, department_code, description, is_active, id]
  );

  return result.rows[0];
};

const deleteDepartment = async (id) => {
  const result = await pool.query(
    `UPDATE public.departments
     SET is_active = FALSE,
         updated_at = NOW()
     WHERE department_id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};

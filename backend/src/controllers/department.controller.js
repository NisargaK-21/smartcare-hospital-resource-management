
const departmentService = require("../services/department.service");

const handleError = (error, res) => {
  console.error("Department API error:", error.message);

  if (error.code === "23505") {
    return res.status(409).json({
      message: "Department name or code already exists",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      message: "Invalid department data",
    });
  }

  res.status(500).json({
    message: "Internal server error",
  });
};

const getAllDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getAllDepartments();

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    handleError(error, res);
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const department = await departmentService.getDepartmentById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    handleError(error, res);
  }
};

const createDepartment = async (req, res) => {
  try {
    const { department_name, department_code, description } = req.body;

    if (
      typeof department_name !== "string" ||
      !department_name.trim() ||
      typeof department_code !== "string" ||
      !department_code.trim()
    ) {
      return res.status(400).json({
        message: "Valid department name and code are required",
      });
    }

    const department = await departmentService.createDepartment({
      department_name: department_name.trim(),
      department_code: department_code.trim(),
      description,
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    handleError(error, res);
  }
};

const updateDepartment = async (req, res) => {
  try {
    const allowed = [
      "department_name",
      "department_code",
      "description",
      "is_active",
    ];

    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length === 0 ||
      Object.keys(req.body).some((key) => !allowed.includes(key)) ||
      ["department_name", "department_code"].some(
        (key) =>
          key in req.body &&
          (typeof req.body[key] !== "string" || !req.body[key].trim())
      ) ||
      ("description" in req.body &&
        req.body.description !== null &&
        typeof req.body.description !== "string") ||
      ("is_active" in req.body &&
        typeof req.body.is_active !== "boolean")
    ) {
      return res.status(400).json({
        message: "Invalid department update",
      });
    }

    const department = await departmentService.updateDepartment(
      req.params.id,
      req.body
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    handleError(error, res);
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const department = await departmentService.deleteDepartment(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({
      success: true,
      message: "Department deactivated successfully",
      data: department,
    });
  } catch (error) {
    handleError(error, res);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};

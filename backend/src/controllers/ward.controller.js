
const wardService = require("../services/ward.service");

// CREATE WARD
const createWard = async (req, res) => {
  try {
    const {
      department_id,
      ward_name,
      ward_code,
      ward_type,
      capacity,
    } = req.body;

    if (
      !department_id ||
      !ward_name?.trim() ||
      !ward_code?.trim() ||
      !ward_type ||
      capacity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "All ward fields are required",
      });
    }

    if (!Number.isInteger(Number(department_id)) ||
        Number(department_id) <= 0 ||
        !Number.isInteger(capacity) ||
        capacity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Department ID and capacity must be positive integers",
      });
    }

    if (!["GENERAL", "ICU"].includes(ward_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Ward type must be GENERAL or ICU",
      });
    }

    const ward = await wardService.createWard(req.body);

    res.status(201).json({
      success: true,
      message: "Ward created successfully",
      data: ward,
    });

  } catch (error) {
    console.error("Create ward error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Ward code or name already exists",
      });
    }

    res.status(error.message.includes("Department") ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET ALL WARDS
const getAllWards = async (req, res) => {
  try {
    const wards = await wardService.getAllWards(req.query);

    res.status(200).json({
      success: true,
      count: wards.length,
      data: wards,
    });

  } catch (error) {
    console.error("Get wards error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve wards",
    });
  }
};


// GET WARD BY ID
const getWardById = async (req, res) => {
  try {
    const ward = await wardService.getWardById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    res.status(200).json({
      success: true,
      data: ward,
    });

  } catch (error) {
    console.error("Get ward error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve ward",
    });
  }
};


// UPDATE WARD
const updateWard = async (req, res) => {
  try {
    if (req.body.capacity !== undefined &&
        (!Number.isInteger(req.body.capacity) ||
         req.body.capacity <= 0)) {
      return res.status(400).json({
        success: false,
        message: "Capacity must be a positive integer",
      });
    }

    if (req.body.ward_type !== undefined &&
        !["GENERAL", "ICU"].includes(req.body.ward_type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Ward type must be GENERAL or ICU",
      });
    }

    const ward = await wardService.updateWard(
      req.params.id,
      req.body
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ward updated successfully",
      data: ward,
    });

  } catch (error) {
    console.error("Update ward error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Ward code or name already exists",
      });
    }

    res.status(error.message.includes("Department") ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
};


// DEACTIVATE WARD
const deactivateWard = async (req, res) => {
  try {
    const ward = await wardService.deactivateWard(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: "Ward not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ward deactivated successfully",
      data: ward,
    });

  } catch (error) {
    console.error("Deactivate ward error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to deactivate ward",
    });
  }
};


module.exports = {
  createWard,
  getAllWards,
  getWardById,
  updateWard,
  deactivateWard,
};


const staffService = require("../services/staff.service");

const createStaff = async (req, res) => {
    try {
        const {
            employee_number,
            first_name,
            last_name,
            role_id,
            department_id,
            phone,
            hire_date
        } = req.body;

        if (
            !employee_number?.trim() ||
            !first_name?.trim() ||
            !last_name?.trim() ||
            !role_id ||
            !department_id ||
            !phone?.trim() ||
            !hire_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Employee number, first name, last name, role, department, phone and hire date are required"
            });
        }

        if (!Number.isInteger(Number(role_id)) || Number(role_id) <= 0 ||
            !Number.isInteger(Number(department_id)) || Number(department_id) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID or department ID"
            });
        }

        if (Number.isNaN(Date.parse(hire_date)) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(hire_date) ||
            new Date(`${hire_date}T00:00:00`) > new Date(new Date().toDateString())) {
            return res.status(400).json({
                success: false,
                message: "Hire date must be a valid date and cannot be in the future"
            });
        }

        const staff = await staffService.createStaff(req.body);

        return res.status(201).json({
            success: true,
            message: "Staff member created successfully",
            data: staff
        });
    } catch (error) {
        console.error("Create staff error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Employee number or email already exists"
            });
        }

        if (error.message.includes("Role") || error.message.includes("Department")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create staff member"
        });
    }
};

const getAllStaff = async (req, res) => {
    try {
        const staff = await staffService.getAllStaff(req.query);

        return res.status(200).json({
            success: true,
            count: staff.length,
            data: staff
        });
    } catch (error) {
        console.error("Get staff error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch staff members"
        });
    }
};

const getStaffById = async (req, res) => {
    try {
        const staff = await staffService.getStaffById(req.params.id);

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: staff
        });
    } catch (error) {
        console.error("Get staff by ID error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch staff member"
        });
    }
};

const searchStaff = async (req, res) => {
    try {
        const searchTerm = req.query.q?.trim();

        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                message: "Search term is required"
            });
        }

        const staff = await staffService.searchStaff(searchTerm);

        return res.status(200).json({
            success: true,
            count: staff.length,
            data: staff
        });
    } catch (error) {
        console.error("Search staff error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search staff members"
        });
    }
};

const updateStaff = async (req, res) => {
    try {
        const staff = await staffService.updateStaff(
            req.params.id,
            req.body
        );

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Staff member updated successfully",
            data: staff
        });
    } catch (error) {
        console.error("Update staff error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Employee number or email already exists"
            });
        }

        if (error.message.includes("Role") ||
            error.message.includes("Department") ||
            error.message.includes("No valid fields")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update staff member"
        });
    }
};

const deactivateStaff = async (req, res) => {
    try {
        const staff = await staffService.deactivateStaff(req.params.id);

        if (!staff) {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Staff member deactivated successfully",
            data: staff
        });
    } catch (error) {
        console.error("Deactivate staff error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate staff member"
        });
    }
};

module.exports = {
    createStaff,
    getAllStaff,
    getStaffById,
    searchStaff,
    updateStaff,
    deactivateStaff
};

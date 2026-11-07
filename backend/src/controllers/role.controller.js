const roleService = require("../services/role.service");

// Create role
const createRole = async (req, res) => {
    try {
        const { role_name, description } = req.body;

        if (
            typeof role_name !== "string" ||
            !role_name.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Role name is required"
            });
        }

        const role = await roleService.createRole({
            role_name: role_name.trim().toUpperCase(),
            description
        });

        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Role already exists"
            });
        }

        console.error("Create role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create role"
        });
    }
};

// Get all roles
const getAllRoles = async (req, res) => {
    try {
        const roles = await roleService.getAllRoles(req.query);

        return res.status(200).json({
            success: true,
            count: roles.length,
            data: roles
        });

    } catch (error) {
        console.error("Get roles error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch roles"
        });
    }
};

// Get role by ID
const getRoleById = async (req, res) => {
    try {
        const roleId = Number(req.params.id);

        if (!Number.isInteger(roleId) || roleId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID"
            });
        }

        const role = await roleService.getRoleById(roleId);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: role
        });

    } catch (error) {
        console.error("Get role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch role"
        });
    }
};

// Update role
const updateRole = async (req, res) => {
    try {
        const roleId = Number(req.params.id);

        if (!Number.isInteger(roleId) || roleId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID"
            });
        }

        const { role_name, description } = req.body;

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        if (
            role_name !== undefined &&
            (typeof role_name !== "string" || !role_name.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Role name cannot be empty"
            });
        }

        const updates = {};

        if (role_name !== undefined) {
            updates.role_name = role_name.trim().toUpperCase();
        }

        if (description !== undefined) {
            updates.description = description;
        }

        const role = await roleService.updateRole(roleId, updates);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Role updated successfully",
            data: role
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Role name already exists"
            });
        }

        console.error("Update role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update role"
        });
    }
};

// Soft-delete role
const deactivateRole = async (req, res) => {
    try {
        const roleId = Number(req.params.id);

        if (!Number.isInteger(roleId) || roleId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID"
            });
        }

        const role = await roleService.deactivateRole(roleId);

        if (!role) {
            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Role deactivated successfully",
            data: role
        });

    } catch (error) {
        console.error("Deactivate role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate role"
        });
    }
};

module.exports = {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deactivateRole
};
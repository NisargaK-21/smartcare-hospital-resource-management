const dashboardService = require("../services/dashboard.service");

// GET /api/dashboard/stats
const getOverallStats = async (req, res) => {
    try {
        const data = await dashboardService.getOverallStats();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Dashboard overall stats error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch overall statistics",
        });
    }
};

// GET /api/dashboard/ward-occupancy
const getWardOccupancy = async (req, res) => {
    try {
        const data = await dashboardService.getWardOccupancy();

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("Dashboard ward occupancy error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch ward occupancy",
        });
    }
};

// GET /api/dashboard/department-stats
const getDepartmentStats = async (req, res) => {
    try {
        const data = await dashboardService.getDepartmentStats();

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("Dashboard department stats error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch department statistics",
        });
    }
};

// GET /api/dashboard/bed-status
const getBedStatusBreakdown = async (req, res) => {
    try {
        const data = await dashboardService.getBedStatusBreakdown();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Dashboard bed status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bed status breakdown",
        });
    }
};

// GET /api/dashboard/recent-patients?limit=10
const getRecentPatients = async (req, res) => {
    try {
        const rawLimit = parseInt(req.query.limit, 10);
        const limit = !isNaN(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, 50)
            : 10;

        const data = await dashboardService.getRecentPatients(limit);

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("Dashboard recent patients error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch recent patients",
        });
    }
};

// GET /api/dashboard/staff-summary
const getStaffSummary = async (req, res) => {
    try {
        const data = await dashboardService.getStaffSummary();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Dashboard staff summary error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch staff summary",
        });
    }
};

module.exports = {
    getOverallStats,
    getWardOccupancy,
    getDepartmentStats,
    getBedStatusBreakdown,
    getRecentPatients,
    getStaffSummary,
};

const patientService = require("../services/patient.service");

const VALID_GENDERS = ["MALE", "FEMALE", "OTHER"];

const VALID_BLOOD_GROUPS = [
    "A+", "A-", "B+", "B-",
    "AB+", "AB-", "O+", "O-"
];

const isValidDate = (date) => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);

    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date &&
        parsed <= new Date(new Date().toISOString().slice(0, 10));
};

// Register patient
const createPatient = async (req, res) => {
    try {
        const {
            patient_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            blood_group,
            phone,
            email,
            address,
            emergency_contact_name,
            emergency_contact_phone
        } = req.body;

        const requiredFields = {
            patient_number,
            first_name,
            last_name,
            date_of_birth,
            gender,
            phone
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) =>
                value === undefined ||
                value === null ||
                (typeof value === "string" && !value.trim())
            )
            .map(([field]) => field);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Required fields missing: ${missingFields.join(", ")}`
            });
        }

        if (!isValidDate(date_of_birth)) {
            return res.status(400).json({
                success: false,
                message: "Date of birth must be a valid date in YYYY-MM-DD format and cannot be in the future"
            });
        }

        if (!VALID_GENDERS.includes(gender)) {
            return res.status(400).json({
                success: false,
                message: `Gender must be one of: ${VALID_GENDERS.join(", ")}`
            });
        }

        if (blood_group &&
            !VALID_BLOOD_GROUPS.includes(blood_group)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blood group"
            });
        }

        if (typeof phone !== "string" ||
            !/^[0-9+() -]{7,20}$/.test(phone.trim())) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid phone number"
            });
        }

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address"
            });
        }

        if (emergency_contact_phone &&
            !/^[0-9+() -]{7,20}$/.test(emergency_contact_phone.trim())) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid emergency contact phone number"
            });
        }

        const patient = await patientService.createPatient({
            patient_number: patient_number.trim(),
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            date_of_birth,
            gender,
            blood_group,
            phone: phone.trim(),
            email,
            address,
            emergency_contact_name,
            emergency_contact_phone
        });

        return res.status(201).json({
            success: true,
            message: "Patient registered successfully",
            data: patient
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Patient number already exists"
            });
        }

        console.error("Create patient error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to register patient"
        });
    }
};

// Get all patients
const getAllPatients = async (req, res) => {
    try {
        const patients = await patientService.getAllPatients(req.query);

        return res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });

    } catch (error) {
        console.error("Get patients error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch patients"
        });
    }
};

// Get patient by ID
const getPatientById = async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const patient = await patientService.getPatientById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: patient
        });

    } catch (error) {
        console.error("Get patient error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch patient"
        });
    }
};

// Search patients
const searchPatients = async (req, res) => {
    try {
        const searchTerm = req.query.q;

        if (typeof searchTerm !== "string" || !searchTerm.trim()) {
            return res.status(400).json({
                success: false,
                message: "Provide a search term using the q parameter"
            });
        }

        const patients = await patientService.searchPatients(searchTerm.trim());

        return res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });

    } catch (error) {
        console.error("Search patients error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search patients"
        });
    }
};

// Update patient
const updatePatient = async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const allowedFields = [
            "first_name",
            "last_name",
            "date_of_birth",
            "gender",
            "blood_group",
            "phone",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one valid field to update"
            });
        }

        if (updates.first_name !== undefined &&
            (typeof updates.first_name !== "string" || !updates.first_name.trim())) {
            return res.status(400).json({
                success: false,
                message: "First name cannot be empty"
            });
        }

        if (updates.last_name !== undefined &&
            (typeof updates.last_name !== "string" || !updates.last_name.trim())) {
            return res.status(400).json({
                success: false,
                message: "Last name cannot be empty"
            });
        }

        if (updates.date_of_birth !== undefined &&
            !isValidDate(updates.date_of_birth)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date of birth"
            });
        }

        if (updates.gender !== undefined &&
            !VALID_GENDERS.includes(updates.gender)) {
            return res.status(400).json({
                success: false,
                message: "Invalid gender"
            });
        }

        if (updates.blood_group !== undefined &&
            updates.blood_group !== null &&
            updates.blood_group !== "" &&
            !VALID_BLOOD_GROUPS.includes(updates.blood_group)) {
            return res.status(400).json({
                success: false,
                message: "Invalid blood group"
            });
        }

        if (updates.phone !== undefined &&
            (typeof updates.phone !== "string" ||
             !/^[0-9+() -]{7,20}$/.test(updates.phone.trim()))) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid phone number"
            });
        }

        if (updates.email !== undefined &&
            updates.email !== null &&
            updates.email !== "" &&
            (typeof updates.email !== "string" ||
             !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email))) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address"
            });
        }

        if (updates.emergency_contact_phone !== undefined &&
            updates.emergency_contact_phone !== null &&
            updates.emergency_contact_phone !== "" &&
            (typeof updates.emergency_contact_phone !== "string" ||
             !/^[0-9+() -]{7,20}$/.test(updates.emergency_contact_phone.trim()))) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid emergency contact phone number"
            });
        }

        for (const field of [
            "first_name",
            "last_name",
            "phone",
            "emergency_contact_name",
            "emergency_contact_phone"
        ]) {
            if (typeof updates[field] === "string") {
                updates[field] = updates[field].trim();
            }
        }

        const patient = await patientService.updatePatient(patientId, updates);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Patient updated successfully",
            data: patient
        });

    } catch (error) {
        console.error("Update patient error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update patient"
        });
    }
};

// Soft-delete patient
const deactivatePatient = async (req, res) => {
    try {
        const patientId = Number(req.params.id);

        if (!Number.isInteger(patientId) || patientId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const patient = await patientService.deactivatePatient(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Patient deactivated successfully",
            data: patient
        });

    } catch (error) {
        console.error("Deactivate patient error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate patient"
        });
    }
};

module.exports = {
    createPatient,
    getAllPatients,
    getPatientById,
    searchPatients,
    updatePatient,
    deactivatePatient
};
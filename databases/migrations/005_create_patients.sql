CREATE TABLE IF NOT EXISTS public.patients (
    patient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    patient_number VARCHAR(30) NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,

    blood_group VARCHAR(5),

    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),

    address TEXT,

    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(20),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT patient_first_name_not_blank
        CHECK (LENGTH(TRIM(first_name)) > 0),

    CONSTRAINT patient_last_name_not_blank
        CHECK (LENGTH(TRIM(last_name)) > 0),

    CONSTRAINT patient_number_not_blank
        CHECK (LENGTH(TRIM(patient_number)) > 0),

    CONSTRAINT valid_patient_gender
        CHECK (
            gender IN ('MALE', 'FEMALE', 'OTHER')
        ),

    CONSTRAINT valid_blood_group
        CHECK (
            blood_group IS NULL OR
            blood_group IN (
                'A+', 'A-', 'B+', 'B-',
                'AB+', 'AB-', 'O+', 'O-'
            )
        ),

    CONSTRAINT valid_patient_dob
        CHECK (date_of_birth <= CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS idx_patients_name
    ON public.patients(first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_patients_phone
    ON public.patients(phone);

CREATE INDEX IF NOT EXISTS idx_patients_active
    ON public.patients(is_active);
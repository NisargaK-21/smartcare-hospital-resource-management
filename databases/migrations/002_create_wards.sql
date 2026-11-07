
CREATE TABLE IF NOT EXISTS public.wards (
    ward_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    department_id BIGINT NOT NULL,

    ward_name VARCHAR(100) NOT NULL,
    ward_code VARCHAR(20) NOT NULL,

    ward_type VARCHAR(30) NOT NULL,

    capacity INTEGER NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ward_department
        FOREIGN KEY (department_id)
        REFERENCES public.departments(department_id)
        ON DELETE RESTRICT,

    CONSTRAINT unique_ward_code_per_department
        UNIQUE (department_id, ward_code),

    CONSTRAINT unique_ward_name_per_department
        UNIQUE (department_id, ward_name),

    CONSTRAINT valid_ward_type
        CHECK (
            ward_type IN (
                'GENERAL',
                'ICU',
                'EMERGENCY',
                'SPECIALIZED'
            )
        ),

    CONSTRAINT valid_ward_capacity
        CHECK (capacity > 0),

    CONSTRAINT ward_name_not_blank
        CHECK (LENGTH(TRIM(ward_name)) > 0),

    CONSTRAINT ward_code_not_blank
        CHECK (LENGTH(TRIM(ward_code)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_wards_department
ON public.wards(department_id);

CREATE INDEX IF NOT EXISTS idx_wards_active
ON public.wards(is_active);

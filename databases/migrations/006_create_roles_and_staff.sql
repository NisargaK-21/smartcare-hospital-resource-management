-- =========================================
-- ROLES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT role_name_not_blank
        CHECK (LENGTH(TRIM(role_name)) > 0)
);


-- =========================================
-- STAFF TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS public.staff (
    staff_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    employee_number VARCHAR(30) NOT NULL UNIQUE,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    role_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,

    designation VARCHAR(100),

    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150) UNIQUE,

    hire_date DATE NOT NULL,

    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_staff_role
        FOREIGN KEY (role_id)
        REFERENCES public.roles(role_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_staff_department
        FOREIGN KEY (department_id)
        REFERENCES public.departments(department_id)
        ON DELETE RESTRICT,

    CONSTRAINT valid_employment_status
        CHECK (
            employment_status IN (
                'ACTIVE',
                'ON_LEAVE',
                'INACTIVE',
                'TERMINATED'
            )
        ),

    CONSTRAINT staff_first_name_not_blank
        CHECK (LENGTH(TRIM(first_name)) > 0),

    CONSTRAINT staff_last_name_not_blank
        CHECK (LENGTH(TRIM(last_name)) > 0),

    CONSTRAINT staff_employee_number_not_blank
        CHECK (LENGTH(TRIM(employee_number)) > 0),

    CONSTRAINT staff_hire_date_valid
        CHECK (hire_date <= CURRENT_DATE)
);


-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_staff_role
    ON public.staff(role_id);

CREATE INDEX IF NOT EXISTS idx_staff_department
    ON public.staff(department_id);

CREATE INDEX IF NOT EXISTS idx_staff_status
    ON public.staff(employment_status);

CREATE INDEX IF NOT EXISTS idx_staff_active
    ON public.staff(is_active);
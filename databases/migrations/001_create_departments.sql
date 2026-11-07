CREATE TABLE IF NOT EXISTS public.departments (
    department_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT department_name_not_blank
        CHECK (LENGTH(TRIM(department_name)) > 0),

    CONSTRAINT department_code_not_blank
        CHECK (LENGTH(TRIM(department_code)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_departments_active
ON public.departments(is_active);

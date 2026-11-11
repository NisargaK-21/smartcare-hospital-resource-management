CREATE TABLE IF NOT EXISTS public.admissions (
    admission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    patient_id BIGINT NOT NULL,
    bed_id BIGINT,

    required_bed_type VARCHAR(20) NOT NULL,
    admission_type VARCHAR(20) NOT NULL,
    admission_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    reason TEXT,

    admitted_by BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_admission_patient
        FOREIGN KEY (patient_id)
        REFERENCES public.patients(patient_id),

    CONSTRAINT fk_admission_bed
        FOREIGN KEY (bed_id)
        REFERENCES public.beds(bed_id),

    CONSTRAINT fk_admission_staff
        FOREIGN KEY (admitted_by)
        REFERENCES public.staff(staff_id),

    CONSTRAINT admission_bed_type_check
        CHECK (
            required_bed_type IN
            ('GENERAL', 'ICU', 'EMERGENCY', 'PRIVATE')
        ),

    CONSTRAINT admission_type_check
        CHECK (
            admission_type IN
            ('PLANNED', 'EMERGENCY', 'TRANSFER')
        ),

    CONSTRAINT admission_status_check
        CHECK (
            admission_status IN
            ('PENDING', 'ACTIVE', 'DISCHARGED', 'CANCELLED')
        )
);

CREATE INDEX IF NOT EXISTS idx_admissions_patient
ON public.admissions(patient_id);

CREATE INDEX IF NOT EXISTS idx_admissions_bed
ON public.admissions(bed_id);

CREATE INDEX IF NOT EXISTS idx_admissions_status
ON public.admissions(admission_status);

CREATE INDEX IF NOT EXISTS idx_admissions_active_bed
ON public.admissions(bed_id)
WHERE admission_status = 'ACTIVE';
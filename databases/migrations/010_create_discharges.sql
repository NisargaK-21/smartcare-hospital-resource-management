CREATE TABLE IF NOT EXISTS public.discharges (
    discharge_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    admission_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    bed_id BIGINT NOT NULL,

    discharge_date TIMESTAMPTZ,
    discharge_reason TEXT NOT NULL,
    discharge_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    discharged_by BIGINT,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_discharge_admission
        FOREIGN KEY (admission_id)
        REFERENCES public.admissions(admission_id),

    CONSTRAINT fk_discharge_patient
        FOREIGN KEY (patient_id)
        REFERENCES public.patients(patient_id),

    CONSTRAINT fk_discharge_bed
        FOREIGN KEY (bed_id)
        REFERENCES public.beds(bed_id),

    CONSTRAINT fk_discharge_staff
        FOREIGN KEY (discharged_by)
        REFERENCES public.staff(staff_id),

    CONSTRAINT discharge_status_check
        CHECK (
            discharge_status IN
            ('PENDING', 'COMPLETED', 'CANCELLED')
        )
);

CREATE INDEX IF NOT EXISTS idx_discharges_admission
    ON public.discharges(admission_id);

CREATE INDEX IF NOT EXISTS idx_discharges_patient
    ON public.discharges(patient_id);

CREATE INDEX IF NOT EXISTS idx_discharges_bed
    ON public.discharges(bed_id);

CREATE INDEX IF NOT EXISTS idx_discharges_status
    ON public.discharges(discharge_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_discharges_one_pending_per_admission
    ON public.discharges(admission_id)
    WHERE discharge_status = 'PENDING';

CREATE TABLE IF NOT EXISTS public.transfers (
    transfer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    admission_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,

    from_bed_id BIGINT,
    to_bed_id BIGINT NOT NULL,

    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    transfer_reason TEXT,

    transfer_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    transferred_by BIGINT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_transfer_admission
        FOREIGN KEY (admission_id)
        REFERENCES public.admissions(admission_id),

    CONSTRAINT fk_transfer_patient
        FOREIGN KEY (patient_id)
        REFERENCES public.patients(patient_id),

    CONSTRAINT fk_transfer_from_bed
        FOREIGN KEY (from_bed_id)
        REFERENCES public.beds(bed_id),

    CONSTRAINT fk_transfer_to_bed
        FOREIGN KEY (to_bed_id)
        REFERENCES public.beds(bed_id),

    CONSTRAINT fk_transfer_staff
        FOREIGN KEY (transferred_by)
        REFERENCES public.staff(staff_id),

    CONSTRAINT transfer_status_check
        CHECK (
            transfer_status IN
            ('PENDING', 'COMPLETED', 'CANCELLED')
        ),

    CONSTRAINT transfer_beds_check
        CHECK (
            from_bed_id IS NULL
            OR from_bed_id <> to_bed_id
        )
);

CREATE INDEX IF NOT EXISTS idx_transfers_admission
ON public.transfers(admission_id);

CREATE INDEX IF NOT EXISTS idx_transfers_patient
ON public.transfers(patient_id);

CREATE INDEX IF NOT EXISTS idx_transfers_from_bed
ON public.transfers(from_bed_id);

CREATE INDEX IF NOT EXISTS idx_transfers_to_bed
ON public.transfers(to_bed_id);

CREATE INDEX IF NOT EXISTS idx_transfers_status
ON public.transfers(transfer_status);

CREATE INDEX IF NOT EXISTS idx_transfers_date
ON public.transfers(transfer_date);
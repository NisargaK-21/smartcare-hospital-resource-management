CREATE TABLE IF NOT EXISTS public.bed_reservations (
    reservation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    patient_id BIGINT NOT NULL,
    bed_id BIGINT NOT NULL,

    reservation_start TIMESTAMPTZ NOT NULL,
    reservation_end TIMESTAMPTZ,

    reservation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    reserved_by BIGINT,

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_reservation_patient
        FOREIGN KEY (patient_id)
        REFERENCES public.patients(patient_id),

    CONSTRAINT fk_reservation_bed
        FOREIGN KEY (bed_id)
        REFERENCES public.beds(bed_id),

    CONSTRAINT fk_reservation_staff
        FOREIGN KEY (reserved_by)
        REFERENCES public.staff(staff_id),

    CONSTRAINT reservation_status_check
        CHECK (
            reservation_status IN
            ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED')
        ),

    CONSTRAINT reservation_dates_check
        CHECK (
            reservation_end IS NULL
            OR reservation_end > reservation_start
        )
);

CREATE INDEX IF NOT EXISTS idx_bed_reservations_patient
ON public.bed_reservations(patient_id);

CREATE INDEX IF NOT EXISTS idx_bed_reservations_bed
ON public.bed_reservations(bed_id);

CREATE INDEX IF NOT EXISTS idx_bed_reservations_status
ON public.bed_reservations(reservation_status);

CREATE INDEX IF NOT EXISTS idx_bed_reservations_dates
ON public.bed_reservations(
    bed_id,
    reservation_start,
    reservation_end
);
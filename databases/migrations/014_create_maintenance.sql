CREATE TABLE IF NOT EXISTS public.maintenance (
    maintenance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    bed_id BIGINT,
    icu_resource_id BIGINT,

    maintenance_reason TEXT NOT NULL,
    maintenance_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    maintenance_start TIMESTAMPTZ,
    maintenance_completed_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_maintenance_bed
        FOREIGN KEY (bed_id)
        REFERENCES public.beds(bed_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_maintenance_icu_resource
        FOREIGN KEY (icu_resource_id)
        REFERENCES public.icu_resources(icu_resource_id)
        ON DELETE RESTRICT,

    CONSTRAINT maintenance_status_check
        CHECK (
            maintenance_status IN
            ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
        ),

    CONSTRAINT maintenance_target_check
        CHECK (
            (bed_id IS NOT NULL AND icu_resource_id IS NULL)
            OR
            (bed_id IS NULL AND icu_resource_id IS NOT NULL)
        ),

    CONSTRAINT maintenance_time_check
        CHECK (
            maintenance_completed_at IS NULL
            OR (
                maintenance_start IS NOT NULL
                AND maintenance_completed_at >= maintenance_start
            )
        ),

    CONSTRAINT maintenance_reason_not_blank
        CHECK (LENGTH(TRIM(maintenance_reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_bed
    ON public.maintenance(bed_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_icu_resource
    ON public.maintenance(icu_resource_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_status
    ON public.maintenance(maintenance_status);

CREATE INDEX IF NOT EXISTS idx_maintenance_start
    ON public.maintenance(maintenance_start);

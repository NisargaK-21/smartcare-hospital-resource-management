CREATE TABLE IF NOT EXISTS public.icu_resources (
    icu_resource_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    bed_id BIGINT NOT NULL,
    resource_type VARCHAR(30) NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    resource_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'UNIT',
    last_checked_at TIMESTAMPTZ,
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_icu_resource_bed
        FOREIGN KEY (bed_id)
        REFERENCES public.beds(bed_id)
        ON DELETE RESTRICT,

    CONSTRAINT icu_resource_type_check
        CHECK (
            resource_type IN (
                'VENTILATOR',
                'CARDIAC_MONITOR',
                'INFUSION_PUMP',
                'PATIENT_MONITOR',
                'OXYGEN_SUPPLY',
                'OTHER'
            )
        ),

    CONSTRAINT icu_resource_status_check
        CHECK (
            resource_status IN (
                'AVAILABLE',
                'IN_USE',
                'MAINTENANCE',
                'OUT_OF_SERVICE'
            )
        ),

    CONSTRAINT icu_resource_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT icu_resource_name_not_blank
        CHECK (LENGTH(TRIM(resource_name)) > 0),

    CONSTRAINT icu_resource_unit_not_blank
        CHECK (LENGTH(TRIM(unit)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_icu_resources_bed
    ON public.icu_resources(bed_id);

CREATE INDEX IF NOT EXISTS idx_icu_resources_type
    ON public.icu_resources(resource_type);

CREATE INDEX IF NOT EXISTS idx_icu_resources_status
    ON public.icu_resources(resource_status);

CREATE INDEX IF NOT EXISTS idx_icu_resources_last_checked
    ON public.icu_resources(last_checked_at);

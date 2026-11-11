CREATE TABLE IF NOT EXISTS public.resource_allocations (
    allocation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    icu_resource_id BIGINT NOT NULL,
    admission_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 1,
    allocation_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_resource_allocation_icu_resource
        FOREIGN KEY (icu_resource_id)
        REFERENCES public.icu_resources(icu_resource_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_resource_allocation_admission
        FOREIGN KEY (admission_id)
        REFERENCES public.admissions(admission_id)
        ON DELETE RESTRICT,

    CONSTRAINT resource_allocation_quantity_check
        CHECK (quantity > 0),

    CONSTRAINT resource_allocation_status_check
        CHECK (
            allocation_status IN
            ('ACTIVE', 'RELEASED', 'CANCELLED')
        ),

    CONSTRAINT resource_allocation_release_time_check
        CHECK (
            released_at IS NULL
            OR released_at >= allocated_at
        )
);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_icu_resource
    ON public.resource_allocations(icu_resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_admission
    ON public.resource_allocations(admission_id);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_status
    ON public.resource_allocations(allocation_status);

CREATE INDEX IF NOT EXISTS idx_resource_allocations_allocated_at
    ON public.resource_allocations(allocated_at);

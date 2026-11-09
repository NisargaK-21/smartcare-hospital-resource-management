BEGIN;

ALTER TABLE public.beds
    DROP CONSTRAINT IF EXISTS valid_bed_status;

ALTER TABLE public.beds
    ADD CONSTRAINT valid_bed_status
    CHECK (
        bed_status IN (
            'AVAILABLE',
            'OCCUPIED',
            'RESERVED',
            'MAINTENANCE',
            'CLEANING'
        )
    );

COMMIT;

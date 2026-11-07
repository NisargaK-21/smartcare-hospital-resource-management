CREATE TABLE IF NOT EXISTS public.beds (
    bed_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    room_id BIGINT NOT NULL,

    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(30) NOT NULL DEFAULT 'STANDARD',

    bed_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bed_room
        FOREIGN KEY (room_id)
        REFERENCES public.rooms(room_id)
        ON DELETE RESTRICT,

    CONSTRAINT unique_bed_number_per_room
        UNIQUE (room_id, bed_number),

    CONSTRAINT valid_bed_type
        CHECK (
            bed_type IN (
                'STANDARD',
                'ELECTRIC',
                'ICU',
                'PEDIATRIC',
                'BARIATRIC'
            )
        ),

    CONSTRAINT valid_bed_status
        CHECK (
            bed_status IN (
                'AVAILABLE',
                'OCCUPIED',
                'RESERVED',
                'MAINTENANCE'
            )
        ),

    CONSTRAINT bed_number_not_blank
        CHECK (LENGTH(TRIM(bed_number)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_beds_room
    ON public.beds(room_id);

CREATE INDEX IF NOT EXISTS idx_beds_status
    ON public.beds(bed_status);

CREATE INDEX IF NOT EXISTS idx_beds_active
    ON public.beds(is_active);
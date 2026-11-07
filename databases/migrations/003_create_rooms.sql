CREATE TABLE IF NOT EXISTS public.rooms (
    room_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    ward_id BIGINT NOT NULL,

    room_number VARCHAR(20) NOT NULL,
    room_type VARCHAR(30) NOT NULL,
    capacity INTEGER NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_room_ward
        FOREIGN KEY (ward_id)
        REFERENCES public.wards(ward_id)
        ON DELETE RESTRICT,

    CONSTRAINT unique_room_number_per_ward
        UNIQUE (ward_id, room_number),

    CONSTRAINT valid_room_type
        CHECK (
            room_type IN (
                'GENERAL',
                'PRIVATE',
                'SEMI_PRIVATE',
                'ISOLATION'
            )
        ),

    CONSTRAINT valid_room_capacity
        CHECK (capacity > 0),

    CONSTRAINT room_number_not_blank
        CHECK (LENGTH(TRIM(room_number)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_rooms_ward
    ON public.rooms(ward_id);

CREATE INDEX IF NOT EXISTS idx_rooms_active
    ON public.rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_rooms_type
    ON public.rooms(room_type);
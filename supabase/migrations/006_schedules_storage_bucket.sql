-- Migration 006: Create Supabase Storage bucket for schedule PNG exports.
--
-- The 'schedules' bucket stores one per-user weekly schedule PNG rendered by
-- Playwright. Files are stored under {user_id}/schedule.png and are publicly
-- readable (no auth required to view the shareable schedule image).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'schedules',
    'schedules',
    true,                        -- public bucket: anyone with the URL can view
    5242880,                     -- 5 MB max per file
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;   -- idempotent: safe to re-run

-- RLS policy: only the owning user can upload/overwrite their own schedule PNG.
-- The file path convention is: {user_id}/schedule.png
CREATE POLICY "Users can upload their own schedule PNG"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'schedules'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own schedule PNG"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'schedules'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Schedule PNGs are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'schedules');

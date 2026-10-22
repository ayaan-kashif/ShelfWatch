-- Prisma metadata must not be exposed through the public Data API.
-- Migration connections own this table and retain access.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public._prisma_migrations FROM PUBLIC, anon, authenticated;
  END IF;
END $$;

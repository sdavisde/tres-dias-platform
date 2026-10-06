-- Track whether a community member is ordained clergy. Collected at signup,
-- editable on the profile and team info sheet, and used by the roster builder
-- (clergy cannot hold head or table leader positions). Existing users default
-- to false and are backfilled by hand.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_clergy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_clergy IS 'Whether the user is ordained clergy';

-- Copy is_clergy from signup metadata alongside the name and gender fields.
CREATE OR REPLACE FUNCTION "public"."sync_users"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.users (
      id,
      first_name,
      last_name,
      gender,
      is_clergy,
      email
    )
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data::jsonb)->>'first_name', ''),
      COALESCE((NEW.raw_user_meta_data::jsonb)->>'last_name', ''),
      COALESCE((NEW.raw_user_meta_data::jsonb)->>'gender', ''),
      COALESCE(((NEW.raw_user_meta_data::jsonb)->>'is_clergy')::boolean, false),
      NEW.email
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE((NEW.raw_user_meta_data::jsonb)->>'first_name', ''),
      last_name = COALESCE((NEW.raw_user_meta_data::jsonb)->>'last_name', ''),
      gender = COALESCE((NEW.raw_user_meta_data::jsonb)->>'gender', ''),
      is_clergy = COALESCE(((NEW.raw_user_meta_data::jsonb)->>'is_clergy')::boolean, false),
      email = NEW.email;
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;$$;

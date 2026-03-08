-- Create addresses table for multiple saved addresses per user
CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    label text DEFAULT 'Home',
    name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    country text NOT NULL DEFAULT 'India',
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_addresses_user_id ON public.addresses(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.addresses
        SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_address
    BEFORE INSERT OR UPDATE ON public.addresses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_address();

-- Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Users can manage their own addresses
CREATE POLICY "Users can view own addresses" ON public.addresses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.addresses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.addresses
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.addresses
    FOR DELETE USING (auth.uid() = user_id);

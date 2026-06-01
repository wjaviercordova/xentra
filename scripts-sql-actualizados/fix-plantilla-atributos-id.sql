-- Fix rápido: Agregar columna faltante plantilla_atributos_id
-- Ejecutar en el Editor SQL de Supabase

ALTER TABLE public.variantes 
ADD COLUMN IF NOT EXISTS plantilla_atributos_id UUID REFERENCES public.plantillas_atributos(id);

COMMENT ON COLUMN public.variantes.plantilla_atributos_id IS 'Plantilla de atributos específica utilizada para esta variante';

-- Verificar que se creó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'variantes' AND column_name = 'plantilla_atributos_id';
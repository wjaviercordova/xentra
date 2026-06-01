-- Verificar estructura de tabla categorias
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categorias' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
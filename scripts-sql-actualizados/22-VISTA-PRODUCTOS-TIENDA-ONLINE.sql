-- =====================================================
-- XENTRA - Vista / consulta para Tienda Online
-- Devuelve portada + galeria web filtrada desde productos
-- =====================================================

-- Recomendacion:
-- 1) Ejecuta primero el script 21 corregido para sincronizar imagen_url
-- 2) Luego crea esta vista para consumo directo desde tienda online

CREATE OR REPLACE VIEW public.v_productos_tienda_online AS
SELECT
  p.id,
  p.empresa_id,
  p.categoria_id,
  p.codigo,
  p.nombre,
  p.descripcion,
  p.marca,
  p.slug,
  p.precio_venta,
  p.imagen_url AS imagen_portada,
  p.orden_visualizacion,
  p.activo,
  p.created_at,
  p.updated_at,
  (
    SELECT jsonb_agg(img ORDER BY (img->>'orden')::int)
    FROM jsonb_array_elements(COALESCE(p.imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'activo_en_web')::boolean, false) = true
  ) AS imagenes_web,
  (
    SELECT jsonb_agg(img ORDER BY (img->>'orden')::int)
    FROM jsonb_array_elements(COALESCE(p.imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'activo_en_web')::boolean, false) = true
      AND (img->>'categoria') = 'promocion_temporada'
  ) AS imagenes_promocion,
  (
    SELECT jsonb_agg(img ORDER BY (img->>'orden')::int)
    FROM jsonb_array_elements(COALESCE(p.imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'activo_en_web')::boolean, false) = true
      AND (img->>'categoria') = 'galeria_tienda'
  ) AS imagenes_catalogo
FROM public.productos p
WHERE p.activo = true;

COMMENT ON VIEW public.v_productos_tienda_online IS
'Vista para e-commerce. Entrega imagen_portada e imagenes_web filtradas desde imagenes_galeria.';

-- =====================================================
-- Consulta ejemplo por slug
-- =====================================================
-- SELECT *
-- FROM public.v_productos_tienda_online
-- WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
--   AND slug = 'colchon-imperial-premium';

-- =====================================================
-- Consulta ejemplo listado catalogo
-- =====================================================
-- SELECT id, codigo, nombre, slug, precio_venta, imagen_portada, imagenes_catalogo
-- FROM public.v_productos_tienda_online
-- WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
-- ORDER BY orden_visualizacion DESC, created_at DESC;

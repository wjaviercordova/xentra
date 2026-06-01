-- =====================================================
-- XENTRA - Backfill demo para productos e-commerce
-- Completa: slug, imagenes_galeria, orden_visualizacion
-- =====================================================

-- Caracteristicas:
-- 1) Idempotente: se puede ejecutar varias veces
-- 2) No pisa datos ya definidos manualmente
-- 3) Aplica solo a empresa y codigos indicados

BEGIN;

WITH demo_data AS (
  SELECT *
  FROM (
    VALUES
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'COL001'::varchar,
        'colchon-imperial-premium'::varchar,
        '[
          {"url": "https://cdn-demo.xentra.app/productos-galeria/colchon-imperial-premium/01-principal.webp", "alt": "Colchon Imperial vista principal", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 1, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/colchon-imperial-premium/02-lateral.webp", "alt": "Colchon Imperial vista lateral", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 2, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/colchon-imperial-premium/03-estructura-interna.webp", "alt": "Colchon Imperial corte interno", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 3, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/colchon-imperial-premium/04-promocion-invierno.webp", "alt": "Promocion de temporada Colchon Imperial", "categoria": "promocion_temporada", "activo_en_web": true, "activo_en_erp": true, "orden": 4, "temporada": "invierno", "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/colchon-imperial-premium/05-empaque.webp", "alt": "Colchon Imperial empaque de bodega", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 5, "temporada": null, "es_portada": false}
        ]'::jsonb,
        100
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'CAM001'::varchar,
        'cama-tapizada-fiore'::varchar,
        '[
          {"url": "https://cdn-demo.xentra.app/productos-galeria/cama-tapizada-fiore/01-principal.webp", "alt": "Cama Tapizada Fiore vista principal", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 1, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/cama-tapizada-fiore/02-cabecero.webp", "alt": "Detalle del cabecero de la cama Fiore", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 2, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/cama-tapizada-fiore/03-base.webp", "alt": "Base estructural de la cama Fiore", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 3, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/cama-tapizada-fiore/04-promocion-hogar.webp", "alt": "Campana hogar para cama Fiore", "categoria": "promocion_temporada", "activo_en_web": true, "activo_en_erp": true, "orden": 4, "temporada": "hogar", "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/cama-tapizada-fiore/05-ambiente.webp", "alt": "Cama Fiore ambientada en dormitorio", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 5, "temporada": null, "es_portada": false}
        ]'::jsonb,
        90
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ALM001'::varchar,
        'almohada-memory-foam-confort'::varchar,
        '[
          {"url": "https://cdn-demo.xentra.app/productos-galeria/almohada-memory-foam-confort/01-principal.webp", "alt": "Almohada Memory Foam vista principal", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 1, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/almohada-memory-foam-confort/02-perfil.webp", "alt": "Perfil lateral de almohada Memory Foam", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 2, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/almohada-memory-foam-confort/03-nucleo.webp", "alt": "Nucleo interno de la almohada", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 3, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/almohada-memory-foam-confort/04-promocion-descanso.webp", "alt": "Promocion descanso de la almohada", "categoria": "promocion_temporada", "activo_en_web": true, "activo_en_erp": true, "orden": 4, "temporada": "descanso", "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/almohada-memory-foam-confort/05-empaque.webp", "alt": "Empaque tecnico de almohada", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 5, "temporada": null, "es_portada": false}
        ]'::jsonb,
        80
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ESB001'::varchar,
        'esponja-blanca-densidad-media'::varchar,
        '[
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-blanca-densidad-media/01-principal.webp", "alt": "Esponja Blanca vista principal", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 1, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-blanca-densidad-media/02-textura.webp", "alt": "Detalle de textura de Esponja Blanca", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 2, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-blanca-densidad-media/03-corte.webp", "alt": "Corte tecnico de Esponja Blanca", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 3, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-blanca-densidad-media/04-promocion-fabrica.webp", "alt": "Promocion fabrica de Esponja Blanca", "categoria": "promocion_temporada", "activo_en_web": true, "activo_en_erp": true, "orden": 4, "temporada": "fabrica", "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-blanca-densidad-media/05-medidas.webp", "alt": "Ficha tecnica de medidas de Esponja Blanca", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 5, "temporada": null, "es_portada": false}
        ]'::jsonb,
        70
      ),
      (
        '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid,
        'ESN001'::varchar,
        'esponja-negra-alta-densidad'::varchar,
        '[
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-negra-alta-densidad/01-principal.webp", "alt": "Esponja Negra vista principal", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 1, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-negra-alta-densidad/02-textura.webp", "alt": "Textura de Esponja Negra", "categoria": "galeria_tienda", "activo_en_web": true, "activo_en_erp": true, "orden": 2, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-negra-alta-densidad/03-corte.webp", "alt": "Corte tecnico de Esponja Negra", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 3, "temporada": null, "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-negra-alta-densidad/04-promocion-industrial.webp", "alt": "Promocion industrial de Esponja Negra", "categoria": "promocion_temporada", "activo_en_web": true, "activo_en_erp": true, "orden": 4, "temporada": "industrial", "es_portada": false},
          {"url": "https://cdn-demo.xentra.app/productos-galeria/esponja-negra-alta-densidad/05-medidas.webp", "alt": "Ficha tecnica de medidas de Esponja Negra", "categoria": "inventario_tecnico", "activo_en_web": false, "activo_en_erp": true, "orden": 5, "temporada": null, "es_portada": false}
        ]'::jsonb,
        60
      )
  ) AS x(empresa_id, codigo, slug, imagenes_galeria, orden_visualizacion)
)
UPDATE public.productos p
SET
  slug = COALESCE(NULLIF(p.slug, ''), d.slug),
  imagenes_galeria = CASE
    WHEN p.imagenes_galeria IS NULL OR p.imagenes_galeria = '[]'::jsonb
      THEN d.imagenes_galeria
    ELSE p.imagenes_galeria
  END,
  orden_visualizacion = CASE
    WHEN COALESCE(p.orden_visualizacion, 0) = 0
      THEN d.orden_visualizacion
    ELSE p.orden_visualizacion
  END,
  updated_at = NOW()
FROM demo_data d
WHERE p.empresa_id = d.empresa_id
  AND p.codigo = d.codigo;

COMMIT;

-- =====================================================
-- Verificacion posterior
-- =====================================================
SELECT
  codigo,
  nombre,
  slug,
  jsonb_array_length(COALESCE(imagenes_galeria, '[]'::jsonb)) AS total_imagenes,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(COALESCE(imagenes_galeria, '[]'::jsonb)) AS img
    WHERE COALESCE((img->>'activo_en_web')::boolean, false) = true
  ) AS imagenes_web,
  orden_visualizacion
FROM public.productos
WHERE empresa_id = '70330390-9e39-4662-8f9e-97e1a2e16342'::uuid
  AND codigo IN ('COL001', 'CAM001', 'ALM001', 'ESB001', 'ESN001')
ORDER BY orden_visualizacion DESC, codigo;

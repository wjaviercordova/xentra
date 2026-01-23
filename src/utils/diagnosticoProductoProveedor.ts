import { supabase } from './supabase'

export async function diagnosticoProductoProveedor() {
  console.log('🔍 Iniciando diagnóstico de relación Producto-Proveedor...')
  
  try {
    // 1. Verificar esquema de productos
    console.log('\n1. Verificando esquema de tabla productos...')
    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('*')
      .limit(1)
    
    if (errorProductos) {
      console.error('❌ Error consultando productos:', errorProductos)
      return
    }
    
    if (productos && productos.length > 0) {
      console.log('✅ Esquema productos:', Object.keys(productos[0]))
      console.log('✅ Tiene proveedor_id:', 'proveedor_id' in productos[0])
    }
    
    // 2. Verificar proveedores disponibles
    console.log('\n2. Verificando proveedores disponibles...')
    const { data: proveedores, error: errorProveedores } = await supabase
      .from('proveedores')
      .select('id, nombre')
    
    if (errorProveedores) {
      console.error('❌ Error consultando proveedores:', errorProveedores)
    } else {
      console.log('✅ Proveedores disponibles:', proveedores?.length)
      proveedores?.forEach(p => console.log(`   - ${p.nombre} (ID: ${p.id})`))
    }
    
    // 3. Verificar productos con proveedor
    console.log('\n3. Verificando productos con relación a proveedor...')
    const { data: productosConProveedor, error: errorRelacion } = await supabase
      .from('productos')
      .select(`
        id,
        nombre,
        proveedor_id,
        proveedores:proveedor_id (
          id,
          nombre
        )
      `)
    
    if (errorRelacion) {
      console.error('❌ Error consultando relación:', errorRelacion)
    } else {
      console.log('✅ Productos con proveedor:', productosConProveedor?.length)
      productosConProveedor?.forEach(p => {
        console.log(`   - ${p.nombre}:`, p.proveedores ? p.proveedores.nombre : 'Sin proveedor')
      })
    }
    
    // 4. Test de INSERT con proveedor
    console.log('\n4. Simulando creación de producto con proveedor...')
    if (proveedores && proveedores.length > 0) {
      const testProducto = {
        nombre: 'PRODUCTO_TEST_DIAGNOSTICO',
        codigo: 'TEST_' + Date.now(),
        categoria_id: 1, // Asumiendo que existe categoría 1
        proveedor_id: proveedores[0].id,
        precio_compra: 100,
        precio_venta: 150,
        stock_actual: 10,
        activo: true,
        empresa_id: 1 // Ajustar según el ID de empresa actual
      }
      
      console.log('Datos del test:', testProducto)
      
      // Nota: No ejecutamos el INSERT real para evitar datos de prueba
      console.log('⚠️  INSERT no ejecutado (solo simulación)')
    }
    
    console.log('\n✅ Diagnóstico completado')
    
  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Función para limpiar productos de prueba
export async function limpiarProductosPrueba() {
  try {
    const { error } = await supabase
      .from('productos')
      .delete()
      .like('nombre', '%TEST_DIAGNOSTICO%')
    
    if (error) {
      console.error('Error limpiando productos de prueba:', error)
    } else {
      console.log('✅ Productos de prueba eliminados')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}
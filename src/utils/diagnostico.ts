// =====================================================
// XENTRA - Utilidad de Diagnóstico de Datos
// =====================================================

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores'

export const diagnosticarDatos = async () => {
  const { empresaActual, user } = useAuthStore.getState()
  
  console.log('🔍 === DIAGNÓSTICO DE DATOS XENTRA ===')
  console.log('👤 Usuario actual:', user?.email)
  console.log('🏢 Empresa actual:', empresaActual)
  console.log('📊 Empresa ID:', empresaActual?.id)
  
  if (!empresaActual?.id) {
    console.error('❌ No hay empresa activa')
    return
  }

  try {
    // 1. Verificar categorías
    console.log('\n📂 === VERIFICANDO CATEGORÍAS ===')
    const { data: categorias, error: errorCategorias } = await supabase
      .from('categorias')
      .select('*')
      .eq('empresa_id', empresaActual.id)
    
    if (errorCategorias) {
      console.error('❌ Error consultando categorías:', errorCategorias)
    } else {
      console.log(`✅ Categorías encontradas: ${categorias?.length || 0}`)
      categorias?.forEach(cat => {
        console.log(`   - ${cat.nombre} (ID: ${cat.id})`)
      })
    }

    // 2. Verificar productos
    console.log('\n📦 === VERIFICANDO PRODUCTOS ===')
    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(nombre)
      `)
      .eq('empresa_id', empresaActual.id)
    
    if (errorProductos) {
      console.error('❌ Error consultando productos:', errorProductos)
    } else {
      console.log(`✅ Productos encontrados: ${productos?.length || 0}`)
      productos?.forEach(prod => {
        console.log(`   - ${prod.codigo}: ${prod.nombre} (Categoría: ${prod.categoria?.nombre || 'Sin categoría'})`)
      })
    }

    // 3. Verificar variantes
    console.log('\n🏷️ === VERIFICANDO VARIANTES ===')
    const { data: variantes, error: errorVariantes } = await supabase
      .from('variantes')
      .select(`
        *,
        producto:productos(codigo, nombre)
      `)
      .eq('empresa_id', empresaActual.id)
    
    if (errorVariantes) {
      console.error('❌ Error consultando variantes:', errorVariantes)
    } else {
      console.log(`✅ Variantes encontradas: ${variantes?.length || 0}`)
      variantes?.forEach(var_ => {
        console.log(`   - ${var_.sku}: ${var_.nombre} (Producto: ${var_.producto?.codigo})`)
      })
    }

    // 4. Verificar todas las empresas (para debug)
    console.log('\n🏢 === VERIFICANDO TODAS LAS EMPRESAS ===')
    const { data: todasEmpresas, error: errorEmpresas } = await supabase
      .from('empresas')
      .select('id, nombre')
    
    if (errorEmpresas) {
      console.error('❌ Error consultando empresas:', errorEmpresas)
    } else {
      console.log(`✅ Total empresas en BD: ${todasEmpresas?.length || 0}`)
      todasEmpresas?.forEach(emp => {
        console.log(`   - ${emp.nombre} (ID: ${emp.id})`)
      })
    }

    // 5. Verificar datos huérfanos (sin empresa_id correcto)
    console.log('\n🔍 === VERIFICANDO DATOS HUÉRFANOS ===')
    
    const { data: categoriasHuerfanas } = await supabase
      .from('categorias')
      .select('*')
      .neq('empresa_id', empresaActual.id)
    
    console.log(`⚠️ Categorías con otro empresa_id: ${categoriasHuerfanas?.length || 0}`)
    categoriasHuerfanas?.forEach(cat => {
      console.log(`   - ${cat.nombre} (empresa_id: ${cat.empresa_id})`)
    })

    const { data: productosHuerfanos } = await supabase
      .from('productos')
      .select('*')
      .neq('empresa_id', empresaActual.id)
    
    console.log(`⚠️ Productos con otro empresa_id: ${productosHuerfanos?.length || 0}`)
    productosHuerfanos?.forEach(prod => {
      console.log(`   - ${prod.nombre} (empresa_id: ${prod.empresa_id})`)
    })

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
  }
  
  console.log('\n🔚 === FIN DEL DIAGNÓSTICO ===')
}

// Función para reasignar datos huérfanos a la empresa actual
export const reasignarDatosHuerfanos = async () => {
  const { empresaActual } = useAuthStore.getState()
  
  if (!empresaActual?.id) {
    console.error('❌ No hay empresa activa')
    return false
  }

  console.log('🔄 Reasignando datos huérfanos...')

  try {
    // Reasignar categorías huérfanas
    const { data: categoriasHuerfanas } = await supabase
      .from('categorias')
      .select('*')
      .neq('empresa_id', empresaActual.id)

    if (categoriasHuerfanas && categoriasHuerfanas.length > 0) {
      const { error: errorCategorias } = await supabase
        .from('categorias')
        .update({ empresa_id: empresaActual.id })
        .neq('empresa_id', empresaActual.id)

      if (errorCategorias) {
        console.error('❌ Error reasignando categorías:', errorCategorias)
      } else {
        console.log(`✅ Reasignadas ${categoriasHuerfanas.length} categorías`)
      }
    }

    // Reasignar productos huérfanos
    const { data: productosHuerfanos } = await supabase
      .from('productos')
      .select('*')
      .neq('empresa_id', empresaActual.id)

    if (productosHuerfanos && productosHuerfanos.length > 0) {
      const { error: errorProductos } = await supabase
        .from('productos')
        .update({ empresa_id: empresaActual.id })
        .neq('empresa_id', empresaActual.id)

      if (errorProductos) {
        console.error('❌ Error reasignando productos:', errorProductos)
      } else {
        console.log(`✅ Reasignados ${productosHuerfanos.length} productos`)
      }
    }

    // Reasignar variantes huérfanas
    const { data: variantesHuerfanas } = await supabase
      .from('variantes')
      .select('*')
      .neq('empresa_id', empresaActual.id)

    if (variantesHuerfanas && variantesHuerfanas.length > 0) {
      const { error: errorVariantes } = await supabase
        .from('variantes')
        .update({ empresa_id: empresaActual.id })
        .neq('empresa_id', empresaActual.id)

      if (errorVariantes) {
        console.error('❌ Error reasignando variantes:', errorVariantes)
      } else {
        console.log(`✅ Reasignadas ${variantesHuerfanas.length} variantes`)
      }
    }

    console.log('✅ Reasignación completada')
    return true

  } catch (error) {
    console.error('❌ Error en reasignación:', error)
    return false
  }
}

// Hacer funciones disponibles globalmente en desarrollo
if (typeof window !== 'undefined') {
  (window as any).diagnosticarDatos = diagnosticarDatos
  (window as any).reasignarDatosHuerfanos = reasignarDatosHuerfanos
  
  // Función para forzar re-inicialización
  (window as any).reinicializarSesion = async () => {
    console.log('🔄 Forzando re-inicialización...')
    
    // Limpiar localStorage
    localStorage.removeItem('xentra-auth-storage')
    
    // Obtener store y re-inicializar
    const { inicializar } = useAuthStore.getState()
    await inicializar()
    
    console.log('✅ Re-inicialización completada')
  }
}
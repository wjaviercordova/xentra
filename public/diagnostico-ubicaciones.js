// Ejecutar en la consola del navegador para diagnosticar y corregir ubicaciones
async function diagnosticarUbicaciones() {
  const { supabase } = await import('./src/lib/supabase.js')
  
  console.log('🔍 === DIAGNÓSTICO DE UBICACIONES ===')
  
  try {
    // 1. Consultar todas las ubicaciones
    const { data: ubicaciones, error } = await supabase
      .from('ubicaciones')
      .select('*')
      .order('empresa_id, created_at')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📍 Total ubicaciones: ${ubicaciones.length}`)
    
    // 2. Analizar por empresa
    const empresas = new Map()
    ubicaciones.forEach(ub => {
      if (!empresas.has(ub.empresa_id)) {
        empresas.set(ub.empresa_id, [])
      }
      empresas.get(ub.empresa_id).push(ub)
    })
    
    console.log(`🏢 Empresas con ubicaciones: ${empresas.size}`)
    
    // 3. Verificar ubicaciones principales
    for (let [empresaId, ubicacionesEmpresa] of empresas) {
      const principales = ubicacionesEmpresa.filter(ub => ub.es_principal === true)
      const noDefinidas = ubicacionesEmpresa.filter(ub => ub.es_principal === false)
      const nulas = ubicacionesEmpresa.filter(ub => ub.es_principal === null)
      
      console.log(`\n🏢 Empresa: ${empresaId}`)
      console.log(`   📍 Total ubicaciones: ${ubicacionesEmpresa.length}`)
      console.log(`   ⭐ Principales (true): ${principales.length}`)
      console.log(`   ➖ No principales (false): ${noDefinidas.length}`)
      console.log(`   ❓ Indefinidas (null): ${nulas.length}`)
      
      // Mostrar detalles
      ubicacionesEmpresa.forEach(ub => {
        const estado = ub.es_principal === true ? '⭐ PRINCIPAL' : 
                      ub.es_principal === false ? '➖ No principal' : 
                      '❓ Indefinida'
        console.log(`      - ${ub.nombre} (${estado})`)
      })
    }
    
    console.log('\n✅ Diagnóstico completado')
    return ubicaciones
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Función para limpiar ubicaciones problemáticas
async function corregirUbicaciones() {
  const { supabase } = await import('./src/lib/supabase.js')
  
  console.log('🔧 === CORRECCIÓN DE UBICACIONES ===')
  
  try {
    // 1. Cambiar todos los false a null para evitar conflictos
    console.log('1️⃣ Cambiando es_principal=false a null...')
    const { error: errorUpdate } = await supabase
      .from('ubicaciones')
      .update({ es_principal: null })
      .eq('es_principal', false)
    
    if (errorUpdate) {
      console.error('❌ Error actualizando:', errorUpdate)
    } else {
      console.log('✅ Ubicaciones no principales actualizadas a null')
    }
    
    // 2. Verificar resultado
    await diagnosticarUbicaciones()
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

console.log('🛠️  Funciones disponibles:')
console.log('   diagnosticarUbicaciones() - Para ver el estado actual')
console.log('   corregirUbicaciones() - Para corregir el problema')
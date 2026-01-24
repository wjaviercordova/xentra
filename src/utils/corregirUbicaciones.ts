import { supabase } from './supabase'

export async function corregirRestriccionUbicaciones() {
  console.log('🔧 Corrigiendo restricción de ubicaciones principales...')
  
  try {
    // 1. Obtener información actual
    console.log('\n1️⃣ Consultando ubicaciones actuales...')
    const { data: ubicaciones, error: errorConsulta } = await supabase
      .from('ubicaciones')
      .select('id, empresa_id, nombre, es_principal')
      .order('empresa_id, created_at')
    
    if (errorConsulta) {
      console.error('Error consultando ubicaciones:', errorConsulta)
      return false
    }
    
    console.log(`✅ Se encontraron ${ubicaciones?.length || 0} ubicaciones`)
    
    // 2. Analizar ubicaciones principales por empresa
    const empresasConPrincipales = new Map()
    ubicaciones?.forEach(ub => {
      if (!empresasConPrincipales.has(ub.empresa_id)) {
        empresasConPrincipales.set(ub.empresa_id, [])
      }
      if (ub.es_principal) {
        empresasConPrincipales.get(ub.empresa_id).push(ub)
      }
    })
    
    console.log('\n2️⃣ Analizando ubicaciones principales por empresa...')
    for (let [empresaId, principales] of empresasConPrincipales) {
      console.log(`   Empresa ${empresaId}: ${principales.length} principales`)
      if (principales.length > 1) {
        console.log('   ⚠️  Múltiples ubicaciones principales detectadas')
        // Mantener solo la primera, desmarcar las demás
        for (let i = 1; i < principales.length; i++) {
          console.log(`   🔄 Desmarcando "${principales[i].nombre}" como no principal`)
          const { error: errorUpdate } = await supabase
            .from('ubicaciones')
            .update({ es_principal: false })
            .eq('id', principales[i].id)
          
          if (errorUpdate) {
            console.error('   ❌ Error:', errorUpdate)
          } else {
            console.log('   ✅ Corregido')
          }
        }
      }
    }
    
    console.log('\n3️⃣ Verificando corrección...')
    const { data: ubicacionesCorregidas } = await supabase
      .from('ubicaciones')
      .select('empresa_id, es_principal')
      .eq('es_principal', true)
    
    const empresasConMultiplesPrincipales = new Set()
    ubicacionesCorregidas?.forEach(ub => {
      if (empresasConMultiplesPrincipales.has(ub.empresa_id)) {
        console.error(`❌ Todavía hay múltiples principales en empresa: ${ub.empresa_id}`)
      } else {
        empresasConMultiplesPrincipales.add(ub.empresa_id)
      }
    })
    
    console.log(`✅ Corrección completada. ${empresasConMultiplesPrincipales.size} empresas con ubicación principal única.`)
    return true
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return false
  }
}
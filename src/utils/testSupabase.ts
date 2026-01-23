// Test de conexión a Supabase
import { supabase } from '../lib/supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Probando conexión a Supabase...')
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('ANON KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    
    // Test simple de conexión
    const { data, error } = await supabase
      .from('empresas')
      .select('count(*)', { count: 'exact' })
      .limit(1)
    
    if (error) {
      console.error('❌ Error conectando a Supabase:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Conexión exitosa a Supabase')
    console.log('Datos:', data)
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ Error general:', error)
    return { success: false, error: error.message }
  }
}

// Test de autenticación
export const testSupabaseAuth = async (email: string, password: string) => {
  try {
    console.log('🔐 Probando autenticación...')
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ Error de autenticación:', error)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Autenticación exitosa')
    console.log('Usuario:', data.user?.email)
    return { success: true, user: data.user }
    
  } catch (error) {
    console.error('❌ Error general de auth:', error)
    return { success: false, error: error.message }
  }
}
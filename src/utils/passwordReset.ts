// Utilidad para resetear contraseña de usuario
import { supabase } from '../lib/supabase'

export const resetUserPassword = async (email: string, newPassword: string) => {
  try {
    console.log('🔄 Reseteando contraseña para:', email)
    
    // Esto enviará un email de reset de contraseña
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/reset-password'
    })
    
    if (error) {
      console.error('❌ Error enviando reset:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Email de reset enviado exitosamente')
    return { success: true, message: 'Email de reset enviado' }
    
  } catch (error: any) {
    console.error('❌ Error general:', error)
    return { success: false, error: error.message }
  }
}

// Función para cambiar contraseña directamente (solo para desarrollo)
export const updatePasswordDirect = async (newPassword: string) => {
  try {
    console.log('🔐 Actualizando contraseña directamente...')
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      console.error('❌ Error actualizando contraseña:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log('✅ Contraseña actualizada exitosamente')
    return { success: true, message: 'Contraseña actualizada' }
    
  } catch (error: any) {
    console.error('❌ Error general:', error)
    return { success: false, error: error.message }
  }
}
// Verificador de variables de entorno
console.log('🔧 VERIFICANDO VARIABLES DE ENTORNO:')
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')

// Verificar que las URLs coincidan
const expectedUrl = 'https://szheqarnqtfkbdoyozca.supabase.co'
const currentUrl = import.meta.env.VITE_SUPABASE_URL

if (currentUrl === expectedUrl) {
  console.log('✅ URL de Supabase correcta')
} else {
  console.error('❌ URL de Supabase incorrecta!')
  console.error('Esperada:', expectedUrl)
  console.error('Actual:', currentUrl)
}

export {}
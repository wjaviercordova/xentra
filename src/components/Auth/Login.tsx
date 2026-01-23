// =====================================================
// XENTRA - Componente de Login/Autenticación
// =====================================================

import React, { useState } from 'react'
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Container,
  Group,
  Alert,
  Divider
} from '@mantine/core'
import { IconAlertCircle, IconLogin, IconUserPlus } from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { testSupabaseConnection, testSupabaseAuth } from '@/utils/testSupabase'

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Estados del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  
  const { inicializar } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('🚀 Iniciando login con credenciales:', email)
      console.log('🌐 URL Supabase:', import.meta.env.VITE_SUPABASE_URL)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Error de autenticación:', error)
        throw error
      }

      console.log('✅ Login exitoso:', data.user?.email)
      
      // Inicializar datos del usuario
      console.log('📊 Inicializando datos del usuario...')
      await inicializar()
      
    } catch (error: any) {
      console.error('❌ Error en login:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Registrar usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setError('Cuenta creada. Revisa tu email para confirmar la cuenta.')
        setIsRegistering(false)
      }
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container size="xs" className="h-screen flex items-center justify-center">
      <Paper shadow="md" p="xl" radius="md" className="w-full">
        <div className="text-center mb-8">
          <Title order={1} color="blue" className="mb-2">
            XENTRA
          </Title>
          <Text color="dimmed" size="lg">
            Sistema de Gestión Comercial
          </Text>
        </div>

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className="space-y-4">
            {isRegistering && (
              <TextInput
                label="Nombre completo"
                placeholder="Tu nombre completo"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                required
              />
            )}

            <TextInput
              label="Email"
              placeholder="tu@email.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
              >
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              type="submit"
              loading={loading}
              leftSection={isRegistering ? <IconUserPlus size={16} /> : <IconLogin size={16} />}
              size="md"
            >
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </div>
        </form>

        <Divider className="my-6" />

        <Group justify="center">
          <Text size="sm" color="dimmed">
            {isRegistering ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          </Text>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError('')
            }}
          >
            {isRegistering ? 'Iniciar sesión' : 'Crear cuenta'}
          </Button>
        </Group>

        <div className="mt-8 text-center">
          <Text size="xs" color="dimmed">
            Sistema multi-empresarial para PyMEs
          </Text>
          <Text size="xs" color="dimmed">
            Version 1.0.0
          </Text>
        </div>
      </Paper>
    </Container>
  )
}

export default Login
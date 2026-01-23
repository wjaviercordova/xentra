// =====================================================
// XENTRA - Componente Principal de la App
// =====================================================

import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell, Loader, Center, Text } from '@mantine/core'
import { useAuthStore } from './stores'
import PuntoDeVenta from './components/POS/PuntoDeVenta'
import Login from './components/Auth/Login'
import Layout from './components/Layout/Layout'
import { 
  CategoriasManagement,
  ProveedoresManagement,
  ProductosManagement,
  VariantesManagement
} from './components/Mantenimiento'

const App: React.FC = () => {
  const { user, loading, inicializar } = useAuthStore()

  useEffect(() => {
    inicializar()
  }, [inicializar])

  // Mostrar loader mientras se inicializa
  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <div className="text-center">
          <Loader size="xl" />
          <Text size="lg" className="mt-4">
            Cargando Xentra...
          </Text>
        </div>
      </Center>
    )
  }

  // Si no hay usuario, mostrar login
  if (!user) {
    return <Login />
  }

  // App principal con rutas
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<PuntoDeVenta />} />
        
        {/* Módulos de Mantenimiento */}
        <Route path="/mantenimiento/categorias" element={<CategoriasManagement />} />
        <Route path="/mantenimiento/proveedores" element={<ProveedoresManagement />} />
        <Route path="/mantenimiento/productos" element={<ProductosManagement />} />
        <Route path="/mantenimiento/variantes" element={<VariantesManagement />} />
        
        {/* Otros módulos */}
        <Route path="/inventario" element={<div>Módulo de Inventario (Por implementar)</div>} />
        <Route path="/transferencias" element={<div>Módulo de Transferencias (Por implementar)</div>} />
        <Route path="/reportes" element={<div>Módulo de Reportes (Por implementar)</div>} />
        <Route path="/configuracion" element={<div>Configuración (Por implementar)</div>} />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
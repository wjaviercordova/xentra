// =====================================================
// XENTRA - Componente Principal de la App
// =====================================================

import React, { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell, Loader, Center, Text } from '@mantine/core'
import { useAuthStore } from './stores'
import PuntoDeVenta from './components/POS/PuntoDeVenta'
import Login from './components/Auth/Login'
import Layout from './components/Layout/Layout'
// Lazy loading de módulos para mejor rendimiento
const CategoriasManagement = lazy(() => import('./components/Mantenimiento/CategoriasManagement'))
const ProveedoresManagement = lazy(() => import('./components/Mantenimiento/ProveedoresManagement'))
const ProductosManagement = lazy(() => import('./components/Mantenimiento/ProductosManagement'))
const VariantesManagement = lazy(() => import('./components/Mantenimiento/VariantesManagement'))
const UbicacionesManagement = lazy(() => import('./components/Mantenimiento/UbicacionesManagement'))
const InventarioManagement = lazy(() => import('./components/Inventario/InventarioManagement'))
const MovimientosManagement = lazy(() => import('./components/Inventario/MovimientosManagement'))
const ReportesManagement = lazy(() => import('./components/Reportes/ReportesManagement'))
const GestorAtributosDinamicos = lazy(() => import('./components/Configuracion/GestorAtributosDinamicos'))
const ConfiguracionGeneral = lazy(() => import('./components/Configuracion/ConfiguracionGeneral'))

// Componente de loading reutilizable
const ModuleLoader = () => (
  <Center style={{ height: '50vh' }}>
    <div className="text-center">
      <Loader size="lg" />
      <Text size="lg" className="mt-4" c="dimmed">
        Cargando módulo...
      </Text>
    </div>
  </Center>
)

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
      <Suspense fallback={<ModuleLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<PuntoDeVenta />} />
          
          {/* Módulos de Mantenimiento con lazy loading */}
          <Route path="/mantenimiento/categorias" element={<CategoriasManagement />} />
          <Route path="/mantenimiento/proveedores" element={<ProveedoresManagement />} />
          <Route path="/mantenimiento/productos" element={<ProductosManagement />} />
          <Route path="/mantenimiento/variantes" element={<VariantesManagement />} />
          <Route path="/mantenimiento/ubicaciones" element={<UbicacionesManagement />} />
          
          {/* Módulo de Inventario */}
          <Route path="/stocks" element={<InventarioManagement />} />
          <Route path="/movimientos" element={<MovimientosManagement />} />
          <Route path="/transferencias" element={<div>Módulo de Transferencias (Por implementar)</div>} />
          <Route path="/reportes" element={<ReportesManagement />} />
          <Route path="/configuracion" element={<ConfiguracionGeneral />} />
          <Route path="/configuracion/empresa" element={<div>Módulo de Empresa (Por implementar)</div>} />
          <Route path="/configuracion/usuarios" element={<div>Módulo de Usuarios (Por implementar)</div>} />
          <Route path="/configuracion/atributos" element={<GestorAtributosDinamicos />} />
          <Route path="/configuracion/etiquetas" element={<div>Módulo de Etiquetas/Códigos (Por implementar)</div>} />
          <Route path="/configuracion/permisos" element={<div>Módulo de Permisos (Por implementar)</div>} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
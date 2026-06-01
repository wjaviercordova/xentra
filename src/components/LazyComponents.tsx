// =====================================================
// XENTRA - Lazy Loading Components
// =====================================================

import { lazy, Suspense } from 'react'
import { Loader, Center } from '@mantine/core'

// Lazy loading de módulos principales
export const CategoriasManagement = lazy(() => 
  import('./components/Mantenimiento/CategoriasManagement')
)

export const ProveedoresManagement = lazy(() => 
  import('./components/Mantenimiento/ProveedoresManagement')
)

export const ProductosManagement = lazy(() => 
  import('./components/Mantenimiento/ProductosManagement')
)

export const VariantesManagement = lazy(() => 
  import('./components/Mantenimiento/VariantesManagement')
)

export const UbicacionesManagement = lazy(() => 
  import('./components/Mantenimiento/UbicacionesManagement')
)

// Componente de loading reutilizable
export const ModuleLoader = () => (
  <Center style={{ height: '50vh' }}>
    <div className="text-center">
      <Loader size="lg" />
      <p className="mt-4 text-gray-600">Cargando módulo...</p>
    </div>
  </Center>
)

// HOC para wrappear componentes lazy
export const withLazyLoading = (Component: React.ComponentType) => {
  return (props: any) => (
    <Suspense fallback={<ModuleLoader />}>
      <Component {...props} />
    </Suspense>
  )
}
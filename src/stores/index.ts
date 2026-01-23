// =====================================================
// XENTRA - Store Global con Zustand
// Manejo de Estado: Empresa, Ubicación y Sesión Activa
// =====================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, type Empresa, type Ubicacion, type PerfilUsuario } from '@/lib/supabase'

interface AuthState {
  user: any | null
  perfil: PerfilUsuario | null
  empresa: Empresa | null
  empresaActual: Empresa | null  // Alias para compatibilidad
  ubicacionActiva: Ubicacion | null
  ubicaciones: Ubicacion[]
  loading: boolean
  
  // Acciones de autenticación
  setUser: (user: any) => void
  setPerfil: (perfil: PerfilUsuario | null) => void
  setEmpresa: (empresa: Empresa | null) => void
  setUbicacionActiva: (ubicacion: Ubicacion | null) => void
  setUbicaciones: (ubicaciones: Ubicacion[]) => void
  setLoading: (loading: boolean) => void
  
  // Acciones asíncronas
  inicializar: () => Promise<void>
  cambiarUbicacion: (ubicacionId: string) => Promise<void>
  cerrarSesion: () => Promise<void>
  limpiarDatos: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      perfil: null,
      empresa: null,
      empresaActual: null,  // Alias para compatibilidad
      ubicacionActiva: null,
      ubicaciones: [],
      loading: true,
      
      // Setters simples
      setUser: (user) => set({ user }),
      setPerfil: (perfil) => set({ perfil }),
      setEmpresa: (empresa) => set({ empresa, empresaActual: empresa }),  // Actualizar ambos
      setUbicacionActiva: (ubicacion) => set({ ubicacionActiva: ubicacion }),
      setUbicaciones: (ubicaciones) => set({ ubicaciones }),
      setLoading: (loading) => set({ loading }),
      
      // Inicializar datos del usuario autenticado
      inicializar: async () => {
        try {
          console.log('🔄 Iniciando proceso de inicialización...')
          set({ loading: true })
          
          // Obtener usuario actual
          console.log('1️⃣ Obteniendo usuario actual...')
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            console.error('❌ Error obteniendo usuario:', userError)
            set({ loading: false })
            return
          }
          
          console.log('✅ Usuario obtenido:', user.email)
          set({ user })
          
          // Obtener perfil del usuario
          console.log('2️⃣ Obteniendo perfil del usuario...')
          const { data: perfil, error: perfilError } = await supabase
            .from('perfiles_usuario')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (perfilError || !perfil) {
            console.error('❌ Error obteniendo perfil:', perfilError)
            console.log('🔍 Intentando buscar perfiles existentes...')
            
            // Buscar todos los perfiles para debug
            const { data: todosPerfiles } = await supabase
              .from('perfiles_usuario')
              .select('*')
            
            console.log('📊 Perfiles encontrados:', todosPerfiles)
            
            set({ loading: false })
            return
          }
          
          console.log('✅ Perfil obtenido:', perfil)
          set({ perfil })
          
          // Obtener empresa
          console.log('3️⃣ Obteniendo empresa...')
          const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', perfil.empresa_id)
            .single()
          
          if (empresaError || !empresa) {
            console.error('❌ Error obteniendo empresa:', empresaError)
            console.log('🔍 Buscando empresa con ID:', perfil.empresa_id)
            
            // Buscar todas las empresas para debug
            const { data: todasEmpresas } = await supabase
              .from('empresas')
              .select('*')
            
            console.log('📊 Empresas encontradas:', todasEmpresas)
            
            set({ loading: false })
            return
          }
          
          console.log('✅ Empresa obtenida:', empresa)
          set({ empresa, empresaActual: empresa })
          
          // Obtener ubicaciones de la empresa
          console.log('4️⃣ Obteniendo ubicaciones...')
          const { data: ubicaciones, error: ubicacionesError } = await supabase
            .from('ubicaciones')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('activo', true)
            .order('es_principal', { ascending: false })
            .order('nombre')
          
          if (ubicacionesError) {
            console.error('❌ Error obteniendo ubicaciones:', ubicacionesError)
            set({ loading: false })
            return
          }
          
          console.log('✅ Ubicaciones obtenidas:', ubicaciones)
          set({ ubicaciones: ubicaciones || [] })
          
          // Establecer ubicación activa
          console.log('5️⃣ Estableciendo ubicación activa...')
          const ubicacionPredeterminada = ubicaciones?.find(
            u => u.id === perfil.ubicacion_predeterminada_id
          ) || ubicaciones?.[0]
          
          if (ubicacionPredeterminada) {
            console.log('✅ Ubicación activa:', ubicacionPredeterminada.nombre)
            set({ ubicacionActiva: ubicacionPredeterminada })
          }
          
          // Actualizar último acceso
          console.log('6️⃣ Actualizando último acceso...')
          await supabase
            .from('perfiles_usuario')
            .update({ ultimo_acceso: new Date().toISOString() })
            .eq('id', user.id)
          
          console.log('🎉 Inicialización completada exitosamente!')
          
        } catch (error) {
          console.error('❌ Error inicializando sesión:', error)
        } finally {
          set({ loading: false })
        }
      },
      
      // Cambiar ubicación activa
      cambiarUbicacion: async (ubicacionId: string) => {
        const { ubicaciones } = get()
        const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
        
        if (ubicacion) {
          set({ ubicacionActiva: ubicacion })
          
          // Actualizar ubicación predeterminada del usuario
          const { user } = get()
          if (user) {
            await supabase
              .from('perfiles_usuario')
              .update({ ubicacion_predeterminada_id: ubicacionId })
              .eq('id', user.id)
          }
        }
      },
      
      // Cerrar sesión
      cerrarSesion: async () => {
        await supabase.auth.signOut()
        get().limpiarDatos()
      },
      
      // Limpiar todos los datos del store
      limpiarDatos: () => {
        set({
          user: null,
          perfil: null,
          empresa: null,
          empresaActual: null,
          ubicacionActiva: null,
          ubicaciones: [],
          loading: false
        })
      }
    }),
    {
      name: 'xentra-auth-storage',
      partialize: (state) => ({
        user: state.user,
        perfil: state.perfil,
        empresa: state.empresa,
        empresaActual: state.empresaActual,
        ubicacionActiva: state.ubicacionActiva,
        ubicaciones: state.ubicaciones
      })
    }
  )
)

// =====================================================
// Store para POS/Punto de Venta
// =====================================================

export interface ItemVenta {
  varianteId: string
  sku: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
  stock: number
}

interface POSState {
  items: ItemVenta[]
  total: number
  cliente: string
  documento: string
  loading: boolean
  
  // Acciones
  agregarItem: (variante: any, cantidad?: number) => void
  actualizarCantidad: (varianteId: string, cantidad: number) => void
  eliminarItem: (varianteId: string) => void
  limpiarVenta: () => void
  setCliente: (cliente: string) => void
  setDocumento: (documento: string) => void
  setLoading: (loading: boolean) => void
  
  // Cálculos
  calcularTotal: () => void
}

export const usePOSStore = create<POSState>((set, get) => ({
  // Estado inicial
  items: [],
  total: 0,
  cliente: '',
  documento: '',
  loading: false,
  
  // Agregar item al carrito
  agregarItem: (variante, cantidad = 1) => {
    const { items } = get()
    const itemExistente = items.find(i => i.varianteId === variante.id)
    
    if (itemExistente) {
      // Actualizar cantidad si ya existe
      get().actualizarCantidad(variante.id, itemExistente.cantidad + cantidad)
    } else {
      // Agregar nuevo item
      const nuevoItem: ItemVenta = {
        varianteId: variante.id,
        sku: variante.sku,
        nombre: variante.nombre,
        precio: variante.precio_venta || 0,
        cantidad,
        subtotal: (variante.precio_venta || 0) * cantidad,
        stock: variante.stock || 0
      }
      
      set({ items: [...items, nuevoItem] })
      get().calcularTotal()
    }
  },
  
  // Actualizar cantidad de un item
  actualizarCantidad: (varianteId, cantidad) => {
    if (cantidad <= 0) {
      get().eliminarItem(varianteId)
      return
    }
    
    set(state => ({
      items: state.items.map(item =>
        item.varianteId === varianteId
          ? { ...item, cantidad, subtotal: item.precio * cantidad }
          : item
      )
    }))
    get().calcularTotal()
  },
  
  // Eliminar item del carrito
  eliminarItem: (varianteId) => {
    set(state => ({
      items: state.items.filter(item => item.varianteId !== varianteId)
    }))
    get().calcularTotal()
  },
  
  // Limpiar toda la venta
  limpiarVenta: () => {
    set({
      items: [],
      total: 0,
      cliente: '',
      documento: ''
    })
  },
  
  setCliente: (cliente) => set({ cliente }),
  setDocumento: (documento) => set({ documento }),
  setLoading: (loading) => set({ loading }),
  
  // Calcular total de la venta
  calcularTotal: () => {
    const { items } = get()
    const total = items.reduce((sum, item) => sum + item.subtotal, 0)
    set({ total })
  }
}))

// =====================================================
// Store para manejo de inventario
// =====================================================

interface InventarioState {
  productos: any[]
  variantes: any[]
  stockActual: any[]
  filtros: {
    busqueda: string
    categoria: string
    activo: boolean
  }
  
  // Acciones
  setProductos: (productos: any[]) => void
  setVariantes: (variantes: any[]) => void
  setStockActual: (stock: any[]) => void
  setFiltros: (filtros: Partial<InventarioState['filtros']>) => void
  
  // Búsquedas
  buscarVariante: (termino: string) => any[]
}

export const useInventarioStore = create<InventarioState>((set, get) => ({
  productos: [],
  variantes: [],
  stockActual: [],
  filtros: {
    busqueda: '',
    categoria: '',
    activo: true
  },
  
  setProductos: (productos) => set({ productos }),
  setVariantes: (variantes) => set({ variantes }),
  setStockActual: (stock) => set({ stockActual: stock }),
  setFiltros: (filtros) => set(state => ({ 
    filtros: { ...state.filtros, ...filtros }
  })),
  
  // Buscar variantes por SKU o nombre
  buscarVariante: (termino: string) => {
    const { variantes, stockActual } = get()
    
    if (!termino.trim()) return []
    
    const terminoLower = termino.toLowerCase()
    
    return variantes
      .filter(v => 
        v.activo && (
          v.sku.toLowerCase().includes(terminoLower) ||
          v.nombre.toLowerCase().includes(terminoLower)
        )
      )
      .map(variante => {
        const stock = stockActual.find(s => s.variante_id === variante.id)
        return {
          ...variante,
          stock: stock?.cantidad_actual || 0,
          costo_promedio: stock?.costo_promedio || 0
        }
      })
      .slice(0, 10) // Limitar resultados para rendimiento
  }
}))
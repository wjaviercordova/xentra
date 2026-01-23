// =====================================================
// XENTRA - Configuración de Supabase Client
// =====================================================

import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// =====================================================
// TIPOS DE DATOS DE LA BASE DE DATOS
// =====================================================

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nombre: string
          ruc_nit: string | null
          direccion: string | null
          telefono: string | null
          email: string | null
          logo_url: string | null
          configuracion: any
          activo: boolean
          plan_suscripcion: string
          fecha_vencimiento: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>
      }
      ubicaciones: {
        Row: {
          id: string
          empresa_id: string
          nombre: string
          direccion: string | null
          telefono: string | null
          es_principal: boolean
          tipo: string
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ubicaciones']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ubicaciones']['Insert']>
      }
      perfiles_usuario: {
        Row: {
          id: string
          empresa_id: string
          nombre_completo: string
          telefono: string | null
          avatar_url: string | null
          rol: string
          ubicacion_predeterminada_id: string | null
          permisos: any
          activo: boolean
          ultimo_acceso: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['perfiles_usuario']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['perfiles_usuario']['Insert']>
      }
      productos: {
        Row: {
          id: string
          empresa_id: string
          categoria_id: string | null
          proveedor_id: string | null
          codigo: string
          nombre: string
          descripcion: string | null
          marca: string | null
          unidad_medida: string
          precio_compra: number
          precio_venta: number
          margen_ganancia: number
          tiene_variantes: boolean
          imagen_url: string | null
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['productos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['productos']['Insert']>
      }
      variantes: {
        Row: {
          id: string
          empresa_id: string
          producto_id: string
          sku: string
          nombre: string
          atributos: any
          precio_compra: number | null
          precio_venta: number | null
          stock_minimo: number
          stock_maximo: number
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['variantes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['variantes']['Insert']>
      }
      stock_actual: {
        Row: {
          id: string
          empresa_id: string
          variante_id: string
          ubicacion_id: string
          cantidad_actual: number
          costo_promedio: number
          fecha_ultima_actualizacion: string
        }
        Insert: Omit<Database['public']['Tables']['stock_actual']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['stock_actual']['Insert']>
      }
      motivos_movimiento: {
        Row: {
          id: string
          empresa_id: string
          codigo: string
          nombre: string
          es_adicion: boolean
          requiere_documento: boolean
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['motivos_movimiento']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['motivos_movimiento']['Insert']>
      }
      movimientos_cabecera: {
        Row: {
          id: string
          empresa_id: string
          ubicacion_id: string | null
          motivo_movimiento_id: string | null
          numero_documento: string | null
          referencia_documento: string | null
          observaciones: string | null
          total_documento: number
          usuario_id: string | null
          fecha_movimiento: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_cabecera']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['movimientos_cabecera']['Insert']>
      }
      movimientos_detalle: {
        Row: {
          id: string
          empresa_id: string
          movimiento_cabecera_id: string
          variante_id: string | null
          ubicacion_id: string | null
          cantidad: number
          precio_unitario: number
          subtotal: number
          observaciones: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimientos_detalle']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['movimientos_detalle']['Insert']>
      }
    }
  }
}

// Tipos específicos para el uso en la aplicación
export type Empresa = Database['public']['Tables']['empresas']['Row']
export type Ubicacion = Database['public']['Tables']['ubicaciones']['Row']
export type PerfilUsuario = Database['public']['Tables']['perfiles_usuario']['Row']
export type Producto = Database['public']['Tables']['productos']['Row']
export type Variante = Database['public']['Tables']['variantes']['Row']
export type StockActual = Database['public']['Tables']['stock_actual']['Row']
export type MotivoMovimiento = Database['public']['Tables']['motivos_movimiento']['Row']
export type MovimientoCabecera = Database['public']['Tables']['movimientos_cabecera']['Row']
export type MovimientoDetalle = Database['public']['Tables']['movimientos_detalle']['Row']

// Tipos para inserciones
export type EmpresaInsert = Database['public']['Tables']['empresas']['Insert']
export type UbicacionInsert = Database['public']['Tables']['ubicaciones']['Insert']
export type ProductoInsert = Database['public']['Tables']['productos']['Insert']
export type VarianteInsert = Database['public']['Tables']['variantes']['Insert']
// =====================================================
// XENTRA - Cache Manager para Supabase
// =====================================================

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live en milisegundos
}

class SupabaseCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  // Generar key única para cache
  private generateKey(table: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {} as Record<string, any>)
    
    return `${table}_${JSON.stringify(sortedParams)}`
  }

  // Verificar si cache es válido
  private isValid(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp < item.ttl
  }

  // Obtener del cache
  get<T>(table: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(table, params)
    const item = this.cache.get(key)
    
    if (item && this.isValid(item)) {
      console.log(`🎯 Cache HIT: ${key}`)
      return item.data
    }
    
    if (item) {
      this.cache.delete(key) // Limpiar cache expirado
    }
    
    console.log(`🔄 Cache MISS: ${key}`)
    return null
  }

  // Guardar en cache
  set<T>(table: string, data: T, params?: Record<string, any>, ttl = this.DEFAULT_TTL): void {
    const key = this.generateKey(table, params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    console.log(`💾 Cache SET: ${key}`)
  }

  // Invalidar cache específico
  invalidate(table: string, params?: Record<string, any>): void {
    const key = this.generateKey(table, params)
    if (this.cache.delete(key)) {
      console.log(`🗑️ Cache INVALIDATED: ${key}`)
    }
  }

  // Invalidar toda una tabla
  invalidateTable(table: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`${table}_`)
    )
    
    keysToDelete.forEach(key => this.cache.delete(key))
    console.log(`🗑️ Table cache INVALIDATED: ${table} (${keysToDelete.length} items)`)
  }

  // Limpiar cache completo
  clear(): void {
    this.cache.clear()
    console.log('🧹 Cache CLEARED')
  }

  // Obtener estadísticas de cache
  getStats() {
    const now = Date.now()
    const validItems = Array.from(this.cache.values()).filter(item => 
      this.isValid(item)
    ).length
    
    return {
      total: this.cache.size,
      valid: validItems,
      expired: this.cache.size - validItems
    }
  }
}

// Instancia singleton
export const supabaseCache = new SupabaseCache()

// Hook para usar cache con Supabase
export function useCachedQuery<T>(
  queryFn: () => Promise<T>,
  table: string,
  params?: Record<string, any>,
  ttl?: number
) {
  const cached = supabaseCache.get<T>(table, params)
  
  if (cached) {
    return Promise.resolve(cached)
  }
  
  return queryFn().then(data => {
    supabaseCache.set(table, data, params, ttl)
    return data
  })
}
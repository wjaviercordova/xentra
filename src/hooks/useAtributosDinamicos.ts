// =====================================================
// XENTRA - Hook para Generar Atributos Dinámicos
// =====================================================

import { useMemo } from 'react'

interface DefinicionAtributo {
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: string
  opciones_predefinidas?: string[]
  es_requerido: boolean
  unidad_medida?: string
  descripcion?: string
  validaciones?: any
}

interface AtributoGenerado {
  campo: string
  etiqueta: string
  valor: any
  es_requerido: boolean
  unidad?: string
}

// Generadores de atributos por sector
const generadoresAtributos = {
  hogar: {
    color: ["Blanco", "Beige", "Gris", "Negro", "Azul", "Verde", "Rojo", "Rosa", "Amarillo", "Marrón"],
    firmeza: ["Extra Suave", "Suave", "Media", "Firme", "Extra Firme"],
    material: ["Algodón", "Poliéster", "Lino", "Seda", "Microfibra", "Memory Foam", "Latex"],
    medida: "105x190", // Ejemplo por defecto
  },
  
  calzado: {
    talla: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
    color: ["Negro", "Marrón", "Blanco", "Gris", "Azul", "Rojo", "Verde"],
    tipo: ["Casual", "Deportivo", "Formal", "Botas", "Sandalias", "Tacones"],
    material: ["Cuero", "Sintético", "Tela", "Gamuza", "Charol"],
    genero: ["Hombre", "Mujer", "Unisex", "Niño", "Niña"],
  },
  
  textil: {
    talla: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
    color: ["Negro", "Blanco", "Azul", "Rojo", "Verde", "Amarillo", "Gris", "Rosa", "Morado"],
    material: ["Algodón", "Poliéster", "Lino", "Seda", "Lana", "Jean", "Lycra"],
    tipo: ["Casual", "Formal", "Deportivo", "Elegante"],
    genero: ["Hombre", "Mujer", "Unisex", "Niño", "Niña"],
    temporada: ["Primavera", "Verano", "Otoño", "Invierno", "Todo el año"],
  },
  
  tecnologia: {
    marca: ["HP", "Dell", "Lenovo", "Asus", "Apple", "Samsung", "LG", "Sony"],
    color: ["Negro", "Blanco", "Plata", "Gris", "Azul"],
    procesador: ["Intel Core i3", "Intel Core i5", "Intel Core i7", "Intel Core i9", "AMD Ryzen 3", "AMD Ryzen 5", "AMD Ryzen 7"],
    ram: ["4GB", "8GB", "16GB", "32GB", "64GB"],
    almacenamiento: ["128GB SSD", "256GB SSD", "512GB SSD", "1TB SSD", "1TB HDD", "2TB HDD"],
    pantalla: ["13.3 pulgadas", "14 pulgadas", "15.6 pulgadas", "17.3 pulgadas"],
    sistema_operativo: ["Windows 11", "Windows 10", "macOS", "Linux", "Sin SO"],
  },
  
  alimenticio: {
    sabor: ["Original", "Chocolate", "Vainilla", "Fresa", "Limón", "Naranja"],
    presentacion: ["Botella", "Lata", "Caja", "Bolsa", "Frasco", "Sobre"],
    peso_neto: "500g", // Ejemplo
    tipo: ["Dulce", "Salado", "Picante", "Ácido", "Neutro"],
    conservacion: ["Refrigerado", "Congelado", "Ambiente", "Seco"],
    origen: ["Nacional", "Importado"],
  },
  
  salud: {
    tipo: ["Crema", "Loción", "Gel", "Spray", "Cápsulas", "Tabletas"],
    presentacion: ["50ml", "100ml", "200ml", "500ml", "10 unidades", "30 unidades"],
    para: ["Piel grasa", "Piel seca", "Piel mixta", "Todo tipo de piel"],
    genero: ["Hombre", "Mujer", "Unisex"],
    edad: ["Adulto", "Joven", "Niño", "Bebé", "Todas las edades"],
  },
  
  deportes: {
    deporte: ["Fútbol", "Basketball", "Tennis", "Running", "Gym", "Natación", "Ciclismo"],
    nivel: ["Principiante", "Intermedio", "Avanzado", "Profesional"],
    genero: ["Hombre", "Mujer", "Unisex", "Niño", "Niña"],
    talla: ["XS", "S", "M", "L", "XL", "XXL"],
    temporada: ["Verano", "Invierno", "Todo el año"],
  },
  
  automotriz: {
    marca_vehiculo: ["Toyota", "Honda", "Ford", "Chevrolet", "Nissan", "Hyundai", "Kia", "BMW", "Mercedes"],
    tipo_vehiculo: ["Sedán", "SUV", "Hatchback", "Pickup", "Deportivo", "Camioneta"],
    año: ["2020", "2021", "2022", "2023", "2024", "Universal"],
    categoria: ["Motor", "Frenos", "Suspensión", "Transmisión", "Eléctrico", "Carrocería"],
  }
}

export const useAtributosDinamicos = () => {
  
  // Función para obtener atributos sugeridos por sector
  const obtenerAtributosPorSector = (sector: string): DefinicionAtributo[] => {
    const atributosSector = generadoresAtributos[sector as keyof typeof generadoresAtributos]
    
    if (!atributosSector) {
      return [
        {
          campo_nombre: 'color',
          campo_etiqueta: 'Color',
          tipo_dato: 'seleccion',
          opciones_predefinidas: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Negro', 'Blanco'],
          es_requerido: false
        },
        {
          campo_nombre: 'material',
          campo_etiqueta: 'Material',
          tipo_dato: 'texto',
          es_requerido: false
        }
      ]
    }
    
    return Object.entries(atributosSector).map(([campo, opciones], index) => ({
      campo_nombre: campo,
      campo_etiqueta: campo.charAt(0).toUpperCase() + campo.slice(1).replace(/_/g, ' '),
      tipo_dato: Array.isArray(opciones) ? 'seleccion' : 'texto',
      opciones_predefinidas: Array.isArray(opciones) ? opciones : undefined,
      es_requerido: ['talla', 'color', 'tipo'].includes(campo),
      unidad_medida: campo.includes('peso') ? 'g' : campo.includes('medida') ? 'cm' : undefined
    }))
  }
  
  // Función para generar atributos de ejemplo para un producto
  const generarAtributosEjemplo = (sector: string, variante?: any): Record<string, any> => {
    const atributosSector = generadoresAtributos[sector as keyof typeof generadoresAtributos]
    
    if (!atributosSector) {
      return {
        color: "Negro",
        material: "Material estándar"
      }
    }
    
    const atributosGenerados: Record<string, any> = {}
    
    Object.entries(atributosSector).forEach(([campo, opciones]) => {
      if (Array.isArray(opciones)) {
        // Para opciones de selección, tomar la primera o una aleatoria
        atributosGenerados[campo] = opciones[0]
      } else {
        // Para campos de texto, usar el valor de ejemplo
        atributosGenerados[campo] = opciones
      }
    })
    
    return atributosGenerados
  }
  
  // Función para validar atributos según las reglas
  const validarAtributos = (atributos: Record<string, any>, definiciones: DefinicionAtributo[]): string[] => {
    const errores: string[] = []
    
    definiciones.forEach(definicion => {
      const valor = atributos[definicion.campo_nombre]
      
      // Verificar campos requeridos
      if (definicion.es_requerido && (!valor || valor === '')) {
        errores.push(`${definicion.campo_etiqueta} es requerido`)
      }
      
      // Verificar opciones válidas para selecciones
      if (definicion.tipo_dato === 'seleccion' && definicion.opciones_predefinidas && valor) {
        if (!definicion.opciones_predefinidas.includes(valor)) {
          errores.push(`${definicion.campo_etiqueta} debe ser una de las opciones válidas`)
        }
      }
      
      // Verificar validaciones personalizadas
      if (definicion.validaciones && valor) {
        const validaciones = definicion.validaciones
        
        if (validaciones.pattern) {
          const regex = new RegExp(validaciones.pattern)
          if (!regex.test(valor)) {
            errores.push(`${definicion.campo_etiqueta} no tiene el formato correcto`)
          }
        }
        
        if (validaciones.min !== undefined && parseFloat(valor) < validaciones.min) {
          errores.push(`${definicion.campo_etiqueta} debe ser mayor o igual a ${validaciones.min}`)
        }
        
        if (validaciones.max !== undefined && parseFloat(valor) > validaciones.max) {
          errores.push(`${definicion.campo_etiqueta} debe ser menor o igual a ${validaciones.max}`)
        }
      }
    })
    
    return errores
  }
  
  // Función para formatear atributos para visualización
  const formatearAtributosParaVista = (atributos: Record<string, any>, definiciones: DefinicionAtributo[]): AtributoGenerado[] => {
    if (!atributos || !definiciones) return []
    
    return definiciones
      .filter(def => atributos[def.campo_nombre] !== undefined && atributos[def.campo_nombre] !== null && atributos[def.campo_nombre] !== '')
      .map(def => ({
        campo: def.campo_nombre,
        etiqueta: def.campo_etiqueta,
        valor: atributos[def.campo_nombre],
        es_requerido: def.es_requerido,
        unidad: def.unidad_medida
      }))
      .sort((a, b) => (b.es_requerido ? 1 : 0) - (a.es_requerido ? 1 : 0))
  }
  
  // Lista de sectores disponibles
  const sectoresDisponibles = useMemo(() => 
    Object.keys(generadoresAtributos).map(sector => ({
      value: sector,
      label: sector.charAt(0).toUpperCase() + sector.slice(1),
      emoji: {
        hogar: '🏠',
        calzado: '👟',
        textil: '👕',
        tecnologia: '💻',
        alimenticio: '🍎',
        salud: '💊',
        deportes: '⚽',
        automotriz: '🚗'
      }[sector] || '📦'
    })), []
  )
  
  return {
    obtenerAtributosPorSector,
    generarAtributosEjemplo,
    validarAtributos,
    formatearAtributosParaVista,
    sectoresDisponibles
  }
}
// =====================================================
// XENTRA - Mantenimiento de Variantes
// =====================================================

import React, { useState, useEffect } from 'react'
import {
  Paper,
  Title,
  Button,
  Table,
  ActionIcon,
  Group,
  TextInput,
  Modal,
  Grid,
  Alert,
  Badge,
  LoadingOverlay,
  NumberInput,
  Select,
  MultiSelect,
  Card,
  Text,
  Stack
} from '@mantine/core'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPackage,
  IconCurrencyDollar,
  IconBarcode,
  IconSettings,
  IconTags
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { supabaseCache, useCachedQuery } from '@/utils/supabaseCache'

interface Producto {
  id: string
  codigo: string
  nombre: string
  categoria_id?: string
}

interface PlantillaAtributos {
  id: string
  sector_negocio: string
  nombre: string
  descripcion?: string
  es_activa: boolean
}

interface DefinicionAtributo {
  id: string
  plantilla_id: string
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: 'texto' | 'numero' | 'decimal' | 'seleccion' | 'multiple' | 'boolean' | 'fecha'
  es_requerido: boolean
  orden: number
  opciones_predefinidas?: string[]
  validaciones?: any
  unidad_medida?: string
  descripcion?: string
}

interface Variante {
  id: string
  producto_id: string
  producto?: { codigo: string; nombre: string; categoria_id?: string }
  sku: string
  nombre: string
  precio_compra: number
  precio_venta: number
  activo: boolean
  created_at: string
  atributos?: Record<string, any> // Campo JSONB para atributos dinámicos
  stock?: { cantidad_actual: number }[]
}

const VariantesManagement: React.FC = () => {
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [plantillasAtributos, setPlantillasAtributos] = useState<PlantillaAtributos[]>([])
  const [atributosDisponibles, setAtributosDisponibles] = useState<DefinicionAtributo[]>([])
  const [atributosVariante, setAtributosVariante] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpened, setModalOpened] = useState(false)
  const [editingVariante, setEditingVariante] = useState<Variante | null>(null)
  
  const { empresaActual } = useAuthStore()

  const form = useForm({
    initialValues: {
      producto_id: '',
      sku: '',
      nombre: '',
      precio_compra: 0,
      precio_venta: 0,
      activo: true,
      plantilla_atributos_id: ''
    },
    validate: {
      producto_id: (value) => !value ? 'El producto es requerido' : null,
      sku: (value) => !value ? 'El SKU es requerido' : null,
      nombre: (value) => !value ? 'El nombre es requerido' : null,
      precio_compra: (value) => value < 0 ? 'El precio debe ser mayor o igual a 0' : null,
      precio_venta: (value) => value < 0 ? 'El precio debe ser mayor o igual a 0' : null
    }
  })

  // ===============================
  // FUNCIONES DE DATOS
  // ===============================

  const cargarProductos = async () => {
    if (!empresaActual?.id) return
    
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('productos')
            .select('id, codigo, nombre, categoria_id')
            .eq('empresa_id', empresaActual.id)
            .eq('activo', true)
            .order('nombre', { ascending: true })

          if (error) throw error
          return data || []
        },
        'productos',
        { empresa_id: empresaActual.id, activo: true, select: 'basic' },
        5 * 60 * 1000 // Cache por 5 minutos
      )
      
      setProductos(data)
    } catch (error: any) {
      console.error('Error cargando productos:', error)
    }
  }

  const cargarPlantillasAtributos = async () => {
    if (!empresaActual?.id) return
    
    try {
      const { data, error } = await supabase
        .from('plantillas_atributos')
        .select('*')
        .eq('empresa_id', empresaActual.id)
        .eq('es_activa', true)
        .order('nombre', { ascending: true })

      if (error) throw error
      setPlantillasAtributos(data || [])
    } catch (error: any) {
      console.error('Error cargando plantillas de atributos:', error)
    }
  }

  const cargarAtributosPlantilla = async (plantillaId: string) => {
    if (!plantillaId) {
      setAtributosDisponibles([])
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('definiciones_atributos')
        .select('*')
        .eq('plantilla_id', plantillaId)
        .order('orden', { ascending: true })

      if (error) throw error
      setAtributosDisponibles(data || [])
    } catch (error: any) {
      console.error('Error cargando atributos de la plantilla:', error)
      setAtributosDisponibles([])
    }
  }

  const cargarVariantes = async () => {
    if (!empresaActual?.id) return
    
    setLoading(true)
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('variantes')
            .select(`
              *,
              producto:productos(codigo, nombre, categoria_id),
              stock:stock_actual(cantidad_actual)
            `)
            .eq('empresa_id', empresaActual.id)
            .order('sku', { ascending: true })

          if (error) throw error
          return data || []
        },
        'variantes',
        { empresa_id: empresaActual.id },
        3 * 60 * 1000 // Cache por 3 minutos
      )
      
      setVariantes(data)
    } catch (error: any) {
      NotificationManager.error('Error', 'No se pudieron cargar las variantes')
      console.error('Error cargando variantes:', error)
    } finally {
      setLoading(false)
    }
  }

  const guardarVariante = async (values: typeof form.values) => {
    if (!empresaActual?.id) return

    setLoading(true)
    console.log('🔄 Iniciando guardado de variante...', { values, atributosVariante })

    try {
      let varianteData = {
        ...values,
        empresa_id: empresaActual.id,
        atributos: Object.keys(atributosVariante).length > 0 ? atributosVariante : null
      }

      // Limpiar campos UUID vacíos para evitar errores de PostgreSQL
      varianteData = limpiarCamposUUID(varianteData)

      console.log('📝 Datos a guardar:', varianteData)

      if (editingVariante) {
        // Actualizar
        console.log('✏️ Actualizando variante existente...', editingVariante.id)
        await NotificationManager.loading(
          'Actualizando variante...',
          supabase
            .from('variantes')
            .update(varianteData)
            .eq('id', editingVariante.id)
            .then(({ error, data }) => {
              if (error) {
                console.error('❌ Error en actualización:', error)
                throw error
              }
              console.log('✅ Variante actualizada:', data)
            }),
          {
            success: 'Variante actualizada exitosamente',
            error: 'No se pudo actualizar la variante'
          }
        )
      } else {
        // Verificar que el SKU no exista y crear
        console.log('🆕 Creando nueva variante...')
        
        // Primero verificar SKU
        console.log('🔍 Verificando si SKU existe:', values.sku)
        
        const { data: existingSku, error: checkError } = await supabase
          .from('variantes')
          .select('id')
          .eq('empresa_id', empresaActual.id)
          .eq('sku', values.sku)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error verificando SKU:', checkError)
          throw checkError
        }

        if (existingSku) {
          console.warn('⚠️ SKU ya existe:', existingSku)
          throw new Error('Ya existe una variante con este SKU')
        }

        console.log('✅ SKU disponible, insertando variante...')
        
        // Insertar la nueva variante
        const { data, error } = await supabase
          .from('variantes')
          .insert(varianteData)
          .select()
          
        if (error) {
          console.error('❌ Error en inserción:', error)
          throw error
        }
        
        console.log('✅ Variante creada exitosamente:', data)
        NotificationManager.success('Éxito', 'Variante creada exitosamente')
      }

      // Invalidar cache
      supabaseCache.invalidateTable('variantes')
      
      cerrarModal()
      await cargarVariantes()
      console.log('✅ Proceso completado exitosamente')
    } catch (error: any) {
      console.error('❌ Error guardando variante:', error)
      
      // Mostrar error específico al usuario
      let errorMessage = 'Error desconocido'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      } else if (error.code) {
        errorMessage = `Error de base de datos: ${error.code}`
      }
      
      NotificationManager.error('Error al guardar variante', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const eliminarVariante = async (variante: Variante) => {
    if (!confirm(`¿Estás seguro de eliminar la variante "${variante.sku}"?`)) return

    try {
      await NotificationManager.loading(
        'Eliminando variante...',
        supabase
          .from('variantes')
          .delete()
          .eq('id', variante.id)
          .then(({ error }) => {
            if (error) throw error
          }),
        {
          success: 'Variante eliminada exitosamente',
          error: 'No se pudo eliminar la variante. Puede tener movimientos asociados.'
        }
      )

      // Invalidar cache
      supabaseCache.invalidateTable('variantes')
      
      await cargarVariantes()
    } catch (error: any) {
      console.error('Error eliminando variante:', error)
    }
  }

  // ===============================
  // FUNCIONES DE UI
  // ===============================

  const abrirModal = (variante?: Variante) => {
    if (variante) {
      setEditingVariante(variante)
      form.setValues({
        producto_id: variante.producto_id,
        sku: variante.sku,
        nombre: variante.nombre,
        precio_compra: variante.precio_compra,
        precio_venta: variante.precio_venta,
        activo: variante.activo,
        plantilla_atributos_id: ''
      })
      // Cargar atributos existentes
      setAtributosVariante(variante.atributos || {})
      
      // Si la variante tiene una categoría con plantilla predeterminada, cargarla
      if (variante.producto?.categoria_id) {
        const producto = productos.find(p => p.id === variante.producto_id)
        if (producto?.categoria_id) {
          // Buscar si hay plantilla predeterminada para esta categoría
          const plantillaRecomendada = plantillasAtributos.find(p => 
            // Esto se podría mejorar con una función que detecte la plantilla basada en atributos existentes
            Object.keys(variante.atributos || {}).length > 0
          )
          if (plantillaRecomendada) {
            form.setFieldValue('plantilla_atributos_id', plantillaRecomendada.id)
            cargarAtributosPlantilla(plantillaRecomendada.id)
          }
        }
      }
    } else {
      setEditingVariante(null)
      form.reset()
      setAtributosVariante({})
      setAtributosDisponibles([])
    }
    setModalOpened(true)
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingVariante(null)
    form.reset()
    setAtributosVariante({})
    setAtributosDisponibles([])
  }

  const calcularStockTotal = (stock?: { cantidad_actual: number }[]) => {
    if (!stock) return 0
    return stock.reduce((total, s) => total + s.cantidad_actual, 0)
  }

  // Filtrar variantes
  const variantesFiltradas = variantes.filter(variante =>
    variante.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variante.producto && (
      variante.producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variante.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  )

  // Opciones de productos para el select
  const opcionesProductos = productos.map(producto => ({
    value: producto.id,
    label: `${producto.codigo} - ${producto.nombre}`
  }))

  // Auto-generar SKU basado en el producto seleccionado
  const handleProductoChange = (productoId: string) => {
    form.setFieldValue('producto_id', productoId)
    
    const producto = productos.find(p => p.id === productoId)
    if (producto && !editingVariante) {
      // Auto-generar SKU
      const variantesDelProducto = variantes.filter(v => v.producto_id === productoId)
      const numeroVariante = variantesDelProducto.length + 1
      const skuGenerado = `${producto.codigo}-${numeroVariante.toString().padStart(2, '0')}`
      form.setFieldValue('sku', skuGenerado)
    }
  }

  // Manejar cambios en atributos dinámicos
  const handleAtributoChange = (campoNombre: string, valor: any) => {
    setAtributosVariante(prev => ({
      ...prev,
      [campoNombre]: valor
    }))
  }

  // Formatear valores de atributos para mostrar (incluyendo arrays)
  const formatearValorAtributo = (valor: any): string => {
    if (valor === null || valor === undefined) return ''
    if (Array.isArray(valor)) {
      return valor.length > 0 ? valor.join(', ') : ''
    }
    return String(valor)
  }

  // Limpiar valores UUID vacíos para evitar errores de PostgreSQL
  const limpiarCamposUUID = (data: any) => {
    const cleaned = { ...data }
    // Convertir campos UUID vacíos a null
    if (cleaned.plantilla_atributos_id === '') {
      cleaned.plantilla_atributos_id = null
    }
    if (cleaned.producto_id === '') {
      cleaned.producto_id = null
    }
    return cleaned
  }

  // Limpiar todos los atributos
  const limpiarAtributos = () => {
    setAtributosVariante({})
    form.setFieldValue('plantilla_atributos_id', '')
    setAtributosDisponibles([])
  }

  // Aplicar plantilla a variante existente
  const aplicarPlantillaAVariante = (plantillaId: string) => {
    form.setFieldValue('plantilla_atributos_id', plantillaId)
    // Mantener valores existentes si coinciden con la nueva plantilla
    const atributosActuales = { ...atributosVariante }
    cargarAtributosPlantilla(plantillaId)
    
    // Después de cargar la plantilla, mantener valores compatibles
    setTimeout(() => {
      const nuevosAtributos = { ...atributosActuales }
      atributosDisponibles.forEach(attr => {
        if (!(attr.campo_nombre in atributosActuales)) {
          // Si el atributo es requerido, no asignar valor por defecto
          if (!attr.es_requerido) {
            nuevosAtributos[attr.campo_nombre] = ''
          }
        }
      })
      setAtributosVariante(nuevosAtributos)
    }, 100)
  }

  // Renderizar campo de atributo dinámico
  const renderizarCampoAtributo = (atributo: DefinicionAtributo) => {
    const valor = atributosVariante[atributo.campo_nombre] || ''

    switch (atributo.tipo_dato) {
      case 'seleccion':
        return (
          <Select
            key={atributo.id}
            label={`${atributo.campo_etiqueta} ${atributo.es_requerido ? '*' : ''}`}
            description={atributo.descripcion}
            value={valor}
            onChange={(val) => handleAtributoChange(atributo.campo_nombre, val)}
            data={atributo.opciones_predefinidas?.map(opcion => ({
              value: opcion,
              label: opcion
            })) || []}
            searchable
            clearable
            required={atributo.es_requerido}
          />
        )
      
      case 'multiple':
        // Valores múltiples como array para chips/tags
        const valoresMultiples = Array.isArray(valor) ? valor : (valor ? [valor] : [])
        return (
          <MultiSelect
            key={atributo.id}
            label={`${atributo.campo_etiqueta} ${atributo.es_requerido ? '*' : ''}`}
            description={`${atributo.descripcion || ''} (Puedes seleccionar múltiples opciones)`}
            value={valoresMultiples}
            onChange={(val) => handleAtributoChange(atributo.campo_nombre, val)}
            data={atributo.opciones_predefinidas?.map(opcion => ({
              value: opcion,
              label: opcion
            })) || []}
            searchable
            clearable
            required={atributo.es_requerido}
            placeholder="Selecciona una o más opciones..."
            maxDropdownHeight={200}
            withinPortal
          />
        )
      
      case 'numero':
      case 'decimal':
        return (
          <NumberInput
            key={atributo.id}
            label={`${atributo.campo_etiqueta} ${atributo.es_requerido ? '*' : ''}`}
            description={atributo.descripcion}
            value={valor}
            onChange={(val) => handleAtributoChange(atributo.campo_nombre, val)}
            precision={atributo.tipo_dato === 'decimal' ? 2 : 0}
            min={atributo.validaciones?.min}
            max={atributo.validaciones?.max}
            required={atributo.es_requerido}
            rightSection={atributo.unidad_medida}
          />
        )
      
      case 'texto':
        return (
          <TextInput
            key={atributo.id}
            label={`${atributo.campo_etiqueta} ${atributo.es_requerido ? '*' : ''}`}
            description={atributo.descripcion}
            value={valor}
            onChange={(e) => handleAtributoChange(atributo.campo_nombre, e.target.value)}
            placeholder={atributo.validaciones?.placeholder}
            required={atributo.es_requerido}
            rightSection={atributo.unidad_medida}
          />
        )
      
      default:
        return (
          <TextInput
            key={atributo.id}
            label={atributo.campo_etiqueta}
            description={atributo.descripcion}
            value={valor}
            onChange={(e) => handleAtributoChange(atributo.campo_nombre, e.target.value)}
            required={atributo.es_requerido}
          />
        )
    }
  }

  // Opciones de plantillas para el select
  const opcionesPlantillas = plantillasAtributos.map(plantilla => ({
    value: plantilla.id,
    label: `${plantilla.nombre} (${plantilla.sector_negocio})`
  }))

  useEffect(() => {
    cargarProductos()
    cargarVariantes()
    cargarPlantillasAtributos()
  }, [empresaActual?.id])

  // Cargar atributos cuando se selecciona una plantilla
  useEffect(() => {
    if (form.values.plantilla_atributos_id) {
      cargarAtributosPlantilla(form.values.plantilla_atributos_id)
    } else {
      // Limpiar atributos disponibles cuando no hay plantilla seleccionada
      setAtributosDisponibles([])
      // Solo limpiar valores de atributos si no estamos editando una variante existente
      if (!editingVariante) {
        setAtributosVariante({})
      }
    }
  }, [form.values.plantilla_atributos_id])

  return (
    <Paper p="lg" withBorder>
      <LoadingOverlay visible={loading} />
      
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Variantes</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => abrirModal()}
          disabled={productos.length === 0}
        >
          Nueva Variante
        </Button>
      </Group>

      {productos.length === 0 && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin productos"
          color="orange"
          mb="lg"
        >
          Necesitas crear al menos un producto antes de agregar variantes
        </Alert>
      )}

      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar variantes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="lg"
      />

      {/* Tabla */}
      {variantesFiltradas.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin variantes"
          color="blue"
        >
          {searchTerm ? 'No se encontraron variantes con ese criterio' : 'No hay variantes registradas'}
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SKU</Table.Th>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Nombre Variante</Table.Th>
              <Table.Th>Atributos</Table.Th>
              <Table.Th>Precio Compra</Table.Th>
              <Table.Th>Precio Venta</Table.Th>
              <Table.Th>Stock</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {variantesFiltradas.map((variante) => (
              <Table.Tr key={variante.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconBarcode size={16} />
                    <Text weight={500}>{variante.sku}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  {variante.producto && (
                    <Stack gap={2}>
                      <Text size="sm" weight={500}>
                        {variante.producto.codigo}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {variante.producto.nombre}
                      </Text>
                    </Stack>
                  )}
                </Table.Td>
                <Table.Td>{variante.nombre}</Table.Td>
                <Table.Td>
                  {variante.atributos && Object.keys(variante.atributos).length > 0 ? (
                    <Group gap={4}>
                      {Object.entries(variante.atributos).slice(0, 3).map(([key, value], index) => {
                        const valorFormateado = formatearValorAtributo(value)
                        return (
                          <Badge 
                            key={key} 
                            size="xs" 
                            variant="outline" 
                            color={Array.isArray(value) ? "teal" : "indigo"}
                            title={`${key}: ${valorFormateado}`}
                          >
                            {key}: {valorFormateado.length > 15 ? `${valorFormateado.substring(0, 15)}...` : valorFormateado}
                          </Badge>
                        )
                      })}
                      {Object.keys(variante.atributos).length > 3 && (
                        <Badge size="xs" variant="light" color="gray">
                          +{Object.keys(variante.atributos).length - 3} más
                        </Badge>
                      )}
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">Sin atributos</Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <IconCurrencyDollar size={14} />
                    {variante.precio_compra.toFixed(2)}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <IconCurrencyDollar size={14} />
                    <Text weight={500}>{variante.precio_venta.toFixed(2)}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue">
                    {calcularStockTotal(variante.stock)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={variante.activo ? 'green' : 'red'}>
                    {variante.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => abrirModal(variante)}
                      title="Editar variante"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="indigo"
                      onClick={() => abrirModal(variante)}
                      title={
                        variante.atributos && Object.keys(variante.atributos).length > 0
                          ? "Editar atributos" 
                          : "Configurar atributos"
                      }
                    >
                      <IconSettings size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarVariante(variante)}
                      title="Eliminar variante"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Modal Formulario */}
      <Modal
        opened={modalOpened}
        onClose={cerrarModal}
        title={editingVariante ? 'Editar Variante' : 'Nueva Variante'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(guardarVariante)}>
          <Grid>
            <Grid.Col span={12}>
              <Select
                label="Producto"
                placeholder="Selecciona un producto"
                data={opcionesProductos}
                required
                leftSection={<IconPackage size={16} />}
                value={form.values.producto_id}
                onChange={handleProductoChange}
                disabled={!!editingVariante}
                searchable
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="SKU"
                placeholder="Código único de la variante"
                required
                leftSection={<IconBarcode size={16} />}
                {...form.getInputProps('sku')}
              />
            </Grid.Col>
            
            <Grid.Col span={6}>
              <TextInput
                label="Nombre de la Variante"
                placeholder="Ej: Talla M, Color Rojo"
                required
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput
                label="Precio de Compra"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                leftSection={<IconCurrencyDollar size={16} />}
                {...form.getInputProps('precio_compra')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput
                label="Precio de Venta"
                placeholder="0.00"
                min={0}
                decimalScale={2}
                fixedDecimalScale
                leftSection={<IconCurrencyDollar size={16} />}
                {...form.getInputProps('precio_venta')}
              />
            </Grid.Col>

            {form.values.precio_compra > 0 && form.values.precio_venta > 0 && (
              <Grid.Col span={12}>
                <Card withBorder>
                  <Text size="sm" c="dimmed">Margen de Ganancia</Text>
                  <Text size="lg" weight={600} c="green">
                    {(((form.values.precio_venta - form.values.precio_compra) / form.values.precio_compra) * 100).toFixed(1)}%
                  </Text>
                  <Text size="xs" c="dimmed">
                    Ganancia: ${(form.values.precio_venta - form.values.precio_compra).toFixed(2)}
                  </Text>
                </Card>
              </Grid.Col>
            )}

            {/* Sección de Atributos Dinámicos - Creación */}
            {!editingVariante && (
              <Grid.Col span={12}>
                <Select
                  label="Plantilla de Atributos"
                  placeholder="Selecciona una plantilla para agregar atributos específicos"
                  data={opcionesPlantillas}
                  value={form.values.plantilla_atributos_id}
                  onChange={(val) => {
                    form.setFieldValue('plantilla_atributos_id', val || '')
                    // Limpiar tanto los valores como los campos disponibles al cambiar plantilla
                    setAtributosVariante({})
                    if (!val) {
                      setAtributosDisponibles([])
                    }
                  }}
                  searchable
                  clearable
                />
              </Grid.Col>
            )}

            {/* Sección de Atributos Dinámicos - Edición */}
            {editingVariante && (
              <Grid.Col span={12}>
                <Card withBorder padding="md" className="bg-blue-50">
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <IconSettings size={20} />
                        <Text weight={600} c="blue">
                          Configuración de Atributos
                        </Text>
                      </Group>
                      
                      <Group gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          color="orange"
                          leftSection={<IconX size={14} />}
                          onClick={limpiarAtributos}
                        >
                          Limpiar
                        </Button>
                      </Group>
                    </Group>

                    <Select
                      label="Plantilla de Atributos"
                      placeholder="Selecciona o cambia la plantilla de atributos"
                      data={opcionesPlantillas}
                      value={form.values.plantilla_atributos_id}
                      onChange={(val) => {
                        if (val) {
                          aplicarPlantillaAVariante(val)
                        } else {
                          limpiarAtributos()
                        }
                      }}
                      searchable
                      clearable
                    />
                  </Stack>
                </Card>
              </Grid.Col>
            )}

            {/* Campos de Atributos Dinámicos */}
            {atributosDisponibles.length > 0 && (
              <Grid.Col span={12}>
                <Card withBorder padding="md" className="bg-green-50">
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <IconTags size={20} />
                        <Text weight={600} c="green">
                          {editingVariante ? 'Editar Atributos del SKU' : 'Atributos Específicos del SKU'}
                        </Text>
                      </Group>
                      
                      {editingVariante && (
                        <Badge size="sm" color="green" variant="light">
                          Modo Edición
                        </Badge>
                      )}
                    </Group>
                    
                    <Grid>
                      {atributosDisponibles.map((atributo) => (
                        <Grid.Col span={6} key={atributo.id}>
                          {renderizarCampoAtributo(atributo)}
                        </Grid.Col>
                      ))}
                    </Grid>
                    
                    {Object.keys(atributosVariante).length > 0 && (
                      <Card withBorder className="bg-gray-50" padding="xs">
                        <Text size="xs" c="dimmed" weight={500}>Vista previa:</Text>
                        <Group gap={6}>
                          {Object.entries(atributosVariante).map(([key, value]) => (
                            <Badge key={key} size="sm" variant="outline" color="blue">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </Group>
                      </Card>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            )}

            {/* Mostrar atributos existentes sin plantilla en modo edición */}
            {editingVariante && Object.keys(atributosVariante).length > 0 && atributosDisponibles.length === 0 && (
              <Grid.Col span={12}>
                <Card withBorder padding="md" className="bg-yellow-50">
                  <Stack>
                    <Group justify="space-between">
                      <Group>
                        <IconSettings size={20} />
                        <Text weight={600} c="orange">
                          Atributos Existentes (Sin Plantilla)
                        </Text>
                      </Group>
                      <Badge size="sm" variant="light" color="orange">
                        Sin estructura
                      </Badge>
                    </Group>
                    
                    <Group gap={6}>
                      {Object.entries(atributosVariante).map(([key, value]) => (
                        <Badge key={key} size="sm" color="orange">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </Group>
                    
                    <Text size="xs" c="dimmed">
                      💡 Selecciona una plantilla arriba para estructurar y editar estos atributos
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            )}

            <Grid.Col span={12}>
              <Group>
                <input
                  type="checkbox"
                  {...form.getInputProps('activo', { type: 'checkbox' })}
                />
                <span>Variante activa</span>
              </Group>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="lg">
            <Button variant="outline" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editingVariante ? 'Actualizar' : 'Crear'}
            </Button>
          </Group>
        </form>
      </Modal>
    </Paper>
  )
}

export default VariantesManagement
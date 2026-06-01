// =====================================================
// XENTRA - Mantenimiento de Productos
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
  Switch,
  Tabs,
  Card,
  Text
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
  IconTags,
  IconCurrencyDollar,
  IconTruck
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { supabaseCache, useCachedQuery } from '@/utils/supabaseCache'

interface Categoria {
  id: string
  nombre: string
}

interface Proveedor {
  id: string
  nombre: string
}

interface Producto {
  id: string
  codigo: string
  nombre: string
  categoria_id: string
  proveedor_id?: string
  categoria?: { nombre: string }
  proveedor?: { nombre: string }
  precio_compra: number
  precio_venta: number
  tiene_variantes: boolean
  activo: boolean
  created_at: string
  variantes?: Variante[]
}

interface Variante {
  id: string
  producto_id: string
  sku: string
  nombre: string
  precio_compra: number
  precio_venta: number
  stock?: { cantidad_actual: number }[]
}

const ProductosManagement: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpened, setModalOpened] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [activeTab, setActiveTab] = useState<string>('basicos')
  
  const { empresaActual } = useAuthStore()

  const form = useForm({
    initialValues: {
      codigo: '',
      nombre: '',
      categoria_id: '',
      proveedor_id: '',
      precio_compra: 0,
      precio_venta: 0,
      tiene_variantes: false,
      activo: true
    },
    validate: {
      codigo: (value) => !value ? 'El código es requerido' : null,
      nombre: (value) => !value ? 'El nombre es requerido' : null,
      categoria_id: (value) => !value ? 'La categoría es requerida' : null,
      precio_compra: (value) => value < 0 ? 'El precio debe ser mayor o igual a 0' : null,
      precio_venta: (value) => value < 0 ? 'El precio debe ser mayor o igual a 0' : null
    }
  })

  // ===============================
  // FUNCIONES DE DATOS
  // ===============================

  const cargarCategorias = async () => {
    if (!empresaActual?.id) return
    
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('categorias')
            .select('id, nombre')
            .eq('empresa_id', empresaActual.id)
            .eq('activo', true)
            .order('nombre', { ascending: true })

          if (error) throw error
          return data || []
        },
        'categorias',
        { empresa_id: empresaActual.id, activo: true },
        5 * 60 * 1000 // Cache por 5 minutos
      )
      
      setCategorias(data)
    } catch (error: any) {
      console.error('Error cargando categorías:', error)
    }
  }

  const cargarProveedores = async () => {
    if (!empresaActual?.id) return
    
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('proveedores')
            .select('id, nombre')
            .eq('empresa_id', empresaActual.id)
            .eq('activo', true)
            .order('nombre', { ascending: true })

          if (error) throw error
          return data || []
        },
        'proveedores',
        { empresa_id: empresaActual.id, activo: true },
        5 * 60 * 1000 // Cache por 5 minutos
      )
      
      setProveedores(data)
    } catch (error: any) {
      console.error('Error cargando proveedores:', error)
    }
  }

  const cargarProductos = async () => {
    if (!empresaActual?.id) return
    
    setLoading(true)
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('productos')
            .select(`
              *,
              categoria:categorias(nombre),
              proveedor:proveedores(nombre),
              variantes(
                id, sku, nombre, precio_compra, precio_venta,
                stock:stock_actual(cantidad_actual)
              )
            `)
            .eq('empresa_id', empresaActual.id)
            .order('nombre', { ascending: true })

          if (error) throw error
          return data || []
        },
        'productos',
        { empresa_id: empresaActual.id },
        3 * 60 * 1000 // Cache por 3 minutos
      )
      
      setProductos(data)
    } catch (error: any) {
      NotificationManager.error('Error', 'No se pudieron cargar los productos')
      console.error('Error cargando productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const guardarProducto = async (values: typeof form.values) => {
    if (!empresaActual?.id) return

    try {
      const productoData = {
        ...values,
        empresa_id: empresaActual.id
      }

      if (editingProducto) {
        // Actualizar
        await NotificationManager.loading(
          'Actualizando producto...',
          supabase
            .from('productos')
            .update(productoData)
            .eq('id', editingProducto.id)
            .then(({ error }) => {
              if (error) throw error
            }),
          {
            success: 'Producto actualizado exitosamente',
            error: 'No se pudo actualizar el producto'
          }
        )
      } else {
        // Crear - también crear variante principal automáticamente
        await NotificationManager.loading(
          'Creando producto...',
          async () => {
            const { data: productoCreado, error: errorProducto } = await supabase
              .from('productos')
              .insert(productoData)
              .select()
              .single()
            
            if (errorProducto) throw errorProducto

            // Crear variante principal automáticamente
            const varianteData = {
              empresa_id: empresaActual.id,
              producto_id: productoCreado.id,
              sku: values.codigo,
              nombre: values.nombre,
              precio_compra: values.precio_compra,
              precio_venta: values.precio_venta
            }

            const { error: errorVariante } = await supabase
              .from('variantes')
              .insert(varianteData)

            if (errorVariante) throw errorVariante
          },
          {
            success: 'Producto creado exitosamente',
            error: 'No se pudo crear el producto'
          }
        )
      }

      // Invalidar cache
      supabaseCache.invalidateTable('productos')
      supabaseCache.invalidateTable('variantes')
      
      cerrarModal()
      await cargarProductos()
    } catch (error: any) {
      console.error('Error guardando producto:', error)
    }
  }

  const eliminarProducto = async (producto: Producto) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) return

    try {
      await NotificationManager.loading(
        'Eliminando producto...',
        supabase
          .from('productos')
          .delete()
          .eq('id', producto.id)
          .then(({ error }) => {
            if (error) throw error
          }),
        {
          success: 'Producto eliminado exitosamente',
          error: 'No se pudo eliminar el producto. Puede tener movimientos asociados.'
        }
      )

      // Invalidar cache
      supabaseCache.invalidateTable('productos')
      supabaseCache.invalidateTable('variantes')
      
      await cargarProductos()
    } catch (error: any) {
      console.error('Error eliminando producto:', error)
    }
  }

  // ===============================
  // FUNCIONES DE UI
  // ===============================

  const abrirModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto)
      form.setValues({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria_id: producto.categoria_id,
        proveedor_id: producto.proveedor_id || '',
        precio_compra: producto.precio_compra,
        precio_venta: producto.precio_venta,
        tiene_variantes: producto.tiene_variantes,
        activo: producto.activo
      })
    } else {
      setEditingProducto(null)
      form.reset()
    }
    setModalOpened(true)
    setActiveTab('basicos')
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingProducto(null)
    form.reset()
  }

  const calcularStockTotal = (variantes?: Variante[]) => {
    if (!variantes) return 0
    return variantes.reduce((total, variante) => {
      const stockVariante = variante.stock?.reduce((sum, s) => sum + s.cantidad_actual, 0) || 0
      return total + stockVariante
    }, 0)
  }

  // Filtrar productos
  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.categoria && producto.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Opciones de categorías para el select
  const opcionesCategorias = categorias.map(categoria => ({
    value: categoria.id,
    label: categoria.nombre
  }))

  // Opciones de proveedores para el select  
  const opcionesProveedores = proveedores.map(proveedor => ({
    value: proveedor.id,
    label: proveedor.nombre
  }))

  useEffect(() => {
    cargarCategorias()
    cargarProductos()
    cargarProveedores()
  }, [empresaActual?.id])

  return (
    <Paper p="lg" withBorder>
      <LoadingOverlay visible={loading} />
      
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Productos</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => abrirModal()}
          disabled={categorias.length === 0 || proveedores.length === 0}
        >
          Nuevo Producto
        </Button>
      </Group>

      {(categorias.length === 0 || proveedores.length === 0) && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Datos incompletos"
          color="orange"
          mb="lg"
        >
          {categorias.length === 0 && proveedores.length === 0 && 
            "Necesitas crear al menos una categoría y un proveedor antes de agregar productos"}
          {categorias.length === 0 && proveedores.length > 0 && 
            "Necesitas crear al menos una categoría antes de agregar productos"}
          {categorias.length > 0 && proveedores.length === 0 && 
            "Necesitas crear al menos un proveedor antes de agregar productos"}
        </Alert>
      )}

      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar productos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="lg"
      />

      {/* Tabla */}
      {productosFiltrados.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin productos"
          color="blue"
        >
          {searchTerm ? 'No se encontraron productos con ese criterio' : 'No hay productos registrados'}
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Código</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>Proveedor</Table.Th>
              <Table.Th>Precio Compra</Table.Th>
              <Table.Th>Precio Venta</Table.Th>
              <Table.Th>Stock</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {productosFiltrados.map((producto) => (
              <Table.Tr key={producto.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconPackage size={16} />
                    <Text weight={500}>{producto.codigo}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>{producto.nombre}</Table.Td>
                <Table.Td>
                  <Badge variant="outline">
                    {producto.categoria?.nombre || 'Sin categoría'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge variant="outline" color="teal">
                    {producto.proveedor?.nombre || 'Sin proveedor'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <IconCurrencyDollar size={14} />
                    {producto.precio_compra.toFixed(2)}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <IconCurrencyDollar size={14} />
                    <Text weight={500}>{producto.precio_venta.toFixed(2)}</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color="blue">
                    {calcularStockTotal(producto.variantes)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={producto.activo ? 'green' : 'red'}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => abrirModal(producto)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarProducto(producto)}
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
        title={editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
      >
        <Tabs value={activeTab} onChange={setActiveTab as any}>
          <Tabs.List>
            <Tabs.Tab value="basicos" leftSection={<IconPackage size={16} />}>
              Datos Básicos
            </Tabs.Tab>
            <Tabs.Tab value="precios" leftSection={<IconCurrencyDollar size={16} />}>
              Precios
            </Tabs.Tab>
          </Tabs.List>

          <form onSubmit={form.onSubmit(guardarProducto)}>
            <Tabs.Panel value="basicos" pt="lg">
              <Grid>
                <Grid.Col span={4}>
                  <TextInput
                    label="Código"
                    placeholder="Código único"
                    required
                    {...form.getInputProps('codigo')}
                  />
                </Grid.Col>
                
                <Grid.Col span={8}>
                  <TextInput
                    label="Nombre"
                    placeholder="Nombre del producto"
                    required
                    {...form.getInputProps('nombre')}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Select
                    label="Categoría"
                    placeholder="Selecciona una categoría"
                    data={opcionesCategorias}
                    required
                    leftSection={<IconTags size={16} />}
                    {...form.getInputProps('categoria_id')}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Select
                    label="Proveedor"
                    placeholder="Selecciona un proveedor"
                    data={opcionesProveedores}
                    required
                    leftSection={<IconTruck size={16} />}
                    {...form.getInputProps('proveedor_id')}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Switch
                    label="¿Producto con variantes?"
                    description="Habilita si el producto tendrá múltiples variantes (tallas, colores, etc.)"
                    {...form.getInputProps('tiene_variantes', { type: 'checkbox' })}
                  />
                </Grid.Col>

                <Grid.Col span={12}>
                  <Switch
                    label="Producto activo"
                    {...form.getInputProps('activo', { type: 'checkbox' })}
                  />
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            <Tabs.Panel value="precios" pt="lg">
              <Grid>
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
              </Grid>
            </Tabs.Panel>

            <Group justify="flex-end" mt="lg">
              <Button variant="outline" onClick={cerrarModal}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading}>
                {editingProducto ? 'Actualizar' : 'Crear'}
              </Button>
            </Group>
          </form>
        </Tabs>
      </Modal>
    </Paper>
  )
}

export default ProductosManagement
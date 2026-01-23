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
  IconBarcode
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'

interface Producto {
  id: string
  codigo: string
  nombre: string
}

interface Variante {
  id: string
  producto_id: string
  producto?: { codigo: string; nombre: string }
  sku: string
  nombre: string
  precio_compra: number
  precio_venta: number
  activo: boolean
  created_at: string
  stock?: { cantidad_actual: number }[]
}

const VariantesManagement: React.FC = () => {
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
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
      activo: true
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
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo, nombre')
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)
        .order('nombre', { ascending: true })

      if (error) throw error
      setProductos(data || [])
    } catch (error: any) {
      console.error('Error cargando productos:', error)
    }
  }

  const cargarVariantes = async () => {
    if (!empresaActual?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('variantes')
        .select(`
          *,
          producto:productos(codigo, nombre),
          stock:stock_actual(cantidad_actual)
        `)
        .eq('empresa_id', empresaActual.id)
        .order('sku', { ascending: true })

      if (error) throw error
      setVariantes(data || [])
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX />
      })
    } finally {
      setLoading(false)
    }
  }

  const guardarVariante = async (values: typeof form.values) => {
    if (!empresaActual?.id) return

    setLoading(true)
    try {
      const varianteData = {
        ...values,
        empresa_id: empresaActual.id
      }

      let error
      if (editingVariante) {
        // Actualizar
        const result = await supabase
          .from('variantes')
          .update(varianteData)
          .eq('id', editingVariante.id)
        error = result.error
      } else {
        // Verificar que el SKU no exista
        const { data: existingSku } = await supabase
          .from('variantes')
          .select('id')
          .eq('empresa_id', empresaActual.id)
          .eq('sku', values.sku)
          .single()

        if (existingSku) {
          throw new Error('Ya existe una variante con este SKU')
        }

        // Crear
        const result = await supabase
          .from('variantes')
          .insert(varianteData)
        error = result.error
      }

      if (error) throw error

      notifications.show({
        title: 'Éxito',
        message: `Variante ${editingVariante ? 'actualizada' : 'creada'} exitosamente`,
        color: 'green',
        icon: <IconCheck />
      })

      cerrarModal()
      await cargarVariantes()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message,
        color: 'red',
        icon: <IconX />
      })
    } finally {
      setLoading(false)
    }
  }

  const eliminarVariante = async (variante: Variante) => {
    if (!confirm(`¿Estás seguro de eliminar la variante "${variante.sku}"?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('variantes')
        .delete()
        .eq('id', variante.id)

      if (error) throw error

      notifications.show({
        title: 'Éxito',
        message: 'Variante eliminada exitosamente',
        color: 'green',
        icon: <IconCheck />
      })

      await cargarVariantes()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'No se puede eliminar la variante. Puede tener movimientos asociados.',
        color: 'red',
        icon: <IconX />
      })
    } finally {
      setLoading(false)
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
        activo: variante.activo
      })
    } else {
      setEditingVariante(null)
      form.reset()
    }
    setModalOpened(true)
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingVariante(null)
    form.reset()
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

  useEffect(() => {
    cargarProductos()
    cargarVariantes()
  }, [empresaActual?.id])

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
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarVariante(variante)}
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
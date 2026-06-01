// =====================================================
// XENTRA - Stocks Management Component
// =====================================================

import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Badge,
  Group,
  Text,
  NumberInput,
  Button,
  Grid,
  Select,
  Alert,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  Title
} from '@mantine/core'
import {
  IconPackage,
  IconArrowUp,
  IconArrowDown,
  IconAlertTriangle,
  IconPlus,
  IconMinus,
  IconTransfer,
  IconHistory,
  IconFileText
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { TableSkeleton } from '@/components/UI/LoadingStates'
import { useCachedQuery, supabaseCache } from '@/utils/supabaseCache'
import HistorialMovimientos from './HistorialMovimientos'
import MovimientosManagement from './MovimientosManagement'

interface InventarioItem {
  id: string
  empresa_id: string
  variante_id: string
  ubicacion_id: string
  cantidad_actual: number
  costo_promedio: number
  fecha_ultima_actualizacion: string
  
  // Relaciones
  variante: { 
    sku: string
    nombre: string
    producto: { nombre: string; codigo: string }
  }
  ubicacion: { nombre: string; tipo: string }
}

interface MovimientoInventario {
  tipo: 'entrada' | 'salida' | 'transferencia' | 'ajuste'
  motivo: 'inventario_inicial' | 'compra' | 'venta' | 'ajuste_positivo' | 'ajuste_negativo' | 
          'devolucion_cliente' | 'devolucion_proveedor' | 'merma' | 'transferencia_entrada' | 
          'transferencia_salida' | 'produccion' | 'consumo_produccion'
  cantidad: number
  ubicacion_destino?: string
  documento_referencia?: string
  observaciones?: string
  costo_unitario?: number
}

export default function InventarioManagement() {
  const [inventario, setInventario] = useState<InventarioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [ubicacionFiltro, setUbicacionFiltro] = useState<string>('')
  const [stockBajo, setStockBajo] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(false)
  const [modalHistorial, setModalHistorial] = useState(false)
  const [modalMovimientos, setModalMovimientos] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState<InventarioItem | null>(null)

  const { empresaActual, ubicaciones } = useAuthStore()

  const cargarInventario = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)
      
      // Usar cache para inventario
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('stock_actual')
            .select(`
              *,
              variante:variantes(
                sku, 
                nombre,
                producto:productos(nombre, codigo)
              ),
              ubicacion:ubicaciones(nombre, tipo)
            `)
            .eq('empresa_id', empresaActual.id)
            .order('fecha_ultima_actualizacion', { ascending: false })

          if (error) throw error
          return data || []
        },
        'stock_actual',
        { empresa_id: empresaActual.id },
        2 * 60 * 1000 // Cache 2 minutos
      )

      setInventario(data)
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo cargar el inventario')
      console.error('Error cargando inventario:', error)
    } finally {
      setLoading(false)
    }
  }

  const realizarMovimiento = async (movimiento: MovimientoInventario) => {
    if (!itemSeleccionado) return

    try {
      await NotificationManager.loading(
        'Procesando movimiento...',
        (async () => {
          const { error } = await supabase.rpc('realizar_movimiento_inventario', {
            p_inventario_id: itemSeleccionado.id,
            p_tipo: movimiento.tipo,
            p_cantidad: movimiento.cantidad,
            p_motivo: movimiento.motivo,
            p_ubicacion_destino: movimiento.ubicacion_destino
          })
          if (error) throw error
        })(),
        {
          success: 'Movimiento registrado exitosamente',
          error: 'No se pudo registrar el movimiento'
        }
      )

      // Invalidar cache y recargar
      supabaseCache.invalidateTable('inventario')
      cargarInventario()
      setModalMovimiento(false)
      setItemSeleccionado(null)
    } catch (error) {
      console.error('Error en movimiento:', error)
    }
  }

  // Filtrar inventario
  const inventarioFiltrado = inventario.filter(item => {
    const cumpleFiltroUbicacion = !ubicacionFiltro || item.ubicacion_id === ubicacionFiltro
    const cumpleFiltroStock = !stockBajo || item.cantidad_actual <= 10 // Stock mínimo temporal
    return cumpleFiltroUbicacion && cumpleFiltroStock
  })

  // Estadísticas
  const stats = {
    totalItems: inventario.length,
    stockBajo: inventario.filter(item => item.cantidad_actual <= 10).length, // Stock mínimo temporal
    sinStock: inventario.filter(item => item.cantidad_actual === 0).length,
    valorInventario: inventario.reduce((sum, item) => sum + (item.cantidad_actual * item.costo_promedio), 0)
  }

  useEffect(() => {
    cargarInventario()
  }, [empresaActual?.id])

  if (loading) return <TableSkeleton />

  return (
    <div className="p-6">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2} mb="xs">📦 Gestión de Stocks</Title>
          <Text c="dimmed">
            Control completo de stock y movimientos por ubicación
          </Text>
        </div>
        <Group>
          <Button 
            leftSection={<IconPlus size={16} />} 
            color="green"
            onClick={() => {
              setItemSeleccionado(null)
              setModalMovimiento(true)
            }}
          >
            Nuevo Movimiento
          </Button>
          <Button 
            leftSection={<IconFileText size={16} />} 
            color="blue"
            variant="light"
            onClick={() => setModalMovimientos(true)}
          >
            Movimientos Completos
          </Button>
          <Button leftSection={<IconTransfer size={16} />} variant="light">
            Transferencia
          </Button>
        </Group>
      </Group>

      {/* Estadísticas */}
      <Grid mb="lg">
        <Grid.Col span={3}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Total Items</Text>
                <Text size="xl" fw={700}>{stats.totalItems}</Text>
              </div>
              <IconPackage size={32} color="blue" />
            </Group>
          </Card>
        </Grid.Col>
        
        <Grid.Col span={3}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Stock Bajo</Text>
                <Text size="xl" fw={700} c="orange">{stats.stockBajo}</Text>
              </div>
              <IconAlertTriangle size={32} color="orange" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Sin Stock</Text>
                <Text size="xl" fw={700} c="red">{stats.sinStock}</Text>
              </div>
              <IconArrowDown size={32} color="red" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={3}>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Valor Inventario</Text>
                <Text size="xl" fw={700} c="green">
                  ${stats.valorInventario.toLocaleString()}
                </Text>
              </div>
              <IconArrowUp size={32} color="green" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Filtros */}
      <Card withBorder mb="lg">
        <Group>
          <Select
            placeholder="Filtrar por ubicación"
            data={ubicaciones.map(ub => ({ value: ub.id, label: ub.nombre }))}
            value={ubicacionFiltro}
            onChange={(value) => setUbicacionFiltro(value || '')}
            clearable
          />
          <Button 
            variant={stockBajo ? 'filled' : 'light'}
            color="orange"
            onClick={() => setStockBajo(!stockBajo)}
          >
            Solo stock bajo
          </Button>
        </Group>
      </Card>

      {/* Alertas de stock */}
      {stats.stockBajo > 0 && (
        <Alert 
          icon={<IconAlertTriangle size={16} />}
          title="Productos con stock bajo"
          color="orange"
          mb="lg"
        >
          {stats.stockBajo} productos están por debajo del stock mínimo
        </Alert>
      )}

      {/* Tabla de inventario */}
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Producto</Table.Th>
            <Table.Th>Ubicación</Table.Th>
            <Table.Th>Stock Actual</Table.Th>
            <Table.Th>Stock Mínimo</Table.Th>
            <Table.Th>Costo Promedio</Table.Th>
            <Table.Th>Valor Stock</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {inventarioFiltrado.map((item) => {
            const valorStock = item.cantidad_actual * item.costo_promedio
            const estadoStock = item.cantidad_actual === 0 ? 'sin-stock' : 
                              item.cantidad_actual <= 10 ? 'bajo' : 'normal' // Stock mínimo temporal

            return (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <div>
                    <Text fw={500}>{item.variante.producto.nombre}</Text>
                    <Text size="sm" c="dimmed">{item.variante.producto.codigo}</Text>
                    <Text size="xs" c="blue">{item.variante.nombre}</Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Badge variant="outline">
                    {item.ubicacion.nombre}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} size="lg">
                    {item.cantidad_actual}
                  </Text>
                </Table.Td>
                <Table.Td>N/A</Table.Td>
                <Table.Td>${item.costo_promedio.toFixed(2)}</Table.Td>
                <Table.Td>${valorStock.toFixed(2)}</Table.Td>
                <Table.Td>
                  <Badge 
                    color={
                      estadoStock === 'sin-stock' ? 'red' :
                      estadoStock === 'bajo' ? 'orange' : 'green'
                    }
                  >
                    {estadoStock === 'sin-stock' ? 'Sin stock' :
                     estadoStock === 'bajo' ? 'Stock bajo' : 'Normal'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon 
                      variant="subtle" 
                      color="green"
                      onClick={() => {
                        setItemSeleccionado(item)
                        setModalMovimiento(true)
                      }}
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red">
                      <IconMinus size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="subtle" 
                      color="blue"
                      onClick={() => {
                        setItemSeleccionado(item)
                        setModalHistorial(true)
                      }}
                    >
                      <IconHistory size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>

      {/* Modal de movimientos */}
      <Modal
        opened={modalMovimiento}
        onClose={() => setModalMovimiento(false)}
        title="Realizar Movimiento de Inventario"
        size="md"
      >
        {itemSeleccionado && (
          <MovimientoForm 
            item={itemSeleccionado}
            onSubmit={realizarMovimiento}
            onCancel={() => setModalMovimiento(false)}
          />
        )}
      </Modal>

      {/* Modal de historial */}
      <HistorialMovimientos
        inventarioId={itemSeleccionado?.id || ''}
        productoNombre={itemSeleccionado?.producto.nombre || ''}
        opened={modalHistorial}
        onClose={() => {
          setModalHistorial(false)
          setItemSeleccionado(null)
        }}
      />

      {/* Modal Movimientos Completos */}
      <Modal
        opened={modalMovimientos}
        onClose={() => setModalMovimientos(false)}
        title="📋 Movimientos Completos - Gestión de Stocks"
        size="100%"
        fullScreen
        padding={0}
      >
        <div style={{ height: 'calc(100vh - 60px)' }}>
          <MovimientosManagement />
        </div>
      </Modal>
    </div>
  )
}

// Componente para formulario de movimientos
function MovimientoForm({ 
  item, 
  onSubmit, 
  onCancel 
}: { 
  item: InventarioItem
  onSubmit: (movimiento: MovimientoInventario) => void
  onCancel: () => void
}) {
  const [tipo, setTipo] = useState<string>('entrada')
  const [cantidad, setCantidad] = useState<number>(0)
  const [motivo, setMotivo] = useState('')

  const handleSubmit = () => {
    onSubmit({
      tipo: tipo as MovimientoInventario['tipo'],
      cantidad,
      motivo
    })
  }

  return (
    <Stack>
      <Text>
        Producto: <strong>{item.producto.nombre}</strong><br/>
        Stock actual: <strong>{item.cantidad_actual}</strong>
      </Text>
      
      <Select
        label="Tipo de movimiento"
        value={tipo}
        onChange={(value) => setTipo(value || 'entrada')}
        data={[
          { value: 'entrada', label: 'Entrada de stock' },
          { value: 'salida', label: 'Salida de stock' },
          { value: 'ajuste', label: 'Ajuste de inventario' }
        ]}
      />
      
      <NumberInput
        label="Cantidad"
        value={cantidad}
        onChange={(value) => setCantidad(typeof value === 'number' ? value : 0)}
        min={1}
        required
      />
      
      <TextInput
        label="Motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Describe el motivo del movimiento"
        required
      />
      
      <Group justify="end">
        <Button variant="light" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          Registrar Movimiento
        </Button>
      </Group>
    </Stack>
  )
}
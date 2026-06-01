// =====================================================
// XENTRA - Reportes de Inventario Detallados
// =====================================================

import { useState, useEffect } from 'react'
import {
  Card,
  Grid,
  Group,
  Text,
  Button,
  Select,
  Table,
  Badge,
  Stack,
  NumberFormatter,
  Pagination,
  TextInput,
  Progress,
  SimpleGrid,
  Tabs,
  RingProgress,
  Flex,
  ThemeIcon
} from '@mantine/core'
import {
  IconPackage,
  IconSearch,
  IconDownload,
  IconFilter,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconCalendar,
  IconChartPie,
  IconRotateClockwise2,
  IconCurrencyDollar
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { useCachedQuery } from '@/utils/supabaseCache'
import { ExportadorReportes } from '@/utils/exportadorReportes'
import { TableSkeleton } from '@/components/UI/LoadingStates'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ItemInventario {
  id: string
  producto: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  stock_maximo: number
  costo_promedio: number
  precio_venta: number
  valor_total: number
  ultimo_movimiento?: string
  rotacion: number
  diasSinMovimiento: number
  estado: 'Normal' | 'Stock Bajo' | 'Sin Stock' | 'Sobrestock'
  margen: number
}

interface MetricasInventario {
  totalProductos: number
  valorTotal: number
  stockBajo: number
  sinStock: number
  sobrestock: number
  rotacionPromedio: number
  margenPromedio: number
}

interface FiltrosInventario {
  categoria?: string
  estado?: string
  busqueda?: string
  ordenarPor?: 'nombre' | 'stock' | 'valor' | 'rotacion'
  direccion?: 'asc' | 'desc'
}

const ESTADOS_STOCK = [
  { value: 'normal', label: 'Normal', color: 'green' },
  { value: 'bajo', label: 'Stock Bajo', color: 'yellow' },
  { value: 'sin_stock', label: 'Sin Stock', color: 'red' },
  { value: 'sobrestock', label: 'Sobrestock', color: 'blue' }
]

const OPCIONES_ORDEN = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'stock', label: 'Stock Actual' },
  { value: 'valor', label: 'Valor Total' },
  { value: 'rotacion', label: 'Rotación' }
]

export default function ReportesInventario() {
  const [inventario, setInventario] = useState<ItemInventario[]>([])
  const [metricas, setMetricas] = useState<MetricasInventario | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosInventario>({
    ordenarPor: 'nombre',
    direccion: 'asc'
  })
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [categorias, setCategorias] = useState<string[]>([])
  const [tabActiva, setTabActiva] = useState('general')

  const { empresaActual } = useAuthStore()
  const ITEMS_POR_PAGINA = 25

  const cargarDatosInventario = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)

      const [inventarioData, metricasData] = await Promise.all([
        cargarInventario(),
        cargarMetricas()
      ])

      setInventario(inventarioData.inventario)
      setTotalPaginas(Math.ceil(inventarioData.total / ITEMS_POR_PAGINA))
      setMetricas(metricasData)

    } catch (error) {
      NotificationManager.error('Error', 'No se pudieron cargar los datos de inventario')
      console.error('Error cargando inventario:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarInventario = async () => {
    let query = supabase
      .from('inventario')
      .select(`
        id,
        stock_actual,
        stock_minimo,
        stock_maximo,
        costo_promedio,
        ultimo_movimiento,
        producto:productos(
          id,
          nombre,
          precio_venta,
          categoria:categorias(nombre)
        )
      `)
      .eq('empresa_id', empresaActual?.id)

    // Aplicar filtros
    if (filtros.categoria) {
      query = query.eq('producto.categoria.nombre', filtros.categoria)
    }

    if (filtros.busqueda) {
      query = query.ilike('producto.nombre', `%${filtros.busqueda}%`)
    }

    // Ordenar
    if (filtros.ordenarPor) {
      const campo = filtros.ordenarPor === 'nombre' ? 'producto.nombre' :
                   filtros.ordenarPor === 'stock' ? 'stock_actual' :
                   filtros.ordenarPor === 'valor' ? 'costo_promedio' : 'ultimo_movimiento'
      
      query = query.order(campo, { ascending: filtros.direccion === 'asc' })
    }

    // Paginación
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    const fin = inicio + ITEMS_POR_PAGINA - 1
    query = query.range(inicio, fin)

    const { data, error, count } = await query

    if (error) throw error

    const inventarioFormateado: ItemInventario[] = data?.map(item => {
      const valorTotal = item.stock_actual * item.costo_promedio
      const diasSinMovimiento = item.ultimo_movimiento 
        ? Math.floor((Date.now() - new Date(item.ultimo_movimiento).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      const rotacion = diasSinMovimiento > 0 ? Math.max(0, 365 - diasSinMovimiento) / 365 : 0
      
      const margen = item.producto?.precio_venta && item.costo_promedio > 0
        ? ((item.producto.precio_venta - item.costo_promedio) / item.producto.precio_venta) * 100
        : 0

      const estado: ItemInventario['estado'] = 
        item.stock_actual === 0 ? 'Sin Stock' :
        item.stock_actual <= item.stock_minimo ? 'Stock Bajo' :
        item.stock_maximo && item.stock_actual >= item.stock_maximo ? 'Sobrestock' : 'Normal'

      return {
        id: item.id,
        producto: item.producto?.nombre || 'Sin nombre',
        categoria: item.producto?.categoria?.nombre || 'Sin categoría',
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        stock_maximo: item.stock_maximo || 0,
        costo_promedio: item.costo_promedio,
        precio_venta: item.producto?.precio_venta || 0,
        valor_total: valorTotal,
        ultimo_movimiento: item.ultimo_movimiento,
        rotacion: Math.round(rotacion * 100) / 100,
        diasSinMovimiento,
        estado,
        margen: Math.round(margen * 100) / 100
      }
    }) || []

    // Filtrar por estado si es necesario
    const inventarioFiltrado = filtros.estado 
      ? inventarioFormateado.filter(item => {
          switch (filtros.estado) {
            case 'normal': return item.estado === 'Normal'
            case 'bajo': return item.estado === 'Stock Bajo'
            case 'sin_stock': return item.estado === 'Sin Stock'
            case 'sobrestock': return item.estado === 'Sobrestock'
            default: return true
          }
        })
      : inventarioFormateado

    return { inventario: inventarioFiltrado, total: count || 0 }
  }

  const cargarMetricas = async () => {
    const { data: inventarioCompleto } = await supabase
      .from('inventario')
      .select(`
        stock_actual,
        stock_minimo,
        stock_maximo,
        costo_promedio,
        ultimo_movimiento
      `)
      .eq('empresa_id', empresaActual?.id)

    if (!inventarioCompleto) return null

    const totalProductos = inventarioCompleto.length
    const valorTotal = inventarioCompleto.reduce((sum, item) => 
      sum + (item.stock_actual * item.costo_promedio), 0)
    
    const stockBajo = inventarioCompleto.filter(item => 
      item.stock_actual <= item.stock_minimo).length
    
    const sinStock = inventarioCompleto.filter(item => 
      item.stock_actual === 0).length
    
    const sobrestock = inventarioCompleto.filter(item => 
      item.stock_maximo && item.stock_actual >= item.stock_maximo).length

    // Calcular rotación promedio
    const rotaciones = inventarioCompleto.map(item => {
      const diasSinMovimiento = item.ultimo_movimiento 
        ? Math.floor((Date.now() - new Date(item.ultimo_movimiento).getTime()) / (1000 * 60 * 60 * 24))
        : 999
      return Math.max(0, 365 - diasSinMovimiento) / 365
    })

    const rotacionPromedio = rotaciones.length > 0 
      ? rotaciones.reduce((sum, rot) => sum + rot, 0) / rotaciones.length 
      : 0

    return {
      totalProductos,
      valorTotal,
      stockBajo,
      sinStock,
      sobrestock,
      rotacionPromedio: Math.round(rotacionPromedio * 100) / 100,
      margenPromedio: 0 // Calcular si es necesario
    }
  }

  const cargarCategorias = async () => {
    if (!empresaActual?.id) return

    try {
      const { data } = await supabase
        .from('categorias')
        .select('nombre')
        .eq('empresa_id', empresaActual.id)

      setCategorias(data?.map(c => c.nombre) || [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const exportarReporte = async (formato: 'excel' | 'pdf') => {
    if (!inventario.length) {
      NotificationManager.error('Error', 'No hay datos para exportar')
      return
    }

    try {
      NotificationManager.loading('Exportando', `Generando reporte en ${formato.toUpperCase()}...`)

      const datosExportacion = inventario.map(item => ({
        producto: item.producto,
        categoria: item.categoria,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        costo_promedio: item.costo_promedio,
        valor_total: item.valor_total,
        ultimo_movimiento: item.ultimo_movimiento,
        estado: item.estado
      }))

      if (formato === 'excel') {
        ExportadorReportes.exportarInventarioExcel(datosExportacion)
      } else {
        ExportadorReportes.exportarInventarioPDF(datosExportacion)
      }

      NotificationManager.success('Exportado', 'Reporte generado exitosamente')
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo exportar el reporte')
      console.error('Error exportando:', error)
    }
  }

  const limpiarFiltros = () => {
    setFiltros({
      ordenarPor: 'nombre',
      direccion: 'asc'
    })
    setPaginaActual(1)
  }

  useEffect(() => {
    cargarCategorias()
  }, [empresaActual?.id])

  useEffect(() => {
    cargarDatosInventario()
  }, [empresaActual?.id, filtros, paginaActual])

  if (loading && !inventario.length) return <TableSkeleton />

  return (
    <Stack gap="xl">
      {/* Filtros */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>🔍 Filtros de Búsqueda</Text>
          <Group>
            <Button
              variant="light"
              size="sm"
              onClick={limpiarFiltros}
            >
              Limpiar
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <TextInput
            label="Buscar Producto"
            placeholder="Nombre del producto..."
            leftSection={<IconSearch size={16} />}
            value={filtros.busqueda || ''}
            onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.currentTarget.value }))}
          />
          
          <Select
            label="Categoría"
            placeholder="Todas las categorías"
            data={categorias}
            value={filtros.categoria}
            onChange={(categoria) => setFiltros(prev => ({ ...prev, categoria: categoria || undefined }))}
            clearable
          />
          
          <Select
            label="Estado del Stock"
            placeholder="Todos los estados"
            data={ESTADOS_STOCK}
            value={filtros.estado}
            onChange={(estado) => setFiltros(prev => ({ ...prev, estado: estado || undefined }))}
            clearable
          />
          
          <Group grow>
            <Select
              label="Ordenar por"
              data={OPCIONES_ORDEN}
              value={filtros.ordenarPor}
              onChange={(orden) => setFiltros(prev => ({ ...prev, ordenarPor: orden as any }))}
            />
            <Select
              label="Dirección"
              data={[
                { value: 'asc', label: 'Ascendente' },
                { value: 'desc', label: 'Descendente' }
              ]}
              value={filtros.direccion}
              onChange={(direccion) => setFiltros(prev => ({ ...prev, direccion: direccion as any }))}
            />
          </Group>
        </SimpleGrid>
      </Card>

      {/* Métricas */}
      {metricas && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Valor Total</Text>
                <NumberFormatter
                  value={metricas.valorTotal}
                  prefix="$"
                  thousandSeparator
                  decimalScale={0}
                  style={{ fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Text size="sm" c="dimmed">
                  {metricas.totalProductos} productos
                </Text>
              </div>
              <IconCurrencyDollar size={32} color="green" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Alertas de Stock</Text>
                <Text size="xl" fw={700} c="orange">
                  {metricas.stockBajo}
                </Text>
                <Text size="sm" c="red">
                  {metricas.sinStock} sin stock
                </Text>
              </div>
              <IconAlertTriangle size={32} color="orange" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Rotación Promedio</Text>
                <Text size="xl" fw={700}>
                  {(metricas.rotacionPromedio * 100).toFixed(1)}%
                </Text>
                <Text size="sm" c="dimmed">
                  anual
                </Text>
              </div>
              <IconRotateClockwise2 size={32} color="purple" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Distribución</Text>
                <Group gap="xs">
                  <Badge color="green" size="xs">{metricas.totalProductos - metricas.stockBajo - metricas.sinStock}</Badge>
                  <Badge color="orange" size="xs">{metricas.stockBajo}</Badge>
                  <Badge color="red" size="xs">{metricas.sinStock}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Normal / Bajo / Sin Stock
                </Text>
              </div>
              <IconChartPie size={32} color="blue" />
            </Group>
          </Card>
        </SimpleGrid>
      )}

      {/* Tabs para diferentes vistas */}
      <Tabs value={tabActiva} onChange={setTabActiva}>
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconPackage size={16} />}>
            Vista General
          </Tabs.Tab>
          <Tabs.Tab value="alertas" leftSection={<IconAlertTriangle size={16} />}>
            Alertas de Stock
          </Tabs.Tab>
          <Tabs.Tab value="rotacion" leftSection={<IconRotateClockwise2 size={16} />}>
            Análisis de Rotación
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general" pt="md">
          <VistaGeneralInventario 
            inventario={inventario}
            totalPaginas={totalPaginas}
            paginaActual={paginaActual}
            setPaginaActual={setPaginaActual}
            exportarReporte={exportarReporte}
          />
        </Tabs.Panel>

        <Tabs.Panel value="alertas" pt="md">
          <VistaAlertasStock inventario={inventario.filter(item => 
            item.estado === 'Stock Bajo' || item.estado === 'Sin Stock'
          )} />
        </Tabs.Panel>

        <Tabs.Panel value="rotacion" pt="md">
          <VistaRotacionInventario inventario={inventario} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

// Componente Vista General
function VistaGeneralInventario({ 
  inventario, 
  totalPaginas, 
  paginaActual, 
  setPaginaActual,
  exportarReporte 
}: {
  inventario: ItemInventario[]
  totalPaginas: number
  paginaActual: number
  setPaginaActual: (pagina: number) => void
  exportarReporte: (formato: 'excel' | 'pdf') => void
}) {
  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600}>📦 Inventario General</Text>
        <Group>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={() => exportarReporte('excel')}
            variant="light"
            color="green"
            size="sm"
          >
            Excel
          </Button>
          <Button
            leftSection={<IconDownload size={16} />}
            onClick={() => exportarReporte('pdf')}
            variant="light"
            color="red"
            size="sm"
          >
            PDF
          </Button>
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={1000}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Producto</Table.Th>
              <Table.Th>Categoría</Table.Th>
              <Table.Th>Stock Actual</Table.Th>
              <Table.Th>Stock Mínimo</Table.Th>
              <Table.Th>Costo Promedio</Table.Th>
              <Table.Th>Valor Total</Table.Th>
              <Table.Th>Rotación</Table.Th>
              <Table.Th>Estado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {inventario.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>
                  <Text fw={500}>{item.producto}</Text>
                </Table.Td>
                <Table.Td>{item.categoria}</Table.Td>
                <Table.Td>
                  <Text fw={600}>{item.stock_actual}</Text>
                </Table.Td>
                <Table.Td>{item.stock_minimo}</Table.Td>
                <Table.Td>
                  <NumberFormatter
                    value={item.costo_promedio}
                    prefix="$"
                    thousandSeparator
                    decimalScale={2}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberFormatter
                    value={item.valor_total}
                    prefix="$"
                    thousandSeparator
                    decimalScale={0}
                    style={{ fontWeight: 600 }}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Progress
                      value={item.rotacion * 100}
                      size="xs"
                      w={50}
                      color={item.rotacion > 0.5 ? 'green' : item.rotacion > 0.2 ? 'yellow' : 'red'}
                    />
                    <Text size="sm">{(item.rotacion * 100).toFixed(0)}%</Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      item.estado === 'Normal' ? 'green' :
                      item.estado === 'Stock Bajo' ? 'orange' :
                      item.estado === 'Sin Stock' ? 'red' : 'blue'
                    }
                    variant="light"
                    size="sm"
                  >
                    {item.estado}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {totalPaginas > 1 && (
        <Group justify="center" mt="md">
          <Pagination
            value={paginaActual}
            onChange={setPaginaActual}
            total={totalPaginas}
            size="sm"
          />
        </Group>
      )}
    </Card>
  )
}

// Componente Vista Alertas
function VistaAlertasStock({ inventario }: { inventario: ItemInventario[] }) {
  const stockBajo = inventario.filter(item => item.estado === 'Stock Bajo')
  const sinStock = inventario.filter(item => item.estado === 'Sin Stock')

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} c="orange">⚠️ Stock Bajo ({stockBajo.length})</Text>
          <Badge color="orange">{stockBajo.length} productos</Badge>
        </Group>
        <Stack gap="sm" mah={400} style={{ overflow: 'auto' }}>
          {stockBajo.map((item) => (
            <Group key={item.id} justify="space-between" p="sm" style={{ backgroundColor: '#fff3cd', borderRadius: 8 }}>
              <div>
                <Text fw={500} size="sm">{item.producto}</Text>
                <Text size="xs" c="dimmed">{item.categoria}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="sm" c="orange">{item.stock_actual} / {item.stock_minimo}</Text>
                <Text size="xs" c="dimmed">Actual / Mínimo</Text>
              </div>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} c="red">🚨 Sin Stock ({sinStock.length})</Text>
          <Badge color="red">{sinStock.length} productos</Badge>
        </Group>
        <Stack gap="sm" mah={400} style={{ overflow: 'auto' }}>
          {sinStock.map((item) => (
            <Group key={item.id} justify="space-between" p="sm" style={{ backgroundColor: '#f8d7da', borderRadius: 8 }}>
              <div>
                <Text fw={500} size="sm">{item.producto}</Text>
                <Text size="xs" c="dimmed">{item.categoria}</Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="sm" c="red">0 unidades</Text>
                <Text size="xs" c="dimmed">{item.diasSinMovimiento} días</Text>
              </div>
            </Group>
          ))}
        </Stack>
      </Card>
    </SimpleGrid>
  )
}

// Componente Vista Rotación
function VistaRotacionInventario({ inventario }: { inventario: ItemInventario[] }) {
  const alta = inventario.filter(item => item.rotacion > 0.7)
  const media = inventario.filter(item => item.rotacion > 0.3 && item.rotacion <= 0.7)
  const baja = inventario.filter(item => item.rotacion <= 0.3)

  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="lg">
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} c="green">🚀 Alta Rotación</Text>
          <Badge color="green">{alta.length}</Badge>
        </Group>
        <RingProgress
          sections={[
            { value: (alta.length / inventario.length) * 100, color: 'green' }
          ]}
          label={
            <div style={{ textAlign: 'center' }}>
              <Text fw={600} size="xl">
                {Math.round((alta.length / inventario.length) * 100)}%
              </Text>
              <Text size="xs" c="dimmed">
                del inventario
              </Text>
            </div>
          }
          mb="md"
        />
        <Text size="sm" c="dimmed">
          Productos con más del 70% de rotación anual
        </Text>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} c="yellow">⚡ Media Rotación</Text>
          <Badge color="yellow">{media.length}</Badge>
        </Group>
        <RingProgress
          sections={[
            { value: (media.length / inventario.length) * 100, color: 'yellow' }
          ]}
          label={
            <div style={{ textAlign: 'center' }}>
              <Text fw={600} size="xl">
                {Math.round((media.length / inventario.length) * 100)}%
              </Text>
              <Text size="xs" c="dimmed">
                del inventario
              </Text>
            </div>
          }
          mb="md"
        />
        <Text size="sm" c="dimmed">
          Productos con rotación entre 30% y 70%
        </Text>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600} c="red">🐌 Baja Rotación</Text>
          <Badge color="red">{baja.length}</Badge>
        </Group>
        <RingProgress
          sections={[
            { value: (baja.length / inventario.length) * 100, color: 'red' }
          ]}
          label={
            <div style={{ textAlign: 'center' }}>
              <Text fw={600} size="xl">
                {Math.round((baja.length / inventario.length) * 100)}%
              </Text>
              <Text size="xs" c="dimmed">
                del inventario
              </Text>
            </div>
          }
          mb="md"
        />
        <Text size="sm" c="dimmed">
          Productos con menos del 30% de rotación
        </Text>
      </Card>
    </SimpleGrid>
  )
}
// =====================================================
// XENTRA - Reportes de Ventas Detallados
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
  ActionIcon,
  Stack,
  NumberFormatter,
  Pagination,
  TextInput,
  Flex,
  Paper,
  RingProgress,
  SimpleGrid
} from '@mantine/core'
import { DatePickerInput, DateValue } from '@mantine/dates'
import {
  IconCalendar,
  IconSearch,
  IconDownload,
  IconFilter,
  IconChartLine,
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconCurrencyDollar
} from '@tabler/icons-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { useCachedQuery } from '@/utils/supabaseCache'
import { ExportadorReportes } from '@/utils/exportadorReportes'
import { TableSkeleton } from '@/components/UI/LoadingStates'

interface VentaDetalle {
  id: string
  fecha: string
  total: number
  subtotal: number
  descuento: number
  impuestos: number
  cliente?: string
  vendedor?: string
  estado: string
  items: Array<{
    producto: string
    categoria: string
    cantidad: number
    precio_unitario: number
    total: number
  }>
}

interface MetricasVentas {
  totalVentas: number
  cantidadVentas: number
  promedioVenta: number
  crecimiento: number
  ventasPorCliente: number
  ticketPromedio: number
}

interface FiltrosVenta {
  fechaInicio?: DateValue
  fechaFin?: DateValue
  cliente?: string
  vendedor?: string
  categoria?: string
  estadoVenta?: string
  busqueda?: string
}

const ESTADOS_VENTA = [
  { value: 'completada', label: 'Completada' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'cancelada', label: 'Cancelada' }
]

const PERIODOS_RAPIDOS = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mes' },
  { value: 'trimestre', label: 'Este trimestre' },
  { value: 'año', label: 'Este año' }
]

export default function ReportesVentas() {
  const [ventas, setVentas] = useState<VentaDetalle[]>([])
  const [metricas, setMetricas] = useState<MetricasVentas | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<FiltrosVenta>({
    fechaInicio: startOfMonth(new Date()),
    fechaFin: endOfMonth(new Date())
  })
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [clientes, setClientes] = useState<string[]>([])
  const [vendedores, setVendedores] = useState<string[]>([])
  const [categorias, setCategorias] = useState<string[]>([])

  const { empresaActual, usuario } = useAuthStore()
  const ITEMS_POR_PAGINA = 25

  const cargarDatosVentas = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)

      const [ventasData, metricasData] = await Promise.all([
        cargarVentas(),
        cargarMetricas()
      ])

      setVentas(ventasData.ventas)
      setTotalPaginas(Math.ceil(ventasData.total / ITEMS_POR_PAGINA))
      setMetricas(metricasData)

    } catch (error) {
      NotificationManager.error('Error', 'No se pudieron cargar los datos de ventas')
      console.error('Error cargando ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarVentas = async () => {
    let query = supabase
      .from('ventas')
      .select(`
        id,
        created_at,
        total,
        subtotal,
        descuento,
        impuestos,
        estado,
        cliente:clientes(nombre),
        vendedor:profiles(nombre),
        venta_items(
          cantidad,
          precio_unitario,
          total,
          variante:variantes(
            nombre,
            producto:productos(
              nombre,
              categoria:categorias(nombre)
            )
          )
        )
      `)
      .eq('empresa_id', empresaActual?.id)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filtros.fechaInicio) {
      query = query.gte('created_at', filtros.fechaInicio.toISOString())
    }
    if (filtros.fechaFin) {
      query = query.lte('created_at', filtros.fechaFin.toISOString())
    }
    if (filtros.estadoVenta) {
      query = query.eq('estado', filtros.estadoVenta)
    }

    // Paginación
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA
    const fin = inicio + ITEMS_POR_PAGINA - 1
    query = query.range(inicio, fin)

    const { data, error, count } = await query

    if (error) throw error

    const ventasFormateadas: VentaDetalle[] = data?.map(venta => ({
      id: venta.id,
      fecha: venta.created_at,
      total: venta.total,
      subtotal: venta.subtotal,
      descuento: venta.descuento || 0,
      impuestos: venta.impuestos || 0,
      cliente: venta.cliente?.nombre,
      vendedor: venta.vendedor?.nombre,
      estado: venta.estado,
      items: venta.venta_items?.map(item => ({
        producto: item.variante?.producto?.nombre || 'Sin nombre',
        categoria: item.variante?.producto?.categoria?.nombre || 'Sin categoría',
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        total: item.total
      })) || []
    })) || []

    return { ventas: ventasFormateadas, total: count || 0 }
  }

  const cargarMetricas = async () => {
    const fechaInicio = filtros.fechaInicio || startOfMonth(new Date())
    const fechaFin = filtros.fechaFin || endOfMonth(new Date())
    
    // Período anterior para comparación
    const diasPeriodo = Math.floor((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24))
    const fechaInicioAnterior = new Date(fechaInicio)
    fechaInicioAnterior.setDate(fechaInicioAnterior.getDate() - diasPeriodo)

    const [ventasActuales, ventasAnteriores] = await Promise.all([
      supabase
        .from('ventas')
        .select('total, id')
        .eq('empresa_id', empresaActual?.id)
        .gte('created_at', fechaInicio.toISOString())
        .lte('created_at', fechaFin.toISOString()),
      
      supabase
        .from('ventas')
        .select('total')
        .eq('empresa_id', empresaActual?.id)
        .gte('created_at', fechaInicioAnterior.toISOString())
        .lt('created_at', fechaInicio.toISOString())
    ])

    const totalActual = ventasActuales.data?.reduce((sum, v) => sum + v.total, 0) || 0
    const cantidadActual = ventasActuales.data?.length || 0
    const totalAnterior = ventasAnteriores.data?.reduce((sum, v) => sum + v.total, 0) || 0

    const crecimiento = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0
    const promedioVenta = cantidadActual > 0 ? totalActual / cantidadActual : 0

    // Ventas por cliente único
    const clientesUnicos = new Set()
    ventasActuales.data?.forEach(venta => {
      if (venta.id) clientesUnicos.add(venta.id)
    })

    return {
      totalVentas: totalActual,
      cantidadVentas: cantidadActual,
      promedioVenta: promedioVenta,
      crecimiento: Math.round(crecimiento * 100) / 100,
      ventasPorCliente: clientesUnicos.size,
      ticketPromedio: promedioVenta
    }
  }

  const cargarOpcionesFiltros = async () => {
    if (!empresaActual?.id) return

    try {
      const [clientesData, vendedoresData, categoriasData] = await Promise.all([
        supabase.from('clientes').select('nombre').eq('empresa_id', empresaActual.id),
        supabase.from('profiles').select('nombre'),
        supabase.from('categorias').select('nombre').eq('empresa_id', empresaActual.id)
      ])

      setClientes(clientesData.data?.map(c => c.nombre) || [])
      setVendedores(vendedoresData.data?.map(v => v.nombre) || [])
      setCategorias(categoriasData.data?.map(c => c.nombre) || [])
    } catch (error) {
      console.error('Error cargando opciones de filtros:', error)
    }
  }

  const aplicarPeriodoRapido = (periodo: string) => {
    const hoy = new Date()
    let fechaInicio: Date, fechaFin: Date

    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date(hoy)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = new Date(hoy)
        fechaFin.setHours(23, 59, 59, 999)
        break
      case 'ayer':
        fechaInicio = subDays(hoy, 1)
        fechaInicio.setHours(0, 0, 0, 0)
        fechaFin = subDays(hoy, 1)
        fechaFin.setHours(23, 59, 59, 999)
        break
      case 'semana':
        fechaInicio = startOfWeek(hoy, { weekStartsOn: 1 })
        fechaFin = endOfWeek(hoy, { weekStartsOn: 1 })
        break
      case 'mes':
        fechaInicio = startOfMonth(hoy)
        fechaFin = endOfMonth(hoy)
        break
      case 'trimestre':
        const trimestre = Math.floor(hoy.getMonth() / 3)
        fechaInicio = new Date(hoy.getFullYear(), trimestre * 3, 1)
        fechaFin = new Date(hoy.getFullYear(), (trimestre + 1) * 3, 0)
        break
      case 'año':
        fechaInicio = new Date(hoy.getFullYear(), 0, 1)
        fechaFin = new Date(hoy.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setFiltros(prev => ({
      ...prev,
      fechaInicio,
      fechaFin
    }))
  }

  const exportarReporte = async (formato: 'excel' | 'pdf') => {
    if (!ventas.length) {
      NotificationManager.error('Error', 'No hay datos para exportar')
      return
    }

    try {
      NotificationManager.loading('Exportando', `Generando reporte en ${formato.toUpperCase()}...`)

      const datosExportacion = ventas.flatMap(venta =>
        venta.items.map(item => ({
          fecha: venta.fecha,
          producto: item.producto,
          categoria: item.categoria,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          total: item.total,
          cliente: venta.cliente,
          vendedor: venta.vendedor
        }))
      )

      const periodo = `${format(filtros.fechaInicio || new Date(), 'dd/MM/yyyy')} - ${format(filtros.fechaFin || new Date(), 'dd/MM/yyyy')}`

      if (formato === 'excel') {
        ExportadorReportes.exportarVentasExcel(datosExportacion, periodo)
      } else {
        ExportadorReportes.exportarVentasPDF(datosExportacion, periodo)
      }

      NotificationManager.success('Exportado', 'Reporte generado exitosamente')
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo exportar el reporte')
      console.error('Error exportando:', error)
    }
  }

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: startOfMonth(new Date()),
      fechaFin: endOfMonth(new Date())
    })
    setPaginaActual(1)
  }

  useEffect(() => {
    cargarOpcionesFiltros()
  }, [empresaActual?.id])

  useEffect(() => {
    cargarDatosVentas()
  }, [empresaActual?.id, filtros, paginaActual])

  if (loading && !ventas.length) return <TableSkeleton />

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
          <Select
            label="Período Rápido"
            placeholder="Seleccionar período"
            data={PERIODOS_RAPIDOS}
            onChange={aplicarPeriodoRapido}
            clearable
          />
          
          <DatePickerInput
            label="Fecha Inicio"
            placeholder="Desde"
            value={filtros.fechaInicio}
            onChange={(fecha) => setFiltros(prev => ({ ...prev, fechaInicio: fecha }))}
            locale="es"
            clearable
          />
          
          <DatePickerInput
            label="Fecha Fin"
            placeholder="Hasta"
            value={filtros.fechaFin}
            onChange={(fecha) => setFiltros(prev => ({ ...prev, fechaFin: fecha }))}
            locale="es"
            clearable
          />
          
          <Select
            label="Estado"
            placeholder="Estado de venta"
            data={ESTADOS_VENTA}
            value={filtros.estadoVenta}
            onChange={(estado) => setFiltros(prev => ({ ...prev, estadoVenta: estado || undefined }))}
            clearable
          />
        </SimpleGrid>
      </Card>

      {/* Métricas */}
      {metricas && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Total Ventas</Text>
                <NumberFormatter
                  value={metricas.totalVentas}
                  prefix="$"
                  thousandSeparator
                  decimalScale={0}
                  style={{ fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Group gap="xs">
                  {metricas.crecimiento >= 0 ? (
                    <IconTrendingUp size={16} color="green" />
                  ) : (
                    <IconTrendingDown size={16} color="red" />
                  )}
                  <Text size="sm" c={metricas.crecimiento >= 0 ? 'green' : 'red'}>
                    {Math.abs(metricas.crecimiento)}%
                  </Text>
                </Group>
              </div>
              <IconCurrencyDollar size={32} color="blue" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Cantidad Ventas</Text>
                <Text size="xl" fw={700}>
                  {metricas.cantidadVentas}
                </Text>
                <Text size="sm" c="dimmed">
                  transacciones
                </Text>
              </div>
              <IconChartLine size={32} color="green" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Ticket Promedio</Text>
                <NumberFormatter
                  value={metricas.ticketPromedio}
                  prefix="$"
                  thousandSeparator
                  decimalScale={0}
                  style={{ fontSize: '1.5rem', fontWeight: 700 }}
                />
                <Text size="sm" c="dimmed">
                  por venta
                </Text>
              </div>
              <IconTrendingUp size={32} color="purple" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">Clientes Únicos</Text>
                <Text size="xl" fw={700}>
                  {metricas.ventasPorCliente}
                </Text>
                <Text size="sm" c="dimmed">
                  compradores
                </Text>
              </div>
              <IconUsers size={32} color="orange" />
            </Group>
          </Card>
        </SimpleGrid>
      )}

      {/* Tabla de Ventas */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>📋 Detalle de Ventas</Text>
          <Group>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => exportarReporte('excel')}
              variant="light"
              color="green"
            >
              Excel
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => exportarReporte('pdf')}
              variant="light"
              color="red"
            >
              PDF
            </Button>
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Cliente</Table.Th>
                <Table.Th>Vendedor</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Subtotal</Table.Th>
                <Table.Th>Descuento</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Estado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ventas.map((venta) => (
                <Table.Tr key={venta.id}>
                  <Table.Td>
                    {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </Table.Td>
                  <Table.Td>{venta.cliente || 'Cliente General'}</Table.Td>
                  <Table.Td>{venta.vendedor || 'Sin asignar'}</Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {venta.items.length} item{venta.items.length !== 1 ? 's' : ''}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <NumberFormatter
                      value={venta.subtotal}
                      prefix="$"
                      thousandSeparator
                      decimalScale={0}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberFormatter
                      value={venta.descuento}
                      prefix="$"
                      thousandSeparator
                      decimalScale={0}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberFormatter
                      value={venta.total}
                      prefix="$"
                      thousandSeparator
                      decimalScale={0}
                      style={{ fontWeight: 600 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={venta.estado === 'completada' ? 'green' : 
                             venta.estado === 'pendiente' ? 'yellow' : 'red'}
                      variant="light"
                      size="sm"
                    >
                      {venta.estado}
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
    </Stack>
  )
}
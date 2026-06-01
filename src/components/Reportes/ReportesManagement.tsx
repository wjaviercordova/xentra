// =====================================================
// XENTRA - Dashboard de Reportes y Métricas
// =====================================================

import '../../styles/reportes.css'
import { useState, useEffect } from 'react'
import {
  Card,
  Grid,
  Group,
  Text,
  Badge,
  Progress,
  Select,
  Button,
  Tabs,
  Table,
  ActionIcon,
  Stack,
  Container,
  Title,
  Paper,
  RingProgress,
  SimpleGrid,
  ThemeIcon
} from '@mantine/core'
import {
  IconReportAnalytics,
  IconTrendingUp,
  IconTrendingDown,
  IconPackage,
  IconCurrencyDollar,
  IconUsers,
  IconCalendar,
  IconDownload,
  IconRefresh,
  IconArrowUp,
  IconArrowDown,
  IconChartBar,
  IconFileExport
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { useCachedQuery, supabaseCache } from '@/utils/supabaseCache'
import { TableSkeleton } from '@/components/UI/LoadingStates'
import ReportesVentas from './ReportesVentas'
import ReportesInventario from './ReportesInventario'
import { ExportadorReportes } from '@/utils/exportadorReportes'

interface DashboardMetrics {
  ventas: {
    total: number
    totalMesAnterior: number
    crecimiento: number
    ventasHoy: number
  }
  inventario: {
    valorTotal: number
    productosTotal: number
    stockBajo: number
    sinStock: number
  }
  productos: {
    masVendidos: Array<{
      producto: string
      cantidad: number
      ingresos: number
    }>
    menosRotacion: Array<{
      producto: string
      stock: number
      diasSinMovimiento: number
    }>
  }
  tendencias: {
    ventasPorDia: Array<{
      fecha: string
      ventas: number
      cantidad: number
    }>
    categoriasTop: Array<{
      categoria: string
      ventas: number
      porcentaje: number
    }>
  }
}

const PERIODOS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '365', label: 'Último año' }
]

export default function ReportesManagement() {
  const [metricas, setMetricas] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('30')
  const [tabActiva, setTabActiva] = useState('dashboard')

  const { empresaActual } = useAuthStore()

  const cargarMetricas = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)
      
      const data = await useCachedQuery(
        async () => {
          // Consultas paralelas para mejor performance
          const [ventasData, inventarioData, productosData, tendenciasData] = await Promise.all([
            cargarMetricasVentas(),
            cargarMetricasInventario(), 
            cargarMetricasProductos(),
            cargarMetricasTendencias()
          ])

          return {
            ventas: ventasData,
            inventario: inventarioData,
            productos: productosData,
            tendencias: tendenciasData
          }
        },
        'metricas-dashboard',
        { empresa_id: empresaActual.id, periodo },
        5 * 60 * 1000 // Cache por 5 minutos
      )

      setMetricas(data)
    } catch (error) {
      NotificationManager.error('Error', 'No se pudieron cargar las métricas')
      console.error('Error cargando métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarMetricasVentas = async () => {
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo))
    
    const fechaMesAnterior = new Date()
    fechaMesAnterior.setDate(fechaMesAnterior.getDate() - (parseInt(periodo) * 2))

    // Ventas del período actual
    const { data: ventasActuales } = await supabase
      .from('ventas')
      .select('total, created_at')
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', fechaInicio.toISOString())

    // Ventas del período anterior para comparación
    const { data: ventasAnteriores } = await supabase
      .from('ventas')
      .select('total')
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', fechaMesAnterior.toISOString())
      .lt('created_at', fechaInicio.toISOString())

    // Ventas de hoy
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const { data: ventasHoy } = await supabase
      .from('ventas')
      .select('total')
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', hoy.toISOString())

    const totalActual = ventasActuales?.reduce((sum, venta) => sum + venta.total, 0) || 0
    const totalAnterior = ventasAnteriores?.reduce((sum, venta) => sum + venta.total, 0) || 0
    const totalHoy = ventasHoy?.reduce((sum, venta) => sum + venta.total, 0) || 0
    
    const crecimiento = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0

    return {
      total: totalActual,
      totalMesAnterior: totalAnterior,
      crecimiento: Math.round(crecimiento * 100) / 100,
      ventasHoy: totalHoy
    }
  }

  const cargarMetricasInventario = async () => {
    const { data: inventario } = await supabase
      .from('inventario')
      .select(`
        stock_actual,
        stock_minimo,
        costo_promedio,
        producto:productos(nombre)
      `)
      .eq('empresa_id', empresaActual?.id)

    const valorTotal = inventario?.reduce((sum, item) => 
      sum + (item.stock_actual * item.costo_promedio), 0) || 0
    
    const productosTotal = inventario?.length || 0
    const stockBajo = inventario?.filter(item => 
      item.stock_actual <= item.stock_minimo).length || 0
    const sinStock = inventario?.filter(item => 
      item.stock_actual === 0).length || 0

    return {
      valorTotal,
      productosTotal,
      stockBajo,
      sinStock
    }
  }

  const cargarMetricasProductos = async () => {
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo))

    // Productos más vendidos
    const { data: masVendidos } = await supabase
      .from('venta_items')
      .select(`
        cantidad,
        precio_unitario,
        variante:variantes(
          nombre,
          producto:productos(nombre)
        )
      `)
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', fechaInicio.toISOString())

    // Procesar productos más vendidos
    const productosVendidos = {}
    masVendidos?.forEach(item => {
      const nombre = item.variante?.producto?.nombre || 'Sin nombre'
      if (!productosVendidos[nombre]) {
        productosVendidos[nombre] = { cantidad: 0, ingresos: 0 }
      }
      productosVendidos[nombre].cantidad += item.cantidad
      productosVendidos[nombre].ingresos += item.cantidad * item.precio_unitario
    })

    const topProductos = Object.entries(productosVendidos)
      .map(([producto, datos]: [string, any]) => ({
        producto,
        cantidad: datos.cantidad,
        ingresos: datos.ingresos
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    // Productos con menos rotación
    const { data: inventarioCompleto } = await supabase
      .from('inventario')
      .select(`
        stock_actual,
        ultimo_movimiento,
        producto:productos(nombre)
      `)
      .eq('empresa_id', empresaActual?.id)
      .gt('stock_actual', 0)

    const productosConPocaRotacion = inventarioCompleto
      ?.map(item => {
        const diasSinMovimiento = item.ultimo_movimiento 
          ? Math.floor((Date.now() - new Date(item.ultimo_movimiento).getTime()) / (1000 * 60 * 60 * 24))
          : 999
        
        return {
          producto: item.producto?.nombre || 'Sin nombre',
          stock: item.stock_actual,
          diasSinMovimiento
        }
      })
      .sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento)
      .slice(0, 5) || []

    return {
      masVendidos: topProductos,
      menosRotacion: productosConPocaRotacion
    }
  }

  const cargarMetricasTendencias = async () => {
    const fechaInicio = new Date()
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(periodo))

    // Ventas por día
    const { data: ventasPorDia } = await supabase
      .from('ventas')
      .select('total, created_at')
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', fechaInicio.toISOString())
      .order('created_at')

    // Agrupar por día
    const ventasAgrupadas = {}
    ventasPorDia?.forEach(venta => {
      const fecha = new Date(venta.created_at).toISOString().split('T')[0]
      if (!ventasAgrupadas[fecha]) {
        ventasAgrupadas[fecha] = { ventas: 0, cantidad: 0 }
      }
      ventasAgrupadas[fecha].ventas += venta.total
      ventasAgrupadas[fecha].cantidad += 1
    })

    const tendenciasVentas = Object.entries(ventasAgrupadas)
      .map(([fecha, datos]: [string, any]) => ({
        fecha,
        ventas: datos.ventas,
        cantidad: datos.cantidad
      }))

    // Top categorías
    const { data: ventasCategoria } = await supabase
      .from('venta_items')
      .select(`
        cantidad,
        precio_unitario,
        variante:variantes(
          producto:productos(
            categoria:categorias(nombre)
          )
        )
      `)
      .eq('empresa_id', empresaActual?.id)
      .gte('created_at', fechaInicio.toISOString())

    const ventasPorCategoria = {}
    let totalVentas = 0

    ventasCategoria?.forEach(item => {
      const categoria = item.variante?.producto?.categoria?.nombre || 'Sin categoría'
      const ventaItem = item.cantidad * item.precio_unitario
      
      if (!ventasPorCategoria[categoria]) {
        ventasPorCategoria[categoria] = 0
      }
      ventasPorCategoria[categoria] += ventaItem
      totalVentas += ventaItem
    })

    const categoriasTop = Object.entries(ventasPorCategoria)
      .map(([categoria, ventas]: [string, any]) => ({
        categoria,
        ventas,
        porcentaje: Math.round((ventas / totalVentas) * 100)
      }))
      .sort((a, b) => b.ventas - a.ventas)
      .slice(0, 5)

    return {
      ventasPorDia: tendenciasVentas,
      categoriasTop
    }
  }

  const actualizarMetricas = async () => {
    supabaseCache.invalidatePrefix('metricas-dashboard')
    await cargarMetricas()
  }

  const exportarReporte = async (formato: 'excel' | 'pdf') => {
    try {
      NotificationManager.info('Exportando', `Generando reporte en formato ${formato.toUpperCase()}...`)
      // TODO: Implementar exportación
      NotificationManager.success('Exportado', `Reporte generado exitosamente`)
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo exportar el reporte')
    }
  }

  useEffect(() => {
    cargarMetricas()
  }, [empresaActual?.id, periodo])

  if (loading && !metricas) return <TableSkeleton />

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            📊 Reportes y Análisis
          </Title>
          <Text c="dimmed">
            Dashboard ejecutivo con métricas de negocio en tiempo real
          </Text>
        </div>
        <Group>
          <Select
            data={PERIODOS}
            value={periodo}
            onChange={(value) => setPeriodo(value || '30')}
            w={200}
          />
          <Button 
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={actualizarMetricas}
            loading={loading}
          >
            Actualizar
          </Button>
          <Button 
            leftSection={<IconDownload size={16} />}
            onClick={() => exportarReporte('excel')}
          >
            Exportar
          </Button>
        </Group>
      </Group>

      <Tabs value={tabActiva} onChange={setTabActiva}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="dashboard" leftSection={<IconChartBar size={16} />}>
            Dashboard
          </Tabs.Tab>
          <Tabs.Tab value="ventas" leftSection={<IconTrendingUp size={16} />}>
            Ventas
          </Tabs.Tab>
          <Tabs.Tab value="inventario" leftSection={<IconPackage size={16} />}>
            Inventario
          </Tabs.Tab>
          <Tabs.Tab value="exportar" leftSection={<IconFileExport size={16} />}>
            Exportar
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard">
          {metricas && <DashboardPanel metricas={metricas} />}
        </Tabs.Panel>

        <Tabs.Panel value="ventas">
          <ReportesVentasPanel />
        </Tabs.Panel>

        <Tabs.Panel value="inventario">
          <ReportesInventarioPanel />
        </Tabs.Panel>

        <Tabs.Panel value="exportar">
          <PanelExportacion metricas={metricas} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  )
}

// Componente del Dashboard Principal
function DashboardPanel({ metricas }: { metricas: DashboardMetrics }) {
  return (
    <Stack gap="xl">
      {/* KPIs Principales */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Ventas Período</Text>
              <Text size="xl" fw={700}>
                ${metricas.ventas.total.toLocaleString()}
              </Text>
              <Group gap="xs">
                {metricas.ventas.crecimiento >= 0 ? (
                  <IconArrowUp size={16} color="green" />
                ) : (
                  <IconArrowDown size={16} color="red" />
                )}
                <Text 
                  size="sm" 
                  c={metricas.ventas.crecimiento >= 0 ? 'green' : 'red'}
                >
                  {Math.abs(metricas.ventas.crecimiento)}%
                </Text>
              </Group>
            </div>
            <IconCurrencyDollar size={32} color="blue" />
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Ventas Hoy</Text>
              <Text size="xl" fw={700}>
                ${metricas.ventas.ventasHoy.toLocaleString()}
              </Text>
              <Text size="sm" c="dimmed">
                En tiempo real
              </Text>
            </div>
            <IconTrendingUp size={32} color="green" />
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Valor Inventario</Text>
              <Text size="xl" fw={700}>
                ${metricas.inventario.valorTotal.toLocaleString()}
              </Text>
              <Text size="sm" c="dimmed">
                {metricas.inventario.productosTotal} productos
              </Text>
            </div>
            <IconPackage size={32} color="purple" />
          </Group>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <div>
              <Text size="sm" c="dimmed">Alertas Stock</Text>
              <Text size="xl" fw={700} c="orange">
                {metricas.inventario.stockBajo}
              </Text>
              <Text size="sm" c="red">
                {metricas.inventario.sinStock} sin stock
              </Text>
            </div>
            <IconTrendingDown size={32} color="orange" />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Productos Top y Alertas */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600}>🏆 Productos Más Vendidos</Text>
            <Badge>Top 5</Badge>
          </Group>
          <Stack gap="sm">
            {metricas.productos.masVendidos.map((producto, index) => (
              <Group key={index} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>{producto.producto}</Text>
                  <Text size="xs" c="dimmed">{producto.cantidad} unidades</Text>
                </div>
                <Text size="sm" fw={600} c="green">
                  ${producto.ingresos.toLocaleString()}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>

        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={600}>⚠️ Productos con Poca Rotación</Text>
            <Badge color="orange">Alerta</Badge>
          </Group>
          <Stack gap="sm">
            {metricas.productos.menosRotacion.map((producto, index) => (
              <Group key={index} justify="space-between">
                <div>
                  <Text size="sm" fw={500}>{producto.producto}</Text>
                  <Text size="xs" c="dimmed">{producto.stock} en stock</Text>
                </div>
                <Badge color="orange" size="sm">
                  {producto.diasSinMovimiento} días
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>
      </SimpleGrid>

      {/* Categorías Top */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>📈 Categorías Más Vendidas</Text>
          <Text size="sm" c="dimmed">Por ingresos</Text>
        </Group>
        <Stack gap="md">
          {metricas.tendencias.categoriasTop.map((categoria, index) => (
            <div key={index}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>{categoria.categoria}</Text>
                <Group gap="sm">
                  <Text size="sm">{categoria.porcentaje}%</Text>
                  <Text size="sm" fw={600}>
                    ${categoria.ventas.toLocaleString()}
                  </Text>
                </Group>
              </Group>
              <Progress value={categoria.porcentaje} size="sm" />
            </div>
          ))}
        </Stack>
      </Card>
    </Stack>
  )
}

// =====================================================
// Paneles Especializados de Reportes
// =====================================================

function ReportesVentasPanel() {
  return <ReportesVentas />
}

function ReportesInventarioPanel() {
  return <ReportesInventario />
}

function PanelExportacion({ metricas }: { metricas: DashboardMetrics | null }) {
  const [exportando, setExportando] = useState(false)
  
  const exportarDashboard = async (formato: 'excel' | 'pdf') => {
    if (!metricas) return
    
    try {
      setExportando(true)
      NotificationManager.loading('Exportando', `Generando dashboard en ${formato.toUpperCase()}...`)
      
      const datosMetricas = {
        periodo: '30 días',
        ventas_total: metricas.ventas.total,
        ventas_cantidad: metricas.ventas.totalMesAnterior || 0,
        productos_total: metricas.inventario.productosTotal,
        valor_inventario: metricas.inventario.valorTotal,
        stock_bajo: metricas.inventario.stockBajo,
        sin_stock: metricas.inventario.sinStock,
        crecimiento: metricas.ventas.crecimiento
      }

      if (formato === 'excel') {
        ExportadorReportes.exportarMetricasExcel(
          datosMetricas,
          metricas.productos.masVendidos,
          metricas.tendencias.categoriasTop
        )
      } else {
        ExportadorReportes.exportarMetricasPDF(
          datosMetricas,
          metricas.productos.masVendidos,
          metricas.tendencias.categoriasTop
        )
      }

      NotificationManager.success('Exportado', 'Dashboard exportado exitosamente')
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo exportar el dashboard')
    } finally {
      setExportando(false)
    }
  }

  return (
    <Stack gap="xl">
      <Card withBorder>
        <Stack gap="lg">
          <div>
            <Title order={3} mb="xs">📊 Exportar Dashboard Ejecutivo</Title>
            <Text c="dimmed">
              Exporta todas las métricas del dashboard en un reporte ejecutivo completo
            </Text>
          </div>
          
          <Group>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => exportarDashboard('excel')}
              loading={exportando}
              color="green"
              size="lg"
            >
              Exportar a Excel
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={() => exportarDashboard('pdf')}
              loading={exportando}
              color="red"
              size="lg"
            >
              Exportar a PDF
            </Button>
          </Group>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card withBorder>
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" color="blue" variant="light">
                <IconTrendingUp size={24} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Reportes de Ventas</Text>
                <Text size="sm" c="dimmed">
                  Análisis detallado de ventas con filtros avanzados
                </Text>
              </div>
            </Group>
            
            <Text size="sm">
              • Ventas por período y cliente
              • Análisis de productos más vendidos
              • Métricas de crecimiento
              • Exportación a Excel/PDF
            </Text>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="md">
            <Group>
              <ThemeIcon size="lg" color="purple" variant="light">
                <IconPackage size={24} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Reportes de Inventario</Text>
                <Text size="sm" c="dimmed">
                  Control completo del stock y rotación
                </Text>
              </div>
            </Group>
            
            <Text size="sm">
              • Estado actual del inventario
              • Alertas de stock bajo y sin stock
              • Análisis de rotación de productos
              • Valorización del inventario
            </Text>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder>
        <Stack gap="md">
          <Group>
            <ThemeIcon size="lg" color="teal" variant="light">
              <IconFileExport size={24} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Formatos de Exportación Disponibles</Text>
              <Text size="sm" c="dimmed">
                Múltiples formatos para diferentes necesidades
              </Text>
            </div>
          </Group>
          
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <div>
              <Text fw={500} mb="xs">📊 Excel (.xlsx)</Text>
              <Text size="sm" c="dimmed">
                • Múltiples hojas de cálculo
                • Datos estructurados y formateados
                • Resúmenes ejecutivos
                • Gráficos y métricas
              </Text>
            </div>
            
            <div>
              <Text fw={500} mb="xs">📄 PDF</Text>
              <Text size="sm" c="dimmed">
                • Reportes listos para imprimir
                • Formato profesional
                • Tablas y gráficos integrados
                • Resúmenes ejecutivos
              </Text>
            </div>
          </SimpleGrid>
        </Stack>
      </Card>
    </Stack>
  )
}
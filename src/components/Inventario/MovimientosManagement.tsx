// =====================================================
// XENTRA - Módulo Completo de Movimientos de Inventario
// =====================================================

import { useState, useEffect } from 'react'
import {
  Container,
  Card,
  Group,
  Text,
  Button,
  Select,
  DateInput,
  Table,
  Badge,
  Stack,
  Title,
  Tabs,
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  SimpleGrid,
  Paper,
  ThemeIcon,
  ActionIcon,
  Pagination,
  Flex,
  Divider,
  Alert,
  Loader,
  Center
} from '@mantine/core'
import { DateInput as DatePickerInput } from '@mantine/dates'
import {
  IconPlus,
  IconMinus,
  IconAdjustments,
  IconTransfer,
  IconSearch,
  IconDownload,
  IconRefresh,
  IconPackage,
  IconTrendingUp,
  IconTrendingDown,
  IconFileText,
  IconCalendar,
  IconFilter,
  IconEye,
  IconAlertCircle,
  IconChecks,
  IconX
} from '@tabler/icons-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { useCachedQuery, supabaseCache } from '@/utils/supabaseCache'
import { TableSkeleton } from '@/components/UI/LoadingStates'
import FormularioMovimientos from './FormularioMovimientos'

// ==================== INTERFACES ====================

interface SKUInventario {
  id: string
  sku: string
  nombre: string
  producto_nombre: string
  categoria_nombre: string
  cantidad_actual: number
  costo_promedio: number
  precio_venta: number
  ubicacion_nombre: string
  barcode?: string
  ean?: string
  peso?: number
  imagen_url?: string
  atributos?: any
  stock_minimo?: number
  stock_maximo?: number
  ultimo_movimiento?: string
}

interface MotivoMovimiento {
  id: string
  nombre: string
  tipo: 'entrada' | 'salida'
  descripcion?: string
  es_activo: boolean
}

interface MovimientoCabecera {
  id: string
  numero_documento: string
  fecha: string
  motivo_id: string
  motivo_nombre: string
  motivo_tipo: 'entrada' | 'salida'
  observaciones?: string
  usuario_email: string
  total_items: number
  valor_total: number
  created_at: string
}

interface MovimientoDetalle {
  id: string
  movimiento_id: string
  variante_id: string
  variante_sku: string
  variante_nombre: string
  producto_nombre: string
  cantidad: number
  costo_unitario: number
  cantidad_anterior: number
  cantidad_nueva: number
  subtotal: number
}

interface PlantillaAtributos {
  id: string
  sector_negocio: string
  nombre: string
  campos: DefinicionAtributo[]
}

interface DefinicionAtributo {
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: string
  opciones_predefinidas?: string[]
  es_requerido: boolean
  unidad_medida?: string
}

export default function MovimientosManagement() {
  const { empresaActual, usuario } = useAuthStore()

  // Estados principales
  const [skus, setSKUs] = useState<SKUInventario[]>([])
  const [motivos, setMotivos] = useState<MotivoMovimiento[]>([])
  const [plantillasAtributos, setPlantillasAtributos] = useState<PlantillaAtributos[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoCabecera[]>([])
  const [movimientoDetalles, setMovimientoDetalles] = useState<MovimientoDetalle[]>([])
  
  // Estados de carga
  const [loading, setLoading] = useState(true)
  const [loadingDetalles, setLoadingDetalles] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Estados de UI
  const [modalNuevoMovimiento, setModalNuevoMovimiento] = useState(false)
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<string>('')
  const [modalDetalles, setModalDetalles] = useState(false)
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState<Date | null>(null)
  const [fechaFin, setFechaFin] = useState<Date | null>(null)
  const [filtroMotivo, setFiltroMotivo] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const ITEMS_POR_PAGINA = 15

  // ==================== CARGAR DATOS ====================

  const cargarSKUs = async () => {
    if (!empresaActual?.id) return

    try {
      // Primero obtenemos el stock actual
      const { data: stockData, error: stockError } = await supabase
        .from('stock_actual')
        .select('variante_id, cantidad_actual, costo_promedio, ubicacion_id, fecha_ultima_actualizacion')
        .eq('empresa_id', empresaActual.id)

      if (stockError) throw stockError

      // Luego obtenemos los SKUs con todos los campos
      const { data: skusData, error: skusError } = await supabase
        .from('variantes')
        .select('id, sku, nombre, precio_venta, precio_compra, producto_id, barcode, ean, peso, imagen_url, atributos, stock_minimo, stock_maximo')
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)

      if (skusError) throw skusError

      // Obtenemos productos
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('id, nombre, categoria_id')
        .eq('empresa_id', empresaActual.id)

      if (productosError) throw productosError

      // Obtenemos categorias
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('empresa_id', empresaActual.id)

      if (categoriasError) throw categoriasError

      // Obtenemos ubicaciones
      const { data: ubicacionesData, error: ubicacionesError } = await supabase
        .from('ubicaciones')
        .select('id, nombre')
        .eq('empresa_id', empresaActual.id)

      if (ubicacionesError) throw ubicacionesError

      // Combinamos los datos
      const skusFormateados: SKUInventario[] = stockData?.map(stock => {
        const sku = skusData?.find(v => v.id === stock.variante_id)
        const producto = productosData?.find(p => p.id === sku?.producto_id)
        const categoria = categoriasData?.find(c => c.id === producto?.categoria_id)
        const ubicacion = ubicacionesData?.find(u => u.id === stock.ubicacion_id)

        return {
          id: stock.variante_id,
          sku: sku?.sku || '',
          nombre: sku?.nombre || '',
          producto_nombre: producto?.nombre || '',
          categoria_nombre: categoria?.nombre || '',
          cantidad_actual: stock.cantidad_actual || 0,
          costo_promedio: stock.costo_promedio || 0,
          precio_venta: sku?.precio_venta || 0,
          ubicacion_nombre: ubicacion?.nombre || '',
          barcode: sku?.barcode,
          ean: sku?.ean,
          peso: sku?.peso,
          imagen_url: sku?.imagen_url,
          atributos: sku?.atributos,
          stock_minimo: sku?.stock_minimo,
          stock_maximo: sku?.stock_maximo,
          ultimo_movimiento: stock.fecha_ultima_actualizacion
        }
      }).filter(item => item.sku) || []

      setSKUs(skusFormateados)
    } catch (error) {
      console.error('Error cargando SKUs:', error)
      NotificationManager.error('Error', 'No se pudieron cargar los SKUs')
    }
  }

  const cargarPlantillasAtributos = async () => {
    if (!empresaActual?.id) return

    try {
      const { data: plantillasData, error: plantillasError } = await supabase
        .from('plantillas_atributos')
        .select(`
          id,
          sector_negocio,
          nombre,
          definiciones_atributos(
            campo_nombre,
            campo_etiqueta,
            tipo_dato,
            opciones_predefinidas,
            es_requerido,
            unidad_medida
          )
        `)
        .eq('empresa_id', empresaActual.id)
        .eq('es_activa', true)

      if (plantillasError) throw plantillasError

      const plantillasFormateadas: PlantillaAtributos[] = plantillasData?.map(plantilla => ({
        id: plantilla.id,
        sector_negocio: plantilla.sector_negocio,
        nombre: plantilla.nombre,
        campos: plantilla.definiciones_atributos || []
      })) || []

      setPlantillasAtributos(plantillasFormateadas)
    } catch (error) {
      console.error('Error cargando plantillas de atributos:', error)
    }
  }

  const cargarMotivos = async () => {
    if (!empresaActual?.id) return

    try {
      const { data, error } = await supabase
        .from('motivos_movimiento')
        .select('id, codigo, nombre, es_adicion, activo')
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      const motivosFormateados = data?.map(motivo => ({
        id: motivo.id,
        nombre: motivo.nombre,
        tipo: motivo.es_adicion ? 'entrada' : 'salida' as 'entrada' | 'salida',
        descripcion: motivo.codigo,
        es_activo: motivo.activo
      })) || []

      setMotivos(motivosFormateados)
    } catch (error) {
      console.error('Error cargando motivos:', error)
      NotificationManager.error('Error', 'No se pudieron cargar los motivos')
    }
  }

  const cargarMovimientos = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)

      let query = supabase
        .from('movimientos_cabecera')
        .select(`
          id,
          numero_documento,
          fecha_movimiento,
          motivo_movimiento_id,
          observaciones,
          usuario_id,
          total_documento,
          created_at
        `)
        .eq('empresa_id', empresaActual.id)

      // Aplicar filtros
      if (fechaInicio) {
        query = query.gte('fecha_movimiento', fechaInicio.toISOString().split('T')[0])
      }
      if (fechaFin) {
        query = query.lte('fecha_movimiento', fechaFin.toISOString().split('T')[0])
      }
      if (filtroMotivo) {
        query = query.eq('motivo_movimiento_id', filtroMotivo)
      }

      const { data, error } = await query
        .order('fecha_movimiento', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(ITEMS_POR_PAGINA * 5)

      if (error) throw error

      // Obtener motivos para el mapeo
      const motivoIds = data?.map(mov => mov.motivo_movimiento_id).filter(Boolean) || []
      const { data: motivosData } = await supabase
        .from('motivos_movimiento')
        .select('id, nombre, es_adicion')
        .in('id', motivoIds)

      // Obtener perfiles de usuario
      const usuarioIds = data?.map(mov => mov.usuario_id).filter(Boolean) || []
      const { data: usuariosData } = await supabase
        .from('perfiles_usuario')
        .select('id, nombre_completo')
        .in('id', usuarioIds)

      const movimientosFormateados: MovimientoCabecera[] = await Promise.all(
        (data || []).map(async (mov: any) => {
          const motivo = motivosData?.find(m => m.id === mov.motivo_movimiento_id)
          const usuario = usuariosData?.find(u => u.id === mov.usuario_id)

          // Contar items del movimiento
          const { count } = await supabase
            .from('movimientos_detalle')
            .select('*', { count: 'exact' })
            .eq('movimiento_cabecera_id', mov.id)

          return {
            id: mov.id,
            numero_documento: mov.numero_documento || '',
            fecha: mov.fecha_movimiento,
            motivo_id: mov.motivo_movimiento_id || '',
            motivo_nombre: motivo?.nombre || 'Motivo desconocido',
            motivo_tipo: motivo?.es_adicion ? 'entrada' : 'salida' as 'entrada' | 'salida',
            observaciones: mov.observaciones,
            usuario_email: usuario?.nombre_completo || 'Usuario desconocido',
            total_items: count || 0,
            valor_total: mov.total_documento || 0,
            created_at: mov.created_at
          }
        })
      )

      setMovimientos(movimientosFormateados)
      setTotalPaginas(Math.ceil(movimientosFormateados.length / ITEMS_POR_PAGINA))
    } catch (error) {
      console.error('Error cargando movimientos:', error)
      NotificationManager.error('Error', 'No se pudo cargar los movimientos')
    } finally {
      setLoading(false)
    }
  }

  const cargarDetallesMovimiento = async (movimientoId: string) => {
    if (!movimientoId) return

    try {
      setLoadingDetalles(true)

      const { data, error } = await supabase
        .from('movimientos_detalle')
        .select('id, movimiento_cabecera_id, variante_id, cantidad, precio_unitario, subtotal')
        .eq('movimiento_cabecera_id', movimientoId)

      if (error) throw error

      // Obtener información de SKUs
      const varianteIds = data?.map(det => det.variante_id).filter(Boolean) || []
      const { data: variantesData } = await supabase
        .from('variantes')
        .select('id, sku, nombre, producto_id')
        .in('id', varianteIds)

      // Obtener información de productos
      const productoIds = variantesData?.map(v => v.producto_id).filter(Boolean) || []
      const { data: productosData } = await supabase
        .from('productos')
        .select('id, nombre')
        .in('id', productoIds)

      const detallesFormateados: MovimientoDetalle[] = data?.map(detalle => {
        const variante = variantesData?.find(v => v.id === detalle.variante_id)
        const producto = productosData?.find(p => p.id === variante?.producto_id)

        return {
          id: detalle.id,
          movimiento_id: detalle.movimiento_cabecera_id,
          variante_id: detalle.variante_id,
          variante_sku: variante?.sku || '',
          variante_nombre: variante?.nombre || '',
          producto_nombre: producto?.nombre || '',
          cantidad: detalle.cantidad,
          costo_unitario: detalle.precio_unitario,
          cantidad_anterior: 0, // Esta información no está disponible en la estructura actual
          cantidad_nueva: 0, // Esta información no está disponible en la estructura actual
          subtotal: detalle.subtotal || (detalle.cantidad * detalle.precio_unitario)
        }
      }) || []

      setMovimientoDetalles(detallesFormateados)
    } catch (error) {
      console.error('Error cargando detalles:', error)
      NotificationManager.error('Error', 'No se pudo cargar los detalles del movimiento')
    } finally {
      setLoadingDetalles(false)
    }
  }

  // Funciones de utilidad para la UI
  const limpiarFiltros = () => {
    setFechaInicio(null)
    setFechaFin(null)
    setFiltroMotivo('')
    setFiltroTipo('')
    setPaginaActual(1)
  }

  const obtenerColorTipo = (tipo: 'entrada' | 'salida') => {
    return tipo === 'entrada' ? 'green' : 'red'
  }

  const obtenerIconoTipo = (tipo: 'entrada' | 'salida') => {
    return tipo === 'entrada' ? <IconTrendingUp size={16} /> : <IconTrendingDown size={16} />
  }



  // ==================== EFECTOS ====================

  useEffect(() => {
    if (empresaActual?.id) {
      Promise.all([
        cargarSKUs(),
        cargarMotivos(),
        cargarMovimientos(),
        cargarPlantillasAtributos()
      ])
    }
  }, [empresaActual?.id])

  useEffect(() => {
    cargarMovimientos()
  }, [fechaInicio, fechaFin, filtroMotivo, filtroTipo])

  // ==================== RENDER ====================

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            📋 Movimientos de SKUs - Inventario
          </Title>
          <Text c="dimmed">
            Gestión completa de entradas y salidas de productos con información comercial
          </Text>
        </div>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setModalNuevoMovimiento(true)}
            color="blue"
          >
            Nuevo Movimiento
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => {
              cargarSKUs()
              cargarMovimientos()
            }}
          >
            Actualizar
          </Button>
        </Group>
      </Group>

      {/* Estadísticas Rápidas */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="blue" variant="light">
              <IconPackage size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Total SKUs</Text>
              <Text size="xl" fw={700}>{skus.length}</Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="green" variant="light">
              <IconTrendingUp size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Movimientos Hoy</Text>
              <Text size="xl" fw={700}>
                {movimientos.filter(m => 
                  format(new Date(m.fecha), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="orange" variant="light">
              <IconFileText size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Total Movimientos</Text>
              <Text size="xl" fw={700}>{movimientos.length}</Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="purple" variant="light">
              <IconAdjustments size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Motivos Activos</Text>
              <Text size="xl" fw={700}>{motivos.length}</Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Filtros */}
      <Card withBorder mb="lg">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconFilter size={18} />
            <Text fw={600}>🔍 Filtros</Text>
          </Group>
          <Button variant="light" size="sm" onClick={limpiarFiltros}>
            Limpiar
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          <DatePickerInput
            label="Fecha Inicio"
            placeholder="Desde"
            value={fechaInicio}
            onChange={setFechaInicio}
            locale="es"
            clearable
            leftSection={<IconCalendar size={16} />}
          />

          <DatePickerInput
            label="Fecha Fin"
            placeholder="Hasta"
            value={fechaFin}
            onChange={setFechaFin}
            locale="es"
            clearable
            leftSection={<IconCalendar size={16} />}
          />

          <Select
            label="Tipo de Movimiento"
            placeholder="Filtrar por tipo"
            data={[
              { value: 'entrada', label: '📈 Entradas' },
              { value: 'salida', label: '📉 Salidas' }
            ]}
            value={filtroTipo}
            onChange={setFiltroTipo}
            clearable
          />

          <Select
            label="Motivo"
            placeholder="Filtrar por motivo"
            data={(motivos || []).map(motivo => ({
              value: motivo.id,
              label: `${motivo.tipo === 'entrada' ? '📈' : '📉'} ${motivo.nombre}`
            }))}
            value={filtroMotivo}
            onChange={setFiltroMotivo}
            clearable
            searchable
          />

          <Button
            variant="outline"
            leftSection={<IconSearch size={16} />}
            onClick={cargarMovimientos}
            loading={loading}
          >
            Buscar
          </Button>
        </SimpleGrid>
      </Card>

      {/* Lista de Movimientos */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>📋 Historial de Movimientos</Text>
          {movimientos.length > 0 && (
            <Badge variant="light" color="blue">
              {movimientos.length} movimientos
            </Badge>
          )}
        </Group>

        {loading ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text>Cargando movimientos...</Text>
            </Stack>
          </Center>
        ) : movimientos.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            <Text>No hay movimientos registrados con los filtros seleccionados</Text>
          </Alert>
        ) : (
          <>
            <Table.ScrollContainer minWidth={1200}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>N° Documento</Table.Th>
                    <Table.Th>Tipo/Motivo</Table.Th>
                    <Table.Th>Items</Table.Th>
                    <Table.Th>Valor Total</Table.Th>
                    <Table.Th>Usuario</Table.Th>
                    <Table.Th>Observaciones</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {movimientos
                    .slice((paginaActual - 1) * ITEMS_POR_PAGINA, paginaActual * ITEMS_POR_PAGINA)
                    .map((movimiento) => (
                    <Table.Tr key={movimiento.id}>
                      <Table.Td>
                        {format(new Date(movimiento.fecha), 'dd/MM/yyyy', { locale: es })}
                        <Text size="xs" c="dimmed">
                          {format(new Date(movimiento.created_at), 'HH:mm')}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{movimiento.numero_documento}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Stack gap={4}>
                          <Badge
                            color={obtenerColorTipo(movimiento.motivo_tipo)}
                            variant="light"
                            size="sm"
                            leftSection={obtenerIconoTipo(movimiento.motivo_tipo)}
                          >
                            {movimiento.motivo_tipo.toUpperCase()}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {movimiento.motivo_nombre}
                          </Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="blue">
                          {movimiento.total_items}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} color={movimiento.motivo_tipo === 'entrada' ? 'green' : 'red'}>
                          ${movimiento.valor_total.toFixed(2)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{movimiento.usuario_email}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" truncate style={{ maxWidth: 200 }}>
                          {movimiento.observaciones || '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => {
                            setMovimientoSeleccionado(movimiento.id)
                            cargarDetallesMovimiento(movimiento.id)
                            setModalDetalles(true)
                          }}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
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
          </>
        )}
      </Card>
      
      {/* Modal Nuevo Movimiento - Rediseñado */}
      <FormularioMovimientos
        opened={modalNuevoMovimiento}
        onClose={() => setModalNuevoMovimiento(false)}
        onSuccess={() => {
          setModalNuevoMovimiento(false)
          cargarMovimientos()
        }}
      />

      {/* Modal Detalles del Movimiento */}
      <Modal
        opened={modalDetalles}
        onClose={() => setModalDetalles(false)}
        title="Detalles del Movimiento"
        size="xl"
      >
        {loadingDetalles ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text>Cargando detalles...</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="md">
            {movimientoDetalles.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                No se encontraron detalles para este movimiento
              </Alert>
            ) : (
              <Table.ScrollContainer minWidth={800}>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>SKU</Table.Th>
                      <Table.Th>Producto/SKU</Table.Th>
                      <Table.Th>Stock Anterior</Table.Th>
                      <Table.Th>Cantidad Movida</Table.Th>
                      <Table.Th>Stock Final</Table.Th>
                      <Table.Th>Costo Unit.</Table.Th>
                      <Table.Th>Subtotal</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {movimientoDetalles.map((detalle) => (
                      <Table.Tr key={detalle.id}>
                        <Table.Td>
                          <Text fw={500} size="sm">{detalle.variante_sku}</Text>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text fw={500} size="sm">{detalle.producto_nombre}</Text>
                            <Text size="xs" c="dimmed">{detalle.variante_nombre}</Text>
                          </div>
                        </Table.Td>
                        <Table.Td>{detalle.cantidad_anterior}</Table.Td>
                        <Table.Td>
                          <Text fw={600} color={detalle.cantidad > 0 ? 'green' : 'red'}>
                            {detalle.cantidad > 0 ? '+' : ''}{detalle.cantidad}
                          </Text>
                        </Table.Td>
                        <Table.Td fw={600}>{detalle.cantidad_nueva}</Table.Td>
                        <Table.Td>${detalle.costo_unitario.toFixed(2)}</Table.Td>
                        <Table.Td>
                          <Text fw={600}>${detalle.subtotal.toFixed(2)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}

            <Group justify="flex-end">
              <Button onClick={() => setModalDetalles(false)}>
                Cerrar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
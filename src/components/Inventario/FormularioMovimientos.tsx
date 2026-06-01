// =====================================================
// XENTRA - Formulario de Movimientos Rediseñado
// =====================================================

import React, { useState, useEffect } from 'react'
import {
  Modal,
  Stack,
  Group,
  Text,
  Button,
  Stepper,
  Card,
  SimpleGrid,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Badge,
  ActionIcon,
  Table,
  Alert,
  Divider,
  ThemeIcon,
  Center,
  Loader
} from '@mantine/core'
import {
  IconPlus,
  IconMinus,
  IconArrowUp,
  IconArrowDown,
  IconTrash,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconPackage,
  IconEdit
} from '@tabler/icons-react'
import { DateInput } from '@mantine/dates'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'

interface Props {
  opened: boolean
  onClose: () => void
  onSuccess: () => void
}

interface MotivoMovimiento {
  id: string
  nombre: string
  codigo: string
  es_adicion: boolean
  activo: boolean
}

interface SKUDisponible {
  id: string
  sku: string
  nombre: string
  producto_nombre: string
  categoria_nombre: string
  cantidad_actual: number
  costo_promedio: number
  precio_venta: number
  ubicacion_nombre: string
}

interface Ubicacion {
  id: string
  nombre: string
  activo: boolean
}

interface DetalleMovimiento {
  sku_id: string
  sku_info?: SKUDisponible
  cantidad: number
  costo_unitario: number
  observaciones: string
}

const FormularioMovimientos: React.FC<Props> = ({ opened, onClose, onSuccess }) => {
  const { empresaActual } = useAuthStore()
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  
  // Estados del formulario
  const [tipoMovimiento, setTipoMovimiento] = useState<'entrada' | 'salida' | ''>('')
  const [motivoId, setMotivoId] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [fecha, setFecha] = useState<Date>(new Date())
  const [observaciones, setObservaciones] = useState('')
  const [detalles, setDetalles] = useState<DetalleMovimiento[]>([])
  
  // Estados para datos
  const [motivos, setMotivos] = useState<MotivoMovimiento[]>([])
  const [skusDisponibles, setSKUsDisponibles] = useState<SKUDisponible[]>([])
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // ==================== CARGAR DATOS ====================
  
  const cargarDatos = async () => {
    if (!empresaActual?.id) return
    
    setLoadingData(true)
    try {
      const [motivosResult, skusResult, ubicacionesResult] = await Promise.all([
        supabase
          .from('motivos_movimiento')
          .select('id, nombre, codigo, es_adicion, activo')
          .eq('empresa_id', empresaActual.id)
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        
        supabase
          .from('variantes')
          .select(`
            id,
            sku,
            nombre,
            precio_venta,
            activo,
            producto:productos(nombre),
            stock_actual(cantidad_actual, costo_promedio, ubicacion:ubicaciones(nombre))
          `)
          .eq('empresa_id', empresaActual.id)
          .eq('activo', true)
          .order('sku', { ascending: true }),
        
        supabase
          .from('ubicaciones')
          .select('id, nombre, activo')
          .eq('empresa_id', empresaActual.id)
          .eq('activo', true)
          .order('nombre', { ascending: true })
      ])

      if (motivosResult.error) throw motivosResult.error
      if (skusResult.error) throw skusResult.error
      if (ubicacionesResult.error) throw ubicacionesResult.error

      setMotivos(motivosResult.data || [])
      setUbicaciones(ubicacionesResult.data || [])
      
      // Formatear SKUs para el componente
      const skusFormateados = skusResult.data?.map(item => ({
        id: item.id,
        sku: item.sku,
        nombre: item.nombre || '',
        producto_nombre: item.producto?.nombre || '',
        categoria_nombre: '', // Temporalmente vacío hasta ajustar la consulta
        cantidad_actual: item.stock_actual?.[0]?.cantidad_actual || 0,
        costo_promedio: item.stock_actual?.[0]?.costo_promedio || 0,
        precio_venta: item.precio_venta || 0,
        ubicacion_nombre: item.stock_actual?.[0]?.ubicacion?.nombre || 'Sin ubicación'
      })) || []
      
      setSKUsDisponibles(skusFormateados)
    } catch (error: any) {
      console.error('Error cargando datos:', error)
      NotificationManager.error('Error', 'No se pudieron cargar los datos necesarios')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (opened) {
      cargarDatos()
      resetFormulario()
    }
  }, [opened, empresaActual?.id])

  const resetFormulario = () => {
    setActiveStep(0)
    setTipoMovimiento('')
    setMotivoId('')
    setFecha(new Date())
    setObservaciones('')
    setDetalles([])
  }

  // ==================== MANEJO DEL FORMULARIO ====================

  const agregarDetalle = () => {
    setDetalles(prev => [...prev, {
      sku_id: '',
      cantidad: 1,
      costo_unitario: 0,
      observaciones: ''
    }])
  }

  const eliminarDetalle = (index: number) => {
    setDetalles(prev => prev.filter((_, i) => i !== index))
  }

  const actualizarDetalle = (index: number, campo: keyof DetalleMovimiento, valor: any) => {
    setDetalles(prev => prev.map((detalle, i) => {
      if (i === index) {
        const updated = { ...detalle, [campo]: valor }
        
        // Auto-completar información del SKU
        if (campo === 'sku_id') {
          const sku = skusDisponibles.find(s => s.id === valor)
          updated.sku_info = sku
          if (sku && sku.costo_promedio > 0) {
            updated.costo_unitario = sku.costo_promedio
          }
        }
        
        return updated
      }
      return detalle
    }))
  }

  // ==================== VALIDACIONES Y ENVÍO ====================

  const validarPaso = (paso: number) => {
    switch (paso) {
      case 0: // Tipo y motivo
        return tipoMovimiento && motivoId && ubicacionId
      case 1: // Detalles de productos
        return detalles.length > 0 && detalles.every(d => d.sku_id && d.cantidad > 0)
      case 2: // Revisión final
        return true
      default:
        return false
    }
  }

  const siguientePaso = () => {
    if (validarPaso(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 2))
    }
  }

  const pasoAnterior = () => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }

  const procesarMovimiento = async () => {
    if (!empresaActual?.id || !validarPaso(2)) return

    setLoading(true)
    try {
      // 1. Crear cabecera del movimiento
      const { data: cabecera, error: errorCabecera } = await supabase
        .from('movimientos_cabecera')
        .insert({
          empresa_id: empresaActual.id,
          motivo_movimiento_id: motivoId,
          ubicacion_id: ubicacionId,
          fecha_movimiento: fecha.toISOString(),
          observaciones,
          usuario_id: null // Temporal mientras arreglamos perfiles_usuario
        })
        .select()
        .single()

      if (errorCabecera) throw errorCabecera

      // 2. Insertar detalles del movimiento
      const detallesFormateados = detalles.map(detalle => ({
        movimiento_cabecera_id: cabecera.id,
        empresa_id: empresaActual.id,
        variante_id: detalle.sku_id,
        cantidad: detalle.cantidad,
        precio_unitario: detalle.costo_unitario,
        observaciones: detalle.observaciones
      }))

      const { error: errorDetalles } = await supabase
        .from('movimientos_detalle')
        .insert(detallesFormateados)

      if (errorDetalles) throw errorDetalles

      NotificationManager.success('Éxito', `Movimiento de ${tipoMovimiento} registrado correctamente`)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error procesando movimiento:', error)
      NotificationManager.error('Error', 'No se pudo procesar el movimiento')
    } finally {
      setLoading(false)
    }
  }

  // ==================== RENDER STEPS ====================

  const renderPaso0 = () => (
    <Stack gap="lg">
      <Card withBorder p="md">
        <Text size="lg" fw={600} mb="md">📋 Información del Movimiento</Text>
        
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            label="Tipo de Movimiento"
            placeholder="¿Es entrada o salida?"
            data={[
              { 
                value: 'entrada', 
                label: '📈 Entrada de Inventario',
                description: 'Agregar productos al inventario'
              },
              { 
                value: 'salida', 
                label: '📉 Salida de Inventario',
                description: 'Quitar productos del inventario'
              }
            ]}
            value={tipoMovimiento}
            onChange={(value) => {
              setTipoMovimiento(value as 'entrada' | 'salida' | '')
              setMotivoId('') // Reset motivo cuando cambia el tipo
            }}
            required
            size="md"
          />
          
          <DateInput
            label="Fecha del Movimiento"
            value={fecha}
            onChange={(date) => setFecha(date || new Date())}
            required
            size="md"
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="md">
          <Select
            label="Motivo del Movimiento"
            placeholder="Seleccione el motivo"
            data={motivos.map(motivo => ({
              value: motivo.id,
              label: `${motivo.es_adicion ? '📈' : '📉'} ${motivo.nombre}`,
              description: `Código: ${motivo.codigo}`
            }))}
            value={motivoId}
            onChange={(value) => setMotivoId(value || '')}
            required
            searchable
            size="md"
          />

          <Select
            label="Ubicación del Movimiento"
            placeholder="¿Dónde ocurre este movimiento?"
            data={ubicaciones.map(ubic => ({
              value: ubic.id,
              label: `${ubic.es_principal ? '🏢' : '📦'} ${ubic.nombre}`
            }))}
            value={ubicacionId}
            onChange={(value) => setUbicacionId(value || '')}
            required
            searchable
            size="md"
          />
        </SimpleGrid>

        <Textarea
          label="Observaciones Generales"
          placeholder="Información adicional sobre este movimiento (opcional)"
          value={observaciones}
          onChange={(event) => setObservaciones(event.currentTarget.value)}
          mt="md"
          minRows={2}
        />
      </Card>
    </Stack>
  )

  const renderPaso1 = () => (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text size="lg" fw={600}>
          📦 Productos a {tipoMovimiento === 'entrada' ? 'Ingresar' : 'Retirar'}
        </Text>
        <Button 
          leftSection={<IconPlus size={16} />} 
          onClick={agregarDetalle}
          size="sm"
        >
          Agregar Producto
        </Button>
      </Group>

      {detalles.length === 0 ? (
        <Card withBorder p="xl">
          <Center>
            <Stack align="center" gap="sm">
              <ThemeIcon size="xl" variant="light" color="gray">
                <IconPackage size={24} />
              </ThemeIcon>
              <Text c="dimmed">No hay productos agregados</Text>
              <Button onClick={agregarDetalle}>
                Agregar Primer Producto
              </Button>
            </Stack>
          </Center>
        </Card>
      ) : (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>SKU / Producto</Table.Th>
              <Table.Th>Stock Actual</Table.Th>
              <Table.Th>Cantidad</Table.Th>
              <Table.Th>Costo Unit.</Table.Th>
              <Table.Th>Total</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {detalles.map((detalle, index) => (
              <Table.Tr key={index}>
                <Table.Td style={{ minWidth: 250 }}>
                  <Select
                    placeholder="Buscar SKU..."
                    data={skusDisponibles.map(sku => ({
                      value: sku.id,
                      label: `${sku.sku} - ${sku.nombre}`,
                      description: `${sku.producto_nombre} | ${sku.categoria_nombre}`
                    }))}
                    value={detalle.sku_id}
                    onChange={(value) => actualizarDetalle(index, 'sku_id', value || '')}
                    searchable
                    required
                  />
                  {detalle.sku_info && (
                    <Text size="xs" c="dimmed" mt={4}>
                      📍 {detalle.sku_info.ubicacion_nombre}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {detalle.sku_info && (
                    <Badge variant="light" color={detalle.sku_info.cantidad_actual > 0 ? 'green' : 'red'}>
                      {detalle.sku_info.cantidad_actual}
                    </Badge>
                  )}
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={detalle.cantidad}
                    onChange={(value) => actualizarDetalle(index, 'cantidad', value || 0)}
                    min={tipoMovimiento === 'salida' ? 1 : 0}
                    max={tipoMovimiento === 'salida' ? detalle.sku_info?.cantidad_actual : undefined}
                    w={100}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={detalle.costo_unitario}
                    onChange={(value) => actualizarDetalle(index, 'costo_unitario', value || 0)}
                    min={0}
                    precision={2}
                    w={120}
                    leftSection="$"
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>
                    ${(detalle.cantidad * detalle.costo_unitario).toFixed(2)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => eliminarDetalle(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {detalles.length > 0 && (
        <Card withBorder p="md">
          <Group justify="space-between">
            <Text size="md" fw={500}>Total del Movimiento:</Text>
            <Text size="lg" fw={600} c="blue">
              ${detalles.reduce((total, d) => total + (d.cantidad * d.costo_unitario), 0).toFixed(2)}
            </Text>
          </Group>
        </Card>
      )}
    </Stack>
  )

  const renderPaso2 = () => {
    const motivoSeleccionado = motivos.find(m => m.id === motivoId)
    const totalMovimiento = detalles.reduce((total, d) => total + (d.cantidad * d.costo_unitario), 0)

    return (
      <Stack gap="lg">
        <Alert 
          icon={<IconCheck size={16} />} 
          title="Resumen del Movimiento" 
          color="blue"
          variant="light"
        >
          Revisa la información antes de confirmar el movimiento
        </Alert>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card withBorder p="md">
            <Text size="md" fw={600} mb="sm">📋 Información General</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Tipo:</Text>
                <Badge 
                  color={tipoMovimiento === 'entrada' ? 'green' : 'red'}
                  variant="light"
                >
                  {tipoMovimiento === 'entrada' ? '📈 Entrada' : '📉 Salida'}
                </Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Motivo:</Text>
                <Text size="sm">{motivoSeleccionado?.nombre}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Ubicación:</Text>
                <Text size="sm">{ubicaciones.find(u => u.id === ubicacionId)?.nombre}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Fecha:</Text>
                <Text size="sm">{fecha.toLocaleDateString()}</Text>
              </Group>
            </Stack>
          </Card>

          <Card withBorder p="md">
            <Text size="md" fw={600} mb="sm">💰 Resumen Financiero</Text>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Total Productos:</Text>
                <Text size="sm" fw={500}>{detalles.length}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Total Unidades:</Text>
                <Text size="sm" fw={500}>{detalles.reduce((sum, d) => sum + d.cantidad, 0)}</Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Valor Total:</Text>
                <Text size="lg" fw={600} c="blue">${totalMovimiento.toFixed(2)}</Text>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>

        <Card withBorder p="md">
          <Text size="md" fw={600} mb="sm">📦 Detalle de Productos</Text>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>SKU</Table.Th>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Costo Unit.</Table.Th>
                <Table.Th>Subtotal</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {detalles.map((detalle, index) => (
                <Table.Tr key={index}>
                  <Table.Td>{detalle.sku_info?.sku}</Table.Td>
                  <Table.Td>
                    <div>
                      <Text size="sm" fw={500}>{detalle.sku_info?.nombre}</Text>
                      <Text size="xs" c="dimmed">{detalle.sku_info?.producto_nombre}</Text>
                    </div>
                  </Table.Td>
                  <Table.Td>{detalle.cantidad}</Table.Td>
                  <Table.Td>${detalle.costo_unitario.toFixed(2)}</Table.Td>
                  <Table.Td fw={500}>${(detalle.cantidad * detalle.costo_unitario).toFixed(2)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    )
  }

  // ==================== RENDER PRINCIPAL ====================

  if (loadingData) {
    return (
      <Modal opened={opened} onClose={onClose} title="Nuevo Movimiento" size="xl">
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Cargando datos necesarios...</Text>
          </Stack>
        </Center>
      </Modal>
    )
  }

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title="Nuevo Movimiento de Inventario" 
      size="xl"
      closeOnClickOutside={false}
    >
      <Stack gap="lg">
        <Stepper active={activeStep} size="sm">
          <Stepper.Step 
            label="Configuración" 
            description="Tipo y motivo"
            icon={<IconEdit size={16} />}
          />
          <Stepper.Step 
            label="Productos" 
            description="Seleccionar SKUs"
            icon={<IconPackage size={16} />}
          />
          <Stepper.Step 
            label="Confirmar" 
            description="Revisar y procesar"
            icon={<IconCheck size={16} />}
          />
        </Stepper>

        <Divider />

        {activeStep === 0 && renderPaso0()}
        {activeStep === 1 && renderPaso1()}
        {activeStep === 2 && renderPaso2()}

        <Group justify="space-between">
          <Button 
            variant="light" 
            onClick={pasoAnterior}
            disabled={activeStep === 0}
          >
            Anterior
          </Button>

          <Group>
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            
            {activeStep < 2 ? (
              <Button 
                onClick={siguientePaso}
                disabled={!validarPaso(activeStep)}
              >
                Siguiente
              </Button>
            ) : (
              <Button 
                onClick={procesarMovimiento}
                loading={loading}
                disabled={!validarPaso(activeStep)}
                color="green"
              >
                Confirmar Movimiento
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}

export default FormularioMovimientos
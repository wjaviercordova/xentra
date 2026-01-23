// =====================================================
// XENTRA - Componente POS (Punto de Venta)
// Interfaz de facturación rápida con atajos de teclado
// =====================================================

import React, { useState, useEffect, useRef } from 'react'
import {
  Container,
  Grid,
  Card,
  TextInput,
  Button,
  Table,
  Group,
  Text,
  NumberInput,
  ActionIcon,
  Badge,
  Divider,
  Alert,
  ScrollArea,
  Modal,
  Select
} from '@mantine/core'
import {
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconPlus,
  IconMinus,
  IconCash,
  IconCreditCard,
  IconPrinter,
  IconX,
  IconCheck,
  IconBarcode
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useDisclosure } from '@mantine/hooks'
import { usePOSStore, useInventarioStore, useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'

const PuntoDeVenta: React.FC = () => {
  // Estados del store
  const {
    items,
    total,
    cliente,
    documento,
    loading,
    agregarItem,
    actualizarCantidad,
    eliminarItem,
    limpiarVenta,
    setCliente,
    setDocumento,
    setLoading
  } = usePOSStore()
  
  const { buscarVariante } = useInventarioStore()
  const { empresa, ubicacionActiva } = useAuthStore()
  
  // Estados locales
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoPagado, setMontoPagado] = useState(0)
  const [vuelto, setVuelto] = useState(0)
  const [modalPago, { open: abrirModalPago, close: cerrarModalPago }] = useDisclosure(false)
  
  // Referencias para focus de elementos
  const busquedaRef = useRef<HTMLInputElement>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)
  
  // Focus inicial en búsqueda
  useEffect(() => {
    busquedaRef.current?.focus()
  }, [])
  
  // Calcular vuelto cuando cambia el monto pagado
  useEffect(() => {
    setVuelto(Math.max(0, montoPagado - total))
  }, [montoPagado, total])
  
  // Buscar productos cuando cambia el término de búsqueda
  useEffect(() => {
    if (busqueda.length >= 2) {
      const resultados = buscarVariante(busqueda)
      setResultadosBusqueda(resultados)
    } else {
      setResultadosBusqueda([])
    }
  }, [busqueda, buscarVariante])
  
  // =====================================================
  // MANEJO DE ATAJOS DE TECLADO
  // =====================================================
  useEffect(() => {
    const manejarTeclado = (e: KeyboardEvent) => {
      // Prevenir atajos si hay un modal abierto
      if (modalPago) return
      
      switch (true) {
        // F1: Focus en búsqueda
        case e.key === 'F1':
          e.preventDefault()
          busquedaRef.current?.focus()
          break
          
        // F2: Abrir modal de pago
        case e.key === 'F2':
          e.preventDefault()
          if (items.length > 0) {
            abrirModalPago()
          }
          break
          
        // F3: Limpiar venta
        case e.key === 'F3':
          e.preventDefault()
          limpiarVenta()
          busquedaRef.current?.focus()
          break
          
        // F4: Cambiar método de pago
        case e.key === 'F4':
          e.preventDefault()
          setMetodoPago(metodoPago === 'efectivo' ? 'tarjeta' : 'efectivo')
          break
          
        // Escape: Cerrar modal o limpiar búsqueda
        case e.key === 'Escape':
          e.preventDefault()
          if (modalPago) {
            cerrarModalPago()
          } else if (busqueda) {
            setBusqueda('')
            setResultadosBusqueda([])
          }
          break
          
        // Enter: Seleccionar primer producto si hay resultados
        case e.key === 'Enter' && resultadosBusqueda.length > 0:
          e.preventDefault()
          agregarProductoRapido(resultadosBusqueda[0])
          break
          
        // Delete: Eliminar último item
        case e.key === 'Delete' && items.length > 0:
          e.preventDefault()
          eliminarItem(items[items.length - 1].varianteId)
          break
      }
    }
    
    document.addEventListener('keydown', manejarTeclado)
    return () => document.removeEventListener('keydown', manejarTeclado)
  }, [busqueda, resultadosBusqueda, items, modalPago, metodoPago])
  
  // =====================================================
  // FUNCIONES PRINCIPALES
  // =====================================================
  
  const agregarProductoRapido = (variante: any, cantidad = 1) => {
    if (variante.stock <= 0) {
      notifications.show({
        title: 'Stock agotado',
        message: `El producto ${variante.nombre} no tiene stock disponible`,
        color: 'red',
        icon: <IconX size={18} />
      })
      return
    }
    
    agregarItem(variante, cantidad)
    setBusqueda('')
    setResultadosBusqueda([])
    busquedaRef.current?.focus()
    
    notifications.show({
      title: 'Producto agregado',
      message: `${variante.nombre} agregado al carrito`,
      color: 'green',
      icon: <IconCheck size={18} />
    })
  }
  
  const procesarVenta = async () => {
    if (items.length === 0) {
      notifications.show({
        title: 'Error',
        message: 'No hay productos en la venta',
        color: 'red'
      })
      return
    }
    
    if (metodoPago === 'efectivo' && montoPagado < total) {
      notifications.show({
        title: 'Error',
        message: 'El monto pagado es insuficiente',
        color: 'red'
      })
      return
    }
    
    setLoading(true)
    
    try {
      // 1. Crear cabecera de movimiento (Venta)
      const { data: cabecera, error: cabeceraError } = await supabase
        .from('movimientos_cabecera')
        .insert({
          empresa_id: empresa!.id,
          ubicacion_id: ubicacionActiva!.id,
          motivo_movimiento_id: await obtenerMotivoVenta(),
          numero_documento: documento || `VENTA-${Date.now()}`,
          observaciones: cliente ? `Cliente: ${cliente}` : null,
          total_documento: total,
          usuario_id: useAuthStore.getState().user!.id,
          fecha_movimiento: new Date().toISOString()
        })
        .select()
        .single()
      
      if (cabeceraError) throw cabeceraError
      
      // 2. Crear detalles de movimiento
      const detalles = items.map(item => ({
        empresa_id: empresa!.id,
        movimiento_cabecera_id: cabecera.id,
        variante_id: item.varianteId,
        ubicacion_id: ubicacionActiva!.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.subtotal
      }))
      
      const { error: detallesError } = await supabase
        .from('movimientos_detalle')
        .insert(detalles)
      
      if (detallesError) throw detallesError
      
      // 3. Limpiar venta y mostrar éxito
      limpiarVenta()
      setMontoPagado(0)
      cerrarModalPago()
      busquedaRef.current?.focus()
      
      notifications.show({
        title: 'Venta procesada',
        message: `Venta ${cabecera.numero_documento} procesada exitosamente`,
        color: 'green',
        icon: <IconCheck size={18} />
      })
      
      // Opcional: Imprimir ticket
      // imprimirTicket(cabecera, detalles)
      
    } catch (error) {
      console.error('Error procesando venta:', error)
      notifications.show({
        title: 'Error',
        message: 'Error al procesar la venta. Intente nuevamente.',
        color: 'red'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const obtenerMotivoVenta = async (): Promise<string> => {
    const { data } = await supabase
      .from('motivos_movimiento')
      .select('id')
      .eq('empresa_id', empresa!.id)
      .eq('codigo', 'VENTA')
      .single()
    
    return data?.id || ''
  }
  
  // =====================================================
  // RENDER DEL COMPONENTE
  // =====================================================
  
  return (
    <Container fluid className="h-screen p-4">
      <Grid className="h-full">
        {/* PANEL IZQUIERDO: Búsqueda y Productos */}
        <Grid.Col span={8}>
          <Card className="h-full p-4">
            <Group justify="space-between" className="mb-4">
              <Text size="xl" weight={600}>
                <IconShoppingCart className="inline mr-2" size={24} />
                Punto de Venta
              </Text>
              <Badge color="blue" size="lg">
                {ubicacionActiva?.nombre || 'Sin ubicación'}
              </Badge>
            </Group>
            
            {/* BARRA DE BÚSQUEDA */}
            <TextInput
              ref={busquedaRef}
              placeholder="Buscar por SKU o nombre del producto (F1)"
              leftSection={<IconSearch size={20} />}
              rightSection={<IconBarcode size={20} />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              size="lg"
              className="mb-4"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && resultadosBusqueda.length > 0) {
                  e.preventDefault()
                  // Focus en primer resultado
                }
              }}
            />
            
            {/* RESULTADOS DE BÚSQUEDA */}
            {resultadosBusqueda.length > 0 && (
              <Card className="mb-4 max-h-80 overflow-auto">
                <Text size="sm" className="mb-2 font-medium">
                  Resultados de búsqueda:
                </Text>
                {resultadosBusqueda.map((variante, index) => (
                  <div
                    key={variante.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      index === 0 ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => agregarProductoRapido(variante)}
                  >
                    <Group justify="space-between">
                      <div>
                        <Text weight={500}>{variante.nombre}</Text>
                        <Text size="sm" color="dimmed">
                          SKU: {variante.sku}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text size="lg" weight={600}>
                          ${variante.precio_venta?.toFixed(2)}
                        </Text>
                        <Badge 
                          color={variante.stock > 0 ? 'green' : 'red'}
                          size="sm"
                        >
                          Stock: {variante.stock}
                        </Badge>
                      </div>
                    </Group>
                  </div>
                ))}
              </Card>
            )}
            
            {/* ATAJOS DE TECLADO */}
            <Card className="bg-gray-50">
              <Text size="sm" weight={500} className="mb-2">
                Atajos de teclado:
              </Text>
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs">F1: Buscar productos</Text>
                  <Text size="xs">F2: Procesar pago</Text>
                  <Text size="xs">F3: Limpiar venta</Text>
                </Grid.Col>
                <Grid.Col span={6}>
                  <Text size="xs">F4: Cambiar método pago</Text>
                  <Text size="xs">Enter: Agregar producto</Text>
                  <Text size="xs">Del: Eliminar último item</Text>
                </Grid.Col>
              </Grid>
            </Card>
          </Card>
        </Grid.Col>
        
        {/* PANEL DERECHO: Carrito y Pago */}
        <Grid.Col span={4}>
          <Card className="h-full p-4 flex flex-col">
            {/* INFORMACIÓN DEL CLIENTE */}
            <div className="mb-4">
              <TextInput
                placeholder="Nombre del cliente (opcional)"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="mb-2"
              />
              <TextInput
                placeholder="Número de documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </div>
            
            <Divider className="mb-4" />
            
            {/* CARRITO DE COMPRAS */}
            <div className="flex-1">
              <Text size="lg" weight={600} className="mb-3">
                Carrito ({items.length} items)
              </Text>
              
              <ScrollArea className="flex-1 mb-4" style={{ height: '300px' }}>
                {items.length === 0 ? (
                  <Alert color="blue" className="text-center">
                    <Text size="sm">
                      Carrito vacío. Use F1 para buscar productos.
                    </Text>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <Card key={item.varianteId} className="p-3">
                        <Group justify="space-between" className="mb-2">
                          <Text size="sm" weight={500} className="flex-1">
                            {item.nombre}
                          </Text>
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="sm"
                            onClick={() => eliminarItem(item.varianteId)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                        
                        <Text size="xs" color="dimmed" className="mb-2">
                          SKU: {item.sku} | Stock: {item.stock}
                        </Text>
                        
                        <Group justify="space-between">
                          <Group gap="xs">
                            <ActionIcon
                              size="sm"
                              onClick={() => actualizarCantidad(item.varianteId, item.cantidad - 1)}
                            >
                              <IconMinus size={12} />
                            </ActionIcon>
                            <NumberInput
                              value={item.cantidad}
                              onChange={(val) => actualizarCantidad(item.varianteId, val || 1)}
                              min={1}
                              max={item.stock}
                              size="xs"
                              style={{ width: '60px' }}
                              hideControls
                            />
                            <ActionIcon
                              size="sm"
                              onClick={() => actualizarCantidad(item.varianteId, item.cantidad + 1)}
                              disabled={item.cantidad >= item.stock}
                            >
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Group>
                          
                          <Text weight={600}>
                            ${item.subtotal.toFixed(2)}
                          </Text>
                        </Group>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
            
            {/* TOTAL Y BOTONES */}
            <div className="border-t pt-4 space-y-4">
              <Group justify="space-between">
                <Text size="xl" weight={700}>TOTAL:</Text>
                <Text size="xl" weight={700} color="blue">
                  ${total.toFixed(2)}
                </Text>
              </Group>
              
              <Group>
                <Button
                  fullWidth
                  size="lg"
                  color="green"
                  leftSection={<IconCash size={20} />}
                  disabled={items.length === 0 || loading}
                  onClick={abrirModalPago}
                >
                  Cobrar (F2)
                </Button>
              </Group>
              
              <Button
                fullWidth
                variant="outline"
                color="red"
                onClick={limpiarVenta}
                disabled={items.length === 0}
              >
                Limpiar Venta (F3)
              </Button>
            </div>
          </Card>
        </Grid.Col>
      </Grid>
      
      {/* MODAL DE PAGO */}
      <Modal
        opened={modalPago}
        onClose={cerrarModalPago}
        title="Procesar Pago"
        size="md"
        centered
      >
        <div className="space-y-4">
          <Group justify="space-between">
            <Text size="lg">Total a cobrar:</Text>
            <Text size="xl" weight={700} color="blue">
              ${total.toFixed(2)}
            </Text>
          </Group>
          
          <Select
            label="Método de pago"
            value={metodoPago}
            onChange={(val) => setMetodoPago(val || 'efectivo')}
            data={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'tarjeta', label: 'Tarjeta' },
              { value: 'transferencia', label: 'Transferencia' }
            ]}
          />
          
          {metodoPago === 'efectivo' && (
            <>
              <NumberInput
                label="Monto recibido"
                value={montoPagado}
                onChange={(val) => setMontoPagado(val || 0)}
                min={0}
                decimalScale={2}
                fixedDecimalScale
                prefix="$"
                size="lg"
              />
              
              <Group justify="space-between">
                <Text>Vuelto:</Text>
                <Text size="lg" weight={600} color={vuelto >= 0 ? 'green' : 'red'}>
                  ${vuelto.toFixed(2)}
                </Text>
              </Group>
            </>
          )}
          
          <Group justify="space-between" className="pt-4">
            <Button variant="outline" onClick={cerrarModalPago}>
              Cancelar
            </Button>
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={procesarVenta}
              loading={loading}
              disabled={metodoPago === 'efectivo' && montoPagado < total}
            >
              Confirmar Pago
            </Button>
          </Group>
        </div>
      </Modal>
    </Container>
  )
}

export default PuntoDeVenta
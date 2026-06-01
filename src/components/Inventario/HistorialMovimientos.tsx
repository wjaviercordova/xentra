// =====================================================
// XENTRA - Historial de Movimientos de Inventario
// =====================================================

import { useState, useEffect } from 'react'
import {
  Modal,
  Table,
  Text,
  Badge,
  ScrollArea,
  Group,
  Button,
  Stack,
  Alert
} from '@mantine/core'
import {
  IconHistory,
  IconArrowUp,
  IconArrowDown,
  IconRefresh,
  IconInfoCircle
} from '@tabler/icons-react'
import { supabase } from '@/lib/supabase'
import { NotificationManager } from '@/utils/notifications'
import { TableSkeleton } from '@/components/UI/LoadingStates'

interface MovimientoHistorial {
  id: string
  tipo: string
  cantidad_anterior: number
  cantidad_movimiento: number
  cantidad_nueva: number
  motivo: string
  created_at: string
  usuario_email: string
}

interface HistorialMovimientosProps {
  inventarioId: string
  productoNombre: string
  opened: boolean
  onClose: () => void
}

export default function HistorialMovimientos({
  inventarioId,
  productoNombre,
  opened,
  onClose
}: HistorialMovimientosProps) {
  const [movimientos, setMovimientos] = useState<MovimientoHistorial[]>([])
  const [loading, setLoading] = useState(false)

  const cargarHistorial = async () => {
    if (!inventarioId) return

    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('obtener_historial_inventario', {
        p_inventario_id: inventarioId,
        p_limite: 100
      })

      if (error) throw error
      setMovimientos(data || [])
    } catch (error) {
      NotificationManager.error('Error', 'No se pudo cargar el historial')
      console.error('Error cargando historial:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (opened && inventarioId) {
      cargarHistorial()
    }
  }, [opened, inventarioId])

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return <IconArrowUp size={16} color="green" />
      case 'salida': return <IconArrowDown size={16} color="red" />
      case 'ajuste': return <IconRefresh size={16} color="blue" />
      default: return <IconHistory size={16} />
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'green'
      case 'salida': return 'red'
      case 'ajuste': return 'blue'
      default: return 'gray'
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconHistory size={20} />
          <Text>Historial de Movimientos - {productoNombre}</Text>
        </Group>
      }
      size="xl"
    >
      <Stack>
        <Group justify="between">
          <Text size="sm" c="dimmed">
            Últimos {movimientos.length} movimientos
          </Text>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={cargarHistorial}
            loading={loading}
          >
            Actualizar
          </Button>
        </Group>

        {loading ? (
          <TableSkeleton />
        ) : movimientos.length === 0 ? (
          <Alert icon={<IconInfoCircle size={16} />} color="blue">
            No hay movimientos registrados para este producto
          </Alert>
        ) : (
          <ScrollArea h={400}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Stock Anterior</Table.Th>
                  <Table.Th>Movimiento</Table.Th>
                  <Table.Th>Stock Nuevo</Table.Th>
                  <Table.Th>Motivo</Table.Th>
                  <Table.Th>Usuario</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {movimientos.map((movimiento) => (
                  <Table.Tr key={movimiento.id}>
                    <Table.Td>
                      <Text size="sm">
                        {formatFecha(movimiento.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {getTipoIcon(movimiento.tipo)}
                        <Badge
                          color={getTipoColor(movimiento.tipo)}
                          variant="light"
                          size="sm"
                        >
                          {movimiento.tipo.charAt(0).toUpperCase() + movimiento.tipo.slice(1)}
                        </Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>
                        {movimiento.cantidad_anterior}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        fw={600}
                        c={movimiento.tipo === 'entrada' ? 'green' : 
                           movimiento.tipo === 'salida' ? 'red' : 'blue'}
                      >
                        {movimiento.tipo === 'entrada' ? '+' : 
                         movimiento.tipo === 'salida' ? '-' : ''}
                        {movimiento.cantidad_movimiento}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>
                        {movimiento.cantidad_nueva}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {movimiento.motivo || 'Sin motivo especificado'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {movimiento.usuario_email}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Modal>
  )
}
import { useState, useEffect } from 'react'
import {
  Button,
  Table,
  Modal,
  TextInput,
  Textarea,
  Alert,
  ActionIcon,
  Group,
  Badge,
  Grid,
  Switch,
  Select,
  Notification
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconMapPin,
  IconBuilding,
  IconAlertCircle,
  IconSearch,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { supabase, type Ubicacion } from '@/lib/supabase'
import { useAuthStore } from '@/stores'

interface UbicacionForm {
  nombre: string
  direccion: string
  telefono: string
  tipo: string
  es_principal: boolean
  activo: boolean
}

export default function UbicacionesManagement() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpened, setModalOpened] = useState(false)
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { empresaActual } = useAuthStore()

  const form = useForm<UbicacionForm>({
    initialValues: {
      nombre: '',
      direccion: '',
      telefono: '',
      tipo: 'sucursal',
      es_principal: false,
      activo: true
    },
    validate: {
      nombre: (value) => value.length < 2 ? 'El nombre debe tener al menos 2 caracteres' : null,
      tipo: (value) => ['sucursal', 'bodega', 'local'].includes(value) ? null : 'Tipo inválido'
    }
  })

  const tiposUbicacion = [
    { value: 'sucursal', label: 'Sucursal' },
    { value: 'bodega', label: 'Bodega' },
    { value: 'local', label: 'Local' }
  ]

  const cargarUbicaciones = async () => {
    if (!empresaActual?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ubicaciones')
        .select('*')
        .eq('empresa_id', empresaActual.id)
        .order('nombre')

      if (error) throw error

      setUbicaciones(data || [])
    } catch (error) {
      console.error('Error cargando ubicaciones:', error)
      notifications.show({
        title: 'Error',
        message: 'No se pudieron cargar las ubicaciones',
        color: 'red',
        icon: <IconX size={16} />
      })
    } finally {
      setLoading(false)
    }
  }

  const abrirModal = (ubicacion?: Ubicacion) => {
    if (ubicacion) {
      setEditingUbicacion(ubicacion)
      form.setValues({
        nombre: ubicacion.nombre,
        direccion: ubicacion.direccion || '',
        telefono: ubicacion.telefono || '',
        tipo: ubicacion.tipo || 'sucursal',
        // Convertir null a false para el formulario
        es_principal: ubicacion.es_principal === true,
        activo: ubicacion.activo ?? true
      })
    } else {
      setEditingUbicacion(null)
      form.reset()
      form.setValues({
        nombre: '',
        direccion: '',
        telefono: '',
        tipo: 'sucursal',
        es_principal: false,
        activo: true
      })
    }
    setModalOpened(true)
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingUbicacion(null)
    form.reset()
  }

  const guardarUbicacion = async (values: UbicacionForm) => {
    if (!empresaActual?.id) return

    try {
      // Preparar los datos para insertar/actualizar
      const datosUbicacion = {
        nombre: values.nombre,
        direccion: values.direccion || null,
        telefono: values.telefono || null,
        tipo: values.tipo,
        activo: values.activo,
        // Solo incluir es_principal si es true, de lo contrario usar null
        // Esto evita el conflicto con la restricción única mal configurada
        es_principal: values.es_principal === true ? true : null
      }

      // Si se marca como principal, desmarcar otras ubicaciones principales primero
      if (values.es_principal === true) {
        const { error: errorDesmarcar } = await supabase
          .from('ubicaciones')
          .update({ es_principal: null })
          .eq('empresa_id', empresaActual.id)
          .eq('es_principal', true)
          .neq('id', editingUbicacion?.id || 'nuevo-registro')

        if (errorDesmarcar) {
          console.warn('Advertencia desmarcando ubicaciones principales:', errorDesmarcar)
        }
      }

      if (editingUbicacion) {
        // Actualizar
        const { error } = await supabase
          .from('ubicaciones')
          .update({
            ...datosUbicacion,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUbicacion.id)

        if (error) throw error

        notifications.show({
          title: 'Éxito',
          message: 'Ubicación actualizada correctamente',
          color: 'green',
          icon: <IconCheck size={16} />
        })
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('ubicaciones')
          .insert({
            ...datosUbicacion,
            empresa_id: empresaActual.id
          })

        if (error) throw error

        notifications.show({
          title: 'Éxito',
          message: 'Ubicación creada correctamente',
          color: 'green',
          icon: <IconCheck size={16} />
        })
      }

      cargarUbicaciones()
      cerrarModal()
    } catch (error) {
      console.error('Error guardando ubicación:', error)
      
      // Mensaje de error más específico
      let mensajeError = 'No se pudo guardar la ubicación'
      if (error.code === '23505') {
        mensajeError = 'Ya existe una ubicación principal para esta empresa. Desmarca la actual primero.'
      }
      
      notifications.show({
        title: 'Error',
        message: mensajeError,
        color: 'red',
        icon: <IconX size={16} />
      })
    }
  }

  const eliminarUbicacion = (ubicacion: Ubicacion) => {
    modals.openConfirmModal({
      title: 'Eliminar ubicación',
      children: `¿Estás seguro de eliminar la ubicación "${ubicacion.nombre}"? Esta acción no se puede deshacer.`,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('ubicaciones')
            .delete()
            .eq('id', ubicacion.id)

          if (error) throw error

          notifications.show({
            title: 'Éxito',
            message: 'Ubicación eliminada correctamente',
            color: 'green',
            icon: <IconCheck size={16} />
          })
          cargarUbicaciones()
        } catch (error) {
          console.error('Error eliminando ubicación:', error)
          notifications.show({
            title: 'Error',
            message: 'No se pudo eliminar la ubicación',
            color: 'red',
            icon: <IconX size={16} />
          })
        }
      }
    })
  }

  // Filtrar ubicaciones por búsqueda
  const ubicacionesFiltradas = ubicaciones.filter(ubicacion =>
    ubicacion.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ubicacion.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ubicacion.tipo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    cargarUbicaciones()
  }, [empresaActual?.id])

  if (loading) {
    return <div>Cargando ubicaciones...</div>
  }

  return (
    <div className="p-6">
      <Group justify="space-between" mb="lg">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Ubicaciones</h2>
          <p className="text-gray-600">Administra sucursales, bodegas y locales</p>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => abrirModal()}
        >
          Nueva Ubicación
        </Button>
      </Group>

      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar ubicaciones..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="lg"
      />

      {/* Tabla */}
      {ubicacionesFiltradas.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin ubicaciones"
          color="blue"
        >
          {searchTerm ? 'No se encontraron ubicaciones con ese criterio' : 'No hay ubicaciones registradas'}
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Teléfono</Table.Th>
              <Table.Th>Principal</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ubicacionesFiltradas.map((ubicacion) => (
              <Table.Tr key={ubicacion.id}>
                <Table.Td>
                  <Group gap="xs">
                    <IconMapPin size={16} />
                    <span className="font-medium">{ubicacion.nombre}</span>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge 
                    variant="outline"
                    color={
                      ubicacion.tipo === 'sucursal' ? 'blue' :
                      ubicacion.tipo === 'bodega' ? 'orange' : 'green'
                    }
                  >
                    {ubicacion.tipo === 'sucursal' ? 'Sucursal' :
                     ubicacion.tipo === 'bodega' ? 'Bodega' : 'Local'}
                  </Badge>
                </Table.Td>
                <Table.Td>{ubicacion.direccion || '-'}</Table.Td>
                <Table.Td>{ubicacion.telefono || '-'}</Table.Td>
                <Table.Td>
                  {ubicacion.es_principal ? (
                    <Badge color="yellow">Principal</Badge>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge color={ubicacion.activo ? 'green' : 'red'}>
                    {ubicacion.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => abrirModal(ubicacion)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarUbicacion(ubicacion)}
                      disabled={ubicacion.es_principal === true}
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
        title={editingUbicacion ? 'Editar Ubicación' : 'Nueva Ubicación'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(guardarUbicacion)}>
          <Grid>
            <Grid.Col span={12}>
              <TextInput
                label="Nombre"
                placeholder="Nombre de la ubicación"
                leftSection={<IconBuilding size={16} />}
                required
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Tipo"
                placeholder="Selecciona el tipo"
                data={tiposUbicacion}
                leftSection={<IconMapPin size={16} />}
                required
                {...form.getInputProps('tipo')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Teléfono"
                placeholder="Número de teléfono"
                {...form.getInputProps('telefono')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Dirección"
                placeholder="Dirección completa"
                rows={3}
                {...form.getInputProps('direccion')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Switch
                label="Ubicación principal"
                description="Solo puede haber una ubicación principal por empresa"
                {...form.getInputProps('es_principal', { type: 'checkbox' })}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Switch
                label="Activo"
                description="Las ubicaciones inactivas no aparecen en selecciones"
                {...form.getInputProps('activo', { type: 'checkbox' })}
              />
            </Grid.Col>
          </Grid>

          <Group justify="end" mt="lg">
            <Button variant="light" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />}>
              {editingUbicacion ? 'Actualizar' : 'Crear'}
            </Button>
          </Group>
        </form>
      </Modal>
    </div>
  )
}
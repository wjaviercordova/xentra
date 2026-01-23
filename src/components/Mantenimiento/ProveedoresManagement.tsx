// =====================================================
// XENTRA - Mantenimiento de Proveedores
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
  LoadingOverlay
} from '@mantine/core'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconPhone,
  IconMail,
  IconMapPin
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'

interface Proveedor {
  id: string
  nombre: string
  ruc_nit?: string
  contacto?: string
  telefono?: string
  email?: string
  direccion?: string
  activo: boolean
  created_at: string
}

const ProveedoresManagement: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpened, setModalOpened] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  
  const { empresaActual } = useAuthStore()

  const form = useForm({
    initialValues: {
      nombre: '',
      ruc_nit: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true
    },
    validate: {
      nombre: (value) => !value ? 'El nombre es requerido' : null,
      email: (value) => value && !/^\S+@\S+$/.test(value) ? 'Email inválido' : null
    }
  })

  // ===============================
  // FUNCIONES DE DATOS
  // ===============================

  const cargarProveedores = async () => {
    if (!empresaActual?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('empresa_id', empresaActual.id)
        .order('nombre', { ascending: true })

      if (error) throw error
      setProveedores(data || [])
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

  const guardarProveedor = async (values: typeof form.values) => {
    if (!empresaActual?.id) return

    setLoading(true)
    try {
      const proveedorData = {
        ...values,
        empresa_id: empresaActual.id,
        // Convertir campos vacíos a null
        ruc_nit: values.ruc_nit || null,
        contacto: values.contacto || null,
        telefono: values.telefono || null,
        email: values.email || null,
        direccion: values.direccion || null
      }

      let error
      if (editingProveedor) {
        // Actualizar
        const result = await supabase
          .from('proveedores')
          .update(proveedorData)
          .eq('id', editingProveedor.id)
        error = result.error
      } else {
        // Crear
        const result = await supabase
          .from('proveedores')
          .insert(proveedorData)
        error = result.error
      }

      if (error) throw error

      notifications.show({
        title: 'Éxito',
        message: `Proveedor ${editingProveedor ? 'actualizado' : 'creado'} exitosamente`,
        color: 'green',
        icon: <IconCheck />
      })

      cerrarModal()
      await cargarProveedores()
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

  const eliminarProveedor = async (proveedor: Proveedor) => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${proveedor.nombre}"?`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', proveedor.id)

      if (error) throw error

      notifications.show({
        title: 'Éxito',
        message: 'Proveedor eliminado exitosamente',
        color: 'green',
        icon: <IconCheck />
      })

      await cargarProveedores()
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'No se puede eliminar el proveedor. Puede tener movimientos asociados.',
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

  const abrirModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor)
      form.setValues({
        nombre: proveedor.nombre,
        ruc_nit: proveedor.ruc_nit || '',
        contacto: proveedor.contacto || '',
        telefono: proveedor.telefono || '',
        email: proveedor.email || '',
        direccion: proveedor.direccion || '',
        activo: proveedor.activo
      })
    } else {
      setEditingProveedor(null)
      form.reset()
    }
    setModalOpened(true)
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingProveedor(null)
    form.reset()
  }

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(proveedor =>
    proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (proveedor.ruc_nit && proveedor.ruc_nit.includes(searchTerm)) ||
    (proveedor.contacto && proveedor.contacto.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    cargarProveedores()
  }, [empresaActual?.id])

  return (
    <Paper p="lg" withBorder>
      <LoadingOverlay visible={loading} />
      
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Proveedores</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => abrirModal()}
        >
          Nuevo Proveedor
        </Button>
      </Group>

      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar proveedores..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="lg"
      />

      {/* Tabla */}
      {proveedoresFiltrados.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin proveedores"
          color="blue"
        >
          {searchTerm ? 'No se encontraron proveedores con ese criterio' : 'No hay proveedores registrados'}
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>RUC/NIT</Table.Th>
              <Table.Th>Contacto</Table.Th>
              <Table.Th>Teléfono</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {proveedoresFiltrados.map((proveedor) => (
              <Table.Tr key={proveedor.id}>
                <Table.Td weight={500}>{proveedor.nombre}</Table.Td>
                <Table.Td>{proveedor.ruc_nit || '-'}</Table.Td>
                <Table.Td>{proveedor.contacto || '-'}</Table.Td>
                <Table.Td>
                  {proveedor.telefono && (
                    <Group gap="xs">
                      <IconPhone size={14} />
                      {proveedor.telefono}
                    </Group>
                  ) || '-'}
                </Table.Td>
                <Table.Td>
                  {proveedor.email && (
                    <Group gap="xs">
                      <IconMail size={14} />
                      {proveedor.email}
                    </Group>
                  ) || '-'}
                </Table.Td>
                <Table.Td>
                  <Badge color={proveedor.activo ? 'green' : 'red'}>
                    {proveedor.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => abrirModal(proveedor)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarProveedor(proveedor)}
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
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(guardarProveedor)}>
          <Grid>
            <Grid.Col span={8}>
              <TextInput
                label="Nombre"
                placeholder="Nombre del proveedor"
                required
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            
            <Grid.Col span={4}>
              <TextInput
                label="RUC/NIT"
                placeholder="RUC o NIT"
                {...form.getInputProps('ruc_nit')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Persona de Contacto"
                placeholder="Nombre del contacto"
                {...form.getInputProps('contacto')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Teléfono"
                placeholder="Número de teléfono"
                leftSection={<IconPhone size={16} />}
                {...form.getInputProps('telefono')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Email"
                placeholder="email@proveedor.com"
                leftSection={<IconMail size={16} />}
                {...form.getInputProps('email')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Dirección"
                placeholder="Dirección del proveedor"
                leftSection={<IconMapPin size={16} />}
                {...form.getInputProps('direccion')}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Group>
                <input
                  type="checkbox"
                  {...form.getInputProps('activo', { type: 'checkbox' })}
                />
                <span>Proveedor activo</span>
              </Group>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="lg">
            <Button variant="outline" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editingProveedor ? 'Actualizar' : 'Crear'}
            </Button>
          </Group>
        </form>
      </Modal>
    </Paper>
  )
}

export default ProveedoresManagement
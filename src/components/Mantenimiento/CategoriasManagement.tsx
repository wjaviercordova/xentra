// =====================================================
// XENTRA - Mantenimiento de Categorías
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
  LoadingOverlay,
  NumberInput,
  Textarea
} from '@mantine/core'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconAlertCircle,
  IconCheck,
  IconX
} from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { modals } from '@mantine/modals'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'
import { useCachedQuery, supabaseCache } from '@/utils/supabaseCache'
import { TableSkeleton } from '@/components/UI/LoadingStates'

interface Categoria {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  created_at: string
}

const CategoriasManagement: React.FC = () => {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpened, setModalOpened] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  
  const { empresaActual } = useAuthStore()

  const form = useForm({
    initialValues: {
      nombre: '',
      descripcion: '',
      orden: 1,
      activo: true
    },
    validate: {
      nombre: (value) => !value ? 'El nombre es requerido' : null,
      orden: (value) => value < 1 ? 'El orden debe ser mayor a 0' : null
    }
  })

  // ===============================
  // FUNCIONES DE DATOS
  // ===============================

  const cargarCategorias = async () => {
    if (!empresaActual?.id) return
    
    setLoading(true)
    try {
      const data = await useCachedQuery(
        async () => {
          const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .eq('empresa_id', empresaActual.id)
            .order('orden', { ascending: true })

          if (error) throw error
          return data || []
        },
        'categorias',
        { empresa_id: empresaActual.id },
        5 * 60 * 1000 // Cache por 5 minutos
      )
      
      setCategorias(data)
    } catch (error: any) {
      NotificationManager.error('Error', 'No se pudieron cargar las categorías')
      console.error('Error cargando categorías:', error)
    } finally {
      setLoading(false)
    }
  }

  const guardarCategoria = async (values: typeof form.values) => {
    if (!empresaActual?.id) return

    try {
      const categoriaData = {
        ...values,
        empresa_id: empresaActual.id
      }

      await NotificationManager.loading(
        editingCategoria ? 'Actualizando categoría...' : 'Creando categoría...',
        editingCategoria ? 
          supabase
            .from('categorias')
            .update(categoriaData)
            .eq('id', editingCategoria.id)
            .then(({ error }) => {
              if (error) throw error
            }) :
          supabase
            .from('categorias')
            .insert(categoriaData)
            .then(({ error }) => {
              if (error) throw error
            }),
        {
          success: `Categoría ${editingCategoria ? 'actualizada' : 'creada'} exitosamente`,
          error: 'No se pudo guardar la categoría'
        }
      )

      // Invalidar cache
      supabaseCache.invalidateTable('categorias')
      
      cerrarModal()
      await cargarCategorias()
    } catch (error: any) {
      console.error('Error guardando categoría:', error)
    }
  }

  const eliminarCategoria = async (categoria: Categoria) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoria.nombre}"?`)) return

    try {
      await NotificationManager.loading(
        'Eliminando categoría...',
        supabase
          .from('categorias')
          .delete()
          .eq('id', categoria.id)
          .then(({ error }) => {
            if (error) throw error
          }),
        {
          success: 'Categoría eliminada exitosamente',
          error: 'No se pudo eliminar la categoría'
        }
      )

      // Invalidar cache
      supabaseCache.invalidateTable('categorias')
      
      await cargarCategorias()
    } catch (error: any) {
      console.error('Error eliminando categoría:', error)
    }
  }

  // ===============================
  // FUNCIONES DE UI
  // ===============================

  const abrirModal = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoria(categoria)
      form.setValues({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
        orden: categoria.orden,
        activo: categoria.activo
      })
    } else {
      setEditingCategoria(null)
      form.reset()
      // Auto-asignar siguiente orden
      const maxOrden = Math.max(...categorias.map(c => c.orden), 0)
      form.setValues({ ...form.values, orden: maxOrden + 1 })
    }
    setModalOpened(true)
  }

  const cerrarModal = () => {
    setModalOpened(false)
    setEditingCategoria(null)
    form.reset()
  }

  // Filtrar categorías
  const categoriasFiltradas = categorias.filter(categoria =>
    categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (categoria.descripcion && categoria.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  useEffect(() => {
    cargarCategorias()
  }, [empresaActual?.id])

  return (
    <Paper p="lg" withBorder>
      <LoadingOverlay visible={loading} />
      
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Title order={2}>Gestión de Categorías</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => abrirModal()}
        >
          Nueva Categoría
        </Button>
      </Group>

      {/* Búsqueda */}
      <TextInput
        placeholder="Buscar categorías..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        leftSection={<IconSearch size={16} />}
        mb="lg"
      />

      {/* Tabla */}
      {categoriasFiltradas.length === 0 ? (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Sin categorías"
          color="blue"
        >
          {searchTerm ? 'No se encontraron categorías con ese criterio' : 'No hay categorías registradas'}
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Orden</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Descripción</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categoriasFiltradas.map((categoria) => (
              <Table.Tr key={categoria.id}>
                <Table.Td>{categoria.orden}</Table.Td>
                <Table.Td weight={500}>{categoria.nombre}</Table.Td>
                <Table.Td>{categoria.descripcion || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={categoria.activo ? 'green' : 'red'}>
                    {categoria.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => abrirModal(categoria)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => eliminarCategoria(categoria)}
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
        title={editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
        size="md"
      >
        <form onSubmit={form.onSubmit(guardarCategoria)}>
          <Grid>
            <Grid.Col span={12}>
              <TextInput
                label="Nombre"
                placeholder="Nombre de la categoría"
                required
                {...form.getInputProps('nombre')}
              />
            </Grid.Col>
            
            <Grid.Col span={12}>
              <Textarea
                label="Descripción"
                placeholder="Descripción opcional"
                rows={3}
                {...form.getInputProps('descripcion')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput
                label="Orden"
                placeholder="Orden de la categoría"
                min={1}
                required
                {...form.getInputProps('orden')}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Group mt="lg">
                <input
                  type="checkbox"
                  {...form.getInputProps('activo', { type: 'checkbox' })}
                />
                <span>Categoría activa</span>
              </Group>
            </Grid.Col>
          </Grid>

          <Group justify="flex-end" mt="lg">
            <Button variant="outline" onClick={cerrarModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editingCategoria ? 'Actualizar' : 'Crear'}
            </Button>
          </Group>
        </form>
      </Modal>
    </Paper>
  )
}

export default CategoriasManagement
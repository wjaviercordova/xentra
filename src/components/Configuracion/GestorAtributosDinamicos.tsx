// =====================================================
// XENTRA - Gestor de Plantillas de Atributos Dinámicos
// =====================================================

import { useState, useEffect } from 'react'
import {
  Container,
  Card,
  Group,
  Text,
  Button,
  Select,
  TextInput,
  Textarea,
  Switch,
  Table,
  Badge,
  Stack,
  Title,
  Modal,
  SimpleGrid,
  Paper,
  ThemeIcon,
  ActionIcon,
  Tabs,
  Divider,
  Alert,
  Loader,
  Center,
  NumberInput,
  JsonInput
} from '@mantine/core'
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconTemplate,
  IconSettings,
  IconCategory,
  IconList,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconCopy
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores'
import { NotificationManager } from '@/utils/notifications'

// ==================== INTERFACES ====================

interface PlantillaAtributos {
  id: string
  empresa_id: string
  categoria_id?: string
  categoria_nombre?: string
  sector_negocio: string
  nombre: string
  descripcion?: string
  es_activa: boolean
  es_predeterminada: boolean
  total_campos?: number
}

interface DefinicionAtributo {
  id: string
  plantilla_id: string
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: 'texto' | 'numero' | 'decimal' | 'seleccion' | 'multiple' | 'boolean' | 'fecha'
  es_requerido: boolean
  orden: number
  opciones_predefinidas?: string[]
  validaciones?: any
  unidad_medida?: string
  descripcion?: string
}

interface NuevaPlantilla {
  categoria_id: string
  sector_negocio: string
  nombre: string
  descripcion: string
  es_predeterminada: boolean
}

interface NuevoAtributo {
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: string
  es_requerido: boolean
  opciones_predefinidas: string
  unidad_medida: string
  descripcion: string
}

export default function GestorAtributosDinamicos() {
  const { empresaActual } = useAuthStore()
  const navigate = useNavigate()

  // Estados principales
  const [plantillas, setPlantillas] = useState<PlantillaAtributos[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [atributosPlantilla, setAtributosPlantilla] = useState<DefinicionAtributo[]>([])
  
  // Estados de UI
  const [loading, setLoading] = useState(true)
  const [modalNuevaPlantilla, setModalNuevaPlantilla] = useState(false)
  const [modalEditarAtributos, setModalEditarAtributos] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('')
  
  // Formularios
  const [nuevaPlantilla, setNuevaPlantilla] = useState<NuevaPlantilla>({
    categoria_id: '',
    sector_negocio: '',
    nombre: '',
    descripcion: '',
    es_predeterminada: false
  })
  
  const [nuevoAtributo, setNuevoAtributo] = useState<NuevoAtributo>({
    campo_nombre: '',
    campo_etiqueta: '',
    tipo_dato: 'texto',
    es_requerido: false,
    opciones_predefinidas: '',
    unidad_medida: '',
    descripcion: ''
  })

  // Opciones de sectores predefinidas
  const sectoresNegocio = [
    { value: 'tecnologia', label: '💻 Tecnología' },
    { value: 'hogar', label: '🏠 Hogar y Decoración' },
    { value: 'calzado', label: '👟 Calzado' },
    { value: 'textil', label: '👕 Textil y Prendas' },
    { value: 'alimenticio', label: '🍎 Alimenticio' },
    { value: 'salud', label: '💊 Salud y Belleza' },
    { value: 'deportes', label: '⚽ Deportes' },
    { value: 'automotriz', label: '🚗 Automotriz' },
    { value: 'construccion', label: '🔨 Construcción' },
    { value: 'oficina', label: '📎 Oficina y Papelería' },
    { value: 'juguetes', label: '🧸 Juguetes' },
    { value: 'mascotas', label: '🐕 Mascotas' },
    { value: 'electrodomesticos', label: '⚡ Electrodomésticos' },
    { value: 'muebles', label: '🪑 Muebles' },
    { value: 'otro', label: '📦 Otro' }
  ]

  const tiposDato = [
    { value: 'texto', label: '📝 Texto libre' },
    { value: 'numero', label: '🔢 Número entero' },
    { value: 'decimal', label: '💰 Número decimal' },
    { value: 'seleccion', label: '📋 Lista de selección' },
    { value: 'multiple', label: '☑️ Selección múltiple' },
    { value: 'boolean', label: '✅ Sí/No (checkbox)' },
    { value: 'fecha', label: '📅 Fecha' }
  ]

  // ==================== CARGAR DATOS ====================

  const cargarPlantillas = async () => {
    if (!empresaActual?.id) return

    try {
      const { data, error } = await supabase
        .from('plantillas_atributos')
        .select(`
          id,
          empresa_id,
          categoria_id,
          sector_negocio,
          nombre,
          descripcion,
          es_activa,
          es_predeterminada,
          definiciones_atributos(id)
        `)
        .eq('empresa_id', empresaActual.id)
        .eq('es_activa', true)
        .order('sector_negocio', { ascending: true })
        .order('nombre', { ascending: true })

      if (error) throw error

      // Cargar categorías primero para mapear nombres
      const { data: categoriasData } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)

      const categoriasMap = new Map(categoriasData?.map(cat => [cat.id, cat.nombre]) || [])

      const plantillasFormateadas = data?.map(plantilla => ({
        id: plantilla.id,
        empresa_id: plantilla.empresa_id,
        categoria_id: plantilla.categoria_id,
        categoria_nombre: categoriasMap.get(plantilla.categoria_id) || 'Sin categoría',
        sector_negocio: plantilla.sector_negocio,
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        es_activa: plantilla.es_activa,
        es_predeterminada: plantilla.es_predeterminada,
        total_campos: plantilla.definiciones_atributos?.length || 0
      })) || []

      setPlantillas(plantillasFormateadas)
    } catch (error) {
      console.error('Error cargando plantillas:', error)
      NotificationManager.error('Error', 'No se pudieron cargar las plantillas')
    }
  }

  const cargarCategorias = async () => {
    if (!empresaActual?.id) return

    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('empresa_id', empresaActual.id)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const cargarAtributosPlantilla = async (plantillaId: string) => {
    try {
      const { data, error } = await supabase
        .from('definiciones_atributos')
        .select('*')
        .eq('plantilla_id', plantillaId)
        .order('orden')

      if (error) throw error
      setAtributosPlantilla(data || [])
    } catch (error) {
      console.error('Error cargando atributos:', error)
      NotificationManager.error('Error', 'No se pudieron cargar los atributos')
    }
  }

  useEffect(() => {
    if (empresaActual?.id) {
      Promise.all([
        cargarPlantillas(),
        cargarCategorias()
      ]).finally(() => setLoading(false))
    }
  }, [empresaActual?.id])

  // ==================== ACCIONES ====================

  const crearPlantilla = async () => {
    if (!empresaActual?.id) return

    try {
      const { data, error } = await supabase
        .from('plantillas_atributos')
        .insert({
          empresa_id: empresaActual.id,
          categoria_id: nuevaPlantilla.categoria_id || null,
          sector_negocio: nuevaPlantilla.sector_negocio,
          nombre: nuevaPlantilla.nombre,
          descripcion: nuevaPlantilla.descripcion,
          es_predeterminada: nuevaPlantilla.es_predeterminada
        })
        .select()
        .single()

      if (error) throw error

      NotificationManager.success('Éxito', 'Plantilla creada correctamente')
      setModalNuevaPlantilla(false)
      setNuevaPlantilla({
        categoria_id: '',
        sector_negocio: '',
        nombre: '',
        descripcion: '',
        es_predeterminada: false
      })
      cargarPlantillas()
    } catch (error) {
      console.error('Error creando plantilla:', error)
      NotificationManager.error('Error', 'No se pudo crear la plantilla')
    }
  }

  const agregarAtributo = async () => {
    if (!plantillaSeleccionada) return

    try {
      const orden = atributosPlantilla.length + 1
      let opciones = null
      
      if (['seleccion', 'multiple'].includes(nuevoAtributo.tipo_dato) && nuevoAtributo.opciones_predefinidas) {
        opciones = nuevoAtributo.opciones_predefinidas.split(',').map(o => o.trim()).filter(o => o)
      }

      const { error } = await supabase
        .from('definiciones_atributos')
        .insert({
          plantilla_id: plantillaSeleccionada,
          campo_nombre: nuevoAtributo.campo_nombre.toLowerCase().replace(/\s+/g, '_'),
          campo_etiqueta: nuevoAtributo.campo_etiqueta,
          tipo_dato: nuevoAtributo.tipo_dato,
          es_requerido: nuevoAtributo.es_requerido,
          orden,
          opciones_predefinidas: opciones,
          unidad_medida: nuevoAtributo.unidad_medida || null,
          descripcion: nuevoAtributo.descripcion || null
        })

      if (error) throw error

      NotificationManager.success('Éxito', 'Atributo agregado correctamente')
      setNuevoAtributo({
        campo_nombre: '',
        campo_etiqueta: '',
        tipo_dato: 'texto',
        es_requerido: false,
        opciones_predefinidas: '',
        unidad_medida: '',
        descripcion: ''
      })
      cargarAtributosPlantilla(plantillaSeleccionada)
    } catch (error) {
      console.error('Error agregando atributo:', error)
      NotificationManager.error('Error', 'No se pudo agregar el atributo')
    }
  }

  const eliminarAtributo = async (atributoId: string) => {
    try {
      const { error } = await supabase
        .from('definiciones_atributos')
        .delete()
        .eq('id', atributoId)

      if (error) throw error

      NotificationManager.success('Éxito', 'Atributo eliminado correctamente')
      cargarAtributosPlantilla(plantillaSeleccionada)
    } catch (error) {
      console.error('Error eliminando atributo:', error)
      NotificationManager.error('Error', 'No se pudo eliminar el atributo')
    }
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Center py="xl">
          <Stack align="center" gap="md">
            <Loader size="lg" />
            <Text>Cargando configuración de atributos...</Text>
          </Stack>
        </Center>
      </Container>
    )
  }

  return (
    <Container size="xl" py="md">
      {/* Breadcrumb Navigation */}
      <Group mb="lg" gap="xs">
        <Button 
          variant="subtle" 
          size="sm"
          color="gray"
          onClick={() => navigate('/configuracion')}
        >
          Configuración
        </Button>
        <Text c="dimmed" size="sm">/</Text>
        <Text size="sm" weight={500}>Atributos Dinámicos</Text>
      </Group>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            🎛️ Gestión de Atributos Dinámicos
          </Title>
          <Text c="dimmed">
            Configura campos personalizados para diferentes tipos de productos
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setModalNuevaPlantilla(true)}
          color="blue"
        >
          Nueva Plantilla
        </Button>
      </Group>

      {/* Estadísticas Rápidas */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="blue" variant="light">
              <IconTemplate size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Plantillas Activas</Text>
              <Text size="xl" fw={700}>{plantillas.length}</Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="green" variant="light">
              <IconCategory size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Sectores Configurados</Text>
              <Text size="xl" fw={700}>
                {new Set(plantillas.map(p => p.sector_negocio)).size}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="lg" color="orange" variant="light">
              <IconList size={24} />
            </ThemeIcon>
            <div>
              <Text size="sm" c="dimmed">Total Atributos</Text>
              <Text size="xl" fw={700}>
                {plantillas.reduce((sum, p) => sum + (p.total_campos || 0), 0)}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Lista de Plantillas */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Text fw={600}>📋 Plantillas de Atributos</Text>
          {plantillas.length > 0 && (
            <Badge variant="light" color="blue">
              {plantillas.length} plantillas configuradas
            </Badge>
          )}
        </Group>

        {plantillas.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            No hay plantillas configuradas. Crea tu primera plantilla para empezar a personalizar los atributos de tus productos.
          </Alert>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Sector</Table.Th>
                  <Table.Th>Nombre de Plantilla</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Atributos</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {plantillas.map((plantilla) => (
                  <Table.Tr key={plantilla.id}>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color="blue"
                        leftSection={
                          sectoresNegocio.find(s => s.value === plantilla.sector_negocio)?.label.split(' ')[0] || '📦'
                        }
                      >
                        {plantilla.sector_negocio}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{plantilla.nombre}</Text>
                        <Text size="xs" c="dimmed">
                          {plantilla.descripcion || 'Sin descripción'}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {plantilla.categoria_nombre || 'General'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline" color="green">
                        {plantilla.total_campos} campos
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {plantilla.es_predeterminada && (
                          <Badge size="sm" color="yellow">Predeterminada</Badge>
                        )}
                        <Badge size="sm" color="green">Activa</Badge>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => {
                            setPlantillaSeleccionada(plantilla.id)
                            cargarAtributosPlantilla(plantilla.id)
                            setModalEditarAtributos(true)
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {/* Modal Nueva Plantilla */}
      <Modal
        opened={modalNuevaPlantilla}
        onClose={() => setModalNuevaPlantilla(false)}
        title="Crear Nueva Plantilla de Atributos"
        size="lg"
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Sector de Negocio"
              placeholder="Selecciona el sector"
              data={sectoresNegocio}
              value={nuevaPlantilla.sector_negocio}
              onChange={(value) => setNuevaPlantilla(prev => ({ 
                ...prev, 
                sector_negocio: value || '' 
              }))}
              required
              searchable
            />

            <Select
              label="Categoría (Opcional)"
              placeholder="Vincular a una categoría específica"
              data={categorias.map(cat => ({
                value: cat.id,
                label: cat.nombre
              }))}
              value={nuevaPlantilla.categoria_id}
              onChange={(value) => setNuevaPlantilla(prev => ({ 
                ...prev, 
                categoria_id: value || '' 
              }))}
              clearable
              searchable
            />
          </SimpleGrid>

          <TextInput
            label="Nombre de la Plantilla"
            placeholder="Ej: Calzado Deportivo, Ropa Casual, Electrónicos"
            value={nuevaPlantilla.nombre}
            onChange={(e) => setNuevaPlantilla(prev => ({ 
              ...prev, 
              nombre: e.currentTarget.value 
            }))}
            required
          />

          <Textarea
            label="Descripción"
            placeholder="Describe para qué tipo de productos se usará esta plantilla"
            value={nuevaPlantilla.descripcion}
            onChange={(e) => setNuevaPlantilla(prev => ({ 
              ...prev, 
              descripcion: e.currentTarget.value 
            }))}
            rows={3}
          />

          <Switch
            label="Hacer predeterminada para esta categoría"
            description="Se aplicará automáticamente a nuevos productos de esta categoría"
            checked={nuevaPlantilla.es_predeterminada}
            onChange={(e) => setNuevaPlantilla(prev => ({ 
              ...prev, 
              es_predeterminada: e.currentTarget.checked 
            }))}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => setModalNuevaPlantilla(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={crearPlantilla}
              disabled={!nuevaPlantilla.sector_negocio || !nuevaPlantilla.nombre}
              leftSection={<IconCheck size={16} />}
            >
              Crear Plantilla
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal Editar Atributos */}
      <Modal
        opened={modalEditarAtributos}
        onClose={() => setModalEditarAtributos(false)}
        title="Configurar Atributos de la Plantilla"
        size="xl"
      >
        <Stack gap="md">
          {/* Formulario Nuevo Atributo */}
          <Card withBorder p="md" bg="gray.0">
            <Text fw={600} mb="md">➕ Agregar Nuevo Atributo</Text>
            
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Nombre del Campo"
                placeholder="color, talla, peso..."
                value={nuevoAtributo.campo_nombre}
                onChange={(e) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  campo_nombre: e.currentTarget.value 
                }))}
                description="Se convertirá automáticamente en snake_case"
              />

              <TextInput
                label="Etiqueta Visible"
                placeholder="Color, Talla, Peso (kg)..."
                value={nuevoAtributo.campo_etiqueta}
                onChange={(e) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  campo_etiqueta: e.currentTarget.value 
                }))}
              />
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 3 }} mt="md">
              <Select
                label="Tipo de Datos"
                data={tiposDato}
                value={nuevoAtributo.tipo_dato}
                onChange={(value) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  tipo_dato: value || 'texto' 
                }))}
              />

              <TextInput
                label="Unidad de Medida"
                placeholder="kg, cm, litros..."
                value={nuevoAtributo.unidad_medida}
                onChange={(e) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  unidad_medida: e.currentTarget.value 
                }))}
              />

              <Switch
                label="Campo Requerido"
                checked={nuevoAtributo.es_requerido}
                onChange={(e) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  es_requerido: e.currentTarget.checked 
                }))}
                mt="xl"
              />
            </SimpleGrid>

            {['seleccion', 'multiple'].includes(nuevoAtributo.tipo_dato) && (
              <TextInput
                label="Opciones (separadas por comas)"
                placeholder="Rojo, Azul, Verde, Amarillo"
                value={nuevoAtributo.opciones_predefinidas}
                onChange={(e) => setNuevoAtributo(prev => ({ 
                  ...prev, 
                  opciones_predefinidas: e.currentTarget.value 
                }))}
                mt="md"
              />
            )}

            <Textarea
              label="Descripción"
              placeholder="Descripción del campo para ayudar al usuario"
              value={nuevoAtributo.descripcion}
              onChange={(e) => setNuevoAtributo(prev => ({ 
                ...prev, 
                descripcion: e.currentTarget.value 
              }))}
              rows={2}
              mt="md"
            />

            <Group justify="flex-end" mt="md">
              <Button
                onClick={agregarAtributo}
                disabled={!nuevoAtributo.campo_nombre || !nuevoAtributo.campo_etiqueta}
                leftSection={<IconPlus size={16} />}
              >
                Agregar Atributo
              </Button>
            </Group>
          </Card>

          {/* Lista de Atributos Existentes */}
          {atributosPlantilla.length > 0 && (
            <Card withBorder>
              <Text fw={600} mb="md">📋 Atributos Configurados</Text>
              
              <Table.ScrollContainer minWidth={700}>
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Campo</Table.Th>
                      <Table.Th>Tipo</Table.Th>
                      <Table.Th>Opciones</Table.Th>
                      <Table.Th>Requerido</Table.Th>
                      <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {atributosPlantilla.map((atributo) => (
                      <Table.Tr key={atributo.id}>
                        <Table.Td>
                          <div>
                            <Text fw={500}>{atributo.campo_etiqueta}</Text>
                            <Text size="xs" c="dimmed">
                              {atributo.campo_nombre}
                              {atributo.unidad_medida && ` (${atributo.unidad_medida})`}
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">
                            {tiposDato.find(t => t.value === atributo.tipo_dato)?.label || atributo.tipo_dato}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {atributo.opciones_predefinidas ? (
                            <Text size="xs" truncate style={{ maxWidth: 150 }}>
                              {Array.isArray(atributo.opciones_predefinidas) 
                                ? atributo.opciones_predefinidas.join(', ')
                                : JSON.stringify(atributo.opciones_predefinidas)
                              }
                            </Text>
                          ) : (
                            <Text c="dimmed" size="xs">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {atributo.es_requerido ? (
                            <Badge color="red" size="sm">Requerido</Badge>
                          ) : (
                            <Badge color="gray" size="sm">Opcional</Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => eliminarAtributo(atributo.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="light"
              onClick={() => setModalEditarAtributos(false)}
            >
              Cerrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
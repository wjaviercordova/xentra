// =====================================================
// XENTRA - Configuración General del Sistema
// =====================================================

import React from 'react'
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Button,
  Grid,
  ThemeIcon,
  Badge,
  Divider
} from '@mantine/core'
import {
  IconSettings,
  IconTags,
  IconUsers,
  IconDatabase,
  IconShield,
  IconBell,
  IconPalette,
  IconChevronRight
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'

const ConfiguracionGeneral: React.FC = () => {
  const navigate = useNavigate()
  const { perfil } = useAuthStore()

  const configuracionModulos = [
    {
      id: 'empresa',
      titulo: '🏢 Empresa',
      descripcion: 'Gestiona información general de la empresa, sucursales y configuración corporativa',
      icono: IconDatabase,
      color: 'blue',
      ruta: '/configuracion/empresa',
      disponible: false,
      permisos: ['admin', 'manager']
    },
    {
      id: 'usuarios',
      titulo: '👥 Usuarios',
      descripcion: 'Administra usuarios, roles y permisos del sistema empresarial',
      icono: IconUsers,
      color: 'green',
      ruta: '/configuracion/usuarios',
      disponible: false,
      permisos: ['admin']
    },
    {
      id: 'atributos',
      titulo: '🎛️ Atributos Dinámicos',
      descripcion: 'Gestiona atributos parametrizables para productos por sector de negocio',
      icono: IconTags,
      color: 'indigo',
      ruta: '/configuracion/atributos',
      disponible: true,
      permisos: ['admin', 'manager']
    },
    {
      id: 'etiquetas',
      titulo: '🏷️ Etiquetas/Códigos',
      descripcion: 'Configura etiquetas, códigos de barras y sistemas de identificación',
      icono: IconTags,
      color: 'orange',
      ruta: '/configuracion/etiquetas',
      disponible: false,
      permisos: ['admin', 'manager']
    },
    {
      id: 'permisos',
      titulo: '🔐 Permisos',
      descripcion: 'Configura políticas de seguridad, roles y control de acceso al sistema',
      icono: IconShield,
      color: 'red',
      ruta: '/configuracion/permisos',
      disponible: false,
      permisos: ['admin']
    }
  ]

  const tienePermiso = (moduloPermisos: string[]) => {
    return moduloPermisos.includes(perfil?.rol || 'user')
  }

  const manejarNavegacion = (ruta: string, disponible: boolean) => {
    if (disponible) {
      navigate(ruta)
    }
  }

  return (
    <Container size="xl">
      <div className="mb-8">
        <Group justify="space-between" align="start">
          <div>
            <Title order={1} c="blue">
              Configuración del Sistema
            </Title>
            <Text size="lg" c="dimmed" className="mt-2">
              Gestiona los diferentes aspectos de configuración de XENTRA
            </Text>
          </div>
          <Badge size="lg" color="blue" variant="light">
            Panel de Administración
          </Badge>
        </Group>
      </div>

      <Divider className="mb-6" />

      <Grid>
        {configuracionModulos.map((modulo) => {
          const Icono = modulo.icono
          const tieneAcceso = tienePermiso(modulo.permisos)
          
          return (
            <Grid.Col key={modulo.id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                className={`
                  transition-all duration-200 cursor-pointer h-full
                  ${modulo.disponible && tieneAcceso 
                    ? 'hover:shadow-md hover:-translate-y-1' 
                    : 'opacity-60 cursor-not-allowed'
                  }
                `}
                onClick={() => modulo.disponible && tieneAcceso && manejarNavegacion(modulo.ruta, modulo.disponible)}
              >
                <Stack>
                  <Group justify="space-between" align="start">
                    <ThemeIcon
                      size="xl"
                      color={modulo.color}
                      variant="light"
                      radius="xl"
                    >
                      <Icono size={28} />
                    </ThemeIcon>
                    
                    {modulo.disponible ? (
                      tieneAcceso ? (
                        <Badge color="green" variant="light" size="sm">
                          Disponible
                        </Badge>
                      ) : (
                        <Badge color="orange" variant="light" size="sm">
                          Sin permisos
                        </Badge>
                      )
                    ) : (
                      <Badge color="gray" variant="light" size="sm">
                        Próximamente
                      </Badge>
                    )}
                  </Group>

                  <div className="flex-1">
                    <Text weight={600} size="lg" className="mb-2">
                      {modulo.titulo}
                    </Text>
                    <Text size="sm" c="dimmed" className="leading-relaxed">
                      {modulo.descripcion}
                    </Text>
                  </div>

                  {modulo.disponible && tieneAcceso && (
                    <Group justify="space-between" align="center" className="mt-4">
                      <Text size="sm" c={modulo.color} weight={500}>
                        Configurar ahora
                      </Text>
                      <IconChevronRight size={16} color="gray" />
                    </Group>
                  )}
                  
                  {!tieneAcceso && (
                    <Text size="xs" c="red" className="mt-2">
                      Permisos requeridos: {modulo.permisos.join(', ')}
                    </Text>
                  )}
                </Stack>
              </Card>
            </Grid.Col>
          )
        })}
      </Grid>

      <Card className="mt-8" padding="lg" withBorder>
        <Group justify="space-between">
          <div>
            <Text weight={600} size="lg" className="mb-2">
              ¿Necesitas ayuda?
            </Text>
            <Text size="sm" c="dimmed">
              Consulta nuestra documentación o contacta al soporte técnico para obtener ayuda con la configuración.
            </Text>
          </div>
          <Button variant="outline" color="blue">
            Ver Documentación
          </Button>
        </Group>
      </Card>
    </Container>
  )
}

export default ConfiguracionGeneral
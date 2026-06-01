// =====================================================
// XENTRA - Layout Principal
// =====================================================

import React from 'react'
import {
  AppShell,
  Navbar,
  Header,
  Text,
  NavLink,
  Group,
  Avatar,
  Menu,
  ActionIcon,
  Badge,
  Select,
  Button
} from '@mantine/core'
import {
  IconDashboard,
  IconShoppingCart,
  IconPackage,
  IconTransfer,
  IconReport,
  IconSettings,
  IconLogout,
  IconUser,
  IconMapPin,
  IconBell,
  IconTags,
  IconTruck,
  IconBox,
  IconBarcode,
  IconAdjustments,
  IconShield
} from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    perfil,
    empresa,
    ubicacionActiva,
    ubicaciones,
    cambiarUbicacion,
    cerrarSesion
  } = useAuthStore()

  const menuItems = [
    {
      label: '🏪 Punto de Venta',
      icon: IconShoppingCart,
      path: '/pos',
      color: 'blue'
    },
    {
      label: '📦 Inventario',
      icon: IconPackage,
      color: 'green',
      submenu: [
        {
          label: 'Stock Actual',
          icon: IconBox,
          path: '/stocks',
          color: 'green'
        },
        {
          label: 'Movimientos de SKUs',
          icon: IconBarcode,
          path: '/movimientos',
          color: 'cyan'
        },
        {
          label: 'Transferencias',
          icon: IconTransfer,
          path: '/transferencias',
          color: 'orange'
        }
      ]
    },
    {
      label: '🔧 Mantenimiento',
      icon: IconSettings,
      color: 'teal',
      submenu: [
        {
          label: 'Categorías',
          icon: IconTags,
          path: '/mantenimiento/categorias',
          color: 'teal'
        },
        {
          label: 'Productos',
          icon: IconBox,
          path: '/mantenimiento/productos',
          color: 'teal'
        },
        {
          label: 'SKUs/Variantes',
          icon: IconBarcode,
          path: '/mantenimiento/variantes',
          color: 'teal'
        },
        {
          label: 'Ubicaciones',
          icon: IconMapPin,
          path: '/mantenimiento/ubicaciones',
          color: 'teal'
        }
      ]
    },
    {
      label: '📊 Reportes',
      icon: IconReport,
      path: '/reportes',
      color: 'purple'
    },
    {
      label: '⚙️ Configuración',
      icon: IconAdjustments,
      color: 'gray',
      submenu: [
        {
          label: '🏢 Empresa',
          icon: IconSettings,
          path: '/configuracion/empresa',
          color: 'blue'
        },
        {
          label: '👥 Usuarios',
          icon: IconUser,
          path: '/configuracion/usuarios',
          color: 'green'
        },
        {
          label: '🎛️ Atributos Dinámicos',
          icon: IconTags,
          path: '/configuracion/atributos',
          color: 'indigo'
        },
        {
          label: '🏷️ Etiquetas/Códigos',
          icon: IconBarcode,
          path: '/configuracion/etiquetas',
          color: 'orange'
        },
        {
          label: '🔐 Permisos',
          icon: IconShield,
          path: '/configuracion/permisos',
          color: 'red'
        }
      ]
    }
  ]

  return (
    <AppShell
      navbar={{ width: 280, breakpoint: 'sm' }}
      header={{ height: 70 }}
      padding="md"
    >
      {/* HEADER */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Text size="xl" weight={700} color="blue">
              XENTRA
            </Text>
            <Badge size="lg" color="blue" variant="light">
              {empresa?.nombre || 'Sin empresa'}
            </Badge>
          </Group>

          <Group>
            {/* Selector de ubicación */}
            <Select
              placeholder="Seleccionar ubicación"
              value={ubicacionActiva?.id || ''}
              onChange={(value) => value && cambiarUbicacion(value)}
              data={ubicaciones.map(u => ({
                value: u.id,
                label: u.nombre
              }))}
              leftSection={<IconMapPin size={16} />}
              style={{ width: 200 }}
            />

            {/* Notificaciones */}
            <ActionIcon variant="light" size="lg">
              <IconBell size={20} />
            </ActionIcon>

            {/* Menu del usuario */}
            <Menu shadow="md" width={250}>
              <Menu.Target>
                <Group className="cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <Avatar size="sm" color="blue">
                    {perfil?.nombre_completo?.charAt(0) || 'U'}
                  </Avatar>
                  <div>
                    <Text size="sm" weight={500}>
                      {perfil?.nombre_completo}
                    </Text>
                    <Text size="xs" color="dimmed">
                      {perfil?.rol}
                    </Text>
                  </div>
                </Group>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Mi cuenta</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  Perfil
                </Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />}>
                  Configuración
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  color="red"
                  onClick={cerrarSesion}
                >
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* NAVBAR */}
      <AppShell.Navbar p="md">
        <Text size="sm" weight={500} color="dimmed" className="mb-4">
          MENÚ PRINCIPAL
        </Text>

        {menuItems.map((item) => {
          const Icon = item.icon
          
          // Si tiene submenú
          if (item.submenu) {
            const isActiveParent = item.submenu.some(sub => location.pathname === sub.path)
            
            return (
              <div key={item.label}>
                <NavLink
                  label={item.label}
                  leftSection={<Icon size={20} />}
                  active={isActiveParent}
                  variant="subtle"
                  color={item.color}
                  className="mb-1"
                  childrenOffset={28}
                >
                  {item.submenu.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isActive = location.pathname === subItem.path
                    
                    return (
                      <NavLink
                        key={subItem.path}
                        label={subItem.label}
                        leftSection={<SubIcon size={16} />}
                        active={isActive}
                        variant="filled"
                        color={subItem.color}
                        onClick={() => navigate(subItem.path)}
                        className="mb-1"
                      />
                    )
                  })}
                </NavLink>
              </div>
            )
          }
          
          // Item normal sin submenú
          const isActive = location.pathname === item.path
          
          return (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<Icon size={20} />}
              active={isActive}
              variant="filled"
              color={item.color}
              onClick={() => navigate(item.path)}
              className="mb-2"
            />
          )
        })}

        {/* Información de la ubicación actual */}
        <div className="mt-auto pt-4 border-t">
          <Text size="xs" color="dimmed" className="mb-2">
            UBICACIÓN ACTIVA
          </Text>
          {ubicacionActiva ? (
            <div className="p-3 bg-blue-50 rounded">
              <Text size="sm" weight={500}>
                {ubicacionActiva.nombre}
              </Text>
              <Text size="xs" color="dimmed">
                {ubicacionActiva.direccion || 'Sin dirección'}
              </Text>
              <Badge size="xs" color="green" className="mt-1">
                {ubicacionActiva.tipo}
              </Badge>
            </div>
          ) : (
            <Text size="xs" color="red">
              No hay ubicación seleccionada
            </Text>
          )}
        </div>
      </AppShell.Navbar>

      {/* MAIN CONTENT */}
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  )
}

export default Layout
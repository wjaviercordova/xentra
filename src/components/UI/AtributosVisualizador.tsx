// =====================================================
// XENTRA - Componente de Atributos Dinámicos para SKUs
// =====================================================

import { useState } from 'react'
import {
  Card,
  Group,
  Text,
  Badge,
  Stack,
  Button,
  Collapse,
  Divider,
  SimpleGrid,
  ThemeIcon,
  Tooltip,
  ActionIcon
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
  IconTag,
  IconRuler,
  IconPalette,
  IconSettings
} from '@tabler/icons-react'

interface DefinicionAtributo {
  campo_nombre: string
  campo_etiqueta: string
  tipo_dato: string
  opciones_predefinidas?: string[]
  es_requerido: boolean
  unidad_medida?: string
  descripcion?: string
}

interface AtributosVisualizadorProps {
  atributos: Record<string, any>
  definiciones?: DefinicionAtributo[]
  mostrarTodos?: boolean
  compacto?: boolean
  titulo?: string
}

// Mapeo de iconos por tipo de atributo
const iconosAtributos = {
  color: IconPalette,
  talla: IconRuler,
  peso: IconRuler,
  medida: IconRuler,
  tipo: IconTag,
  marca: IconTag,
  material: IconSettings,
  default: IconTag
}

// Mapeo de colores por tipo de atributo
const coloresAtributos = {
  color: 'pink',
  talla: 'blue',
  peso: 'orange',
  medida: 'orange',
  tipo: 'green',
  marca: 'purple',
  material: 'gray',
  default: 'blue'
}

export default function AtributosVisualizador({ 
  atributos, 
  definiciones = [], 
  mostrarTodos = false,
  compacto = false,
  titulo = \"Características\"
}: AtributosVisualizadorProps) {
  const [expanded, setExpanded] = useState(mostrarTodos)

  // Filtrar atributos que tienen valor
  const atributosConValor = Object.entries(atributos || {}).filter(([_, valor]) => 
    valor !== null && valor !== undefined && valor !== ''
  )

  // Obtener definición de un atributo
  const obtenerDefinicion = (nombreCampo: string) => {
    return definiciones.find(def => def.campo_nombre === nombreCampo)
  }

  // Obtener icono para un atributo
  const obtenerIcono = (nombreCampo: string) => {
    const IconComponent = iconosAtributos[nombreCampo as keyof typeof iconosAtributos] || iconosAtributos.default
    return IconComponent
  }

  // Obtener color para un atributo
  const obtenerColor = (nombreCampo: string) => {
    return coloresAtributos[nombreCampo as keyof typeof coloresAtributos] || coloresAtributos.default
  }

  // Formatear valor según el tipo
  const formatearValor = (valor: any, definicion?: DefinicionAtributo) => {
    if (!valor) return '-'
    
    let valorFormateado = valor.toString()
    
    // Agregar unidad si existe
    if (definicion?.unidad_medida) {
      valorFormateado += ` ${definicion.unidad_medida}`
    }
    
    return valorFormateado
  }

  // Obtener etiqueta del campo
  const obtenerEtiqueta = (nombreCampo: string, definicion?: DefinicionAtributo) => {
    if (definicion?.campo_etiqueta) {
      return definicion.campo_etiqueta
    }
    
    // Capitalizar y formatear nombre del campo
    return nombreCampo
      .split('_')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ')
  }

  if (!atributosConValor.length) {
    return (
      <Card withBorder p=\"sm\" bg=\"gray.0\">
        <Text size=\"sm\" c=\"dimmed\" ta=\"center\">
          Sin características específicas
        </Text>
      </Card>
    )
  }

  // Mostrar solo los primeros 3 en modo compacto
  const atributosMostrar = expanded || mostrarTodos 
    ? atributosConValor 
    : atributosConValor.slice(0, 3)

  const hayMasAtributos = atributosConValor.length > 3

  return (
    <Card withBorder p={compacto ? \"sm\" : \"md\"}>
      <Group justify=\"space-between\" mb={compacto ? \"xs\" : \"sm\"}>
        <Text fw={600} size={compacto ? \"sm\" : \"md\"}>
          {titulo}
        </Text>
        {hayMasAtributos && (
          <ActionIcon
            variant=\"subtle\"
            onClick={() => setExpanded(!expanded)}
            size=\"sm\"
          >
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        )}
      </Group>

      <Stack gap={compacto ? \"xs\" : \"sm\"}>
        <SimpleGrid cols={{ base: 1, sm: compacto ? 2 : 3 }} spacing={compacto ? \"xs\" : \"sm\"}>
          {atributosMostrar.map(([nombreCampo, valor]) => {
            const definicion = obtenerDefinicion(nombreCampo)
            const IconComponent = obtenerIcono(nombreCampo)
            const color = obtenerColor(nombreCampo)
            const etiqueta = obtenerEtiqueta(nombreCampo, definicion)
            const valorFormateado = formatearValor(valor, definicion)

            return (
              <Group key={nombreCampo} gap=\"xs\" wrap=\"nowrap\">
                <ThemeIcon size={compacto ? \"sm\" : \"md\"} color={color} variant=\"light\">
                  <IconComponent size={compacto ? 12 : 16} />
                </ThemeIcon>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size={compacto ? \"xs\" : \"sm\"} fw={500} truncate>
                    {etiqueta}
                  </Text>
                  <Text size={compacto ? \"xs\" : \"sm\"} c=\"dimmed\" truncate>
                    {valorFormateado}
                  </Text>
                </div>
                {definicion?.es_requerido && (
                  <Badge size=\"xs\" color=\"red\" variant=\"dot\" />
                )}
              </Group>
            )
          })}
        </SimpleGrid>

        {hayMasAtributos && (
          <Collapse in={expanded}>
            <Divider my=\"xs\" />
            <SimpleGrid cols={{ base: 1, sm: compacto ? 2 : 3 }} spacing={compacto ? \"xs\" : \"sm\"}>
              {atributosConValor.slice(3).map(([nombreCampo, valor]) => {
                const definicion = obtenerDefinicion(nombreCampo)
                const IconComponent = obtenerIcono(nombreCampo)
                const color = obtenerColor(nombreCampo)
                const etiqueta = obtenerEtiqueta(nombreCampo, definicion)
                const valorFormateado = formatearValor(valor, definicion)

                return (
                  <Group key={nombreCampo} gap=\"xs\" wrap=\"nowrap\">
                    <ThemeIcon size={compacto ? \"sm\" : \"md\"} color={color} variant=\"light\">
                      <IconComponent size={compacto ? 12 : 16} />
                    </ThemeIcon>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text size={compacto ? \"xs\" : \"sm\"} fw={500} truncate>
                        {etiqueta}
                      </Text>
                      <Text size={compacto ? \"xs\" : \"sm\"} c=\"dimmed\" truncate>
                        {valorFormateado}
                      </Text>
                    </div>
                    {definicion?.es_requerido && (
                      <Badge size=\"xs\" color=\"red\" variant=\"dot\" />
                    )}
                  </Group>
                )
              })}
            </SimpleGrid>
          </Collapse>
        )}
        
        {hayMasAtributos && !mostrarTodos && (
          <Group justify=\"center\">
            <Button
              variant=\"subtle\"
              size=\"xs\"
              onClick={() => setExpanded(!expanded)}
              rightSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            >
              {expanded ? 'Mostrar menos' : `Ver ${atributosConValor.length - 3} más`}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  )
}

// =====================================================
// Componente de Atributos en Formato Badge
// =====================================================

interface AtributosBadgesProps {
  atributos: Record<string, any>
  limite?: number
  size?: 'xs' | 'sm' | 'md'
}

export function AtributosBadges({ atributos, limite = 5, size = 'sm' }: AtributosBadgesProps) {
  const atributosConValor = Object.entries(atributos || {}).filter(([_, valor]) => 
    valor !== null && valor !== undefined && valor !== ''
  )

  const atributosMostrar = atributosConValor.slice(0, limite)
  const atributosRestantes = atributosConValor.length - limite

  return (
    <Group gap=\"xs\">
      {atributosMostrar.map(([nombre, valor]) => {
        const color = obtenerColor(nombre)
        return (
          <Tooltip key={nombre} label={`${nombre}: ${valor}`}>
            <Badge size={size} color={color} variant=\"light\">
              {valor}
            </Badge>
          </Tooltip>
        )
      })}
      {atributosRestantes > 0 && (
        <Tooltip label={`${atributosRestantes} características más`}>
          <Badge size={size} color=\"gray\" variant=\"outline\">
            +{atributosRestantes}
          </Badge>
        </Tooltip>
      )}
    </Group>
  )
}

// =====================================================
// Componente Resumido para Tablas
// =====================================================

interface AtributosResumenProps {
  atributos: Record<string, any>
  camposPrincipales?: string[]
}

export function AtributosResumen({ atributos, camposPrincipales = ['color', 'talla', 'tipo'] }: AtributosResumenProps) {
  const atributosPrincipales = camposPrincipales
    .map(campo => ({ campo, valor: atributos?.[campo] }))
    .filter(({ valor }) => valor !== null && valor !== undefined && valor !== '')

  if (!atributosPrincipales.length) {
    return <Text size=\"xs\" c=\"dimmed\">Sin especificaciones</Text>
  }

  return (
    <Group gap={4}>
      {atributosPrincipales.map(({ campo, valor }, index) => (
        <Text key={campo} size=\"xs\" span>
          <Text component=\"span\" fw={500}>{valor}</Text>
          {index < atributosPrincipales.length - 1 && (
            <Text component=\"span\" c=\"dimmed\"> • </Text>
          )}
        </Text>
      ))}
    </Group>
  )
}

export { obtenerColor }
// =====================================================
// XENTRA - Loading States & Skeletons
// =====================================================

import { useState } from 'react'
import { Skeleton, Card, Group, Stack } from '@mantine/core'

// Skeleton para tabla de datos
export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <Card withBorder>
    <Stack gap="sm">
      {/* Header skeleton */}
      <Group>
        {Array(columns).fill(0).map((_, i) => (
          <Skeleton key={i} height={20} width={`${Math.random() * 50 + 80}px`} />
        ))}
      </Group>
      
      {/* Rows skeleton */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <Group key={rowIndex}>
          {Array(columns).fill(0).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              height={16} 
              width={`${Math.random() * 40 + 60}px`} 
            />
          ))}
        </Group>
      ))}
    </Stack>
  </Card>
)

// Skeleton para formulario
export const FormSkeleton = () => (
  <Stack gap="md">
    <Skeleton height={32} /> {/* Title */}
    <Skeleton height={40} /> {/* Input 1 */}
    <Skeleton height={40} /> {/* Input 2 */}
    <Group>
      <Skeleton height={40} width={120} />
      <Skeleton height={40} width={120} />
    </Group>
    <Group justify="end">
      <Skeleton height={36} width={80} />
      <Skeleton height={36} width={100} />
    </Group>
  </Stack>
)

// Skeleton para dashboard/cards
export const DashboardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array(4).fill(0).map((_, i) => (
      <Card key={i} withBorder>
        <Stack gap="xs">
          <Skeleton height={16} width="60%" />
          <Skeleton height={28} width="80%" />
          <Skeleton height={12} width="40%" />
        </Stack>
      </Card>
    ))}
  </div>
)

// Hook para loading states
export function useLoadingState() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (asyncFn: () => Promise<any>): Promise<any> => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFn()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, execute }
}
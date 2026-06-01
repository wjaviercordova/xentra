// =====================================================
// XENTRA - Sistema de Notificaciones Mejorado
// =====================================================

import { notifications } from '@mantine/notifications'

export class NotificationManager {
  static success(title: string, message?: string) {
    notifications.show({
      title,
      message: message || 'Operación exitosa',
      color: 'green',
      autoClose: 3000,
    })
  }

  static error(title: string, message?: string) {
    notifications.show({
      title,
      message: message || 'Ha ocurrido un error',
      color: 'red',
      autoClose: 5000,
    })
  }

  static warning(title: string, message?: string) {
    notifications.show({
      title,
      message: message || 'Advertencia',
      color: 'orange',
      autoClose: 4000,
    })
  }

  static info(title: string, message?: string) {
    notifications.show({
      title,
      message: message || 'Información',
      color: 'blue',
      autoClose: 4000,
    })
  }

  static async loading<T>(
    title: string,
    promise: Promise<T>,
    messages: {
      success: string
      error: string | ((error: any) => string)
    }
  ): Promise<T> {
    const id = notifications.show({
      title,
      message: 'Procesando...',
      color: 'blue',
      loading: true,
      autoClose: false,
      withCloseButton: false,
    })

    try {
      const result = await promise
      
      notifications.update({
        id,
        title: 'Éxito',
        message: messages.success,
        color: 'green',
        loading: false,
        autoClose: 3000,
      })

      return result
    } catch (error) {
      const errorMessage = typeof messages.error === 'function' 
        ? messages.error(error)
        : messages.error

      notifications.update({
        id,
        title: 'Error',
        message: errorMessage,
        color: 'red',
        loading: false,
        autoClose: 5000,
      })

      throw error
    }
  }

  static crud = {
    created: (entity: string) => NotificationManager.success('Creado', `${entity} creado exitosamente`),
    updated: (entity: string) => NotificationManager.success('Actualizado', `${entity} actualizado exitosamente`),
    deleted: (entity: string) => NotificationManager.success('Eliminado', `${entity} eliminado exitosamente`),
    
    createError: (entity: string) => NotificationManager.error('Error al crear', `No se pudo crear ${entity}`),
    updateError: (entity: string) => NotificationManager.error('Error al actualizar', `No se pudo actualizar ${entity}`),
    deleteError: (entity: string) => NotificationManager.error('Error al eliminar', `No se pudo eliminar ${entity}`),
    
    loadError: (entity: string) => NotificationManager.error('Error al cargar', `No se pudieron cargar ${entity}`)
  }

  static business = {
    inventoryMovement: (type: string, product: string) => 
      NotificationManager.success('Movimiento registrado', `${type} de ${product} registrado exitosamente`),
    
    lowStock: (product: string) => 
      NotificationManager.warning('Stock bajo', `El producto ${product} tiene stock bajo`),
    
    outOfStock: (product: string) => 
      NotificationManager.error('Sin stock', `El producto ${product} está agotado`),
    
    saleCompleted: (total: number) => 
      NotificationManager.success('Venta completada', `Venta por $${total.toFixed(2)} registrada`),
    
    paymentReceived: (amount: number) => 
      NotificationManager.info('Pago recibido', `Pago de $${amount.toFixed(2)} procesado`),
    
    transferCompleted: (from: string, to: string) => 
      NotificationManager.success('Transferencia completada', `Productos transferidos de ${from} a ${to}`)
  }
}
// =====================================================
// XENTRA - Sistema de Exportación de Reportes
// =====================================================

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ReporteVenta {
  fecha: string
  producto: string
  categoria: string
  cantidad: number
  precio_unitario: number
  total: number
  cliente?: string
  vendedor?: string
}

interface ReporteInventario {
  producto: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  costo_promedio: number
  valor_total: number
  ultimo_movimiento?: string
  estado: 'Normal' | 'Stock Bajo' | 'Sin Stock'
}

interface ReporteMetricas {
  periodo: string
  ventas_total: number
  ventas_cantidad: number
  productos_total: number
  valor_inventario: number
  stock_bajo: number
  sin_stock: number
  crecimiento: number
}

export class ExportadorReportes {
  
  // ===============================================
  // Exportación de Ventas
  // ===============================================
  
  static exportarVentasExcel(datos: ReporteVenta[], periodo: string) {
    const ws = XLSX.utils.json_to_sheet(
      datos.map(venta => ({
        'Fecha': format(new Date(venta.fecha), 'dd/MM/yyyy', { locale: es }),
        'Producto': venta.producto,
        'Categoría': venta.categoria,
        'Cantidad': venta.cantidad,
        'Precio Unitario': `$${venta.precio_unitario.toLocaleString()}`,
        'Total': `$${venta.total.toLocaleString()}`,
        'Cliente': venta.cliente || 'N/A',
        'Vendedor': venta.vendedor || 'N/A'
      }))
    )

    // Estilos y formato
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1')
    
    // Configurar anchos de columna
    ws['!cols'] = [
      { width: 12 }, // Fecha
      { width: 25 }, // Producto
      { width: 15 }, // Categoría
      { width: 10 }, // Cantidad
      { width: 15 }, // Precio Unitario
      { width: 15 }, // Total
      { width: 20 }, // Cliente
      { width: 20 }  // Vendedor
    ]

    // Crear workbook y agregar hoja
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Ventas')

    // Agregar hoja de resumen
    const totalVentas = datos.reduce((sum, venta) => sum + venta.total, 0)
    const cantidadVentas = datos.length
    const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0

    const resumenData = [
      ['Resumen del Reporte'],
      ['Período:', periodo],
      ['Total de Ventas:', `$${totalVentas.toLocaleString()}`],
      ['Cantidad de Ventas:', cantidadVentas],
      ['Promedio por Venta:', `$${promedioVenta.toLocaleString()}`],
      ['Fecha de Generación:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })]
    ]

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    wsResumen['!cols'] = [{ width: 20 }, { width: 25 }]
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // Descargar archivo
    const fileName = `reporte_ventas_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
    XLSX.writeFile(wb, fileName)

    return fileName
  }

  static exportarVentasPDF(datos: ReporteVenta[], periodo: string) {
    const doc = new jsPDF()
    
    // Configuración de título
    doc.setFontSize(18)
    doc.text('REPORTE DE VENTAS', 14, 22)
    
    doc.setFontSize(12)
    doc.text(`Período: ${periodo}`, 14, 32)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 40)

    // Resumen ejecutivo
    const totalVentas = datos.reduce((sum, venta) => sum + venta.total, 0)
    const cantidadVentas = datos.length

    doc.setFontSize(14)
    doc.text('Resumen Ejecutivo', 14, 55)
    doc.setFontSize(10)
    doc.text(`Total Ventas: $${totalVentas.toLocaleString()}`, 14, 65)
    doc.text(`Cantidad de Ventas: ${cantidadVentas}`, 14, 72)
    doc.text(`Promedio por Venta: $${(totalVentas/cantidadVentas).toLocaleString()}`, 14, 79)

    // Tabla de datos
    doc.autoTable({
      startY: 90,
      head: [['Fecha', 'Producto', 'Categoría', 'Cant.', 'P. Unit.', 'Total']],
      body: datos.map(venta => [
        format(new Date(venta.fecha), 'dd/MM/yy'),
        venta.producto.length > 20 ? venta.producto.substring(0, 17) + '...' : venta.producto,
        venta.categoria,
        venta.cantidad,
        `$${venta.precio_unitario.toLocaleString()}`,
        `$${venta.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 }, // Fecha
        1: { cellWidth: 45 }, // Producto
        2: { cellWidth: 25 }, // Categoría
        3: { cellWidth: 20 }, // Cantidad
        4: { cellWidth: 25 }, // Precio Unit.
        5: { cellWidth: 25 }  // Total
      }
    })

    const fileName = `reporte_ventas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`
    doc.save(fileName)

    return fileName
  }

  // ===============================================
  // Exportación de Inventario
  // ===============================================
  
  static exportarInventarioExcel(datos: ReporteInventario[]) {
    const ws = XLSX.utils.json_to_sheet(
      datos.map(item => ({
        'Producto': item.producto,
        'Categoría': item.categoria,
        'Stock Actual': item.stock_actual,
        'Stock Mínimo': item.stock_minimo,
        'Costo Promedio': `$${item.costo_promedio.toLocaleString()}`,
        'Valor Total': `$${item.valor_total.toLocaleString()}`,
        'Último Movimiento': item.ultimo_movimiento 
          ? format(new Date(item.ultimo_movimiento), 'dd/MM/yyyy')
          : 'Sin movimientos',
        'Estado': item.estado
      }))
    )

    // Configurar anchos
    ws['!cols'] = [
      { width: 25 }, // Producto
      { width: 15 }, // Categoría
      { width: 12 }, // Stock Actual
      { width: 12 }, // Stock Mínimo
      { width: 15 }, // Costo Promedio
      { width: 15 }, // Valor Total
      { width: 15 }, // Último Movimiento
      { width: 12 }  // Estado
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Inventario')

    // Hoja de resumen
    const valorTotal = datos.reduce((sum, item) => sum + item.valor_total, 0)
    const stockBajo = datos.filter(item => item.estado === 'Stock Bajo').length
    const sinStock = datos.filter(item => item.estado === 'Sin Stock').length

    const resumenData = [
      ['Resumen de Inventario'],
      ['Total de Productos:', datos.length],
      ['Valor Total del Inventario:', `$${valorTotal.toLocaleString()}`],
      ['Productos con Stock Bajo:', stockBajo],
      ['Productos sin Stock:', sinStock],
      ['Fecha de Generación:', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })]
    ]

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    wsResumen['!cols'] = [{ width: 25 }, { width: 25 }]
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    const fileName = `reporte_inventario_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
    XLSX.writeFile(wb, fileName)

    return fileName
  }

  static exportarInventarioPDF(datos: ReporteInventario[]) {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('REPORTE DE INVENTARIO', 14, 22)
    
    doc.setFontSize(12)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 32)

    // Resumen
    const valorTotal = datos.reduce((sum, item) => sum + item.valor_total, 0)
    const stockBajo = datos.filter(item => item.estado === 'Stock Bajo').length
    const sinStock = datos.filter(item => item.estado === 'Sin Stock').length

    doc.setFontSize(14)
    doc.text('Resumen del Inventario', 14, 47)
    doc.setFontSize(10)
    doc.text(`Total Productos: ${datos.length}`, 14, 57)
    doc.text(`Valor Total: $${valorTotal.toLocaleString()}`, 14, 64)
    doc.text(`Stock Bajo: ${stockBajo} | Sin Stock: ${sinStock}`, 14, 71)

    // Tabla
    doc.autoTable({
      startY: 80,
      head: [['Producto', 'Cat.', 'Stock', 'Min.', 'Costo', 'Valor', 'Estado']],
      body: datos.map(item => [
        item.producto.length > 25 ? item.producto.substring(0, 22) + '...' : item.producto,
        item.categoria,
        item.stock_actual,
        item.stock_minimo,
        `$${item.costo_promedio.toLocaleString()}`,
        `$${item.valor_total.toLocaleString()}`,
        item.estado
      ]),
      theme: 'striped',
      headStyles: { fillColor: [156, 39, 176] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 }, // Producto
        1: { cellWidth: 20 }, // Categoría
        2: { cellWidth: 15 }, // Stock
        3: { cellWidth: 15 }, // Min
        4: { cellWidth: 20 }, // Costo
        5: { cellWidth: 25 }, // Valor
        6: { cellWidth: 25 }  // Estado
      }
    })

    const fileName = `reporte_inventario_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`
    doc.save(fileName)

    return fileName
  }

  // ===============================================
  // Exportación de Dashboard/Métricas
  // ===============================================
  
  static exportarMetricasExcel(metricas: ReporteMetricas, productosTop: any[], categoriasTop: any[]) {
    const wb = XLSX.utils.book_new()

    // Hoja 1: Métricas Generales
    const wsMetricas = XLSX.utils.json_to_sheet([
      { 'Métrica': 'Período', 'Valor': metricas.periodo },
      { 'Métrica': 'Ventas Total', 'Valor': `$${metricas.ventas_total.toLocaleString()}` },
      { 'Métrica': 'Cantidad Ventas', 'Valor': metricas.ventas_cantidad },
      { 'Métrica': 'Total Productos', 'Valor': metricas.productos_total },
      { 'Métrica': 'Valor Inventario', 'Valor': `$${metricas.valor_inventario.toLocaleString()}` },
      { 'Métrica': 'Productos Stock Bajo', 'Valor': metricas.stock_bajo },
      { 'Métrica': 'Productos Sin Stock', 'Valor': metricas.sin_stock },
      { 'Métrica': 'Crecimiento %', 'Valor': `${metricas.crecimiento}%` }
    ])
    wsMetricas['!cols'] = [{ width: 25 }, { width: 20 }]
    XLSX.utils.book_append_sheet(wb, wsMetricas, 'Métricas')

    // Hoja 2: Productos Top
    const wsProductos = XLSX.utils.json_to_sheet(
      productosTop.map((producto, index) => ({
        'Posición': index + 1,
        'Producto': producto.producto,
        'Cantidad Vendida': producto.cantidad,
        'Ingresos': `$${producto.ingresos.toLocaleString()}`
      }))
    )
    wsProductos['!cols'] = [{ width: 10 }, { width: 35 }, { width: 15 }, { width: 15 }]
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos Top')

    // Hoja 3: Categorías Top
    const wsCategorias = XLSX.utils.json_to_sheet(
      categoriasTop.map((categoria, index) => ({
        'Posición': index + 1,
        'Categoría': categoria.categoria,
        'Ventas': `$${categoria.ventas.toLocaleString()}`,
        'Porcentaje': `${categoria.porcentaje}%`
      }))
    )
    wsCategorias['!cols'] = [{ width: 10 }, { width: 25 }, { width: 15 }, { width: 12 }]
    XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorías Top')

    const fileName = `dashboard_metricas_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
    XLSX.writeFile(wb, fileName)

    return fileName
  }

  static exportarMetricasPDF(metricas: ReporteMetricas, productosTop: any[], categoriasTop: any[]) {
    const doc = new jsPDF()
    
    // Título principal
    doc.setFontSize(18)
    doc.text('DASHBOARD EJECUTIVO', 14, 22)
    
    doc.setFontSize(12)
    doc.text(`Período: ${metricas.periodo}`, 14, 32)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 14, 40)

    // Métricas principales
    doc.setFontSize(14)
    doc.text('📊 Métricas Principales', 14, 55)
    
    doc.setFontSize(10)
    const metricas_y = 65
    doc.text(`Ventas Total: $${metricas.ventas_total.toLocaleString()}`, 14, metricas_y)
    doc.text(`Cantidad Ventas: ${metricas.ventas_cantidad}`, 14, metricas_y + 7)
    doc.text(`Valor Inventario: $${metricas.valor_inventario.toLocaleString()}`, 14, metricas_y + 14)
    doc.text(`Crecimiento: ${metricas.crecimiento}%`, 14, metricas_y + 21)
    doc.text(`Stock Bajo: ${metricas.stock_bajo} | Sin Stock: ${metricas.sin_stock}`, 14, metricas_y + 28)

    // Productos top
    doc.setFontSize(14)
    doc.text('🏆 Productos Más Vendidos', 14, 105)
    
    doc.autoTable({
      startY: 115,
      head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
      body: productosTop.map((producto, index) => [
        index + 1,
        producto.producto.length > 30 ? producto.producto.substring(0, 27) + '...' : producto.producto,
        producto.cantidad,
        `$${producto.ingresos.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [76, 175, 80] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 }
      }
    })

    // Nueva página para categorías
    doc.addPage()
    doc.setFontSize(14)
    doc.text('📈 Categorías Más Vendidas', 14, 22)

    doc.autoTable({
      startY: 32,
      head: [['#', 'Categoría', 'Ventas', 'Porcentaje']],
      body: categoriasTop.map((categoria, index) => [
        index + 1,
        categoria.categoria,
        `$${categoria.ventas.toLocaleString()}`,
        `${categoria.porcentaje}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 99] },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25 }
      }
    })

    const fileName = `dashboard_metricas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`
    doc.save(fileName)

    return fileName
  }

  // ===============================================
  // Utilidades
  // ===============================================
  
  static validarDatos(datos: any[]): boolean {
    return datos && Array.isArray(datos) && datos.length > 0
  }

  static obtenerNombreArchivo(tipo: string, formato: string): string {
    return `${tipo}_${format(new Date(), 'yyyyMMdd_HHmm')}.${formato}`
  }
}
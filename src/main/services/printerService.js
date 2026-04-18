import escpos from 'escpos';
import USB from 'escpos-usb';
import { getSettings } from './database.js';

// Función genérica para abrir conexión y ejecutar un diseño
const executePrint = (printJob) => {
  const settings = getSettings();
  try {
    const device = new USB();
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        console.error("Error de impresora:", error);
        return;
      }
      // Ejecutamos el diseño específico
      printJob(printer, settings);

      printer.feed(3).cut().close();
    });
  } catch (err) {
    console.error("Impresora no encontrada o desconectada:", err);
  }
};

// --- DISEÑO: TICKET DE VENTA ---
export function printSaleTicket(saleData) {
  executePrint((printer, settings) => {
    printer
      .align('ct').style('b').size(1, 1).text(settings.business_name)
      .style('normal').size(0, 0)
      .text(settings.business_address)
      .text(`NIF: ${settings.business_nif}`)
      .text('--------------------------------')
      .align('lt')
      .text(`TICKET: ${String(saleData.id || 'N/A').padStart(5, '0')}`)
      .text(`FECHA: ${new Date().toLocaleString()}`)
      .text('--------------------------------');

    saleData.cart.forEach(item => {
      const line = `${item.qty} ${item.name.substring(0, 18)}`;
      const price = `${(item.qty * item.price).toFixed(2)}€`;
      printer.text(line.padEnd(24) + price.padStart(8));
    });

    printer
      .text('--------------------------------')
      .align('rt').style('b').size(1, 1)
      .text(`TOTAL: ${saleData.total.toFixed(2)}€`)
      .text(`PAGO:  ${saleData.payment_method === 'CASH' ? 'EFECTIVO' : 'TARJETA'}`)

    if (saleData.payment_method === 'CASH') {
      printer
        .text(`ENTREGADO: ${saleData.cashReceived.toFixed(2)}€`)
        .style('b')
        .text(`CAMBIO:    ${saleData.change.toFixed(2)}€`)
        .style('normal');
    }
    printer
      .feed(1).align('ct').style('normal').size(0, 0)
      .text(settings.ticket_footer || 'Gracias por su visita');
  });
}

// --- DISEÑO: REPORTE X (Turno) ---
export function printReportX(data) {
  executePrint((printer, settings) => {
    printer
      .align('ct').style('b').text("ARQUEO DE CAJA (X)")
      .style('normal').text(settings.business_name)
      .text('--------------------------------')
      .align('lt')
      .text(`EMPLEADO: ${data.user_name}`)
      .text(`INICIO:   ${data.start_time}`)
      .text(`FIN:      ${new Date().toLocaleTimeString()}`)
      .text('--------------------------------')
      .text(`FONDO INICIAL:  ${data.initial_cash.toFixed(2)}€`)
      .text(`VENTAS TURNO:   ${data.total_sales.toFixed(2)}€`)
      .text(`ESPERADO:       ${data.expected_cash.toFixed(2)}€`)
      .style('b')
      .text(`CONTADO:        ${data.closing_cash.toFixed(2)}€`)
      .text(`DIFERENCIA:     ${(data.closing_cash - data.expected_cash).toFixed(2)}€`)
      .style('normal')
      .text('--------------------------------')
      .align('ct').text("COMPROBANTE DE EMPLEADO");
  });
}

// --- DISEÑO: REPORTE Z (Jornada) ---
export function printReportZ(data) {
  executePrint((printer, settings) => {
    printer
      .align('ct').style('b').size(1, 1).text("CIERRE DE JORNADA (Z)")
      .size(0, 0).text(data.date || new Date().toLocaleDateString())
      .text('--------------------------------')
      .align('lt')
      .text(`TOTAL VENTAS Z: ${data.total_sales.toFixed(2)}€`)
      .text(`TOTAL TICKETS:  ${data.sales_count}`)
      .text('--------------------------------')
      .text("DESGLOSE POR TURNOS:");

    data.sessions.forEach(s => {
      printer.text(`${s.user_name.substring(0, 15).padEnd(16)} | ${s.closing_cash.toFixed(2)}€`);
    });

    printer
      .text('--------------------------------')
      .align('ct').text("*** FIN DEL REPORTE Z ***");
  });
}
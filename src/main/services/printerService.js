import escpos from 'escpos';
import useUSB from 'escpos-usb';
escpos.USB = useUSB;
import { getSettings } from './database.js';

// Función genérica para abrir conexión y ejecutar un diseño
const executePrint = (printJob) => {
  const settings = getSettings();
  try {
    // 1. Buscamos la impresora
    const device = new escpos.USB();
    // 2. IMPORTANTE: Definir el encoding global como 'CP850'
    const options = { encoding: "CP858" };
    const printer = new escpos.Printer(device, options);

    device.open((error) => {
      if (error) {
        console.error("Error de impresora:", error);
        return;
      }
      printer.buffer.write('\x1b\x74\x13');
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
      .text('-----------------------------------')
      .align('lt')
      .text(`TICKET: ${String(saleData.id || 'N/A').padStart(5, '0')}`)
      .text(`FECHA: ${new Date().toLocaleString()}`)
      .text('------------------------------------------------');

    saleData.cart.forEach(item => {
      const line = `${item.qty} ${item.name.substring(0, 24)}`;
      const price = `${(item.qty * item.price).toFixed(2)}€`;
      printer.text(line.padEnd(32) + price.padStart(12));
    });

    printer
      .text('------------------------------------------------')
      .align('rt').style('b').size(1, 1)
      .text(`TOTAL: ${saleData.total.toFixed(2)}€`)
      .text(`PAGO:  ${saleData.payment_method === 'CASH' ? 'EFECTIVO' : 'TARJETA'}`)

    if (saleData.payment_method === 'CASH') {
      printer
        .text(`ENTREGADO: ${saleData.cashReceived.toFixed(2)}€`)
        .style('b')
        .text(`CAMBIO:    ${(saleData.change || 0).toFixed(2)}€`)
        .style('normal');
    }
    printer
      .feed(1).align('ct').style('normal').size(0, 0).text(`atendido por: ${saleData.session_user || 'N/A'}`)
      .text(settings.ticket_footer || 'Gracias por su visita');
  });
}

// --- DISEÑO: REPORTE X (Turno) ---
export function printReportX(data) {
  executePrint((printer, settings) => {
    const diferencia = data.closing_cash - data.expected_cash;

    printer
      .align('ct').style('b').size(1, 1).text("ARQUEO DE TURNO (X)")
      .size(0, 0).style('normal').text(`ID SESION: ${data.id}`)
      .text('--------------------------------')
      .align('lt')
      .style('b').text(`EMPLEADO: ${data.user_name.toUpperCase()}`).style('normal')
      .text(`INICIO: ${data.start_time}`)
      .text(`FIN:    ${new Date().toLocaleTimeString()}`)
      .text('--------------------------------')
      .text(`FONDO INICIAL:     ${data.initial_cash.toFixed(2)}€`)
      .style('b').text(`TOTAL VENTAS:      ${data.total_sales.toFixed(2)}€`).style('normal');

    // Sección de Gastos
    if (data.total_expenses > 0) {
      printer.text('--------------------------------')
        .text('GASTOS PAGADOS:')
      data.expenses.forEach(exp => {
        printer.text(`- ${exp.description.substring(0, 15).padEnd(16)} -${exp.amount.toFixed(2)}€`);
      });
      printer.style('b').text(`TOTAL GASTOS:     -${data.total_expenses.toFixed(2)}€`).style('normal');
    }

    printer.text('--------------------------------')
      .text('VENTAS POR METODO:')
      .text(`Efectivo:          ${(data.totals_by_method?.CASH || 0).toFixed(2)}€`)
      .text(`Tarjeta:           ${(data.totals_by_method?.CARD || 0).toFixed(2)}€`)
      .text('--------------------------------')
      .text(`ESPERADO CAJA:     ${data.expected_cash.toFixed(2)}€`)
      .style('b').size(1, 1).text(`CONTADO:  ${data.closing_cash.toFixed(2)}€`)
      .size(0, 0).text(`DIFERENCIA: ${diferencia.toFixed(2)}€`)
      .style('normal')
      .text('--------------------------------')
      .align('ct').text("COMPROBANTE DE TURNO");
  });
}

// --- DISEÑO: REPORTE Z (Jornada) ---
export function printReportZ(data) {
  executePrint((printer, settings) => {
    printer
      .align('ct').style('b').size(1, 1).text("CIERRE DE JORNADA (Z)")
      .size(0, 0).text(data.date ? new Date(data.date).toLocaleString() : new Date().toLocaleString())
      .text('--------------------------------')
      .align('lt')
      .style('b').size(1, 1).text(`TOTAL VENTAS:  ${data.total_sales.toFixed(2)}€`)
      .size(0, 0).style('normal').text(`OPERACIONES:   ${data.sales_count} tickets`)
      .text('--------------------------------');

    // Gastos de la jornada
    if (data.total_expenses > 0) {
      printer.text("GASTOS DE LA JORNADA:");
      data.expenses.forEach(exp => {
        printer.text(`- ${exp.description.substring(0, 15).padEnd(16)} -${exp.amount.toFixed(2)}€`);
      });
      printer.text(`TOTAL GASTOS:     -${data.total_expenses.toFixed(2)}€`);

      const netoEfectivo = (data.totals_by_method?.CASH || 0) - (data.total_expenses || 0);
      printer.style('b').text(`NETO EFECTIVO:    ${netoEfectivo.toFixed(2)}€`).style('normal')
        .text('--------------------------------');
    }

    // Desglose por método
    printer.text("VENTAS POR METODO:")
      .text(`Efectivo:          ${(data.totals_by_method?.CASH || 0).toFixed(2)}€`)
      .text(`Tarjeta:           ${(data.totals_by_method?.CARD || 0).toFixed(2)}€`)
      .text('--------------------------------')
      .text("TURNOS INCLUIDOS:");

    data.sessions.forEach(s => {
      const nombre = s.user_name.toUpperCase().substring(0, 12).padEnd(13);
      printer.text(`${nombre} | Ventas: ${Number(s.net_cash || 0).toFixed(2)}€`);
    });

    printer
      .text('--------------------------------')
      .align('ct').style('italic').text("*** FIN DE JORNADA LABORAL ***");
  });
}
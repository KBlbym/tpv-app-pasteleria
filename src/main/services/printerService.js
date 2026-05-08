import escpos from 'escpos';
import USB from 'escpos-usb';
import { getSettings } from './database.js';

// Función genérica para abrir conexión y ejecutar un diseño
const executePrint = (printJob) => {
  const settings = getSettings();
  try {
    // TIP: En el futuro, recupera VID y PID de settings
    const device = new USB();

    // Configuramos el adaptador con encoding para España (CP858 incluye € y ñ)
    const options = { encoding: "GB18030" }; // O "CP858" dependiendo de la impresora

    const printer = new escpos.Printer(device, options);

    device.open((error) => {
      if (error) {
        console.warn("Error de impresora:", error);
        return;
      }

      // Aplicamos el CodeTable para que salgan bien las ñ y €
      // El comando depende del modelo, pero 19 suele ser PC858 (Euro)

      printer.model('qsprinter').encode('cp858');

      // Ejecutamos el diseño específico
      printJob(printer, settings);

      printer.feed(3).cut().close();
    });
  } catch (err) {
    console.warn("Impresora offline o no conectada.");
  }
};

// --- DISEÑO: TICKET DE VENTA ---
export function printSaleTicket(saleData) {
  executePrint((printer, settings) => {
    const width = 32; // Ancho estándar de 58mm (si es de 80mm usa 42)

    printer
      .align('ct').style('b').size(1, 1).text(settings.business_name)
      .size(0, 0).style('normal')
      .text(settings.business_address)
      .text(`NIF: ${settings.business_nif}`)
      .text('-'.repeat(width))
      .align('lt')
      .text(`TICKET: ${String(saleData.id).padStart(6, '0')}`)
      .text(`FECHA:  ${new Date().toLocaleString()}`)
      .text('-'.repeat(width));

    // Cabecera de tabla
    printer.text("CANT  DESCRIPCIÓN         TOTAL");

    saleData.cart.forEach(item => {
      const qty = String(item.qty).padEnd(5);
      const name = item.name.substring(0, 18).padEnd(19);
      const price = (item.qty * item.price).toFixed(2).padStart(6) + "€";
      printer.text(`${qty}${name}${price}`);
    });

    printer
      .text('-'.repeat(width))
      .align('rt').style('b')
      .text(`TOTAL: ${saleData.total.toFixed(2)}€`)
      .style('normal')
      .text(`PAGO: ${saleData.payment_method === 'CASH' ? 'EFECTIVO' : 'TARJETA'}`);

    if (saleData.payment_method === 'CASH' && saleData.cashReceived) {
        printer.text(`ENTREGADO: ${saleData.cashReceived.toFixed(2)}€`)
               .text(`CAMBIO:    ${saleData.change.toFixed(2)}€`);
    }

    printer
      .feed(1).align('ct')
      .text(settings.ticket_footer || 'Gracias por su confianza')
      .feed(1);
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
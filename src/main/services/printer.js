import escpos from 'escpos';
import USB from 'escpos-usb';
import { getSettings } from './database.js';

export function printTicket(saleData) {
  const settings = getSettings(); // Recuperamos los datos de la empresa
  try {
    const device = new USB(); // Detecta la impresora USB automáticamente
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        console.error("Error al abrir impresora:", error);
        return;
      }

      printer
    .align('ct')
    .style('b')
    .size(2, 2)
    .text(settings.business_name) // NOMBRE EN GRANDE
    .size(1, 1)
    .style('normal')
    .text(`NIF: ${settings.business_nif}`)
    .text(settings.business_address)
    .text(`Tel: ${settings.business_phone}`)
    .text('--------------------------------')
    .text(`Ticket: ${saleData.saleId}`)
    .text(new Date().toLocaleString())
    .text('--------------------------------')
    .align('lt');

  // Bucle de productos
  saleData.cart.forEach(item => {
    printer.text(`${item.qty} x ${item.name.padEnd(20)} ${ (item.qty * item.price).toFixed(2) }€`);
  });

      printer
    .text('--------------------------------')
    .align('rt')
    .style('b')
    .size(2, 2)
    .text(`TOTAL: ${saleData.total.toFixed(2)}€`)
    .size(1, 1)
    .style('normal')
    .align('ct')
    .feed(2)
    .text(settings.ticket_footer)
    .cut()
    .close();
    });
  } catch (err) {
    console.error("No se encontró la impresora:", err);
  }
}
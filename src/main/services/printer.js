import escpos from 'escpos';
import USB from 'escpos-usb';

export function printTicket(saleData) {
  try {
    const device = new USB(); // Detecta la impresora USB automáticamente
    const printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        console.error("Error al abrir impresora:", error);
        return;
      }

      printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text('PASTELERÍA DULCE')
        .size(0, 0)
        .text('Calle Mayor, 12 - Madrid')
        .text('--------------------------------')
        .align('lt')
        .text(`Fecha: ${new Date().toLocaleString()}`)
        .text(`Ticket #: ${saleData.saleId}`)
        .text('--------------------------------');

      saleData.cart.forEach(item => {
        printer.tableCustom([
          { text: `${item.qty}x ${item.name}`, align: "LEFT", width: 0.75 },
          { text: `${(item.price * item.qty).toFixed(2)}`, align: "RIGHT", width: 0.25 }
        ]);
      });

      printer
        .text('--------------------------------')
        .align('rt')
        .size(1, 1)
        .text(`TOTAL: ${saleData.total.toFixed(2)} EUR`)
        .size(0, 0)
        .feed(2)
        .cut() // Comando para la cuchilla de la CP-450
        .close();
    });
  } catch (err) {
    console.error("No se encontró la impresora:", err);
  }
}
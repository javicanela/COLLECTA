import { Router, Request, Response } from 'express';
import { generateEstadoCuenta } from '../services/pdfGenerator';
import PDFDocument from 'pdfkit';

const router = Router();

router.get('/cliente/:rfc/pdf', async (req: Request, res: Response) => {
  try {
    const rfc = Array.isArray(req.params.rfc) ? req.params.rfc[0] : req.params.rfc;
    const data = await generateEstadoCuenta(rfc);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="estado_cuenta_${rfc}.pdf"`);

    doc.pipe(res);

    const cfg = data.config;
    const nombreDespacho = cfg.nombre_despacho || 'Collecta';
    const depto = cfg.depto || '';
    const tel = cfg.tel || '';
    const email = cfg.email || '';
    const beneficiario = cfg.beneficiario || '';
    const banco = cfg.banco || '';
    const clabe = cfg.clabe || '';

    const fmtMonto = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const fmtFecha = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    doc.fillColor('#0c2340').fontSize(18).text(nombreDespacho, { align: 'left' });
    doc.fillColor('#333').fontSize(10).text(`${depto} | ${tel} | ${email}`, { align: 'left' });
    doc.moveDown();

    doc.fillColor('#0c2340').fontSize(14).text('ESTADO DE CUENTA', { align: 'right' });
    doc.fillColor('#666').fontSize(10).text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, { align: 'right' });
    doc.moveDown(2);

    doc.fillColor('#102440').rect(50, doc.y, 515, 25).fill();
    doc.fillColor('#fff').fontSize(11).text(`Cliente: ${data.cliente.nombre}`, 60, doc.y - 20);
    doc.text(`RFC: ${data.cliente.rfc}`, 350, doc.y - 20);
    doc.moveDown();

    if (data.pendientes.length > 0) {
      doc.fillColor('#0c2340').fontSize(12).text('SALDOS PENDIENTES', 50);
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fillColor('#f3f4f6').rect(50, tableTop, 515, 25).fill();
      doc.fillColor('#0c2340').fontSize(9).text('Tipo', 55, tableTop + 8);
      doc.text('Descripción', 130, tableTop + 8);
      doc.text('Monto', 350, tableTop + 8);
      doc.text('Fecha', 430, tableTop + 8);

      let y = tableTop + 30;
      data.pendientes.forEach((p, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#fafafa';
        doc.fillColor(bg).rect(50, y - 5, 515, 20).fill();
        doc.fillColor('#333').fontSize(9).text(p.tipo, 55, y);
        doc.text(p.descripcion.substring(0, 40), 130, y);
        doc.text(fmtMonto(p.monto), 350, y);
        doc.text(fmtFecha(p.fechaVence), 430, y);
        y += 20;
      });

      doc.moveTo(50, y).lineTo(565, y).stroke('#ccc');
      y += 5;
      doc.fillColor('#e03535').fontSize(11).text(`TOTAL PENDIENTE: ${fmtMonto(data.totalPendiente)}`, 350, y);
      doc.moveDown(2);
    }

    if (data.pagados.length > 0) {
      doc.fillColor('#3dba4e').fontSize(12).text('HISTORIAL DE PAGOS (3 meses)');
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fillColor('#ecfdf5').rect(50, tableTop, 515, 25).fill();
      doc.fillColor('#065f46').fontSize(9).text('Tipo', 55, tableTop + 8);
      doc.text('Descripción', 130, tableTop + 8);
      doc.text('Monto', 350, tableTop + 8);
      doc.text('Fecha Pago', 420, tableTop + 8);

      let y = tableTop + 30;
      data.pagados.forEach((p, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#fafafa';
        doc.fillColor(bg).rect(50, y - 5, 515, 20).fill();
        doc.fillColor('#333').fontSize(9).text(p.tipo, 55, y);
        doc.text(p.descripcion.substring(0, 40), 130, y);
        doc.text(fmtMonto(p.monto), 350, y);
        doc.text(fmtFecha(p.fechaPago), 420, y);
        y += 20;
      });

      doc.moveTo(50, y).lineTo(565, y).stroke('#ccc');
      y += 5;
      doc.fillColor('#3dba4e').fontSize(11).text(`TOTAL PAGADO: ${fmtMonto(data.totalPagado)}`, 350, y);
      doc.moveDown(2);
    }

    if (beneficiario || banco || clabe) {
      doc.fillColor('#0c2340').rect(50, doc.y, 515, 60).fill();
      doc.fillColor('#fff').fontSize(10).text('DATOS PARA TRANSFERENCIA', 60, doc.y + 10);
      doc.fontSize(9).text(`Beneficiario: ${beneficiario}`, 60, doc.y + 28);
      doc.text(`Banco: ${banco}`, 60, doc.y + 42);
      doc.text(`CLABE: ${clabe}`, 300, doc.y + 42);
      doc.moveDown();
    }

    const pageHeight = doc.page.height;
    doc.fillColor('#666').fontSize(8).text(nombreDespacho, 50, pageHeight - 50, { align: 'left' });
    doc.text(`${depto} | ${tel} | ${email}`, 50, pageHeight - 38, { align: 'left' });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generating PDF', details: (error as Error).message });
  }
});

export default router;
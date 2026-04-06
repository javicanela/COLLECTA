import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Operation } from '../types';

interface ReporteCxCProps {
  operations: Operation[];
  config: Record<string, string>;
}

const fmx = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

const ffd = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calcDias = (fechaVence: string) =>
  Math.ceil((new Date(fechaVence).getTime() - Date.now()) / 86400000);

const getStatus = (op: Operation) => op.calculatedStatus || op.estatus;

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#1e293b' },
  header: { backgroundColor: '#0c2340', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 4, marginBottom: 16 },
  headerTitle: { color: '#ffffff', fontSize: 14, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#94a3b8', fontSize: 8, marginTop: 3 },
  headerRight: { alignItems: 'flex-end' as any },
  headerReport: { color: '#e0a020', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  headerDate: { color: '#94a3b8', fontSize: 7, marginTop: 2 },
  // Asesor section
  asesorHeader: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 3, marginTop: 12, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: '#2e7cf0' },
  asesorName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0c2340' },
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingVertical: 4, paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 3, paddingHorizontal: 4 },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' as any },
  td: { fontSize: 8, color: '#334155' },
  tdMono: { fontSize: 8, color: '#334155', fontFamily: 'Courier' },
  tdBold: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
  // Columns
  colCliente: { width: '22%' },
  colRfc: { width: '15%' },
  colTipo: { width: '12%' },
  colMonto: { width: '13%', textAlign: 'right' as any },
  colVence: { width: '13%' },
  colDias: { width: '10%', textAlign: 'center' as any },
  colEstatus: { width: '15%' },
  // Totals
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 4, paddingRight: 4, borderTopWidth: 1, borderTopColor: '#cbd5e1' },
  subtotalLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#64748b', marginRight: 8 },
  subtotalAmount: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#0c2340' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, marginTop: 16, backgroundColor: '#0c2340', borderRadius: 4 },
  grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#94a3b8', marginRight: 12 },
  grandTotalAmount: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#e03535' },
  // Footer
  footer: { position: 'absolute' as any, bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#cbd5e1', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

export default function ReporteCxCPDF({ operations, config }: ReporteCxCProps) {
  const nombreDespacho = config.nombre_despacho || 'Collecta';

  // Filter only non-paid, non-excluded ops
  const pendientes = operations.filter(op => {
    const status = getStatus(op);
    return status !== 'PAGADO' && status !== 'EXCLUIDO' && !op.archived;
  });

  // Group by asesor
  const byAsesor: Record<string, Operation[]> = {};
  for (const op of pendientes) {
    const asesor = op.asesor || op.client?.asesor || 'Sin Asignar';
    if (!byAsesor[asesor]) byAsesor[asesor] = [];
    byAsesor[asesor].push(op);
  }
  const asesorNames = Object.keys(byAsesor).sort();

  const grandTotal = pendientes.reduce((sum, op) => sum + (op.monto || 0), 0);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>{nombreDespacho}</Text>
            <Text style={s.headerSub}>
              {[config.depto, config.tel, config.email].filter(Boolean).join(' | ')}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerReport}>REPORTE CxC</Text>
            <Text style={s.headerDate}>{ffd(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Per asesor */}
        {asesorNames.map(asesor => {
          const ops = byAsesor[asesor];
          const subtotal = ops.reduce((sum, op) => sum + (op.monto || 0), 0);
          return (
            <View key={asesor} wrap={false}>
              <View style={s.asesorHeader}>
                <Text style={s.asesorName}>{asesor} ({ops.length} operaciones)</Text>
              </View>
              <View style={s.tableHeader}>
                <Text style={[s.th, s.colCliente]}>Cliente</Text>
                <Text style={[s.th, s.colRfc]}>RFC</Text>
                <Text style={[s.th, s.colTipo]}>Tipo</Text>
                <Text style={[s.th, s.colMonto]}>Monto</Text>
                <Text style={[s.th, s.colVence]}>Vencimiento</Text>
                <Text style={[s.th, s.colDias]}>Dias</Text>
                <Text style={[s.th, s.colEstatus]}>Estatus</Text>
              </View>
              {ops.map((op, i) => {
                const status = getStatus(op);
                const dias = op.diasRestantes ?? calcDias(op.fechaVence);
                return (
                  <View key={op.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                    <Text style={[s.td, s.colCliente]}>{op.client?.nombre || '-'}</Text>
                    <Text style={[s.tdMono, s.colRfc]}>{op.client?.rfc || '-'}</Text>
                    <Text style={[s.td, s.colTipo]}>{op.tipo}</Text>
                    <Text style={[s.tdMono, s.colMonto]}>{fmx(op.monto)}</Text>
                    <Text style={[s.td, s.colVence]}>{ffd(op.fechaVence)}</Text>
                    <Text style={[s.tdBold, s.colDias, { color: dias < 0 ? '#e03535' : dias === 0 ? '#e07820' : '#2e7cf0' }]}>
                      {dias < 0 ? `+${Math.abs(dias)}` : dias === 0 ? 'Hoy' : String(dias)}
                    </Text>
                    <Text style={[s.tdBold, s.colEstatus, { color: status === 'VENCIDO' ? '#e03535' : status === 'HOY VENCE' ? '#e07820' : '#2e7cf0' }]}>
                      {status}
                    </Text>
                  </View>
                );
              })}
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Subtotal {asesor}:</Text>
                <Text style={s.subtotalAmount}>{fmx(subtotal)}</Text>
              </View>
            </View>
          );
        })}

        {/* Grand total */}
        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>TOTAL CUENTAS POR COBRAR:</Text>
          <Text style={s.grandTotalAmount}>{fmx(grandTotal)}</Text>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {nombreDespacho} | Generado por Collecta
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

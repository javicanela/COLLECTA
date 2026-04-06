import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Client, Operation } from '../../types';

interface PdfDataOverlayProps {
  client: Client;
  operations: Operation[];
  config: Record<string, string>;
  nombreDespacho: string;
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

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 30,
  },
  clientInfo: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  clientField: {
    marginRight: 20,
  },
  clientLabel: {
    fontSize: 6,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  clientValue: {
    fontSize: 9,
    color: '#0c2340',
    fontFamily: 'Helvetica-Bold',
  },
  operationsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0c2340',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(12, 35, 64, 0.1)',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  th: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: '#0c2340',
    textTransform: 'uppercase',
  },
  td: {
    fontSize: 8,
    color: '#334155',
  },
  tdMono: {
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#334155',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalRed: { color: '#e03535' },
  totalGreen: { color: '#3dba4e' },
});

export function PdfDataOverlay({ client, operations }: PdfDataOverlayProps) {
  const pendientes = operations.filter(op => !op.fechaPago && getStatus(op) !== 'PAGADO' && getStatus(op) !== 'EXCLUIDO');
  const pagados = operations.filter(op => op.fechaPago || getStatus(op) === 'PAGADO');
  const totalPendiente = pendientes.reduce((sum, op) => sum + (op.monto || 0), 0);
  const totalPagado = pagados.reduce((sum, op) => sum + (op.monto || 0), 0);

  return (
    <View style={overlayStyles.container}>
      <View style={overlayStyles.clientInfo}>
        <View style={overlayStyles.clientField}>
          <Text style={overlayStyles.clientLabel}>CLIENTE</Text>
          <Text style={overlayStyles.clientValue}>{client.nombre}</Text>
        </View>
        <View style={overlayStyles.clientField}>
          <Text style={overlayStyles.clientLabel}>RFC</Text>
          <Text style={overlayStyles.clientValue}>{client.rfc}</Text>
        </View>
        <View style={overlayStyles.clientField}>
          <Text style={overlayStyles.clientLabel}>ASESOR</Text>
          <Text style={overlayStyles.clientValue}>{client.asesor || '-'}</Text>
        </View>
      </View>

      {pendientes.length > 0 && (
        <View style={overlayStyles.operationsSection}>
          <Text style={overlayStyles.sectionTitle}>Saldos Pendientes</Text>
          <View style={overlayStyles.tableHeader}>
            <Text style={[overlayStyles.th, { width: '20%' }]}>Tipo</Text>
            <Text style={[overlayStyles.th, { width: '30%' }]}>Concepto</Text>
            <Text style={[overlayStyles.th, { width: '15%', textAlign: 'right' }]}>Monto</Text>
            <Text style={[overlayStyles.th, { width: '15%' }]}>Vence</Text>
            <Text style={[overlayStyles.th, { width: '10%' }]}>Dias</Text>
            <Text style={[overlayStyles.th, { width: '10%' }]}>Estatus</Text>
          </View>
          {pendientes.map((op) => {
            const status = getStatus(op);
            const dias = op.diasRestantes ?? calcDias(op.fechaVence);
            return (
              <View key={op.id} style={overlayStyles.tableRow}>
                <Text style={[overlayStyles.td, { width: '20%' }]}>{op.tipo}</Text>
                <Text style={[overlayStyles.td, { width: '30%' }]}>{op.descripcion || '-'}</Text>
                <Text style={[overlayStyles.tdMono, { width: '15%', textAlign: 'right' }]}>{fmx(op.monto)}</Text>
                <Text style={[overlayStyles.td, { width: '15%' }]}>{ffd(op.fechaVence)}</Text>
                <Text style={[overlayStyles.td, { width: '10%' }]}>{dias}</Text>
                <Text style={[overlayStyles.td, { width: '10%' }]}>{status}</Text>
              </View>
            );
          })}
          <View style={overlayStyles.totalRow}>
            <Text style={[overlayStyles.totalLabel, overlayStyles.totalRed]}>Total: </Text>
            <Text style={[overlayStyles.totalAmount, overlayStyles.totalRed]}>{fmx(totalPendiente)}</Text>
          </View>
        </View>
      )}

      {pagados.length > 0 && (
        <View style={[overlayStyles.operationsSection, { marginTop: 8 }]}>
          <Text style={overlayStyles.sectionTitle}>Historial de Pagos</Text>
          <View style={overlayStyles.tableHeader}>
            <Text style={[overlayStyles.th, { width: '25%' }]}>Tipo</Text>
            <Text style={[overlayStyles.th, { width: '35%' }]}>Concepto</Text>
            <Text style={[overlayStyles.th, { width: '20%', textAlign: 'right' }]}>Monto</Text>
            <Text style={[overlayStyles.th, { width: '20%' }]}>Fecha Pago</Text>
          </View>
          {pagados.map((op) => (
            <View key={op.id} style={overlayStyles.tableRow}>
              <Text style={[overlayStyles.td, { width: '25%' }]}>{op.tipo}</Text>
              <Text style={[overlayStyles.td, { width: '35%' }]}>{op.descripcion || '-'}</Text>
              <Text style={[overlayStyles.tdMono, { width: '20%', textAlign: 'right' }]}>{fmx(op.monto)}</Text>
              <Text style={[overlayStyles.td, { width: '20%' }]}>{ffd(op.fechaPago)}</Text>
            </View>
          ))}
          <View style={overlayStyles.totalRow}>
            <Text style={[overlayStyles.totalLabel, overlayStyles.totalGreen]}>Total: </Text>
            <Text style={[overlayStyles.totalAmount, overlayStyles.totalGreen]}>{fmx(totalPagado)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

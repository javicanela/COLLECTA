import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { Client, Operation } from '../../types';

interface PdfDefaultLayoutProps {
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

const ffdFormal = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
};

const calcDias = (fechaVence: string) =>
  Math.ceil((new Date(fechaVence).getTime() - Date.now()) / 86400000);

const getStatus = (op: Operation) => op.calculatedStatus || op.estatus;

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60,
    paddingLeft: 30,
    paddingRight: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
  header: {
    backgroundColor: '#0c2340',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 0,
  },
  headerLeft: { flexDirection: 'column' },
  headerTitle: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },
  headerSub: { color: '#94a3b8', fontSize: 8, marginTop: 4 },
  headerRight: { alignItems: 'flex-end' },
  headerEdoCta: { color: '#3dba4e', fontSize: 12, fontFamily: 'Helvetica-Bold' },
  headerDate: { color: '#94a3b8', fontSize: 8, marginTop: 4, textAlign: 'right' },
  clientBand: {
    backgroundColor: '#f8fafc',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clientLabel: { color: '#64748b', fontSize: 7, textTransform: 'uppercase', marginBottom: 2 },
  clientValue: { color: '#1e293b', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  clientValueMuted: { color: '#94a3b8', fontSize: 10, fontStyle: 'italic' },
  clientCol: { flex: 1 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0c2340',
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0c2340',
    paddingBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tableRowVencido: { backgroundColor: '#fef2f2' },
  tableRowHoy: { backgroundColor: '#fff7ed' },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' },
  td: { fontSize: 9, color: '#334155' },
  tdBold: { fontSize: 9, color: '#334155', fontFamily: 'Helvetica-Bold' },
  colDesc: { width: '40%' },
  colMonto: { width: '16%', textAlign: 'right' },
  colFecha: { width: '14%', textAlign: 'center' },
  colDias: { width: '10%', textAlign: 'center' },
  colEstatus: { width: '18%' },
  colFechaPago: { width: '20%' },
  monto: { fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica' },
  montoBold: { fontSize: 9, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  dias: { fontSize: 9, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textAlign: 'center',
  },
  badgeVencido: { backgroundColor: '#fef2f2' },
  badgeHoy: { backgroundColor: '#fff7ed' },
  badgePorVencer: { backgroundColor: '#eff6ff' },
  badgeAlCorriente: { backgroundColor: '#f0fdf4' },
  badgeTextVencido: { color: '#dc2626', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  badgeTextHoy: { color: '#ea580c', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  badgeTextPorVencer: { color: '#2563eb', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  badgeTextAlCorriente: { color: '#16a34a', fontSize: 7, fontFamily: 'Helvetica-Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, paddingRight: 6, marginTop: 4 },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginRight: 10 },
  totalAmount: { fontSize: 12, fontFamily: 'Helvetica-Bold' },
  totalRed: { color: '#dc2626' },
  totalGreen: { color: '#16a34a' },
  bankBlock: {
    backgroundColor: '#0c2340',
    padding: 16,
    borderRadius: 6,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bankLabel: { color: '#94a3b8', fontSize: 7, textTransform: 'uppercase', marginBottom: 2 },
  bankValue: { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },
  bankCol: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

export function PdfDefaultLayout({ client, operations, config, nombreDespacho }: PdfDefaultLayoutProps) {
  const pendientes = operations.filter(op => !op.fechaPago && getStatus(op) !== 'PAGADO' && getStatus(op) !== 'EXCLUIDO');
  const pagados = operations.filter(op => op.fechaPago || getStatus(op) === 'PAGADO');
  const totalPendiente = pendientes.reduce((sum, op) => sum + (op.monto || 0), 0);
  const totalPagado = pagados.reduce((sum, op) => sum + (op.monto || 0), 0);

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'VENCIDO': return { badge: styles.badgeVencido, text: styles.badgeTextVencido };
      case 'HOY VENCE': return { badge: styles.badgeHoy, text: styles.badgeTextHoy };
      case 'POR VENCER': return { badge: styles.badgePorVencer, text: styles.badgeTextPorVencer };
      case 'AL CORRIENTE': return { badge: styles.badgeAlCorriente, text: styles.badgeTextAlCorriente };
      default: return { badge: styles.badgePorVencer, text: styles.badgeTextPorVencer };
    }
  };

  const formatDias = (dias: number) => {
    if (dias < 0) return `${Math.abs(dias)} días`;
    if (dias === 0) return 'Hoy';
    return `${dias} días`;
  };

  const today = ffdFormal(new Date().toISOString());

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{nombreDespacho}</Text>
          <Text style={styles.headerSub}>
            {[config.depto, config.tel, config.email].filter(Boolean).join(' | ')}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerEdoCta}>ESTADO DE CUENTA</Text>
          <Text style={styles.headerDate}>{today}</Text>
        </View>
      </View>

      <View style={styles.clientBand}>
        <View style={styles.clientCol}>
          <Text style={styles.clientLabel}>Cliente</Text>
          <Text style={styles.clientValue}>{client.nombre}</Text>
        </View>
        <View style={styles.clientCol}>
          <Text style={styles.clientLabel}>RFC</Text>
          <Text style={styles.clientValue}>{client.rfc}</Text>
        </View>
        {client.regimen ? (
          <View style={styles.clientCol}>
            <Text style={styles.clientLabel}>Régimen</Text>
            <Text style={styles.clientValue}>{client.regimen}</Text>
          </View>
        ) : null}
        {client.asesor ? (
          <View style={styles.clientCol}>
            <Text style={styles.clientLabel}>Asesor</Text>
            <Text style={styles.clientValue}>{client.asesor}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Saldos Pendientes</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
        <Text style={[styles.th, styles.colMonto]}>Monto</Text>
        <Text style={[styles.th, styles.colFecha]}>Vencimiento</Text>
        <Text style={[styles.th, styles.colDias]}>Días</Text>
        <Text style={[styles.th, styles.colEstatus]}>Estatus</Text>
      </View>
      {pendientes.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={[styles.td, { width: '100%', textAlign: 'center', color: '#94a3b8' }]}>Sin saldos pendientes</Text>
        </View>
      ) : (
        pendientes.map((op, i) => {
          const status = getStatus(op);
          const dias = op.diasRestantes ?? calcDias(op.fechaVence);
          const badge = getBadgeStyle(status);
          const rowStyle =
            status === 'VENCIDO' ? styles.tableRowVencido :
            status === 'HOY VENCE' ? styles.tableRowHoy :
            i % 2 === 1 ? styles.tableRowAlt : {};
          return (
            <View key={op.id} style={[styles.tableRow, rowStyle]}>
              <Text style={[styles.td, styles.colDesc]}>{op.descripcion || '-'}</Text>
              <Text style={[styles.montoBold, styles.colMonto]}>{fmx(op.monto)}</Text>
              <Text style={[styles.td, styles.colFecha]}>{ffd(op.fechaVence)}</Text>
              <Text style={[styles.dias, styles.colDias, { color: dias < 0 ? '#dc2626' : dias === 0 ? '#ea580c' : '#2563eb' }]}>
                {formatDias(dias)}
              </Text>
              <View style={[styles.colEstatus, { flexDirection: 'row', justifyContent: 'center' }]}>
                <View style={[styles.badge, badge.badge]}>
                  <Text style={badge.text}>{status === 'HOY VENCE' ? 'HOY VENCE' : status}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, styles.totalRed]}>Total Pendiente:</Text>
        <Text style={[styles.totalAmount, styles.totalRed]}>{fmx(totalPendiente)}</Text>
      </View>

      {pagados.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Historial de Pagos</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: '40%' }]}>Descripción</Text>
            <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Monto</Text>
            <Text style={[styles.th, styles.colFechaPago]}>Fecha Pago</Text>
          </View>
          {pagados.map((op, i) => (
            <View key={op.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.td, { width: '40%' }]}>{op.descripcion || '-'}</Text>
              <Text style={[styles.montoBold, { width: '20%', textAlign: 'right' }]}>{fmx(op.monto)}</Text>
              <Text style={[styles.td, styles.colFechaPago]}>{ffd(op.fechaPago)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.totalGreen]}>Total Liquidado:</Text>
            <Text style={[styles.totalAmount, styles.totalGreen]}>{fmx(totalPagado)}</Text>
          </View>
        </>
      )}

      {(config.beneficiario || config.banco || config.clabe) && (
        <View style={styles.bankBlock}>
          <View style={styles.bankCol}>
            <Text style={styles.bankLabel}>Beneficiario</Text>
            <Text style={styles.bankValue}>{config.beneficiario || '-'}</Text>
          </View>
          <View style={styles.bankCol}>
            <Text style={styles.bankLabel}>Banco</Text>
            <Text style={styles.bankValue}>{config.banco || '-'}</Text>
          </View>
          <View style={styles.bankCol}>
            <Text style={styles.bankLabel}>CLABE</Text>
            <Text style={styles.bankValue}>{config.clabe || '-'}</Text>
          </View>
        </View>
      )}
    </>
  );
}

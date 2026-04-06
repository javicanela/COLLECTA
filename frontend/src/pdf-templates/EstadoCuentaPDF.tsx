import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import type { Client, Operation } from '../types';

interface EstadoCuentaProps {
  client: Client;
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

const calcDias = (fechaVence: string | null | undefined): number => {
  if (!fechaVence) return 0;
  const t = new Date(fechaVence).getTime();
  if (isNaN(t)) return 0;
  return Math.ceil((t - Date.now()) / 86400000);
};

const safe = (v: any): string => {
  const s = v?.toString().trim();
  return s || '—';
};

const getStatus = (op: Operation) => op.calculatedStatus || op.estatus;

// ─── Parameter helpers ───────────────────────────────────────────────────────
const safeHex = (v: string, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;

const getColor = (cfg: Record<string, string>, key: string, fallback: string) =>
  safeHex(cfg[`pdf_param_${key}`] || '', fallback);

const getNum = (cfg: Record<string, string>, key: string, fallback: number) => {
  const v = Number(cfg[`pdf_param_${key}`]);
  return isNaN(v) ? fallback : v;
};

const getBool = (cfg: Record<string, string>, key: string, fallback: boolean) => {
  const v = cfg[`pdf_param_${key}`];
  if (v === undefined || v === '') return fallback;
  return v === 'true';
};

const getString = (cfg: Record<string, string>, key: string, fallback: string) =>
  cfg[`pdf_param_${key}`] || fallback;

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EstadoCuentaPDF({ client, operations, config }: EstadoCuentaProps) {
  // Read all pdf_param_* keys with sensible fallbacks
  const colorHeader      = getColor(config, 'color_header',        '#0c2340');
  const colorClientBand  = getColor(config, 'color_client_band',   '#102440');
  const colorBankBlock   = getColor(config, 'color_bank_block',    '#0c2340');
  const colorTableBg     = getColor(config, 'color_table_bg',      '#f1f5f9');
  const colorBodyText    = getColor(config, 'color_body_text',     '#334155');
  const colorAccent      = getColor(config, 'color_accent',        '#3dba4e');

  const fontSizeTitle    = getNum(config, 'font_size_title',       14);
  const fontSizeData     = getNum(config, 'font_size_data',        8);

  const marginTop        = getNum(config, 'margin_top',            30);
  const marginBottom     = getNum(config, 'margin_bottom',         30);
  const marginSide       = getNum(config, 'margin_side',           30);

  const showLogo         = getBool(config, 'show_logo',            false);
  const showBankBlock    = getBool(config, 'show_bank_block',      true);
  const showPayHistory   = getBool(config, 'show_pay_history',     true);
  const showFooter       = getBool(config, 'show_footer',          true);

  const docTitle         = getString(config, 'doc_title',          'ESTADO DE CUENTA');
  const legalText        = getString(config, 'legal_text',         'Documento generado por Collecta');

  const nombreDespacho = config.nombre_despacho || 'Collecta';
  const hasImageTemplate = config['pdf_template_mode'] === 'imagen' && !!config['pdf_template_image'];

  const pendientes = operations.filter(op => !op.fechaPago && getStatus(op) !== 'PAGADO' && getStatus(op) !== 'EXCLUIDO');
  const pagados    = operations.filter(op => op.fechaPago || getStatus(op) === 'PAGADO');
  const totalPendiente = pendientes.reduce((sum, op) => sum + (op.monto || 0), 0);
  const totalPagado    = pagados.reduce((sum, op) => sum + (op.monto || 0), 0);

  const s = StyleSheet.create({
    page: {
      paddingTop: marginTop,
      paddingBottom: marginBottom + 30,
      paddingLeft: marginSide,
      paddingRight: marginSide,
      fontSize: fontSizeData,
      fontFamily: 'Helvetica',
      color: colorBodyText,
    },
    // Header
    header: {
      backgroundColor: colorHeader,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 4,
      marginBottom: 0,
    },
    headerLeft: { flexDirection: 'column' },
    headerTitle: { color: '#ffffff', fontSize: fontSizeTitle, fontFamily: 'Helvetica-Bold' },
    headerSub: { color: '#94a3b8', fontSize: 8, marginTop: 3 },
    headerRight: { alignItems: 'flex-end' },
    headerEdoCta: { color: colorAccent, fontSize: 11, fontFamily: 'Helvetica-Bold' },
    headerDate: { color: '#94a3b8', fontSize: 7, marginTop: 2 },
    // Client band
    clientBand: {
      backgroundColor: colorClientBand,
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      borderRadius: 4,
    },
    clientLabel: { color: '#64748b', fontSize: 7, textTransform: 'uppercase' as const, marginBottom: 1 },
    clientValue: { color: '#e2e8f0', fontSize: fontSizeData + 1, fontFamily: 'Helvetica-Bold' },
    clientCol: { flex: 1 },
    // Section title
    sectionTitle: {
      fontSize: fontSizeData + 2,
      fontFamily: 'Helvetica-Bold',
      color: colorHeader,
      marginBottom: 6,
      marginTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e2e8f0',
      paddingBottom: 3,
    },
    // Table
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colorTableBg,
      borderBottomWidth: 1,
      borderBottomColor: '#cbd5e1',
      paddingVertical: 5,
      paddingHorizontal: 4,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#e2e8f0',
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    tableRowVencido: { backgroundColor: '#fef2f2' },
    tableRowHoy: { backgroundColor: '#fff7ed' },
    tableRowAlt: { backgroundColor: '#f8fafc' },
    th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', textTransform: 'uppercase' as const },
    td: { fontSize: fontSizeData, color: colorBodyText },
    tdMono: { fontSize: fontSizeData, color: colorBodyText, fontFamily: 'Courier' },
    tdBold: { fontSize: fontSizeData, color: colorBodyText, fontFamily: 'Helvetica-Bold' },
    // Column widths
    colTipo: { width: '15%' },
    colDesc: { width: '25%' },
    colMonto: { width: '15%', textAlign: 'right' as const },
    colFecha: { width: '15%' },
    colDias: { width: '10%', textAlign: 'center' as const },
    colEstatus: { width: '20%' },
    colFechaPago: { width: '20%' },
    // Totals
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 6, paddingRight: 4, marginTop: 2 },
    totalLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginRight: 10 },
    totalAmount: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
    totalRed: { color: '#e03535' },
    totalGreen: { color: '#3dba4e' },
    // Bank block
    bankBlock: {
      backgroundColor: colorBankBlock,
      padding: 14,
      borderRadius: 4,
      marginTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    bankLabel: { color: '#64748b', fontSize: 7, textTransform: 'uppercase' as const, marginBottom: 1 },
    bankValue: { color: '#ffffff', fontSize: fontSizeData + 1, fontFamily: 'Helvetica-Bold' },
    bankCol: { flex: 1 },
    // Legal text
    legalBlock: { marginTop: 12, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#e2e8f0' },
    legalText: { fontSize: 7, color: '#94a3b8', textAlign: 'center' as const },
    // Footer
    footer: {
      position: 'absolute' as const,
      bottom: marginBottom,
      left: marginSide,
      right: marginSide,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 0.5,
      borderTopColor: '#cbd5e1',
      paddingTop: 6,
    },
    footerText: { fontSize: 7, color: '#94a3b8' },
  });

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Background image if template mode = imagen */}
        {hasImageTemplate && (
          <Image
            src={config['pdf_template_image']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.15,
            }}
          />
        )}

        {/* Logo (if enabled and image template present) */}
        {showLogo && config['pdf_template_image'] && (
          <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
            <Image
              src={config['pdf_template_image']}
              style={{ width: 80, height: 40, objectFit: 'contain' as any }}
            />
          </View>
        )}

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>{nombreDespacho}</Text>
            <Text style={s.headerSub}>
              {[config.depto, config.tel, config.email].filter(Boolean).join(' | ')}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerEdoCta}>{docTitle}</Text>
            <Text style={s.headerDate}>{ffd(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Client band */}
        <View style={s.clientBand}>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Cliente</Text>
            <Text style={s.clientValue}>{client.nombre}</Text>
          </View>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>RFC</Text>
            <Text style={s.clientValue}>{client.rfc}</Text>
          </View>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Régimen</Text>
            <Text style={s.clientValue}>{safe(client.regimen)}</Text>
          </View>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Asesor</Text>
            <Text style={s.clientValue}>{safe(client.asesor)}</Text>
          </View>
        </View>

        {/* Saldos Pendientes */}
        <Text style={s.sectionTitle}>Saldos Pendientes</Text>
        <View style={s.tableHeader}>
          <Text style={[s.th, s.colTipo]}>Tipo</Text>
          <Text style={[s.th, s.colDesc]}>Descripción</Text>
          <Text style={[s.th, s.colMonto]}>Monto</Text>
          <Text style={[s.th, s.colFecha]}>Vencimiento</Text>
          <Text style={[s.th, s.colDias]}>Dias</Text>
          <Text style={[s.th, s.colEstatus]}>Estatus</Text>
        </View>
        {pendientes.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={[s.td, { width: '100%', textAlign: 'center' as const, color: '#94a3b8' }]}>Sin saldos pendientes</Text>
          </View>
        ) : (
          pendientes.map((op, i) => {
            const status = getStatus(op);
            const dias = op.diasRestantes ?? calcDias(op.fechaVence);
            const rowStyle =
              status === 'VENCIDO' ? s.tableRowVencido :
              status === 'HOY VENCE' ? s.tableRowHoy :
              i % 2 === 1 ? s.tableRowAlt : {};
            return (
              <View key={op.id} style={[s.tableRow, rowStyle]}>
                <Text style={[s.td, s.colTipo]}>{op.tipo}</Text>
                <Text style={[s.td, s.colDesc]}>{op.descripcion || '-'}</Text>
                <Text style={[s.tdMono, s.colMonto]}>{fmx(op.monto)}</Text>
                <Text style={[s.td, s.colFecha]}>{ffd(op.fechaVence)}</Text>
                <Text style={[s.tdBold, s.colDias, { color: dias < 0 ? '#e03535' : dias === 0 ? '#e07820' : '#2e7cf0' }]}>
                  {!op.fechaVence ? '—' : dias < 0 ? `+${Math.abs(dias)}` : dias === 0 ? 'Hoy' : String(dias)}
                </Text>
                <Text style={[s.tdBold, s.colEstatus, {
                  color: status === 'VENCIDO' ? '#e03535' : status === 'HOY VENCE' ? '#e07820' : '#2e7cf0'
                }]}>
                  {status}
                </Text>
              </View>
            );
          })
        )}
        <View style={s.totalRow}>
          <Text style={[s.totalLabel, s.totalRed]}>Total Pendiente:</Text>
          <Text style={[s.totalAmount, s.totalRed]}>{fmx(totalPendiente)}</Text>
        </View>

        {/* Historial de Pagos */}
        {showPayHistory && pagados.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Historial de Pagos</Text>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: '20%' }]}>Tipo</Text>
              <Text style={[s.th, { width: '30%' }]}>Descripción</Text>
              <Text style={[s.th, { width: '20%', textAlign: 'right' as const }]}>Monto</Text>
              <Text style={[s.th, s.colFechaPago]}>Fecha Pago</Text>
            </View>
            {pagados.map((op, i) => (
              <View key={op.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <Text style={[s.td, { width: '20%' }]}>{op.tipo}</Text>
                <Text style={[s.td, { width: '30%' }]}>{op.descripcion || '-'}</Text>
                <Text style={[s.tdMono, { width: '20%', textAlign: 'right' as const }]}>{fmx(op.monto)}</Text>
                <Text style={[s.td, s.colFechaPago]}>{ffd(op.fechaPago)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, s.totalGreen]}>Total Liquidado:</Text>
              <Text style={[s.totalAmount, s.totalGreen]}>{fmx(totalPagado)}</Text>
            </View>
          </>
        )}

        {/* Bank block — solo si hay CLABE configurada */}
        {showBankBlock && config.clabe && (
          <View style={s.bankBlock}>
            {config.beneficiario ? (
              <View style={s.bankCol}>
                <Text style={s.bankLabel}>Beneficiario</Text>
                <Text style={s.bankValue}>{config.beneficiario}</Text>
              </View>
            ) : null}
            {config.banco ? (
              <View style={s.bankCol}>
                <Text style={s.bankLabel}>Banco</Text>
                <Text style={s.bankValue}>{config.banco}</Text>
              </View>
            ) : null}
            <View style={s.bankCol}>
              <Text style={s.bankLabel}>CLABE</Text>
              <Text style={s.bankValue}>{config.clabe}</Text>
            </View>
          </View>
        )}

        {/* Legal text */}
        {legalText && (
          <View style={s.legalBlock}>
            <Text style={s.legalText}>{legalText}</Text>
          </View>
        )}

        {/* Footer */}
        {showFooter && (
          <View style={s.footer} fixed>
            <Text style={s.footerText}>
              {[nombreDespacho, config.depto, config.tel].filter(Boolean).join(' | ')}
            </Text>
            <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
          </View>
        )}
      </Page>
    </Document>
  );
}

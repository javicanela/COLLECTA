import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import type { Client, Operation } from '../../types';
import { PdfDefaultLayout } from './PdfDefaultLayout';
import { PdfDataOverlay } from './PdfDataOverlay';

interface PdfEstadoCuentaProps {
  client: Client;
  operations: Operation[];
  config: Record<string, string>;
}

const documentStyles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60,
    paddingLeft: 30,
    paddingRight: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
  },
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

export default function PdfEstadoCuenta({ client, operations, config }: PdfEstadoCuentaProps) {
  const nombreDespacho = config.nombre_despacho || 'Collecta';
  const hasImageTemplate = config['pdf_template_mode'] === 'imagen' && !!config['pdf_template_image'];

  return (
    <Document>
      <Page size="LETTER" style={documentStyles.page}>
        {hasImageTemplate && (
          <Image
            src={config['pdf_template_image']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />
        )}

        {hasImageTemplate ? (
          <PdfDataOverlay
            client={client}
            operations={operations}
            config={config}
            nombreDespacho={nombreDespacho}
          />
        ) : (
          <PdfDefaultLayout
            client={client}
            operations={operations}
            config={config}
            nombreDespacho={nombreDespacho}
          />
        )}

        <View style={documentStyles.footer} fixed>
          <Text style={documentStyles.footerText}>
            {[nombreDespacho, config.depto, config.tel].filter(Boolean).join(' | ')}
          </Text>
          <Text
            style={documentStyles.footerText}
            render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export { PdfEstadoCuenta };

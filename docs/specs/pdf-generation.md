---
name: pdf_generation_flow
description: Instrucciones sobre cómo generar reportes financieros en PDF desde el frontend de forma modular.
---

# Generación de PDFs

Para solventar las limitaciones pasadas de `jsPDF` crudo (posicionamiento x,y manual), el proyecto migrará a generadores basados en componentes declarativos de React.

## Librería Principal
Se usará `@react-pdf/renderer` para definir los documentos.

## Estructura de un Documento
Cada formato de impresión (ej. "Recibo de Honorarios", "Reporte Mensual") debe ser un componente aislado dentro de `frontend/src/pdf-templates/`.

### Reglas de Diseño PDF:
1. **No usar HTML Estándar:** Usar exclusivamente los componentes primitivos provistos por `@react-pdf/renderer` (`<Document>`, `<Page>`, `<View>`, `<Text>`, `<Image>`).
2. **Estilos Aislados:** Usar `StyleSheet.create` de la misma librería. Las utilidades de Tailwind **no aplican** mágicamente dentro del lienzo del PDF.
3. **Paso de Datos (Props):** Los componentes PDF deben recibir constructivamente la data cruda, ej: `<ReciboFiscal cliente={selectedClient} operaciones={listaOp} />`.

### Generación y Descarga (Web)
Para mostrar botones de "Descargar PDF" o "Previsualizar":
```tsx
import { PDFDownloadLink } from '@react-pdf/renderer';
import MiReportePDF from './pdf-templates/MiReportePDF';

const BotonDescarga = ({ data }) => (
  <PDFDownloadLink document={<MiReportePDF data={data} />} fileName="reporte.pdf">
    {({ blob, url, loading, error }) =>
      loading ? 'Preparando documento...' : 'Descargar Reporte'
    }
  </PDFDownloadLink>
);
```

### Integración con WhatsApp (Generación en Memoria)
Cuando se necesite generar el PDF sin descargarlo (para copiarlo al portapapeles según `whatsapp_flow.md`):
Usar la API `pdf()` de React-PDF para convertir el componente en un Blob de manera programática.

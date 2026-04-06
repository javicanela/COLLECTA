---
name: whatsapp_semi_auto_flow
description: Instrucciones estrictas sobre cómo debe la IA programar el flujo de envío de mensajes y PDFs por WhatsApp.
---

# Flujo Semi-Automático de WhatsApp

El proyecto BajaTax V4 no tiene acceso a la API Oficial de Meta por el momento. Toda Inteligencia Artificial que escriba código relacionado con el envío de mensajes a clientes debe adherirse a esta lógica estricta (Click-to-Send):

### 1. Generación de Enlace (Texto Precargado)
Para iniciar un chat, SIEMPRE usar la URL universal:
`https://wa.me/{numero_limpio}?text={mensaje_url_encoded}`

*Restricciones:*
* El número debe estar sanitizado (solo dígitos, con código de país, ej. `5215555555555`).
* El mensaje debe ir codificado (`encodeURIComponent`).

### 2. El Problema del Archivo Adjunto (PDF)
**REGLA DE ORO:** Las APIs públicas `wa.me/` o `api.whatsapp.com` de Meta **NO ACEPTAN ARCHIVOS ADJUNTOS por URL**. Cualquier intento de enviar un blob o URL en un href fallará.

### 3. La Solución (Flujo Portapapeles):
Al diseñar el código del botón de "Enviar por WhatsApp", el flujo en React debe funcionar obligatoriamente en 2 pasos *síncronos*:

```typescript
// Ejemplo Conceptual Estricto que la IA debe seguir:

const handleSendWhatsApp = async (cliente, datosPDF) => {
  try {
    // PASO 1: Generar el PDF en memoria usando la librería designada (ej. pdf-lib, react-pdf)
    const pdfBlob = await generarPDF(datosPDF);
    
    // PASO 2: Intentar copiar el archivo al portapapeles del Sistema Operativo
    // Nota: La Clipboard API es delicada con archivos, verificar soporte en navegadores.
    const clipboardItem = new ClipboardItem({
      [pdfBlob.type]: pdfBlob
    });
    await navigator.clipboard.write([clipboardItem]);
    
    mostrarToastM("PDF copiado al portapapeles. Pégalo en el chat de WhatsApp.", "success");

    // PASO 3: Abrir la pestaña con el chat y texto precargado
    const textoCodificado = encodeURIComponent(`Hola ${cliente.nombre}, adjunto su reporte.`);
    const linkWa = `https://wa.me/${cliente.telefono}?text=${textoCodificado}`;
    
    window.open(linkWa, "_blank");
    
  } catch (error) {
    // Si falla el portapapeles (ej. permisos), informar y abrir Whatsapp de todos modos
    mostrarToast("Error al copiar el PDF. Deberás adjuntarlo manualmente.", "error");
    window.open(linkWa, "_blank");
  }
}
```

### 4. Modo Cola (Batch)
Si se muestran múltiples clientes a enviar, la UI debe presentar una lista visible. Al dar click a un botón "Enviar", se ejecuta la función `handleSendWhatsApp` y, tras abrir la pestaña, se debe actualizar el estado visual de ese cliente a "Aperturado" o "Pendiente de Confirmación del Asesor".

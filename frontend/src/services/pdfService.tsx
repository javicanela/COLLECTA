/**
 * Collecta V5 - PDF Service
 * Generación de PDF con @react-pdf/renderer
 */

import { pdf } from '@react-pdf/renderer';
import PdfEstadoCuenta from '../components/pdf/PdfEstadoCuenta';
import type { Client, Operation } from '../types';

/**
 * Abre un modal para pedir nombre de archivo y retorna el nombre o null si cancela
 */
function askFileName(defaultName: string): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 9999;
    `;
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white; border-radius: 16px; padding: 24px; width: 400px; max-width: 90vw;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    `;
    modal.innerHTML = `
      <h3 style="margin:0 0 8px; font-size:18px; color:#0c2340;">Nombre del archivo</h3>
      <p style="margin:0 0 16px; color:#64748b; font-size:14px;">Ingresa el nombre para descargar el PDF</p>
      <input id="pdf-filename-input" type="text" value="${defaultName}" 
        style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:8px; font-size:14px; box-sizing:border-box; outline:none;"
        onfocus="this.select()" />
      <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:16px;">
        <button id="pdf-cancel-btn" style="padding:8px 20px; border:none; background:#f1f5f9; border-radius:8px; cursor:pointer; font-size:14px; color:#64748b;">Cancelar</button>
        <button id="pdf-ok-btn" style="padding:8px 20px; border:none; background:#0c2340; color:white; border-radius:8px; cursor:pointer; font-size:14px;">Descargar</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = document.getElementById('pdf-filename-input') as HTMLInputElement;
    input.focus();
    input.select();

    const close = (result: string | null) => {
      document.body.removeChild(overlay);
      resolve(result);
    };

    document.getElementById('pdf-cancel-btn')!.onclick = () => close(null);
    document.getElementById('pdf-ok-btn')!.onclick = () => {
      const val = input.value.trim();
      close(val ? val.endsWith('.pdf') ? val : val + '.pdf' : defaultName);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') document.getElementById('pdf-ok-btn')!.click();
      if (e.key === 'Escape') close(null);
    };
    overlay.onclick = (e) => { if (e.target === overlay) close(null); };
  });
}

/**
 * Genera y descarga un PDF de estado de cuenta para un cliente
 */
export async function downloadPDF(
  client: Client,
  operations: Operation[],
  config: Record<string, string>
): Promise<void> {
  const defaultName = `EstadoCuenta_${client.rfc}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const fileName = await askFileName(defaultName);
  if (!fileName) throw new Error('Cancelled');

  const doc = <PdfEstadoCuenta client={client} operations={operations} config={config} />;
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Genera PDFs masivos para múltiples clientes (uno por cliente)
 */
export async function generateMasivoPDF(
  operations: Operation[],
  config: Record<string, string>
): Promise<{ generated: number; failed: number }> {
  const grouped = new Map<string, { client: Client; ops: Operation[] }>();
  for (const op of operations) {
    if (!op.client) continue;
    const cid = op.clientId;
    if (!grouped.has(cid)) {
      grouped.set(cid, { client: op.client, ops: [] });
    }
    grouped.get(cid)!.ops.push(op);
  }

  let generated = 0;
  let failed = 0;

  for (const { client, ops } of grouped.values()) {
    try {
      const defaultName = `EstadoCuenta_${client.rfc}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const doc = <PdfEstadoCuenta client={client} operations={ops} config={config} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultName;
      a.click();
      URL.revokeObjectURL(url);
      generated++;
      await new Promise(r => setTimeout(r, 300));
    } catch {
      failed++;
    }
  }

  return { generated, failed };
}

export const PdfService = {
  downloadPDF,
  generateMasivoPDF,
};

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle2, Loader2, AlertCircle, FileSpreadsheet, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';
import { OperationService } from '../services/operationService';
import { ClientService } from '../services/clientService';
import { useOperationStore } from '../stores/useOperationStore';
import { useClientStore } from '../stores/useClientStore';
import { api } from '../services/api';
import type { OperationEstatus } from '../types';
import Topbar from '../components/Topbar';
import { Card } from '../components/ui/Card';
import { ImportWizard } from '../features/smart-import/components/ImportWizard';

interface ExtractedData {
  mapping: Record<string, string>;
  _source: string;
  rows: any[];
  headers: string[];
}

export default function RegistersView() {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMapping, setUserMapping] = useState<Record<string, string>>({});
  const [skippedNoClient, setSkippedNoClient] = useState(0);
  const [skippedDuplicate, setSkippedDuplicate] = useState(0);
  const [skippedBadDate, setSkippedBadDate] = useState(0);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(50);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);

  const { clients, fetchClients } = useClientStore();
  const { operations, fetchOperations } = useOperationStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) { setFile(selectedFile); processFile(selectedFile); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const processFile = async (file: File) => {
    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      if (wb.SheetNames.length > 1) {
        setWorkbook(wb);
        setShowSheetSelector(true);
        setIsExtracting(false);
        return;
      }

      processSheet(wb, 0);
    } catch (err: any) {
      setError(err.message || 'Error procesando el archivo.');
      setIsExtracting(false);
    }
  };

  const processSheet = async (wb: XLSX.WorkBook, sheetIndex: number) => {
    setIsExtracting(true);
    setShowSheetSelector(false);

    try {
      const sheetName = wb.SheetNames[sheetIndex];
      const worksheet = wb.Sheets[sheetName];
      let allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      allRows = allRows.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));

      if (allRows.length === 0) { setError('La hoja está vacía.'); setIsExtracting(false); return; }

      const headers = allRows[0].map(h => String(h || ''));
      const dataRows = allRows.slice(1);

      if (dataRows.length === 0) { setError('No se encontraron datos después de los encabezados.'); setIsExtracting(false); return; }

      const sampleRows = dataRows.slice(0, 20);
      const response = await OperationService.extract({ headers, rows: sampleRows });

      if (response && response.mapping) {
        const V3_TO_V5: Record<string, string> = {
          'responsable': 'asesor', 'concepto': 'tipo', 'vencimiento': 'fechaVence',
          'cliente': 'nombre', 'correo': 'email', 'clasificacion': 'categoria',
        };
        const normalizedMapping: Record<string, string> = {};
        Object.entries(response.mapping).forEach(([idx, field]) => {
          normalizedMapping[idx] = V3_TO_V5[field as string] || (field as string);
        });
        setExtractedData({ mapping: normalizedMapping, _source: response._source || 'unknown', rows: dataRows, headers });
        setUserMapping(normalizedMapping);
      } else {
        setError('No se pudo extraer la información automáticamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Error procesando la hoja.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    setIsSaving(true);

    try {
      // Asegurar que tenemos los clientes más recientes
      await fetchClients();
      
      const { rows } = extractedData;
      const fieldToIndex: Record<string, number> = {};
      Object.entries(userMapping).forEach(([idx, field]) => { fieldToIndex[field as string] = parseInt(idx); });

      // Primera pasada: identificar clientes que necesitan crearse o actualizarse
      const rowsNeedingClient: {row: string[], rfc: string, nombre: string, telefono?: string, email?: string, regimen?: string, categoria?: string, asesor?: string}[] = [];
      const clientsToUpdate: {id: string, telefono?: string, email?: string}[] = [];

      rows.forEach((row: string[]) => {
        const rfcIdx = fieldToIndex['rfc'];
        const nombreIdx = fieldToIndex['nombre'];
        const telefonoIdx = fieldToIndex['telefono'];
        const emailIdx = fieldToIndex['email'];
        const regimenIdx = fieldToIndex['regimen'];
        const categoriaIdx = fieldToIndex['categoria'];
        const asesorIdx = fieldToIndex['asesor'];

        const rfcValue = rfcIdx !== undefined ? String(row[rfcIdx] || '').trim().toUpperCase() : '';
        const nombreValue = nombreIdx !== undefined ? String(row[nombreIdx] || '').trim() : '';
        const telefonoValue = telefonoIdx !== undefined ? String(row[telefonoIdx] || '').trim() : '';
        const emailValue = emailIdx !== undefined ? String(row[emailIdx] || '').trim() : '';
        const regimenValue = regimenIdx !== undefined ? String(row[regimenIdx] || '').trim() : '';
        const categoriaValue = categoriaIdx !== undefined ? String(row[categoriaIdx] || '').trim() : '';
        const asesorValue = asesorIdx !== undefined ? String(row[asesorIdx] || '').trim() : '';

        const existingClient = clients.find(c =>
          (rfcValue && c.rfc === rfcValue) ||
          (nombreValue && c.nombre.toLowerCase().trim() === nombreValue.toLowerCase().trim())
        );

        if (!existingClient && (rfcValue || nombreValue)) {
          rowsNeedingClient.push({
            row,
            rfc: rfcValue,
            nombre: nombreValue,
            telefono: telefonoValue || undefined,
            email: emailValue || undefined,
            regimen: regimenValue || undefined,
            categoria: categoriaValue || undefined,
            asesor: asesorValue || undefined
          });
        } else if (existingClient) {
          // Si el import trae teléfono o email y es diferente al guardado, actualizar
          const hasNewPhone = telefonoValue && telefonoValue !== (existingClient.telefono || '');
          const hasNewEmail = emailValue && emailValue !== (existingClient.email || '');
          if (hasNewPhone || hasNewEmail) {
            // Solo encolar una actualización por cliente (deduplicar por id)
            if (!clientsToUpdate.some(u => u.id === existingClient.id)) {
              clientsToUpdate.push({
                id: existingClient.id,
                ...(hasNewPhone ? { telefono: telefonoValue } : {}),
                ...(hasNewEmail ? { email: emailValue } : {}),
              });
            }
          }
        }
      });

      // Crear clientes que no existen
      const createdClients: Map<string, {id: string, rfc: string, nombre: string}> = new Map();
      const clientErrors: string[] = [];
      if (rowsNeedingClient.length > 0) {
        const uniqueClients = rowsNeedingClient
          .map(r => ({
            rfc: r.rfc || `TEMP${Date.now()}${Math.floor(Math.random() * 9999)}`.slice(0, 13),
            nombre: r.nombre || 'Cliente importado',
            telefono: r.telefono,
            email: r.email,
            regimen: r.regimen,
            categoria: r.categoria,
            asesor: r.asesor
          }))
          .filter((c, i, arr) => arr.findIndex(x => x.rfc === c.rfc) === i);

        for (const clientData of uniqueClients) {
          try {
            const newClient = await api.post<{id: string, rfc: string, nombre: string}>('/clients', {
              rfc: clientData.rfc,
              nombre: clientData.nombre,
              telefono: clientData.telefono,
              email: clientData.email,
              regimen: clientData.regimen,
              categoria: clientData.categoria,
              asesor: clientData.asesor,
              estado: 'ACTIVO'
            });
            createdClients.set(clientData.rfc, newClient);
          } catch (err: any) {
            const msg = err.message || 'Error desconocido';
            clientErrors.push(`${clientData.nombre} (${clientData.rfc}): ${msg}`);
          }
        }
        
        // Recargar clientes del store
        await fetchClients();
      }

      // Actualizar teléfono/email de clientes existentes que traen datos nuevos en el import
      for (const update of clientsToUpdate) {
        try {
          await ClientService.update(update.id, { telefono: update.telefono, email: update.email });
        } catch {
          // No crítico: continúa aunque falle la actualización de contacto
        }
      }
      if (clientsToUpdate.length > 0) {
        await fetchClients();
      }

      // Segunda pasada: crear operaciones
      // Combinar clientes del store con los creados recientemente
      const allClients = [
        ...clients,
        ...Array.from(createdClients.values()).map(c => ({ id: c.id, rfc: c.rfc, nombre: c.nombre }))
      ];

      const operationsToCreate = rows.map((row: string[]) => {
        const rfcIdx = fieldToIndex['rfc'];
        const nombreIdx = fieldToIndex['nombre'];
        const rfcValue = rfcIdx !== undefined ? String(row[rfcIdx] || '').trim().toUpperCase() : '';
        const nombreValue = nombreIdx !== undefined ? String(row[nombreIdx] || '').trim() : '';
        
        // Buscar en todos los clientes (store + creados)
        let client = allClients.find(c =>
          (rfcValue && c.rfc === rfcValue) ||
          (nombreValue && c.nombre.toLowerCase().trim() === nombreValue.toLowerCase().trim())
        );
        
        if (!client) return null;

        const montoIdx = fieldToIndex['monto'];
        const montoStr = montoIdx !== undefined ? String(row[montoIdx] || '0').replace(/[$,\s]/g, '') : '0';
        const monto = parseFloat(montoStr);
        const fechaIdx = fieldToIndex['fechaVence'] ?? fieldToIndex['vencimiento'] ?? fieldToIndex['fecha'];
        const rawFecha = fechaIdx !== undefined ? row[fechaIdx] : null;
        const fechaValue = (() => {
          if (!rawFecha) return null;
          const raw = String(rawFecha).trim();
          // 1. Número serial de Excel (ej: 46025.9999) → convertir a fecha JS
          const serial = Number(raw);
          if (!isNaN(serial) && serial > 1000 && serial < 100000) {
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) return date.toISOString();
          }
          // 2. Formato DD/MM/YYYY o DD/MM/YY con separadores / - .
          const ddmmyyyy = raw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
          if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
            const iso = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            const p = new Date(iso);
            if (!isNaN(p.getTime())) return p.toISOString();
          }
          // 3. Formato con espacio: "15 04 2026" o "15.04.2026"
          const ddmmyyyySpace = raw.match(/^(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})$/);
          if (ddmmyyyySpace) {
            const [, d, m, y] = ddmmyyyySpace;
            const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
            const iso = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            const p = new Date(iso);
            if (!isNaN(p.getTime())) return p.toISOString();
          }
          // 4. Formato con día escrito: "15-abr-2026" o "15/Abr/2026"
          const meses: Record<string, string> = {
            'ene': '01', 'enero': '01', 'jan': '01', 'january': '01',
            'feb': '02', 'febrero': '02',
            'mar': '03', 'marzo': '03', 'march': '03',
            'abr': '04', 'abril': '04', 'apr': '04', 'april': '04',
            'may': '05', 'mayo': '05',
            'jun': '06', 'junio': '06', 'june': '06',
            'jul': '07', 'julio': '07', 'july': '07',
            'ago': '08', 'agosto': '08', 'aug': '08', 'august': '08',
            'sep': '09', 'septiembre': '09', 'sept': '09',
            'oct': '10', 'octubre': '10',
            'nov': '11', 'noviembre': '11',
            'dic': '12', 'diciembre': '12', 'dec': '12', 'december': '12',
          };
          const ddmmyyyyText = raw.toLowerCase().match(/^(\d{1,2})[\/\-\.\s]+([a-z]+)[\/\-\.\s]+(\d{2,4})$/);
          if (ddmmyyyyText) {
            const [, d, mesStr, y] = ddmmyyyyText;
            const m = meses[mesStr];
            if (m) {
              const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
              const iso = `${year}-${m}-${d.padStart(2, '0')}`;
              const p = new Date(iso);
              if (!isNaN(p.getTime())) return p.toISOString();
            }
          }
          // 5. Formato ISO o otros que new Date pueda entender (YYYY-MM-DD, MM/DD/YYYY)
          const parsed = new Date(raw);
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
          return null;
        })();
        const tipoIdx = fieldToIndex['tipo'];
        const tipoValue = tipoIdx !== undefined ? String(row[tipoIdx] || 'FISCAL') : 'FISCAL';
        const descIdx = fieldToIndex['descripcion'];
        const descValue = descIdx !== undefined ? String(row[descIdx] || '') : '';
        const asesorIdx = fieldToIndex['asesor'];
        const asesorValue = asesorIdx !== undefined ? String(row[asesorIdx] || '') : '';

        if (!fechaValue) return null; // Fecha inválida → omitir fila
        return {
          clientId: client.id, tipo: tipoValue, descripcion: descValue || tipoValue,
          asesor: asesorValue || undefined, monto: isNaN(monto) ? 0 : monto,
          fechaVence: fechaValue, estatus: 'PENDIENTE' as OperationEstatus, excluir: false, archived: false
        };
      });

      const totalRows = rows.length;
      void totalRows; // usado implícitamente en conteos abajo
      // Contar separadamente: nulos por cliente vs nulos por fecha inválida
      // Re-pasada simple para separar conteos:
      let badDateCount = 0;
      let noClientCount2 = 0;
      rows.forEach((row: string[]) => {
        const rfcIdx2 = fieldToIndex['rfc'];
        const nombreIdx2 = fieldToIndex['nombre'];
        const rfcV = rfcIdx2 !== undefined ? String(row[rfcIdx2] || '').trim().toUpperCase() : '';
        const nomV = nombreIdx2 !== undefined ? String(row[nombreIdx2] || '').trim() : '';
        const found = allClients.find(c =>
          (rfcV && c.rfc === rfcV) || (nomV && c.nombre.toLowerCase().trim() === nomV.toLowerCase().trim())
        );
        if (!found) { noClientCount2++; return; }
        const fIdx = fieldToIndex['fechaVence'] ?? fieldToIndex['vencimiento'] ?? fieldToIndex['fecha'];
        const raw = fIdx !== undefined ? row[fIdx] : null;
        if (!raw) { badDateCount++; return; }
        const rawStr = String(raw).trim();
        const serial = Number(rawStr);
        if (!isNaN(serial) && serial > 1000 && serial < 100000) return;
        if (!isNaN(new Date(rawStr).getTime())) return;
        badDateCount++;
      });
      setSkippedNoClient(noClientCount2);
      setSkippedBadDate(badDateCount);
      const validOps = operationsToCreate.filter(Boolean);

      let dupCount = 0;
      const dedupedOps = validOps.filter(op => {
        const isDup = operations.some(existing =>
          existing.clientId === op!.clientId && existing.tipo === op!.tipo &&
          Math.abs((existing.monto || 0) - (op!.monto || 0)) < 0.01
        );
        if (isDup) dupCount++;
        return !isDup;
      });
      setSkippedDuplicate(dupCount);

      if (dedupedOps.length === 0 && dupCount > 0) {
        setError(`Todos los registros ya existen (${dupCount} duplicados omitidos). No se importó nada.`);
        setIsSaving(false); return;
      }

      const total = dedupedOps.length;
      setImportProgress({ current: 0, total });
      const BATCH_SIZE = 5;
      let created = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = dedupedOps.slice(i, i + BATCH_SIZE).filter(Boolean);
        await Promise.all(batch.map(op => OperationService.create(op!)));
        created += batch.length;
        setImportProgress({ current: created, total });
        await new Promise(r => setTimeout(r, 0));
      }

      setSuccess(true);
      await fetchOperations();
      if (clientErrors.length > 0) {
        setError(`Advertencia: ${clientErrors.length} cliente(s) no pudieron crearse:\n${clientErrors.slice(0, 3).join('\n')}${clientErrors.length > 3 ? `\n...y ${clientErrors.length - 3} más` : ''}`);
      }
      setTimeout(() => {
        setSuccess(false); setExtractedData(null); setFile(null);
        setImportProgress({ current: 0, total: 0 });
        if (clientErrors.length === 0) setError(null);
      }, clientErrors.length > 0 ? 8000 : 3000);
    } catch (err: any) {
      setError('Error al guardar los registros: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setFile(null); setExtractedData(null); setError(null); setSuccess(false);
    setSkippedNoClient(0); setSkippedDuplicate(0); setSkippedBadDate(0); setUserMapping({});
    setImportProgress({ current: 0, total: 0 }); setPreviewLimit(50);
  };

  const filteredRows = useMemo(() => {
    if (!extractedData) return [];
    if (!searchQuery) return extractedData.rows;
    return extractedData.rows.filter(row => row.join(' ').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [extractedData, searchQuery]);

  const previewRows = useMemo(() => filteredRows.slice(0, previewLimit), [filteredRows, previewLimit]);

  return (
    <>
      <Topbar title="Registros" subtitle="Importación inteligente de Excel/CSV" />

      <div className="p-5 max-w-7xl mx-auto w-full flex flex-col gap-6">

        <ImportWizard />

        {/* Dropzone */}
        <div className="surface-card p-6" style={{ background: 'var(--c-surface)' }}>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Cargar Archivo de Datos</h2>
            {extractedData && <button className="btn btn-ghost btn-sm" onClick={reset}>✕ Cancelar</button>}
          </div>

          <div
            {...getRootProps()}
            className="rounded-2xl p-8 text-center transition-all cursor-pointer relative overflow-hidden"
            style={{
              border: `2px dashed ${isDragActive ? 'var(--brand-primary)' : isExtracting ? 'var(--brand-violet)' : 'var(--c-border)'}`,
              background: isDragActive ? 'var(--brand-primary-dim)' : isExtracting ? 'rgba(124,58,237,0.04)' : 'var(--c-surface-raised)',
            }}
          >
            {isExtracting && (
              <div className="absolute inset-0 bg-gradient-to-r via-transparent to-transparent animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.1), transparent)' }} />
            )}
            <input {...getInputProps()} />
            {isExtracting ? (
              <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--brand-violet)' }} />
                  <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--brand-violet)' }}>IA Analizando Archivo...</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>Extrayendo columnas, identificando RFCs y mapeando datos.</p>
                </div>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-3 relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,183,125,0.12)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--brand-success)' }} />
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--c-text)' }}>{file.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--brand-success)' }}>✓ Archivo procesado exitosamente</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--brand-primary-dim)' }}>
                  <FileSpreadsheet size={28} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div>
                  <p style={{ color: 'var(--c-text-2)' }}>
                    Arrastra tu archivo aquí o{' '}
                    <span className="font-semibold underline underline-offset-2" style={{ color: 'var(--brand-primary)' }}>haz clic para buscar</span>
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--c-text-muted)' }}>Soportamos Excel (.xlsx) y CSV • La IA detectará las columnas automáticamente</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg flex items-center gap-2 text-sm font-medium" style={{ background: 'rgba(239,63,63,0.08)', border: '1px solid rgba(239,63,63,0.22)', color: 'var(--brand-danger)', borderLeft: '3px solid var(--brand-danger)' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 rounded-lg flex items-center gap-2 text-sm font-medium" style={{ background: 'rgba(16,183,125,0.08)', border: '1px solid rgba(16,183,125,0.22)', color: 'var(--brand-success)', borderLeft: '3px solid var(--brand-success)' }}>
              <CheckCircle2 size={16} />
              Registros importados exitosamente.
              {skippedDuplicate > 0 && ` (${skippedDuplicate} duplicados omitidos)`}
            </div>
          )}
        </div>

        {showSheetSelector && workbook && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--c-text)' }}>Seleccionar Hoja</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--c-text-muted)' }}>
                El archivo tiene {workbook.SheetNames.length} hojas. ¿Cuál deseas importar?
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {workbook.SheetNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => processSheet(workbook, i)}
                    className="w-full text-left p-3 rounded-lg border transition-all hover:border-violet-500 hover:bg-violet-50"
                    style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                  >
                    <span className="font-semibold">{name}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => { setShowSheetSelector(false); setFile(null); setWorkbook(null); }} 
                className="w-full btn btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {extractedData && (
          <>
            {skippedNoClient > 0 && (
              <div className="p-4 rounded-lg flex items-center gap-2 text-sm font-semibold" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', color: 'var(--brand-warn)', borderLeft: '3px solid var(--brand-warn)' }}>
                ⚠ {skippedNoClient} {skippedNoClient === 1 ? 'fila omitida' : 'filas omitidas'}: RFC/nombre no encontrado en el directorio.
                Agrega esos clientes en Directorio antes de reimportar.
              </div>
            )}
            {skippedBadDate > 0 && (
              <div className="p-4 rounded-lg flex items-center gap-2 text-sm font-semibold" style={{ background: 'rgba(239,63,63,0.08)', border: '1px solid rgba(239,63,63,0.22)', color: 'var(--brand-danger)', borderLeft: '3px solid var(--brand-danger)' }}>
                ⚠ {skippedBadDate} {skippedBadDate === 1 ? 'fila omitida' : 'filas omitidas'}: fecha de vencimiento inválida o faltante.
                Revisa la columna de fecha en el archivo o ajusta el mapeo de columnas.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="glass" padding="normal" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: 'var(--brand-info)', transform: 'translate(30%, -30%)' }} />
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>Total Encontrados</p>
                <p className="text-3xl font-black" style={{ color: 'var(--c-text)' }}>{extractedData.rows.length}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--brand-info)' }}>filas en el archivo</p>
              </Card>
              
              <Card variant="glass" padding="normal" className="relative overflow-hidden border-[rgba(124,58,237,0.3)]">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10" style={{ background: 'var(--brand-violet)', transform: 'translate(30%, -30%)' }} />
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>Columnas Mapeadas</p>
                <p className="text-3xl font-black" style={{ color: 'var(--brand-violet)' }}>{Object.keys(extractedData.mapping).length}</p>
                <p className="text-xs mt-2 flex gap-1.5 items-center font-medium" style={{ color: 'var(--brand-violet)' }}>
                  <Sparkles size={12} className="animate-pulse" />
                  IA Activa ({extractedData._source})
                </p>
              </Card>
              
              <Card variant="glass" padding="normal" className="flex flex-col justify-center min-h-[140px] border-[rgba(16,183,125,0.3)]">
                {isSaving && importProgress.total > 0 ? (
                  <div className="w-full flex flex-col items-center gap-3 py-2">
                    <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--brand-success)' }}>
                      <Loader2 className="animate-spin" size={18} />
                      Importando {importProgress.current} / {importProgress.total}
                    </div>
                    <div className="w-full rounded-full h-2.5 overflow-hidden relative" style={{ background: 'var(--c-border)' }}>
                      <div className="h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`, background: 'var(--brand-success)' }} />
                    </div>
                    <div className="flex justify-between w-full text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                      <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                      <span>{importProgress.current} de {importProgress.total}</span>
                    </div>
                  </div>
                ) : (
                  <button onClick={handleSave} disabled={isSaving} className="btn btn-green w-full flex flex-col justify-center items-center gap-2 py-4 disabled:opacity-50 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-shadow">
                    <CheckCircle2 size={22} />
                    <span className="font-semibold">Confirmar e Importar</span>
                  </button>
                )}
              </Card>
            </div>

            {/* Preview table */}
            <Card variant="solid" padding="none" className="overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-surface-raised)' }}>
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Vista Previa de Extracción</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--brand-violet)' }}>
                    {filteredRows.length} filas
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar dentro del archivo..."
                    className="pl-9 pr-4 py-2 w-72 text-sm rounded-xl outline-none transition-all focus:ring-2 focus:ring-violet-500/30"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  />
                  <span className="absolute left-3 top-2.5 text-sm" style={{ color: 'var(--c-text-muted)' }}>🔍</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--c-surface-raised)', borderBottom: '1px solid var(--c-border)' }}>
                      {extractedData.headers.map((h, i) => (
                        <th key={i} className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--c-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                    {/* Mapping row */}
                    <tr style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0.03) 100%)', borderBottom: '2px solid rgba(124,58,237,0.25)' }}>
                      {extractedData.headers.map((_h, i) => {
                        const currentField = Object.entries(userMapping).find(([k]) => parseInt(k) === i)?.[1] ?? '';
                        return (
                          <th key={`m-${i}`} className="px-3 py-2.5 text-center">
                            <div className="relative">
                              <select
                                value={currentField}
                                onChange={e => {
                                  const next = { ...userMapping };
                                  Object.keys(next).forEach(k => { if (next[k] === e.target.value && e.target.value !== '') delete next[k]; });
                                  if (e.target.value === '') delete next[String(i)];
                                  else next[String(i)] = e.target.value;
                                  setUserMapping(next);
                                }}
                                className="rounded-lg text-[11px] px-3 py-1.5 outline-none w-full max-w-[140px] font-semibold cursor-pointer transition-all focus:ring-2 focus:ring-violet-500/30"
                                style={{ 
                                  background: currentField ? 'rgba(124,58,237,0.12)' : 'var(--c-surface)', 
                                  border: `1px solid ${currentField ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)'}`,
                                  color: currentField ? 'var(--brand-violet)' : 'var(--c-text-muted)' 
                                }}
                              >
                                <option value="">— ignorar —</option>
                                <option value="rfc">RFC</option>
                                <option value="nombre">Nombre</option>
                                <option value="telefono">Teléfono</option>
                                <option value="email">Email</option>
                                <option value="regimen">Régimen</option>
                                <option value="categoria">Categoría</option>
                                <option value="tipo">Tipo</option>
                                <option value="monto">Monto</option>
                                <option value="fechaVence">Fecha Vence</option>
                                <option value="descripcion">Descripción</option>
                                <option value="asesor">Asesor</option>
                              </select>
                              {currentField && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: 'var(--brand-success)' }} />
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i}
                        style={{ borderBottom: '1px solid var(--c-border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--c-surface-raised)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,79,232,0.04)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'var(--c-surface-raised)'; }}
                      >
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-4 py-3 text-sm min-w-[120px] max-w-[200px] truncate" style={{ color: 'var(--c-text-2)' }} title={cell}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr><td colSpan={extractedData.headers.length} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>No se encontraron resultados en la vista previa.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > previewLimit && (
                <div className="p-4 flex justify-center" style={{ borderTop: '1px solid var(--c-border)' }}>
                  <button onClick={() => setPreviewLimit(prev => prev + 100)} className="btn btn-ghost btn-sm" style={{ color: 'var(--brand-info)' }}>
                    Mostrando {previewLimit} de {filteredRows.length} filas — Cargar más
                  </button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </>
  );
}

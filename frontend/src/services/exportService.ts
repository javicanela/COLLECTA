import { api } from './api';
import * as xlsx from 'xlsx';

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const calcDias = (fechaVence: string) => Math.ceil((new Date(fechaVence).getTime() - Date.now()) / 86400000);

function mapOperaciones(ops: any[]) {
  return ops.map(op => ({
    'ASESOR': op.asesor || op.client?.asesor || '',
    'CLIENTE': op.client?.nombre || '',
    'RFC': op.client?.rfc || '',
    'CORREO': op.client?.email || '',
    'TELEFONO': op.client?.telefono || '',
    'FECHA VENCE': fmtDate(op.fechaVence),
    'TIPO': op.tipo || '',
    'DESCRIPCION': op.descripcion || '',
    'MONTO': op.monto || 0,
    'ESTATUS': op.calculatedStatus || op.estatus || '',
    'DIAS': op.diasRestantes ?? calcDias(op.fechaVence),
    'FECHA PAGO': fmtDate(op.fechaPago),
    'EXCLUIR': op.excluir ? 'SI' : 'NO',
    'ARCHIVADO': op.archived ? 'SI' : 'NO',
  }));
}

function mapDirectorio(clients: any[]) {
  return clients.map(c => ({
    'RFC': c.rfc || '',
    'NOMBRE': c.nombre || '',
    'CORREO': c.email || '',
    'TELEFONO': c.telefono || '',
    'REGIMEN': c.regimen || '',
    'CATEGORIA': c.categoria || '',
    'ASESOR': c.asesor || '',
    'ESTADO': c.estado || '',
    'NOTAS': c.notas || '',
    'FECHA ALTA': fmtDate(c.createdAt),
  }));
}

function mapPagos(ops: any[]) {
  const pagados = ops.filter(o => o.fechaPago || (o.calculatedStatus || o.estatus) === 'PAGADO');
  const rows = pagados.map(op => ({
    'ASESOR': op.asesor || op.client?.asesor || '',
    'CLIENTE': op.client?.nombre || '',
    'RFC': op.client?.rfc || '',
    'TIPO': op.tipo || '',
    'DESCRIPCION': op.descripcion || '',
    'MONTO': op.monto || 0,
    'FECHA VENCE': fmtDate(op.fechaVence),
    'FECHA PAGO': fmtDate(op.fechaPago),
  }));
  const total = pagados.reduce((sum, op) => sum + (op.monto || 0), 0);
  rows.push({
    'ASESOR': '',
    'CLIENTE': '',
    'RFC': '',
    'TIPO': '',
    'DESCRIPCION': '',
    'MONTO': total,
    'FECHA VENCE': '',
    'FECHA PAGO': 'TOTAL COBRADO',
  });
  return rows;
}

function mapLog(logs: any[]) {
  return logs.map(l => ({
    'FECHA/HORA': fmtDateTime(l.createdAt),
    'CLIENTE': l.client?.nombre || '',
    'RFC': l.client?.rfc || '',
    'TELEFONO': l.telefono || '',
    'TIPO': l.tipo || '',
    'VARIANTE': l.variante || '',
    'MODO': l.modo || '',
    'RESULTADO': l.resultado || '',
    'MENSAJE': l.mensaje || '',
  }));
}

function applyWorksheetFormat(worksheet: xlsx.WorkSheet, mapped: Record<string, any>[]) {
  if (mapped.length === 0) return;

  const cols = Object.keys(mapped[0]);

  const WIDE: Record<string, number> = {
    'CLIENTE': 32, 'NOMBRE': 32, 'DESCRIPCION': 36, 'NOTAS': 40,
    'MENSAJE': 50, 'RFC': 18, 'CLABE': 22, 'CORREO': 28,
    'TELEFONO': 16, 'FECHA VENCE': 16, 'FECHA PAGO': 16,
    'FECHA/HORA': 20, 'FECHA ALTA': 16,
    'MONTO': 16, 'DIAS': 8, 'ESTATUS': 16, 'RESULTADO': 14,
    'TIPO': 14, 'VARIANTE': 14, 'MODO': 12, 'ASESOR': 18,
    'EXCLUIR': 10, 'ARCHIVADO': 12, 'ESTADO': 12, 'REGIMEN': 22,
    'CATEGORIA': 18,
  };
  worksheet['!cols'] = cols.map(col => ({
    wch: WIDE[col] ?? Math.max(col.length + 4, 14)
  }));

  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, activeCell: 'A2', sqref: 'A2' };

  const ref = worksheet['!ref'];
  if (ref) {
    worksheet['!autofilter'] = { ref };
  }
}

export const ExportService = {
  async downloadExcel(type: 'operaciones' | 'directorio' | 'pagos' | 'log') {
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `collecta_${type}_${fecha}.xlsx`;

    try {
      let mapped: Record<string, any>[] = [];

      if (type === 'operaciones') {
        const ops = await api.get<any[]>('/operations');
        mapped = mapOperaciones(ops);
      } else if (type === 'directorio') {
        const cls = await api.get<any[]>('/clients');
        mapped = mapDirectorio(cls);
      } else if (type === 'pagos') {
        const ops = await api.get<any[]>('/operations');
        mapped = mapPagos(ops);
      } else if (type === 'log') {
        const logs = await api.get<any[]>('/logs');
        mapped = mapLog(logs);
      }

      if (mapped.length === 0) {
        throw new Error('No hay datos para exportar');
      }

      const worksheet = xlsx.utils.json_to_sheet(mapped);
      applyWorksheetFormat(worksheet, mapped);
      const workbook = xlsx.utils.book_new();
      const sheetName = { operaciones: 'Operaciones', directorio: 'Directorio', pagos: 'Pagos', log: 'Log WA' }[type] || type;
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
      xlsx.writeFile(workbook, filename);
    } catch (error) {
      console.error(`Error downloading ${type}:`, error);
      throw error;
    }
  },

  async downloadBackup() {
    try {
      const backupData = await api.get<any>('/config/backup');
      const blob = new Blob([JSON.stringify(backupData.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_collecta_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw error;
    }
  },

  async restoreBackup(backupFile: File) {
    try {
      const text = await backupFile.text();
      const parsed = JSON.parse(text);
      if (!parsed.data) throw new Error('Formato de backup invalido');
      await api.post('/config/restore', { data: parsed.data });
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  },

  async purgeData(type: 'all' | 'logs' | 'staging') {
    try {
      await api.post('/config/purge', { type });
    } catch (error) {
      console.error('Error purging data:', error);
      throw error;
    }
  }
};

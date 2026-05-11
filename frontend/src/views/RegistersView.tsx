import { useState, useCallback } from 'react';
import { ImportWizard } from '../features/smart-import/components/ImportWizard';
import { OperationService } from '../services/operationService';
import { ClientService } from '../services/clientService';
import { useOperationStore } from '../stores/useOperationStore';
import { useClientStore } from '../stores/useClientStore';
import type { CanonicalImportRow } from '../features/smart-import/domain/types';
import type { Client, Operation } from '../types';
import { useToast } from '../hooks/useToast';

type ClientImportPayload = Pick<Client, 'rfc' | 'nombre'> & Partial<Pick<Client, 'telefono' | 'email' | 'regimen' | 'categoria' | 'asesor'>>;
type OperationImportPayload = Pick<Operation, 'clientId' | 'tipo' | 'monto' | 'fechaVence'> & Partial<Pick<Operation, 'descripcion' | 'asesor'>>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createTemporaryRfc(sourceRowIndex: number) {
  return `TEMP${String(sourceRowIndex).padStart(6, '0')}XXX`;
}

function findClient(
  clients: Pick<Client, 'id' | 'rfc' | 'nombre' | 'telefono' | 'email'>[],
  rfc?: string,
  nombre?: string,
) {
  return clients.find(existing =>
    (rfc && existing.rfc === rfc) ||
    (nombre && existing.nombre.toLowerCase() === nombre.toLowerCase())
  );
}

function toIsoDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function RegistersView() {
  const [isCommitting, setIsCommitting] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const { fetchClients } = useClientStore();
  const { fetchOperations, fetchArchivedOperations } = useOperationStore();
  const { toast } = useToast();

  const handleCommit = useCallback(async (rows: CanonicalImportRow[]) => {
    setIsCommitting(true);
    const clientErrors: string[] = [];
    let skippedDuplicate = 0;
    let skippedInvalid = 0;

    try {
      const [freshClients, freshOperations, freshArchivedOperations] = await Promise.all([
        ClientService.getAll(),
        OperationService.getAll(),
        OperationService.getAll({ archived: 'true' }),
      ]);

      const clientsToCreate = new Map<string, ClientImportPayload>();
      const clientsToUpdate = new Map<string, { id: string; telefono?: string; email?: string }>();

      rows.forEach(row => {
        const c = row.client;
        if (!c.rfc && !c.nombre) return;

        const rfc = c.rfc?.trim().toUpperCase();
        const nombre = c.nombre?.trim();

        const existingClient = findClient(freshClients, rfc, nombre);

        if (!existingClient) {
          const key = rfc || nombre || `TEMP_${row.sourceRowIndex}`;
          if (!clientsToCreate.has(key)) {
            clientsToCreate.set(key, {
              rfc: rfc || createTemporaryRfc(row.sourceRowIndex),
              nombre: nombre || 'Cliente importado',
              telefono: c.telefono,
              email: c.email,
              regimen: c.regimen,
              categoria: c.categoria,
              asesor: c.asesor
            });
          }
        } else {
          const hasNewPhone = c.telefono && c.telefono !== existingClient.telefono;
          const hasNewEmail = c.email && c.email !== existingClient.email;

          if (hasNewPhone || hasNewEmail) {
            clientsToUpdate.set(existingClient.id, {
              id: existingClient.id,
              ...(hasNewPhone ? { telefono: c.telefono } : {}),
              ...(hasNewEmail ? { email: c.email } : {}),
            });
          }
        }
      });

      for (const clientData of clientsToCreate.values()) {
        try {
          await ClientService.create({
            ...clientData,
            estado: 'ACTIVO'
          });
        } catch (error: unknown) {
          clientErrors.push(`${clientData.nombre}: ${getErrorMessage(error, 'Error desconocido')}`);
        }
      }

      for (const update of clientsToUpdate.values()) {
        try {
          await ClientService.update(update.id, { telefono: update.telefono, email: update.email });
        } catch {
          // Non-critical
        }
      }

      const allClients = clientsToCreate.size > 0 || clientsToUpdate.size > 0
        ? await ClientService.getAll()
        : freshClients;

      const mappedOperations: Array<OperationImportPayload | null> = rows.map(row => {
        const c = row.client;
        const o = row.operation;

        const rfc = c.rfc?.trim().toUpperCase();
        const nombre = c.nombre?.trim();

        const client = findClient(allClients, rfc, nombre);
        const fechaVence = toIsoDate(o.fechaVence);

        if (!client || !fechaVence) {
          skippedInvalid++;
          return null;
        }

        return {
          clientId: client.id,
          tipo: o.tipo || 'FISCAL',
          descripcion: o.descripcion || o.tipo || 'FISCAL',
          monto: o.monto || 0,
          fechaVence,
          asesor: o.asesor,
        };
      });

      const operationsToCreate = mappedOperations.filter((op): op is OperationImportPayload => op !== null);

      const existingOperations = [...freshOperations, ...freshArchivedOperations];
      const dedupedOps = operationsToCreate.filter(op => {
        const isDup = existingOperations.some(existing =>
          existing.clientId === op.clientId &&
          existing.tipo === op.tipo &&
          Math.abs((existing.monto || 0) - (op.monto || 0)) < 0.01 &&
          new Date(existing.fechaVence).getTime() === new Date(op.fechaVence).getTime()
        );
        if (isDup) skippedDuplicate++;
        return !isDup;
      });

      if (dedupedOps.length === 0) {
        if (skippedDuplicate > 0) {
          toast('warn', `Todos los registros ya existen (${skippedDuplicate} omitidos).`);
        } else {
          toast('warn', 'No hay operaciones validas para importar.');
        }
        return;
      }

      const BATCH_SIZE = 5;
      let createdCount = 0;

      for (let i = 0; i < dedupedOps.length; i += BATCH_SIZE) {
        const batch = dedupedOps.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(op => OperationService.create(op)));
        createdCount += batch.length;
      }

      await Promise.all([fetchClients(), fetchOperations(), fetchArchivedOperations()]);

      let successMsg = `Se importaron ${createdCount} operaciones correctamente.`;
      if (skippedDuplicate > 0) successMsg += ` (${skippedDuplicate} omitidas por duplicadas).`;
      if (skippedInvalid > 0) successMsg += ` (${skippedInvalid} omitidas por datos incompletos).`;

      if (clientErrors.length > 0) {
        toast('warn', `Se importaron operaciones pero hubo errores con clientes: ${clientErrors[0]}`);
      } else {
        toast('ok', successMsg);
      }

      setWizardKey(current => current + 1);

    } catch (error: unknown) {
      toast('err', `Error al importar: ${getErrorMessage(error, 'Error desconocido')}`);
    } finally {
      setIsCommitting(false);
    }
  }, [fetchArchivedOperations, fetchClients, fetchOperations, toast]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-20">
      <ImportWizard key={wizardKey} onCommit={handleCommit} isCommitting={isCommitting} />
    </div>
  );
}

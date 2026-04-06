import { create } from 'zustand';
import type { Operation, OperationEstatus } from '../types';
import { OperationService } from '../services/operationService';

interface OperationStore {
  operations: Operation[];
  archivedOperations: Operation[];
  filterStatus: OperationEstatus | 'TODOS';
  isLoading: boolean;
  isLoadingArchived: boolean;
  error: string | null;
  vencidasCount: number;
  fetchOperations: (filters?: any) => Promise<void>;
  fetchArchivedOperations: () => Promise<void>;
  setFilterStatus: (status: OperationEstatus | 'TODOS') => void;
  markAsPaid: (id: string) => Promise<void>;
  unmarkAsPaid: (id: string) => Promise<void>;
  createOperation: (data: Partial<Operation>) => Promise<void>;
  deleteOperation: (id: string) => Promise<void>;
  archiveOperation: (id: string) => Promise<void>;
  unarchiveOperation: (id: string) => Promise<void>;
  toggleExclude: (id: string) => Promise<void>;
}

export const useOperationStore = create<OperationStore>((set, get) => ({
  operations: [],
  archivedOperations: [],
  filterStatus: 'TODOS',
  isLoading: false,
  isLoadingArchived: false,
  error: null,
  vencidasCount: 0,

  fetchOperations: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const operations = await OperationService.getAll(filters);
      const vencidas = operations.filter(op => (op.calculatedStatus || op.estatus) === 'VENCIDO').length;
      set({ operations, vencidasCount: vencidas, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchArchivedOperations: async () => {
    set({ isLoadingArchived: true, error: null });
    try {
      const archivedOperations = await OperationService.getAll({ archived: 'true' });
      set({ archivedOperations, isLoadingArchived: false });
    } catch (err: any) {
      set({ error: err.message, isLoadingArchived: false });
    }
  },

  setFilterStatus: (status) => set({ filterStatus: status }),

  markAsPaid: async (id) => {
    try {
      const updatedOp = await OperationService.registrarPago(id);
      set((state) => ({
        operations: state.operations.map((op) =>
          op.id === id ? updatedOp : op
        ),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  unmarkAsPaid: async (id) => {
    await OperationService.unpay(id);
    await get().fetchOperations();
  },

  createOperation: async (data) => {
    try {
      await OperationService.create(data);
      await get().fetchOperations();
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  deleteOperation: async (id) => {
    try {
      await OperationService.delete(id);
      set((state) => ({
        operations: state.operations.filter((op) => op.id !== id),
        archivedOperations: state.archivedOperations.filter((op) => op.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  archiveOperation: async (id) => {
    try {
      const updatedOp = await OperationService.archive(id);
      set((state) => ({
        operations: state.operations.filter((op) => op.id !== id),
        archivedOperations: [...state.archivedOperations, updatedOp],
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  unarchiveOperation: async (id) => {
    try {
      const updatedOp = await OperationService.unarchive(id);
      set((state) => ({
        archivedOperations: state.archivedOperations.filter((op) => op.id !== id),
        operations: [...state.operations, updatedOp],
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleExclude: async (id) => {
    try {
      const updatedOp = await OperationService.toggleExclude(id);
      set((state) => ({
        operations: state.operations.map((op) =>
          op.id === id ? updatedOp : op
        ),
      }));
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));

import { create } from 'zustand';
import type { Client } from '../types';
import { ClientService } from '../services/clientService';

interface ClientStore {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  createClient: (client: Partial<Client>) => Promise<void>;
  updateClient: (id: string, client: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}

export const useClientStore = create<ClientStore>((set) => ({
  clients: [],
  isLoading: false,
  error: null,

  fetchClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const clients = await ClientService.getAll();
      set({ clients, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createClient: async (clientData) => {
    set({ isLoading: true, error: null });
    try {
      const newClient = await ClientService.create(clientData);
      set((state) => ({ 
        clients: [newClient, ...state.clients],
        isLoading: false 
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  updateClient: async (id, updatedClient) => {
    try {
      const result = await ClientService.update(id, updatedClient);
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? { ...c, ...result } : c
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteClient: async (id) => {
    try {
      console.log(`[useClientStore] Deleting client: ${id}`);
      await ClientService.delete(id);
      console.log(`[useClientStore] Client deleted successfully, updating state`);
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
      }));
      console.log(`[useClientStore] State updated`);
    } catch (err) {
      console.error('[useClientStore] Error deleting client:', err);
      set({ error: (err as Error).message });
      throw err;
    }
  },

  toggleStatus: async (id) => {
    try {
      const updated = await ClientService.toggleStatus(id);
      set((state) => ({
        clients: state.clients.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));

import { create } from 'zustand';
import type { User, ApprovalRequest, AuditStats } from '../types';

interface AppState {
  user: User | null;
  myRequests: ApprovalRequest[];
  pendingRequests: ApprovalRequest[];
  allRequests: ApprovalRequest[];
  auditStats: AuditStats | null;
  loading: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setMyRequests: (requests: ApprovalRequest[]) => void;
  setPendingRequests: (requests: ApprovalRequest[]) => void;
  setAllRequests: (requests: ApprovalRequest[]) => void;
  setAuditStats: (stats: AuditStats | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchUser: () => Promise<void>;
  fetchMyRequests: () => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  fetchAllRequests: () => Promise<void>;
  fetchAuditStats: () => Promise<void>;
  submitRequest: (notebook: File, justification: string) => Promise<ApprovalRequest>;
  processRequest: (requestId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  myRequests: [],
  pendingRequests: [],
  allRequests: [],
  auditStats: null,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),
  setMyRequests: (myRequests) => set({ myRequests }),
  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  setAllRequests: (allRequests) => set({ allRequests }),
  setAuditStats: (auditStats) => set({ auditStats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchUser: async () => {
    try {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Failed to fetch user');
      const user = await response.json();
      set({ user });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchMyRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/requests/my-requests');
      if (!response.ok) throw new Error('Failed to fetch requests');
      const myRequests = await response.json();
      set({ myRequests, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchPendingRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/requests/pending');
      if (!response.ok) throw new Error('Failed to fetch pending requests');
      const pendingRequests = await response.json();
      set({ pendingRequests, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllRequests: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/audit/all-requests');
      if (!response.ok) throw new Error('Failed to fetch all requests');
      const allRequests = await response.json();
      set({ allRequests, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAuditStats: async () => {
    try {
      const response = await fetch('/api/audit/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const auditStats = await response.json();
      set({ auditStats });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  submitRequest: async (notebook: File, justification: string) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('notebook', notebook);
      formData.append('justification', justification);

      const response = await fetch('/api/requests/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit request');
      }

      const request = await response.json();
      set({ loading: false });

      // Refresh my requests
      get().fetchMyRequests();

      return request;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  processRequest: async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/requests/${requestId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to process request');
      }

      set({ loading: false });

      // Refresh pending requests
      get().fetchPendingRequests();
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));

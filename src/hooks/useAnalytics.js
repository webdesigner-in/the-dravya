import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

export function useAnalytics(month = 'all') {
  return useQuery({
    queryKey: ['analytics', month],
    queryFn: () => api.get('/api/analytics', { params: { month } }),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard'),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useCustomerLedger(filters = {}) {
  const { month } = filters;
  return useQuery({
    queryKey: ['customer-ledger', filters],
    queryFn: () =>
      api.get('/api/reports/customer-ledger', { params: { limit: 500, ...(month && { month }) } }),
    staleTime: 5 * 60 * 1000,
  });
}

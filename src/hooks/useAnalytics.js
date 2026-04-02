import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
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
  return useInfiniteQuery({
    queryKey: ['customer-ledger', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/reports/customer-ledger', { params: { page: pageParam, limit: 20, ...(month && { month }) } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.pagination?.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

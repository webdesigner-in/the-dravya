import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

// Fetch analytics data
export function useAnalytics(timeRange = '7d') {
  return useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (analytics change frequently)
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  });
}

// Fetch dashboard data
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      return response.json();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refetch every 10 minutes
  });
}

// Fetch customer ledger with infinite scroll
export function useCustomerLedger(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['customer-ledger', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
      });
      
      const response = await fetch(`/api/reports/customer-ledger?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer ledger');
      }
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.pagination && lastPage.pagination.hasMore) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
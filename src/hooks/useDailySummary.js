import { useQuery } from '@tanstack/react-query';
import api from '@/lib/apiClient';

export function useDailySummary(date) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: () => api.get('/api/daily-summary', { params: { date } }),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from '@tanstack/react-query';

export function useDailySummary(date) {
  return useQuery({
    queryKey: ['daily-summary', date],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        date: date || new Date().toISOString().split("T")[0],
      });
      
      const response = await fetch(`/api/daily-summary?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily summary');
      }
      return response.json();
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

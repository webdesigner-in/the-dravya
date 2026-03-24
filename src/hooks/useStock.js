import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Fetch stock movements with infinite scroll
export function useStockMovements(filters = {}) {
  const { type, product } = filters;
  
  return useInfiniteQuery({
    queryKey: ['stock-movements', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(type && { type }),
        ...(product && { product }),
      });
      
      const response = await fetch(`/api/stock/movements?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock movements');
      }
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.movements && lastPage.movements.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Create stock movement mutation
export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movementData) => {
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create stock movement');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock movement recorded successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

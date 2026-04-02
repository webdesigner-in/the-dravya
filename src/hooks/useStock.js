import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useStockMovements(filters = {}) {
  const { type, product } = filters;
  return useInfiniteQuery({
    queryKey: ['stock-movements', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/stock/movements', { params: { page: pageParam, limit: 20, ...(type && { type }), ...(product && { product }) } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.movements?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movementData) => api.post('/api/stock/movements', movementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-forecast'] });
      toast.success('Stock movement recorded successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useStockForecast() {
  return useQuery({
    queryKey: ['stock-forecast'],
    queryFn: () => api.get('/api/stock/forecast'),
    staleTime: 10 * 60 * 1000,
  });
}

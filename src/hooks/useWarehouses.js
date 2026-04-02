import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useWarehouses(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['warehouses', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/warehouses', { params: { page: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.warehouses?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000,
  });
}

export function useWarehouse(warehouseId) {
  return useQuery({
    queryKey: ['warehouses', warehouseId],
    queryFn: () => api.get(`/api/warehouses/${warehouseId}`),
    enabled: !!warehouseId,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouseData) => api.post('/api/warehouses', warehouseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseId, updates }) => api.put(`/api/warehouses/${warehouseId}`, updates),
    onSuccess: (data, { warehouseId }) => {
      queryClient.setQueryData(['warehouses', warehouseId], data);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (warehouseId) => api.delete(`/api/warehouses/${warehouseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

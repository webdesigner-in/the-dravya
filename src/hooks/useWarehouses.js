import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Fetch warehouses with infinite scroll
export function useWarehouses(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['warehouses', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const queryParams = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
      });
      
      const response = await fetch(`/api/warehouses?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch warehouses');
      }
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.warehouses && lastPage.warehouses.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Fetch single warehouse
export function useWarehouse(warehouseId) {
  return useQuery({
    queryKey: ['warehouses', warehouseId],
    queryFn: async () => {
      const response = await fetch(`/api/warehouses/${warehouseId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch warehouse');
      }
      return response.json();
    },
    enabled: !!warehouseId,
  });
}

// Create warehouse mutation
export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouseData) => {
      const response = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warehouseData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create warehouse');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Update warehouse mutation
export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ warehouseId, updates }) => {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update warehouse');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['warehouses', variables.warehouseId], data);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Delete warehouse mutation
export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouseId) => {
      const response = await fetch(`/api/warehouses/${warehouseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete warehouse');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

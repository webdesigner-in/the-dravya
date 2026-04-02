import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useVehicles(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['vehicles', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/vehicles', { params: { page: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.vehicles?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000,
  });
}

export function useVehicle(vehicleId) {
  return useQuery({
    queryKey: ['vehicles', vehicleId],
    queryFn: () => api.get(`/api/vehicles/${vehicleId}`),
    enabled: !!vehicleId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleData) => api.post('/api/vehicles', vehicleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, updates }) => api.put(`/api/vehicles/${vehicleId}`, updates),
    onSuccess: (data, { vehicleId }) => {
      queryClient.setQueryData(['vehicles', vehicleId], data);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId) => api.delete(`/api/vehicles/${vehicleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useOrders(filters = {}) {
  const { search, status, paymentStatus, customer, date, sortBy } = filters;
  return useInfiniteQuery({
    queryKey: ['orders', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/orders', {
        params: { page: pageParam, limit: 20, search, status, paymentStatus, customer, date, sortBy },
      }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.pagination?.hasMore ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => api.get(`/api/orders/${orderId}`),
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderData) => api.post('/api/orders', orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, updates }) => api.put(`/api/orders/${orderId}`, updates),
    onSuccess: (data, { orderId }) => {
      queryClient.setQueryData(['orders', orderId], data);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId) => api.delete(`/api/orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

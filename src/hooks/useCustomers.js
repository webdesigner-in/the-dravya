import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useCustomers(filters = {}) {
  const { search } = filters;
  return useInfiniteQuery({
    queryKey: ['customers', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/customers', { params: { page: pageParam, limit: 20, ...(search && { search }) } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.customers?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllCustomers() {
  return useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => api.get('/api/customers'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCustomer(customerId) {
  return useQuery({
    queryKey: ['customers', customerId],
    queryFn: () => api.get(`/api/customers/${customerId}`),
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerData) => api.post('/api/customers', customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, updates }) => api.put(`/api/customers/${customerId}`, updates),
    onSuccess: (data, { customerId }) => {
      queryClient.setQueryData(['customers', customerId], data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId) => api.delete(`/api/customers/${customerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

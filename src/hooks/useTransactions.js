import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useTransactions(filters = {}) {
  const { search, type, customer, month } = filters;
  return useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/transactions', { params: { page: pageParam, limit: 20, search, type, customer, month } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.transactions?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
  });
}

export function useTransaction(transactionId) {
  return useQuery({
    queryKey: ['transactions', transactionId],
    queryFn: () => api.get(`/api/transactions/${transactionId}`),
    enabled: !!transactionId,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionData) => api.post('/api/transactions', transactionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, updates }) => api.put(`/api/transactions/${transactionId}`, updates),
    onSuccess: (data, { transactionId }) => {
      queryClient.setQueryData(['transactions', transactionId], data);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId) => api.delete(`/api/transactions/${transactionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

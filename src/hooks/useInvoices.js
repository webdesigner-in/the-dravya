import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useInvoices(filters = {}) {
  const { search, status } = filters;
  return useInfiniteQuery({
    queryKey: ['invoices', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/invoices', { params: { page: pageParam, limit: 20, ...(search && { search }), ...(status && { status }) } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.invoices?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 3 * 60 * 1000,
  });
}

export function useInvoice(invoiceId) {
  return useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () => api.get(`/api/invoices/${invoiceId}`),
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, invoiceData }) => api.post(`/api/orders/${orderId}/invoice`, invoiceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, updates }) => api.put(`/api/invoices/${invoiceId}`, updates),
    onSuccess: (data, { invoiceId }) => {
      queryClient.setQueryData(['invoices', invoiceId], data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId) => api.delete(`/api/invoices/${invoiceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, paymentData }) => api.post(`/api/invoices/${invoiceId}/payment`, paymentData),
    onSuccess: (data, { invoiceId }) => {
      queryClient.setQueryData(['invoices', invoiceId], data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

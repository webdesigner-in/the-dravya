import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useProducts(filters = {}) {
  const { active } = filters;
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/products', { params: { page: pageParam, limit: 20, ...(active !== undefined && { active }) } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.products?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000,
  });
}

export function useProduct(productId) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: () => api.get(`/api/products/${productId}`),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productData) => api.post('/api/products', productData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, updates }) => api.put(`/api/products/${productId}`, updates),
    onSuccess: (data, { productId }) => {
      queryClient.setQueryData(['products', productId], data);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId) => api.delete(`/api/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

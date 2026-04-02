import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/apiClient';

export function useUsers(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['users', filters],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/api/users', { params: { page: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.users?.length === 20 ? pages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUser(userId) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => api.get(`/api/users/${userId}`),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData) => api.post('/api/users/create', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, updates }) => api.put(`/api/users/${userId}`, updates),
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(['users', userId], data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.delete(`/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error) => toast.error(error.message),
  });
}

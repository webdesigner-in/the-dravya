import { useState, useEffect, useCallback } from 'react';
import { apiGet, ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';

/**
 * Custom hook for API calls with loading, error handling, and retry
 */
export function useApi(url, options = {}) {
  const {
    enabled = true,
    onSuccess,
    onError,
    showErrorToast = true,
    dependencies = [],
  } = options;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await apiGet(url);
      setData(result);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err);
      
      if (showErrorToast) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error('Failed to fetch data');
        }
      }
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled, onSuccess, onError, showErrorToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi(url, options = {}) {
  const {
    page = 1,
    limit = 20,
    enabled = true,
    onSuccess,
    onError,
    showErrorToast = true,
    dependencies = [],
  } = options;

  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: limit,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const urlWithParams = `${url}${url.includes('?') ? '&' : '?'}page=${page}&limit=${limit}`;
      const result = await apiGet(urlWithParams);
      
      // Handle different response formats
      const items = result.orders || result.customers || result.products || 
                    result.invoices || result.transactions || result.items || [];
      
      setData(items);
      
      if (result.pagination) {
        setPagination(result.pagination);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err);
      
      if (showErrorToast) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error('Failed to fetch data');
        }
      }
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, page, limit, enabled, onSuccess, onError, showErrorToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    data,
    pagination,
    isLoading,
    error,
    refetch,
  };
}

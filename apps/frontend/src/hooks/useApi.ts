'use client'

import {
  useQuery,
  useMutation,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

// ─── Generic API query hook ────────────────────────────────────
export function useApiQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<{ data: TData }>,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, AxiosError>({
    queryKey,
    queryFn: async () => {
      const response = await queryFn()
      return response.data
    },
    ...options,
  })
}

// ─── Generic API mutation hook ─────────────────────────────────
interface UseMutationExtras<TData, TVariables> {
  successMessage?: string | ((data: TData) => string)
  errorMessage?:   string | ((error: AxiosError) => string)
  onSuccess?:      (data: TData, variables: TVariables) => void | Promise<void>
  onError?:        (error: AxiosError, variables: TVariables) => void
  options?:        Omit<UseMutationOptions<TData, AxiosError, TVariables>, 'mutationFn'>
}

export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData }>,
  extras?: UseMutationExtras<TData, TVariables>
) {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables) => {
      const response = await mutationFn(variables)
      return response.data
    },
    onSuccess: (data, variables) => {
      if (extras?.successMessage) {
        const msg =
          typeof extras.successMessage === 'function'
            ? extras.successMessage(data)
            : extras.successMessage
        toast.success(msg)
      }
      extras?.onSuccess?.(data, variables)
    },
    onError: (error, variables) => {
      const axiosErr = error as AxiosError<{ error?: string; message?: string }>
      if (extras?.errorMessage) {
        const msg =
          typeof extras.errorMessage === 'function'
            ? extras.errorMessage(axiosErr)
            : extras.errorMessage
        toast.error(msg)
      } else {
        const serverMsg =
          axiosErr.response?.data?.error ??
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          'Something went wrong'
        toast.error(serverMsg)
      }
      extras?.onError?.(axiosErr, variables)
    },
    ...extras?.options,
  })
}

// ─── Paginated query helper ────────────────────────────────────
export function usePaginatedQuery<TData>(
  queryKey: QueryKey,
  queryFn: (page: number) => Promise<{ data: TData }>,
  page: number,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useApiQuery<TData>(
    [...(Array.isArray(queryKey) ? queryKey : [queryKey]), page],
    () => queryFn(page),
    {
      placeholderData: (prev) => prev,
      ...options,
    }
  )
}

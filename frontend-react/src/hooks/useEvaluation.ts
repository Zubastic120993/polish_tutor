import { useMutation } from '@tanstack/react-query'
import type { EvaluateRequestPayload, EvaluateResponsePayload } from '../types/api'
import { apiFetch } from '../lib/apiClient'

const BASE = import.meta.env.VITE_API_BASE ?? ''

async function sendEvaluation(payload: EvaluateRequestPayload): Promise<EvaluateResponsePayload> {
  return apiFetch<EvaluateResponsePayload>(`${BASE}/api/v2/evaluate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function useEvaluation() {
  const mutation = useMutation({
    mutationFn: (payload: EvaluateRequestPayload) => sendEvaluation(payload),
  })

  return {
    evaluate: mutation.mutateAsync,
    isEvaluating: mutation.isPending,
    error: mutation.error as Error | null,
  }
}

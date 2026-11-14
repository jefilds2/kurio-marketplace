import { createContext, useContext } from 'react'
import type { Sessao } from '../contratos/mercado'

export const SessaoContexto = createContext<{ sessao: Sessao | null; avisar: (mensagem: string) => void }>({
  sessao: null, avisar: () => undefined,
})
export function useSessao() { return useContext(SessaoContexto) }

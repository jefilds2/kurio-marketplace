import type { PedidoInput } from '../../contratos/mercado'

export type Tentativa = { chave: string; proposta: PedidoInput; pedidoId?: string }
const chaveLocal = (id: string) => `kurio-tentativa:${id}`
export const lerTentativa = (id: string): Tentativa | null => JSON.parse(sessionStorage.getItem(chaveLocal(id)) ?? 'null') as Tentativa | null
export function guardarTentativa(id: string, tentativa: Tentativa | null) {
  if (tentativa) sessionStorage.setItem(chaveLocal(id), JSON.stringify(tentativa))
  else sessionStorage.removeItem(chaveLocal(id))
}

import { useMutation } from '@tanstack/react-query'
import { cache, carrinhoConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import type { Item } from '../../contratos/mercado'
import { mercadoApi, tokenAtual } from '../../integracoes/api'

type Alteracao = { acao: 'adicionar' | 'alterar' | 'remover'; item: Item } | { acao: 'cupom'; codigo: string }
export function useCarrinhoMutation() {
  const { sessao } = useSessao()
  const dono = sessao?.perfil.id ?? 'visitante'
  const token = sessao?.token ?? ''
  return useMutation({
    scope: { id: 'carrinho-' + dono },
    mutationFn: (dados: Alteracao) => {
      if (token !== tokenAtual()) throw new Error('A sessão mudou.')
      return dados.acao === 'cupom' ? mercadoApi.cupom(dados.codigo) : mercadoApi[dados.acao](dados.item)
    },
    onSuccess: cotacao => {
      if (token !== tokenAtual()) return
      cache.setQueryData(carrinhoConsulta(dono).queryKey, cotacao)
      void cache.invalidateQueries({ queryKey: ['privado', dono, 'cotacao'] })
    },
  })
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { cache, favoritosConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { erroDaApi, mercadoApi, tokenAtual } from '../../integracoes/api'

export function useFavorito(nftId: string) {
  const { sessao, avisar } = useSessao()
  const navigate = useNavigate()
  const href = useRouterState({ select: s => s.location.href })
  const opcoes = favoritosConsulta(sessao?.perfil.id ?? 'visitante')
  const consulta = useQuery(opcoes)
  const ativo = consulta.data?.includes(nftId) ?? false
  const mutation = useMutation({
    mutationKey: ['favorito', sessao?.perfil.id], scope: { id: 'favoritos' },
    mutationFn: (novo: boolean) => {
      if (!sessao || sessao.token !== tokenAtual()) throw new Error('A sessão mudou.')
      return mercadoApi.favorito(nftId, novo)
    },
    onMutate: async novo => {
      await cache.cancelQueries(opcoes)
      cache.setQueryData<string[]>(opcoes.queryKey, anterior => novo ? [...(anterior ?? []), nftId] : anterior?.filter(id => id !== nftId))
      return sessao?.token
    },
    onError: (erro, novo, token) => {
      if (!token || token !== tokenAtual()) return
      cache.setQueryData<string[]>(opcoes.queryKey, anterior => novo
        ? anterior?.filter(id => id !== nftId) : [...new Set([...(anterior ?? []), nftId])])
      avisar(erroDaApi(erro).mensagem)
    },
    onSettled: () => { if (sessao?.token === tokenAtual()) void cache.invalidateQueries(opcoes) },
  })
  return {
    ativo, desabilitado: !!sessao && (mutation.isPending || consulta.isPending),
    alternar: () => sessao ? mutation.mutate(!ativo) : void navigate({ to: '/login', search: { retorno: href } }),
  }
}

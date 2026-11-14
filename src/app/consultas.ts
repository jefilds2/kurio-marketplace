import { QueryClient, queryOptions } from '@tanstack/react-query'
import { mercadoApi, statusDaApi } from '../integracoes/api'

export const cache = new QueryClient({
  defaultOptions: { queries: {
    staleTime: 15_000,
    retry: (falhas, erro) => {
      const status = statusDaApi(erro)
      return falhas < 1 && (status === undefined || status >= 500)
    },
    retryDelay: 250,
  } },
})
export const sessaoConsulta = queryOptions({
  queryKey: ['sessao'], queryFn: ({ signal }) => mercadoApi.sessao(signal), retry: false,
})
export const carrinhoConsulta = (dono: string) => queryOptions({
  queryKey: ['carrinho', dono], queryFn: ({ signal }) => mercadoApi.carrinho(signal),
})
export const favoritosConsulta = (dono: string) => queryOptions({
  queryKey: ['privado', dono, 'favoritos'], queryFn: ({ signal }) => mercadoApi.favoritos(signal), enabled: dono !== 'visitante',
})
export const perfilConsulta = (dono: string) => queryOptions({
  queryKey: ['privado', dono, 'perfil'], queryFn: ({ signal }) => mercadoApi.perfil(signal),
})
export const carteirasConsulta = (dono: string) => queryOptions({
  queryKey: ['privado', dono, 'carteiras'], queryFn: ({ signal }) => mercadoApi.carteiras(signal),
})
export async function trocarSessao() {
  const privado = { predicate: (query: { queryKey: readonly unknown[] }) => ['privado', 'carrinho'].includes(String(query.queryKey[0])) }
  await cache.cancelQueries(privado)
  cache.removeQueries(privado)
  cache.getMutationCache().clear()
}

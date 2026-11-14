import { queryOptions } from '@tanstack/react-query'
import { mercadoApi } from '../../integracoes/api'

export const nftConsulta = (id: string) => queryOptions({
  queryKey: ['nft', id],
  queryFn: ({ signal }) => mercadoApi.nft(id, signal),
})

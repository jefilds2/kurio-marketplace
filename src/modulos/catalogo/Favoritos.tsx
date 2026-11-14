import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { favoritosConsulta } from '../../app/consultas'
import { useSessao } from '../../app/contexto'
import { Button, Erro, Skeleton } from '../../componentes/ui'
import { nftConsulta } from '../nft/Detalhe'
import { CartaoVisual } from './CatalogoVisual'

export function Favoritos() {
  const { sessao } = useSessao()
  const favoritos = useQuery(favoritosConsulta(sessao?.perfil.id ?? 'visitante'))
  return <section className="design-kurio mx-auto max-w-[1200px] px-8 py-8 font-kurio">
    <h1 className="mb-6">Favoritos</h1>
    <Erro erro={favoritos.error} tentar={() => void favoritos.refetch()} />
    {favoritos.data?.length === 0 && <div className="estado-vazio"><h2>Você ainda não tem favoritos</h2><Button asChild><Link to="/">Explorar NFTs</Link></Button></div>}
    <div className="grade-nfts grid grid-cols-3 gap-6 max-[800px]:grid-cols-2">
      {favoritos.isPending && <Skeleton className="skeleton-card" />}
      {favoritos.data?.map((id, i) => <Favorito key={id} id={id} posicao={i} />)}
    </div>
  </section>
}
function Favorito({ id, posicao }: { id: string; posicao: number }) {
  const resultado = useQuery(nftConsulta(id))
  if (resultado.data) return <CartaoVisual nft={resultado.data} posicao={posicao} />
  if (resultado.error) return <Erro erro={resultado.error} tentar={() => void resultado.refetch()} />
  return <Skeleton className="skeleton-card" />
}

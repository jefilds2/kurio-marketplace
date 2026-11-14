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
  return <section className="conta-painel" aria-labelledby="conta-titulo-favoritos">
    <Link to="/" className="link conta-inicio-desktop mb-4 inline-block text-[13px]">Voltar ao início</Link>
    <h2 id="conta-titulo-favoritos" className="mb-6 text-[15px] font-bold">Favoritos</h2>
    <Erro erro={favoritos.error} tentar={() => void favoritos.refetch()} />
    {favoritos.data?.length === 0 && <div className="estado-vazio"><h3>Você ainda não tem favoritos</h3><Button asChild><Link to="/">Explorar NFTs</Link></Button></div>}
    <div className="grade-nfts grid grid-cols-3 gap-4 max-[800px]:grid-cols-2">
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

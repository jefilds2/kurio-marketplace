import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { EventoNft, EventoPedido } from '../contratos/mercado'
import { cache } from '../app/consultas'

export function useTempoReal(token: string, usuarioId: string, avisar: (mensagem: string) => void) {
  useEffect(() => {
    let socket: Socket | undefined
    let encerrado = false
    void import('socket.io-client').then(({ io }) => {
      if (encerrado) return
      const conexao = io(import.meta.env.VITE_SOCKET_ORIGIN || location.origin, {
        transports: ['websocket'], autoConnect: false, forceNew: true, reconnectionDelay: 300,
      })
      socket = conexao
      const versoes = new Map<string, number>()
      const aceitar = (tipo: string, id: string, versao: number) => {
        const chave = tipo + ':' + id
        if (versao <= (versoes.get(chave) ?? 0)) return false
        versoes.set(chave, versao)
        return true
      }
      function sincronizar() {
        conexao.emit('sessao', token)
        void cache.invalidateQueries({ predicate: q =>
          ['catalogo', 'nft', 'carrinho'].includes(String(q.queryKey[0])) ||
          (q.queryKey[0] === 'privado' && q.queryKey[1] === usuarioId && ['pedido', 'pendente', 'cotacao'].includes(String(q.queryKey[2]))) })
      }
      conexao.on('connect', sincronizar)
      conexao.on('nft.updated', (evento: EventoNft) => {
        if (!aceitar('nft', evento.recursoId, evento.versao)) return
        const afetado = cache.getQueriesData<{ linhas?: { nftId: string }[] }>({ queryKey: ['carrinho'] })
          .some(([, dados]) => dados?.linhas?.some(linha => linha.nftId === evento.recursoId))
        if (afetado) avisar('O preço ou a disponibilidade de um NFT do carrinho mudou.')
        void cache.invalidateQueries({ queryKey: ['catalogo'] })
        void cache.invalidateQueries({ queryKey: ['nft', evento.recursoId] })
        void cache.invalidateQueries({ queryKey: ['carrinho'] })
        void cache.invalidateQueries({ queryKey: ['privado', usuarioId, 'cotacao'] })
      })
      conexao.on('order.updated', (evento: EventoPedido) => {
        if (evento.usuarioId !== usuarioId || !aceitar('pedido', evento.recursoId, evento.versao)) return
        void cache.invalidateQueries({ queryKey: ['privado', usuarioId, 'pedido', evento.recursoId] })
        void cache.invalidateQueries({ queryKey: ['privado', usuarioId, 'pendente'] })
        void cache.invalidateQueries({ queryKey: ['carrinho', usuarioId] })
      })
      conexao.connect()
    })
    return () => {
      encerrado = true
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [token, usuarioId, avisar])
}

import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { EventoNft, EventoPedido } from '../contratos/mercado'
import { lerBanco } from './banco'
import { resolverPedidos } from './compras'

const socketUrl = new URL('/', import.meta.env.VITE_SOCKET_ORIGIN || location.origin)
if (socketUrl.protocol === 'http:') socketUrl.protocol = 'ws:'
if (socketUrl.protocol === 'https:') socketUrl.protocol = 'wss:'
const sockets = ws.link(socketUrl.href)
type Mensagem = ['nft.updated', EventoNft] | ['order.updated', EventoPedido]
type Inscrito = { token: string | undefined; emitir: (evento: Mensagem) => void }
const inscritos = new Map<string, Inscrito>()
const canal = new BroadcastChannel('kurio-mock-eventos')

async function enviar(evento: Mensagem) {
  const sessoes = evento[0] === 'order.updated' ? (await lerBanco()).sessoes : undefined
  for (const inscrito of inscritos.values()) {
    if (inscrito.token === undefined) continue
    if (evento[0] === 'order.updated') {
      const sessao = sessoes?.[inscrito.token]
      if (!sessao || sessao.expiraEm <= Date.now() || sessao.usuarioId !== evento[1].usuarioId) continue
    }
    inscrito.emitir(evento)
  }
}
canal.addEventListener('message', event => { void enviar(event.data as Mensagem) })
function publicar(evento: Mensagem) {
  canal.postMessage(evento)
  void enviar(evento)
}
export function emitirNft(recursoId: string, versao: number) {
  publicar(['nft.updated', { id: `nft:${recursoId}:${versao}`, recursoId, versao }])
}
export async function atualizarPedidos() {
  const { pedidos, alterados } = await resolverPedidos()
  for (const pedido of pedidos) {
    publicar(['order.updated', { id: `pedido:${pedido.id}:${pedido.versao}`, recursoId: pedido.id,
      versao: pedido.versao, usuarioId: pedido.usuarioId, estado: pedido.estado }])
  }
  for (const [id, versao] of alterados) emitirNft(id, versao)
}
export const eventos = sockets.addEventListener('connection', connection => {
  const { client } = toSocketIo(connection)
  const inscrito: Inscrito = { token: undefined, emitir: ([nome, dados]) => client.emit(nome, dados) }
  inscritos.set(connection.client.id, inscrito)
  client.on('sessao', (_, token: unknown) => { if (typeof token === 'string') inscrito.token = token })
  const heartbeat = setInterval(() => connection.client.send('2'), 22_000)
  connection.client.addEventListener('close', () => {
    clearInterval(heartbeat)
    inscritos.delete(connection.client.id)
  })
})
export function interromperSockets() {
  for (const client of sockets.clients) client.close(1012, 'Reconectando')
}

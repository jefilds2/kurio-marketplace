import { openDB, type DBSchema } from 'idb'
import type { ApiErro, Carteira, Cenario, Conexao, Item, Nft, Pedido, Perfil } from '../contratos/mercado'
import { carteirasIniciais, criarNfts, demo } from './fixtures'

type Conta = { perfil: Perfil; salt: string; verificador: string; favoritos: string[]; carteiras: Carteira[] }
type Carrinho = { itens: Item[]; cupom: string }
export type Banco = {
  nfts: Nft[]; contas: Record<string, Conta>; carrinhos: Record<string, Carrinho>
  sessoes: Record<string, { usuarioId: string; expiraEm: number }>; cenario: Cenario
  conexoes: Record<string, Conexao & { token: string }>
  pedidos: Record<string, Pedido>; tentativas: Record<string, { corpo: string; pedidoId: string }>
  reserva: Record<string, Item[]>; rastros: Record<string, boolean>; pagamento: Record<string, 'confirmado' | 'recusado'>
}
interface KurioDB extends DBSchema {
  dados: { key: string; value: Banco }
}
export class Falha extends Error {
  constructor(public status: number, public detalhe: ApiErro) {
    super(detalhe.mensagem)
  }
}
export function falhar(status: number, codigo: string, mensagem: string, complemento?: Partial<ApiErro>): never {
  throw new Falha(status, { codigo, mensagem, ...complemento })
}
const encoder = new TextEncoder()
export async function verificarSenha(senha: string, salt: string) {
  const chave = await crypto.subtle.importKey('raw', encoder.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bytes = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100_000, hash: 'SHA-256' }, chave, 256)
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}
export async function bancoInicial(cenario: Cenario = 'padrao'): Promise<Banco> {
  const contas = Object.fromEntries(await Promise.all(demo.map(async perfil => {
    const salt = 'kurio-demo-' + perfil.id
    return [perfil.id, { perfil, salt, verificador: await verificarSenha('Kurio123!', salt), favoritos: [], carteiras: carteirasIniciais(perfil.id) }]
  })))
  return {
    nfts: criarNfts(), contas, carrinhos: {}, sessoes: {}, cenario,
    conexoes: {}, pedidos: {}, tentativas: {}, reserva: {}, rastros: {}, pagamento: {},
  }
}
const db = openDB<KurioDB>('kurio-simulacao', 1, {
  upgrade(database) { database.createObjectStore('dados') },
})
const inicializado = (async () => {
  const database = await db
  if (await database.get('dados', 'demo')) return
  const seed = await bancoInicial()
  const tx = database.transaction('dados', 'readwrite')
  if (!(await tx.store.get('demo'))) await tx.store.put(seed, 'demo')
  await tx.done
})()
export async function lerBanco() {
  await inicializado
  const database = await db
  return (await database.get('dados', 'demo'))!
}
export async function editarBanco<T>(acao: (banco: Banco) => T) {
  await inicializado
  const database = await db
  const tx = database.transaction('dados', 'readwrite')
  const banco = (await tx.store.get('demo'))!
  try {
    const resultado = acao(banco)
    await tx.store.put(banco, 'demo')
    await tx.done
    return resultado
  } catch (error) {
    await tx.done.catch(() => undefined)
    throw error
  }
}
export async function resetBanco(cenario: Cenario) {
  const seed = await bancoInicial(cenario)
  await inicializado
  const database = await db
  await database.put('dados', seed, 'demo')
}
export function carrinhoDo(banco: Banco, dono: string) {
  return banco.carrinhos[dono] ??= { itens: [], cupom: '' }
}
export function usuarioDo(banco: Banco, token: string, privado = true) {
  const sessao = banco.sessoes[token]
  const usuarioId = sessao?.expiraEm > Date.now() ? sessao.usuarioId : undefined
  if (!usuarioId && (privado || token)) falhar(401, 'sessao-invalida', 'Sua sessão terminou. Entre novamente para continuar.')
  return usuarioId
}
export function tokenDe(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
}
export function donoDo(banco: Banco, request: Request) {
  const usuario = usuarioDo(banco, tokenDe(request), false)
  if (usuario) return usuario
  const visitante = request.headers.get('x-kurio-visitante')
  if (!visitante || !/^[a-z0-9-]{10,60}$/i.test(visitante)) falhar(400, 'visitante-invalido', 'Identificador de visitante inválido.')
  return 'visitante:' + visitante
}

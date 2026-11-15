import axios, { isAxiosError } from 'axios'
import type { ApiErro, BuscaCatalogo, Carteira, Catalogo, Cenario, Conexao, Cotacao, Item, Nft, Pedido, PedidoInput, Perfil, Rede, Sessao } from '../contratos/mercado'

export const mocksAtivos = import.meta.env.VITE_ENABLE_MOCKS !== 'false'
const chaveToken = 'kurio-token'
const chaveVisitante = 'kurio-visitante'
export const tokenAtual = () => sessionStorage.getItem(chaveToken) ?? ''
export function salvarToken(token: string) {
  if (token) sessionStorage.setItem(chaveToken, token)
  else sessionStorage.removeItem(chaveToken)
}
function visitante() {
  const salvo = localStorage.getItem(chaveVisitante)
  if (salvo) return salvo
  const id = crypto.randomUUID()
  localStorage.setItem(chaveVisitante, id)
  return id
}
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 3200,
  responseType: 'json',
  transitional: { silentJSONParsing: false },
})
api.interceptors.request.use(config => {
  const token = tokenAtual()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  if (mocksAtivos) config.headers.set('X-Kurio-Mock', '1')
  config.headers.set('X-Kurio-Visitante', visitante())
  return config
})
api.interceptors.response.use(response => response, error => {
  if (isAxiosError(error) && error.response?.status === 401) {
    const token = error.config?.headers.get('Authorization')
    if (token && token === `Bearer ${tokenAtual()}`) {
      salvarToken('')
      window.dispatchEvent(new Event('kurio:expirou'))
    }
  }
  return Promise.reject(error)
})
export function erroDaApi(erro: unknown): ApiErro {
  if (isAxiosError<ApiErro>(erro)) {
    if (erro.response?.data?.mensagem) return erro.response.data
    if (erro.code === 'ECONNABORTED') return { codigo: 'timeout', mensagem: 'A resposta demorou. Você pode consultar ou reenviar a tentativa.' }
    return { codigo: 'rede', mensagem: 'Não foi possível acessar o serviço. Tente novamente.' }
  }
  return { codigo: 'inesperado', mensagem: 'Ocorreu um erro inesperado.' }
}
export const statusDaApi = (erro: unknown) => isAxiosError(erro) ? erro.response?.status : undefined
export const mercadoApi = {
  catalogo: (params: BuscaCatalogo, signal?: AbortSignal) => api.get<Catalogo>('/nfts', { params, signal }).then(r => r.data),
  nft: (id: string, signal?: AbortSignal) => api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal }).then(r => r.data),
  sessao: (signal?: AbortSignal) => api.get<Sessao | null>('/sessao', { signal }).then(r => r.data),
  autenticar: (acao: 'login' | 'cadastro', dados: unknown) => api.post<Sessao>(`/sessao/${acao}`, dados).then(r => r.data),
  logout: () => api.delete('/sessao'),
  perfil: (signal?: AbortSignal) => api.get<Perfil>('/perfil', { signal }).then(r => r.data),
  salvarPerfil: (dados: unknown) => api.put<Perfil>('/perfil', dados).then(r => r.data),
  trocarSenha: (dados: unknown) => api.put('/perfil/senha', dados),
  carteiras: (signal?: AbortSignal) => api.get<Carteira[]>('/carteiras', { signal }).then(r => r.data),
  salvarCarteira: (tipo: Carteira['tipo'], dados: unknown) => api.put<Carteira>(`/carteiras/${tipo}`, dados).then(r => r.data),
  conectar: (dados: Omit<Conexao, 'id'>) => api.post<Conexao>('/carteiras/conexao', dados).then(r => r.data),
  desconectar: (id: string) => api.delete(`/carteiras/conexao/${id}`),
  favoritos: (signal?: AbortSignal) => api.get<string[]>('/favoritos', { signal }).then(r => r.data),
  favorito: (id: string, ativo: boolean) => api.put<string[]>(`/favoritos/${id}`, { ativo }).then(r => r.data),
  carrinho: (signal?: AbortSignal) => api.get<Cotacao>('/carrinho', { signal }).then(r => r.data),
  adicionar: (dados: Item) => api.post<Cotacao>('/carrinho/itens', dados).then(r => r.data),
  alterar: (dados: Item) => api.put<Cotacao>('/carrinho/itens', dados).then(r => r.data),
  remover: (dados: Item) => api.delete<Cotacao>(`/carrinho/itens/${dados.nftId}/${dados.edicaoId}`).then(r => r.data),
  cupom: (codigo: string) => api.put<Cotacao>('/carrinho/cupom', { codigo }).then(r => r.data),
  cotacao: (rede: Rede, signal?: AbortSignal) => api.get<Cotacao>('/cotacao', { params: { rede }, signal }).then(r => r.data),
  iniciarPedido: (dados: PedidoInput, chave: string) => api.post<Pedido>('/pedidos', dados, { headers: { 'Idempotency-Key': chave } }).then(r => r.data),
  pedido: (id: string, signal?: AbortSignal) => api.get<Pedido>(`/pedidos/${encodeURIComponent(id)}`, { signal }).then(r => r.data),
  pendente: (signal?: AbortSignal) => api.get<Pedido | null>('/pedidos/pendente', { signal }).then(r => r.data),
  cenario: () => api.get<{ cenario: Cenario }>('/demo/cenario').then(r => r.data.cenario),
  alterarCenario: (cenario: Cenario, reset = false) => api.put('/demo/cenario', { cenario, reset }),
}

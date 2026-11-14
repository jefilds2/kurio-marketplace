import { delay, HttpResponse } from 'msw'
import { z } from 'zod'
import type { ApiErro } from '../contratos/mercado'
import { Falha, lerBanco } from './banco'

export const base = '/api'
export type Contexto = { request: Request; params: Record<string, string | readonly string[] | undefined> }
export function resposta(acao: (ctx: Contexto) => unknown | Promise<unknown>) {
  return async (ctx: Contexto) => {
    try {
      const resultado = await acao(ctx)
      return resultado instanceof Response ? resultado : HttpResponse.json(resultado as Record<string, unknown>)
    } catch (erro) {
      if (erro instanceof Falha) return HttpResponse.json(erro.detalhe, { status: erro.status })
      if (erro instanceof z.ZodError) {
        return HttpResponse.json({
          codigo: 'validacao', mensagem: 'Revise os dados informados.',
          campos: Object.fromEntries(erro.issues.map(issue => [issue.path.join('.'), issue.message])),
        } satisfies ApiErro, { status: 422 })
      }
      throw erro
    }
  }
}
export async function simular(request: Request) {
  const { cenario } = await lerBanco()
  const busca = new URL(request.url).searchParams.get('busca') ?? ''
  if (cenario === 'lento') await delay(1_100)
  if (cenario === 'fora-de-ordem') await delay(busca.length < 4 ? 850 : 65)
  if (cenario === 'sem-rede') return HttpResponse.error()
  if (cenario === 'erro-http') return HttpResponse.json({ codigo: 'indisponivel', mensagem: 'Serviço temporariamente indisponível.' }, { status: 503 })
}
export async function corpo<T extends z.ZodType>(request: Request, esquema: T): Promise<z.output<T>> {
  return esquema.parse(await request.json())
}

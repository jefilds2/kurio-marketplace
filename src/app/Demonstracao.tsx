import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { cenarios, type Cenario } from '../contratos/mercado'
import { api, mercadoApi, mocksAtivos, salvarToken } from '../integracoes/api'
import { cache } from './consultas'
import { useSessao } from './contexto'
import { Button, Campo, Erro, Janela } from '../componentes/ui'

const nomesCenarios: Record<Cenario, string> = {
  padrao: 'Normal',
  vazio: 'Catálogo vazio',
  lento: 'Carregamento lento',
  'fora-de-ordem': 'Respostas fora de ordem',
  'sem-rede': 'Falha de conexão com a API',
  'erro-http': 'Serviço indisponível (503)',
  'favorito-falha': 'Falha ao salvar favorito',
  'carteira-recusada': 'Conexão de carteira recusada',
  'pagamento-recusado': 'Pagamento recusado',
  'pedido-timeout': 'Tempo limite após criar pedido',
  'pedido-pendente': 'Pedido demora a confirmar',
}

export function Demonstracao() {
  const [aberto, setAberto] = useState(false)
  const [confirmarReset, setConfirmarReset] = useState(false)
  const { avisar } = useSessao()
  const consulta = useQuery({ queryKey: ['cenario'], queryFn: mercadoApi.cenario, enabled: mocksAtivos && aberto })
  const acao = useMutation({ mutationFn: async (dados: { caminho: string; corpo?: unknown }) => api.post('/demo/' + dados.caminho, dados.corpo),
    onSuccess: (_, dados) => {
      if (dados.caminho === 'expirar') void cache.invalidateQueries({ queryKey: ['sessao'] })
      avisar('Cenário disparado.')
    },
  })
  const alterar = useMutation({
    mutationFn: ({ cenario, reset }: { cenario: Cenario; reset?: boolean }) => mercadoApi.alterarCenario(cenario, reset),
    onSuccess: async (_, dados) => {
      if (dados.reset) {
        salvarToken('')
        for (const chave of Object.keys(sessionStorage)) if (chave.startsWith('kurio-tentativa:')) sessionStorage.removeItem(chave)
        location.assign('/')
        return
      }
      cache.setQueryData(['cenario'], dados.cenario)
      void cache.invalidateQueries({ predicate: query => query.queryKey[0] !== 'cenario' })
      avisar(dados.cenario === 'padrao' ? 'Modo normal restaurado.' : 'Cenário ativo: ' + nomesCenarios[dados.cenario])
    },
  })
  if (!mocksAtivos) return null
  return <div className="demo-controle">
    <Janela titulo="Cenários de demonstração"
      descricao="Use o modo Normal para navegar. Escolha outro cenário para reproduzir uma falha do desafio. A seleção continua ativa ao recarregar a página."
      aberta={aberto} aoMudar={valor => { setAberto(valor); if (!valor) setConfirmarReset(false) }}
      gatilho={<Button variant="outline"><Settings2 size={16} /> Cenários</Button>}>
      <div className="formulario">
        <label className="campo">Cenário ativo<select className="entrada" disabled={alterar.isPending || consulta.isPending || consulta.isError}
          value={consulta.data ?? 'padrao'} onChange={e => alterar.mutate({ cenario: e.target.value as Cenario })}>
          {cenarios.map(nome => <option key={nome} value={nome}>{nomesCenarios[nome]}</option>)}</select></label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={alterar.isPending || consulta.data === 'padrao'}
            onClick={() => alterar.mutate({ cenario: 'padrao' })}>Voltar ao normal</Button>
          <Button variant="outline" onClick={() => acao.mutate({ caminho: 'expirar' })}>Expirar sessão</Button>
          <Button variant="outline" onClick={() => acao.mutate({ caminho: 'desconectar' })}>Interromper conexão</Button>
        </div>
        <form className="formulario" onSubmit={e => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const estoque = String(form.get('estoque') ?? '')
          const preco = String(form.get('preco') ?? '').trim().replace(',', '.')
          acao.mutate({ caminho: 'nft', corpo: { nftId: form.get('nftId'), repetir: form.get('repetir') === 'on',
            ...(estoque ? { estoque: Number(estoque) } : {}), ...(preco ? { preco } : {}) } })
        }}>
          <Campo rotulo="Identificador do NFT" name="nftId" defaultValue="nft-01" required />
          <Campo rotulo="Novo preço" name="preco" defaultValue="1.49" inputMode="decimal" />
          <Campo rotulo="Novo estoque" name="estoque" type="number" min={0} max={999} />
          <label className="flex items-center gap-2"><input name="repetir" type="checkbox" /> Repetir evento e enviar versão anterior</label>
          <Button type="submit" disabled={acao.isPending}>Disparar atualização de NFT</Button>
        </form>
        <div className="formulario">
          <Button variant="outline" onClick={() => setConfirmarReset(!confirmarReset)}>Resetar demonstração</Button>
          {confirmarReset && <>
            <p>Restaura os dados iniciais e apaga as contas, alterações e compras feitas neste navegador.</p>
            <Button disabled={alterar.isPending} onClick={() => alterar.mutate({ cenario: 'padrao', reset: true })}>
              Confirmar reset
            </Button>
          </>}
        </div>
        <Erro erro={consulta.error} tentar={() => void consulta.refetch()} />
        <Erro erro={acao.error || alterar.error} />
      </div>
    </Janela>
  </div>
}

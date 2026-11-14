import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { cenarios, type Cenario } from '../contratos/mercado'
import { api, mercadoApi, mocksAtivos, salvarToken } from '../integracoes/api'
import { cache } from './consultas'
import { useSessao } from './contexto'
import { Button, Campo, Erro, Janela } from '../componentes/ui'

export function Demonstracao() {
  const [aberto, setAberto] = useState(false)
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
      await cache.invalidateQueries()
      avisar('Cenário selecionado.')
    },
  })
  if (!mocksAtivos) return null
  return <div className="demo-controle">
    <Janela titulo="Cenários de demonstração" descricao="Os cenários usam a API simulada e a conexão Socket.IO da aplicação."
      aberta={aberto} aoMudar={setAberto}
      gatilho={<Button variant="outline"><Settings2 size={16} /> Cenários</Button>}>
      <div className="formulario">
        <label className="campo">Cenário ativo<select className="entrada" disabled={alterar.isPending || consulta.isPending}
          value={consulta.data ?? 'padrao'} onChange={e => alterar.mutate({ cenario: e.target.value as Cenario })}>
          {cenarios.map(nome => <option key={nome}>{nome}</option>)}</select></label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => alterar.mutate({ cenario: 'padrao', reset: true })}>Resetar demonstração</Button>
          <Button variant="outline" onClick={() => acao.mutate({ caminho: 'expirar' })}>Expirar sessão</Button>
          <Button variant="outline" onClick={() => acao.mutate({ caminho: 'desconectar' })}>Interromper conexão</Button>
        </div>
        <form className="formulario" onSubmit={e => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          const estoque = String(form.get('estoque') ?? '')
          const preco = String(form.get('preco') ?? '')
          acao.mutate({ caminho: 'nft', corpo: { nftId: form.get('nftId'), repetir: form.get('repetir') === 'on',
            ...(estoque ? { estoque: Number(estoque) } : {}), ...(preco ? { preco } : {}) } })
        }}>
          <Campo rotulo="Identificador do NFT" name="nftId" defaultValue="nft-01" required />
          <Campo rotulo="Novo preço" name="preco" defaultValue="1.49" inputMode="decimal" />
          <Campo rotulo="Novo estoque" name="estoque" type="number" min={0} max={999} />
          <label className="flex items-center gap-2"><input name="repetir" type="checkbox" /> Repetir evento e enviar versão anterior</label>
          <Button type="submit" disabled={acao.isPending}>Disparar atualização de NFT</Button>
        </form>
        <Erro erro={consulta.error || acao.error || alterar.error} />
      </div>
    </Janela>
  </div>
}

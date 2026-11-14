# KURIO · Marketplace de NFTs

Demonstração para o desafio frontend da Jungle Gaming. Os fluxos usam contas, carteiras, pagamentos e transações fictícias.

## Executar localmente

Requisitos de execução: Node.js 22.19 ou mais recente, npm e um navegador com suporte a Service Worker. No Windows, execute a partir desta pasta no PowerShell.

```bash
npm ci
npm run dev
```

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Desenvolvimento com Vite e mocks |
| `npm run build` | Verifica tipos e gera `dist/` |
| `npm run preview` | Serve o build em localhost |
| `npm run typecheck` | Verifica tipos sem emitir arquivos |
| `npm run lint` | Verifica o código com ESLint |
| `npx playwright install chromium` | Instala o navegador para a suíte |
| `npm run test:e2e` | Roda testes e regressão visual do build em desktop e mobile |
| `npm run audit` | Executa Lighthouse no build e escreve relatórios em `reports/lighthouse/` |

Construa o build antes de executar testes ou Lighthouse. Para abrir o relatório HTML de testes, use `npx playwright show-report`. Traces e capturas de falha ficam em `test-results/`. Para auditar com uma instalação local específica do Chrome, defina `KURIO_CHROME_PATH`. Para testar ou auditar uma URL publicada, use `KURIO_TEST_URL` ou `KURIO_AUDIT_URL`, respectivamente.

## Configuração

| Variável | Valor padrão |
| --- | --- |
| `VITE_ENABLE_MOCKS` | `true` |
| `VITE_API_BASE` | `/api` |
| `VITE_SOCKET_ORIGIN` | Origem da aplicação |

Os valores padrão são suficientes para o desafio. Se definir `VITE_ENABLE_MOCKS=false`, configure serviços HTTP e Socket.IO compatíveis. Consulte [configuração de exemplo](.env.example).

## Demonstração

Use `ana@kurio.test` ou `leo@kurio.test`. Ambas as contas de demonstração começam com a senha `Kurio123!` e carteiras cadastradas. Use apenas dados fictícios. A persistência pertence à origem e ao perfil do navegador.

1. Abra um NFT, escolha uma edição em estoque e adicione ao carrinho.
2. Abra o carrinho, experimente `KURIO10` ou `EXPIRADO`, entre e confira os itens preservados.
3. Escolha uma carteira e a rede, clique em **Confirmar compra** para conectar e revisar a cotação, depois confirme o envio no diálogo. A tela acompanha o pedido até a resposta terminal.
4. Use o botão **Cenários**, ao fim da página, para reproduzir falhas ou restaurar a demonstração.

| Cenário ou ação | Como reproduzir |
| --- | --- |
| `vazio`, `lento`, `fora-de-ordem` | Selecione o cenário e volte ao catálogo. Em `fora-de-ordem`, pesquise termos curtos e longos em sequência. |
| `sem-rede`, `erro-http` | Consulte catálogo, detalhe ou carrinho. Retorne a `padrao` para recuperar. |
| Sessão expirada e conflito | Use **Expirar sessão** durante um fluxo privado ou tente cadastrar o e-mail de uma conta existente. |
| `favorito-falha` | Entre, escolha o cenário, favorite um NFT e observe o rollback. |
| `carteira-recusada` | Selecione o cenário antes de abrir a revisão pelo botão **Confirmar compra**. |
| Preço, estoque e eventos antigos | Adicione o NFT `nft-01` ao carrinho, entre no checkout e use a ação de atualização no painel. Pode reproduzir durante a revisão em outra aba da mesma origem. Use estoque zero para esgotar ou marque a opção de repetir versões. |
| `pagamento-recusado` | Revise e envie um pedido. Confira o estado recusado e os itens no carrinho. |
| `pedido-timeout` | Confirme uma compra. Após timeout, feche a revisão e use **Consultar ou reenviar tentativa**. A opção sobrevive ao refresh da mesma aba. |
| `pedido-pendente` | Envie, abra **Cenários**, clique em **Interromper conexão** e recarregue a tela do pedido para retomar. |

**Resetar demonstração** restaura fixtures e invalida contas e pedidos criados no cenário local. Consulte [Arquitetura](ARCHITECTURE.md), [Regras de negócio](docs/REGRAS-DE-NEGOCIO.md) e [Registro de bugs](docs/BUGS-E-CORRECOES.md).

## Publicação manual no Netlify

Importe o repositório no Netlify. A configuração versionada usa Node 22, executa `npm run build`, publica `dist/` e serve a SPA por rotas diretas. Para publicar por upload manual, execute `npm ci` e `npm run build`, confirme que `dist/_redirects` está presente e faça upload de `dist/`. Depois abra a URL HTTPS em uma sessão limpa e confirme acesso direto, refresh, compra e atualização em tempo real antes da entrega.

O formulário da Jungle Gaming solicita link do repositório e URL pública da aplicação. [Formulário de entrega](https://entrevistas.45-55-130-35.sslip.io/testes/front-remoto)

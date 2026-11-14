# Checklist do desafio Jungle Gaming

Revisão do [README oficial no commit fea4e7c](https://github.com/junglegaming/frontend-challenge/blob/fea4e7c7d35be125150576d3d03af2460023c17f/README.md). A [cópia local](README-OFICIAL.md) foi conferida com a versão no GitHub.

**Verificado** indica evidência no código, na suíte ou nos relatórios. **Parcial** indica que existe implementação, com uma diferença ou lacuna de validação indicada. **Pendente** indica que a etapa ainda precisa ser feita.

## 1–2. Escopo e stack

| Exigência | Situação e evidência |
| --- | --- |
| Catálogo, compra e conta com versão desktop e mobile | Verificado nos fluxos Chromium e nas capturas. A fidelidade visual é avaliada na seção 8. |
| Autenticação, API, carteiras e pagamento simulados | Verificado em `src/mocks`, com IndexedDB, credenciais fictícias e transações de demonstração. |
| React e TypeScript | Verificado em `src/main.tsx`, nas telas e em `tsconfig.json`. Build executa a checagem de tipos. |
| TanStack Router | Verificado em `src/app/router.tsx`, com parâmetros de URL, navegação, carregadores e proteção de rotas. |
| TanStack Query | Verificado em `src/app/consultas.ts` e nos módulos, com queries, mutations e invalidações. |
| Axios e REST | Verificado em `src/integracoes/api.ts`. As chamadas atravessam a camada de rede, com handlers MSW. |
| Socket.IO | Verificado em `src/integracoes/tempo-real.ts` e `src/mocks/eventos.ts`, com cliente real e integração MSW. |
| Tailwind CSS | Verificado em `vite.config.ts`, `src/estilos/global.css` e nas classes dos templates. |
| shadcn/ui | Verificado nos componentes Button e Dialog com Radix, adaptados à identidade da referência e usados na aplicação. [Código](../src/componentes/ui.tsx) |
| MSW, Playwright e Lighthouse | Verificado em `src/mocks/browser.ts`, `playwright.config.ts`, `tests/` e `scripts/audit.mjs`. |

## 3. Telas e fluxos

| Exigência | Situação e evidência |
| --- | --- |
| Início com destaques, catálogo, busca, filtros combináveis, ordenação, paginação e navegação para o NFT | Verificado. Os testes exercitam filtros, navegação e histórico. O catálogo chama a API com os parâmetros, reinicia a página em mudanças de filtro e tem recuperação de vazio, falha e respostas atrasadas. |
| Detalhe com galeria, informações, edição, quantidade, compra e favoritos | Verificado. Rota direta, recurso ausente e edição indisponível exercitados. A quantidade é limitada no cliente e revalidada na API. |
| Favoritos de usuário autenticado | Verificado. Persistem por conta, têm atualização otimista, rollback e feedback sob falha. |
| Carrinho com adição, edição, remoção, persistência e transferência ao autenticar | Verificado. A linha identifica NFT e edição, e a API valida estoque e quantidade inteira. |
| Cupom, subtotal, desconto, taxa e total | Verificado. Aplicação, remoção, código inválido e expirado passam pela API. ETH trafega como texto decimal e o cálculo usa wei com BigInt. |
| Atualização de carrinho ao mudar preço ou estoque | Verificado por consumo de `nft.updated`, aviso e nova cotação REST. |
| Checkout com formulário, carteira cadastrada, rede, conexão, recusa, desconexão, revisão e envio | Verificado pela interface e código. O teste de recusa retoma com carteira na rede Polygon. O formulário mobile usa dados do perfil para manter a composição do print. |
| Revalidar cotação, preço, estoque, taxas e cupom | Verificado. A API compara a identidade da cotação antes de criar a compra e o checkout bloqueia confirmação desatualizada. |
| Pedidos idempotentes, sem duplicação por clique ou timeout | Verificado. O teste repete o envio e recupera o mesmo pedido após recarregar. A API vincula chave, conta e conteúdo. |
| Pedido pendente, confirmado, recusado e recuperação | Verificado. Compra e recibo, recusa, timeout, desconexão e retomada estão na suíte. |
| Recibo com transação fictícia, itens, taxas e total do snapshot | Verificado no fluxo confirmado e no contrato da API. A simulação retira apenas o que foi comprado e preserva o carrinho na recusa. |
| Login e cadastro com validação, conflito e retorno ao fluxo | Verificado em Chromium. Credenciais fictícias e verificadores PBKDF2 com salt. |
| Logout, expiração durante navegação e checkout, refresh e troca de conta | Verificado. Dados privados e assinatura anterior são descartados. A suíte confirma proteção e retomada. |
| Perfil, dados, avatar e senha | Verificado com submissão, erros e persistência por conta. |
| Carteira principal e secundária | Verificado. Cadastro e atualização usam o mesmo contrato por tipo. A suíte edita ambas e confere após refresh. |
| Confirmação, perfil e carteiras em mobile | Verificado nos respectivos fluxos mobile e nas capturas. |
| Links e ações fora do escopo | Parcial. Recuperação e login social informam indisponibilidade. Links de rodapé com destino ilustrativo são exibidos como texto. A revisão manual ainda não cobriu todos os links auxiliares. |

## 4. Integração e estado

- [x] Contratos tipados e validação compartilhada entre transporte, estado e interface. [Contratos](../src/contratos/mercado.ts)
- [x] Estados de carregamento, vazio, erro, sucesso e consultas em segundo plano. Recuperação exercitada no catálogo e no checkout.
- [x] Invalidação após mutations e eventos. Cache isolado por conta e parâmetros. Cancelamento por AbortSignal no Axios.
- [x] Favoritos com atualização otimista e rollback. Compra com recuperação sem duplicar operação.
- [x] Rotas públicas e privadas com acesso direto e tratamento de rota inexistente. O endereço antigo do protótipo também redireciona com busca e âncora.
- [x] Política de cache, retries, assinaturas e reconciliação. [Arquitetura](../ARCHITECTURE.md)

## 5. Contratos REST

- [x] Conta e sessão, incluindo expiração. Catálogo e detalhe. Consulta, inclusão e remoção de favoritos.
- [x] Carrinho, cotação, cupom, disponibilidade, taxas e total.
- [x] Criação idempotente e consulta de pedidos e recibos. Reuso da chave com conteúdo diferente recebe 409.
- [x] Perfil, avatar e senha. Cadastro, consulta e edição de carteiras.
- [x] Respostas de validação, sessão inválida, acesso proibido, ausência, conflito e falha transitória. [Rotas e erros](../ARCHITECTURE.md#contratos-rest)

## 6. Mocking com MSW

- [x] Interceptação de rede em desenvolvimento, no build e nos testes. A configuração habilita o mock. Componentes consomem respostas através da API.
- [x] Estado compartilhado entre recursos no mesmo navegador e persistência local. Reset restaura fixtures, catálogo, contas e cenários. A volta ao modo Normal preserva os dados.
- [x] Catálogo variado, paginação e dois usuários fictícios.
- [x] Modos normal, vazio, lento, fora de ordem, falha de conexão, HTTP 503 e erro de favorito.
- [x] Sessão expirada, acesso proibido, conflito, validação, cupom inválido ou expirado e alterações de preço ou estoque.
- [x] Timeout após criação, confirmação, recusa, pendência e recusa de conexão de carteira.
- [x] Eventos passam por `socket.io-client` e `@mswjs/socket.io-binding`. Transporte, persistência e limitações estão documentados. [Como usar Cenários](../README.md#como-usar-o-painel-cenários)

## 7. Tempo real

- [x] `nft.updated` e `order.updated` com identidade, recurso e versão. Atualizam as consultas por REST.
- [x] Versões duplicadas ou antigas descartadas. Eventos privados filtrados por usuário. Listeners removidos ao sair ou trocar de sessão.
- [x] Preço e estoque se refletem no catálogo, detalhe e carrinho. Checkout impede confirmação com cotação desatualizada.
- [x] Reconexão reconcilia consultas ativas. Pedido pendente pode ser retomado após interrupção e recarga, com estados terminais.

## 8. Interface e acessibilidade

| Exigência | Situação e evidência |
| --- | --- |
| Tipografia, cores, espaçamentos, hierarquia, imagens, proporções e composição | Parcial. Sete HTMLs e três CSS do backup são idênticos por hash. Os seis prints mobile foram comparados. Há diferenças de enquadramento, espaçamento, dados e estados funcionais. |
| Desktop, tablet e mobile em 1440, 768 e 390 px | Parcial. Suíte desktop e mobile cobre os fluxos. Em 768 px, a suíte cobre cinco rotas públicas e a verificação complementar cobriu pagamento, confirmação, perfil, carteiras e favoritos. |
| Skeletons com shimmer, movimento reduzido e preservação das dimensões | Verificado para catálogo, detalhe e carrinho. Playwright exercita carregamento lento. CLS consta no Lighthouse. |
| Teclado, foco visível e controle de foco em diálogos e drawers | Verificado em interação principal por teclado e diálogos Radix. |
| Semântica, rótulos, mensagens associadas, imagens, contraste e feedback | Verificado nos casos automatizados e no Lighthouse. A ordenação tem contraste no menu nativo. A revisão manual de todos os estados e links ainda é parcial. |
| Ausência de overflow e perda de conteúdo com zoom | Parcial. Overflow medido nas rotas públicas e privadas verificadas em 768 px. Falta uma passada completa com zoom, incluindo rotas privadas e estados de erro. |
| Assets e fontes locais e documentação de adaptações | Verificado. Roboto Mono local, artes do backup convertidas para WebP, fontes e imagens no build. [Arquitetura](../ARCHITECTURE.md#interface-e-referências) |

## 9. Playwright

- [x] Busca, filtros combinados, ordem, paginação, histórico e respostas fora de ordem.
- [x] Acesso direto, detalhe inexistente e edição sem estoque.
- [x] Cadastro, login, expiração, logout e troca de usuário.
- [x] Favoritos, falha de mutation e recuperação.
- [x] Carrinho, quantidades, remoção, cupom e persistência.
- [x] Compra completa e recibo confirmado.
- [x] Recusa, clique repetido e recuperação de timeout.
- [x] Perfil, avatar, senha e ambas as carteiras, incluindo erros de validação.
- [x] Mudança de cotação por Socket.IO, eventos repetidos e antigos, desconexão e retomada.
- [x] Teclado, foco e validação de formulários.
- [x] Skeletons, falha e recuperação, incluindo volta ao modo Normal.
- [x] Chromium desktop e mobile, contextos isolados, regressão visual com oito baselines e relatório HTML com traces de falhas.
- [ ] **Parcial** · A suíte configura a latência e os eventos pelo mock e controla o relógio na retomada de pedido pendente. O cenário de timeout ainda usa timers reais do mock.

## 10. Lighthouse

- [x] Build de produção com mocks em modo Normal. Início e detalhe em desktop e mobile, com três medições por perfil e mediana.
- [x] Script versionado. Relatórios HTML/JSON documentam ambiente, condições, LCP, CLS, TBT e diagnósticos.
- [x] Metas de SEO, acessibilidade e boas práticas conforme os números do relatório final.
- [ ] **Parcial** · O Lighthouse mediu 68 no início mobile e 71 no detalhe mobile, diante da meta 90. No desktop, ambas as páginas ficaram em 99. Consulte as notas por página e perfil e a justificativa no [relatório final](RESULTADOS-DA-VALIDACAO.md).

## 11. Critérios de avaliação

| Critério | Peso | Resultado da revisão |
| --- | ---: | --- |
| Fidelidade visual e responsividade | 20 | Parcial. Comparação e escopo de testes acima. |
| Fluxos e experiência | 20 | Fluxos principais executados. |
| Integração e estado | 15 | Verificados em código, testes e arquitetura. |
| Tempo real | 10 | Eventos reais do cliente, cotação e reconexão verificados. |
| Mocking | 10 | Cenários, persistência e recuperação verificados. |
| Testes | 10 | Suíte e regressão visual executadas. Controle de relógio parcial. |
| Acessibilidade | 5 | Verificação automatizada e por teclado. Cobertura manual de zoom parcial. |
| Performance | 5 | Medianas e diagnósticos entregues. Meta mobile pendente. |
| Arquitetura e documentação | 5 | Setup, contratos, limites, testes e procedimentos documentados. |

A revisão dos critérios eliminatórios conferiu o uso da stack, a execução de compra e conta, a confirmação pela resposta simulada, o isolamento entre usuários, os eventos no cliente Socket.IO e a suíte E2E executável.

## 12. Entrega

- [x] Código, lockfile, assets locais, fixtures, mocks, testes e configuração Lighthouse incluídos.
- [x] README com setup, variáveis, credenciais fictícias, cenários, reset, falhas, desenvolvimento, build, preview, tipos, lint, Playwright e Lighthouse.
- [x] Arquitetura com contratos REST e eventos, sessão, carrinho, cache, reconciliação, limitações e desvios visuais.
- [x] Instalação e build a partir de checkout limpo com Node 22. Configuração e pacote estático para publicação manual no Netlify.
- [ ] **Pendente de publicação manual** · Enviar ao avaliador o repositório remoto e a URL pública correspondente.
- [ ] **Pendente após publicação** · Conferir acesso direto, refresh, REST, compra e Socket.IO na URL HTTPS pública.

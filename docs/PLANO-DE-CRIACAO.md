# Plano de criação · KURIO

**Proposta para aprovação.** O objetivo é implementar o marketplace completo da Jungle Gaming aproveitando a interface que você criou. Os critérios eliminatórios do enunciado são tratados desde os primeiros testes, principalmente uso efetivo da stack, compra confirmada pela API simulada, isolamento de contas, eventos pelo Socket.IO e testes E2E executáveis.

## 1. Mapa do protótipo

A pasta `Desafio` tem sete páginas HTML, três CSS separados, estilos Tailwind no próprio HTML e onze scripts JS. O projeto usa a marca KURIO, tipografia Roboto Mono, fundos escuros quentes e ações em laranja. A pasta `src/images` tem quatro PNGs a serem reaproveitados como assets de catálogo e galeria. Os arquivos de interação ajudam a identificar gestos, labels, campos, transições e comportamentos já desenhados.

| Tela | HTML de referência em `Desafio` | Print mobile em `Prints da versão MOBILE` | Rota proposta |
| --- | --- | --- | --- |
| Início | `index.html` | `index-mobile.png` | `/` |
| Detalhe | `mercado/index.html` | `detalhesNFT-mobile.png` | `/nfts/$nftId` |
| Carrinho | `carrinho/index.html` | `carrinho-mobile.png` | `/carrinho` |
| Pagamento | `pagamentos/index.html` | `pagamento-mobile.png` | `/pagamento` |
| Pedido e confirmação | `confirmacao-pedido/index.html` | Adaptação responsiva | `/pedidos/$pedidoId` |
| Login | Aba em `login/index.html` | `login-mobile.png` | `/login` |
| Cadastro | Aba em `login/index.html` | `criar-conta-mobile.png` | `/cadastro` |
| Perfil | Aba em `minha-conta/index.html` | Adaptação responsiva | `/conta/perfil` |
| Carteiras | Aba em `minha-conta/index.html` | Adaptação responsiva | `/conta/carteiras` |

Os seis prints já foram conferidos. Em mobile, o início tem busca e filtros no topo, destaque compacto, grade de duas colunas e navegação inferior. O detalhe destaca a arte e concentra edição, quantidade e compra na parte inferior. O carrinho usa cartões compactos e resumo abaixo dos itens. Pagamento organiza carteira e rede em listas com a ação de confirmação no rodapé. Login e cadastro têm formulários de largura contida em uma coluna. `Todas as telas mobiles.png` mostra o conjunto. A moldura cinza, o nome do frame e a seleção vermelha no print de cadastro pertencem à captura do Figma.

## 2. Arquitetura proposta

- **Base e visual.** Vite com React e TypeScript estrito. Tailwind compilado no build, tokens semânticos de cor e tipografia e componentes shadcn/ui adaptados ao HTML de referência. Hospedar a fonte e os assets usados no próprio build e otimizar imagens mantendo o enquadramento.
- **Componentes.** Separar cabeçalho, rodapé, navegação mobile, botões, campos, dialogs e drawers compartilhados. Reusar cards de NFT, seletor de quantidade, galeria, seletor de carteira e resumo de valores nas áreas onde aparecem. Preservar login/cadastro e perfil/carteiras como famílias de componentes com rotas próprias. Converter o iframe de login em diálogo acessível nos pontos onde o protótipo abre o login sobre o fluxo atual.
- **Manutenção.** Organizar arquivos pequenos por responsabilidade e usar nomes que expliquem seu papel, como `Cabecalho.tsx`, `ResumoDoCarrinho.tsx` e `calcularCotacao.ts`. Extrair padrões recorrentes e compor telas com componentes, evitando arquivos responsáveis por vários fluxos.
- **Roteamento e estado.** TanStack Router cuida dos parâmetros tipados, histórico, rotas protegidas e retorno pós-login. TanStack Query controla consultas, mutations, abortos, invalidação e rollback. Usar Axios em toda chamada REST e separar chaves de consulta por recurso, parâmetros e conta quando houver dados privados. Limitar retries automáticos a leituras com falhas transitórias e recuperar envios incertos usando a mesma chave de idempotência.
- **Mock e persistência.** MSW é o servidor simulado no navegador. Handlers delegam a regras e um estado compartilhado por REST e WebSocket. Usar IndexedDB como armazenamento local dos dados simulados, com transações para estoque, reconciliação de carrinho e pedidos. Fixtures versionadas e reset restauram um cenário conhecido. Cada sessão de navegador pode ser demonstrada com contas fictícias; dados persistentes do mock são locais à origem e ao perfil do navegador.
- **Compra.** Calcular em wei com inteiros de precisão arbitrária e serializar ETH em decimal. Persistir tentativa antes de enviar, revalidar cotação na API e trocar a chave só ao iniciar uma nova tentativa revisada. Transições terminais persistem snapshot e seus efeitos de forma atômica. Redirecionar para o recibo a partir do estado confirmado da API, inclusive após reconectar.
- **Tempo real.** Cliente `socket.io-client` com WebSocket interceptado pelo MSW e binding compatível. Começar pelo namespace padrão e eventos textuais tipados. Filtrar por identidade e versão, desfazer assinaturas na troca de sessão e invalidar dados ativos para reconciliar com REST na reconexão. Fixar versões compatíveis no lockfile e testar a reconexão no primeiro incremento funcional. [Binding Socket.IO para MSW](https://github.com/mswjs/socket.io-binding)
- **Documentação.** Manter contratos REST e eventos, política de sessão e cache, sincronização, limites do mock e decisões de UX em `ARCHITECTURE.md`. O `README.md` final cobre instalação, variáveis, contas fictícias, reset, falhas reproduzíveis e comandos de dev, build, preview, tipos, lint, Playwright e Lighthouse.

Estrutura inicial proposta

```text
src/
  app/                 Rotas, layouts e provedores
  componentes/         Elementos compartilhados e primitivas shadcn/ui
  modulos/             Catálogo, NFT, conta, carrinho, pagamento e pedido
  contratos/           Tipos e formatos REST e Socket.IO
  integracoes/         Cliente Axios e conexão Socket.IO
  mocks/               Handlers, persistência, fixtures e cenários
  estilos/             Tokens e estilos globais
public/                Assets públicos e Service Worker do MSW
tests/                 E2E, fixtures de teste e baselines visuais
docs/                  Enunciado, regras, memória, plano e registro de bugs
```

## 3. Sequência de trabalho

| Etapa | Entrega | Como verificar |
| --- | --- | --- |
| 1. Fundar o projeto | Após aprovação, configurar stack, extrair elementos comuns e migrar o início e o detalhe. Associar componentes ao mapa visual. Provar em uma rota o REST e um evento Socket.IO no build com mocks. | Build, tipos e lint passam. Navegação direta funciona e o evento chega pelo cliente real. Conferir início/detalhe a 390, 768 e 1440 px. |
| 2. Descoberta e sessão | Catálogo com filtros reais, histórico, favoritos, cadastro, login e sessão. Integrar telas de conta, perfil, avatar, senha e carteiras. | Perfil e favoritos isolados por conta. Simular expiração, erro de mutation e recuperação do fluxo anterior. |
| 3. Carrinho e compra | Carrinho persistente, cupom, conexão de carteira, cotação, revisão, pedido idempotente e recibo. Concluir layouts desktop, tablet e mobile de todos os estados. | Executar compra completa e cenários de estoque, preço, timeout, recusa e reconexão. Conferir remoção seletiva do carrinho e imutabilidade do recibo. |
| 4. Qualidade | Completar Playwright, baselines, acessibilidade, SEO, desempenho e registro de bugs. | Cobertura dos doze cenários, relatório HTML e traces de falhas. Auditorias reproduzíveis na versão otimizada. |
| 5. Publicação | Publicar no Netlify a partir do mesmo commit entregue no GitHub, com mocks habilitados por configuração. | Abrir URL pública em sessão limpa, acessar rotas diretamente, recarregar e completar compra e cenário de tempo real. Conferir que o repositório está acessível à equipe avaliadora. |

## 4. Critérios de qualidade e evidências

- **Playwright.** Chromium desktop e mobile com contexto isolado, latência e tempo controláveis. Cobrir os doze grupos do [README oficial, seção 9](README-OFICIAL.md#9-testes-com-playwright) e os respectivos resultados na interface. Versionar baselines de início, detalhe, carrinho e pagamento. Traces devem ser recuperáveis nas falhas.
- **Acessibilidade e layout.** Conferir 390, 768 e 1440 px, zoom, foco, ordem de tabulação, contraste e anúncios de atualização. Comparar cada tela com seu HTML e print de referência e registrar desvios necessários no documento de arquitetura.
- **SEO.** Definir título, descrição e hierarquia semântica por rota pública, links navegáveis e regras de indexação para rotas privadas. Validar catálogo e detalhes no build publicado.
- **Lighthouse.** Auditar início e detalhe em desktop e mobile três vezes por combinação, doze execuções no total. Entregar medianas por categoria, LCP, CLS, TBT, configuração, versões, condições e relatórios HTML/JSON. Metas de 90 para performance e SEO e 95 para acessibilidade e boas práticas. Investigar e registrar resultados abaixo da meta.
- **Bugs.** Toda falha reproduzida ganha ficha com cenário, resultado esperado e observado, causa, correção, teste e evidência de reteste. Consultar [registro de bugs](BUGS-E-CORRECOES.md).

## 5. Netlify e decisão pendente

A proposta usa o Netlify, conforme sua preferência. O build estático pode publicar `dist/`, com redirecionamento interno para a SPA e arquivos estáticos servidos normalmente. A requisição REST e a conexão Socket.IO são simuladas no navegador pelo MSW; o desafio permite persistência local e dispensa banco hospedado. O repositório continua reproduzível a partir de checkout limpo. [Regras de rotas para SPA no Netlify](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/#history-pushstate-and-single-page-apps)

A memória no **Octi** é uma exigência do projeto. O endereço fornecido abre o enunciado da Jungle Gaming e não identifica a ferramenta. A [memória inicial em Markdown](MEMORIA-DO-PROJETO.md) documenta o conteúdo a cadastrar assim que o produto ou a instalação forem identificados. Nenhuma integração Octi foi executada nesta etapa.

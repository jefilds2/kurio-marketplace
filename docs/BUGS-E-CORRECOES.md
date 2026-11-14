# Registro de bugs e correções · KURIO

## BUG-001 · Rótulos mudavam depois de um erro no formulário

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** tentar cadastrar um e-mail existente e corrigir o campo. O texto de erro entrava no nome acessível, tornando a identificação do campo inconsistente.
- **Correção:** cada campo recebeu ID estável, `label` associado e mensagem referenciada por `aria-describedby`. Arquivo `src/componentes/ui.tsx`.
- **Reteste:** cadastro com conflito, troca de conta e erros de perfil, senha e carteira na suíte Playwright.

## BUG-002 · Mudança de preço não chegava ao checkout por Socket.IO

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** abrir uma revisão e alterar o preço de um NFT pelo cenário. A atualização REST era persistida, mas o WebSocket caía no servidor HTTP e a revisão não recebia o evento.
- **Causa:** a regra inicial incluía o prefixo `/socket.io/`, que o MSW remove ao casar conexões. Outra causa no carregamento inicial era a captura do WebSocket nativo pelo cliente antes da instalação do interceptor.
- **Correção:** vincular a origem normalizada no handler, instalar o mock antes do carregamento do cliente, usar a API `toSocketIo` da versão fixada no lockfile e manter heartbeat. Arquivos `src/mocks/eventos.ts` e `src/integracoes/tempo-real.ts`.
- **Reteste:** o teste de mudança de cotação recebe o evento, bloqueia a confirmação e ignora versões repetidas ou antigas. A suíte também cobre reconexão durante pedido pendente. [Trace da falha original](../reports/traces/BUG-002-socket.zip).

## BUG-003 · A verificação do primeiro Tab começava antes da montagem das rotas

**Estado:** verificado em Chromium desktop e mobile.

- **Reprodução:** disparar o primeiro Tab após a resposta do HTML, antes da montagem da interface e do bootstrap dos mocks.
- **Correção:** iniciar a interação de teclado assim que o título da rota estiver renderizado. A aplicação oferece salto para o conteúdo e Radix restaura foco ao fechar o diálogo.
- **Reteste:** a suíte confirma foco inicial no salto, abertura com Enter, fechamento com Escape, restauração do foco e validação nativa do login.

## BUG-004 · A preparação do Chrome falhava em caminho com espaço

**Estado:** verificado no Windows.

- **Reprodução:** executar Lighthouse a partir de uma pasta em `C:/Users/Jefferson Miranda`. O caminho do perfil era passado com espaço codificado e o Chrome não abria a porta de depuração.
- **Correção:** criar um perfil temporário usando caminho de sistema e iniciar Chrome com argumentos separados. Arquivo `scripts/audit.mjs`.
- **Reteste:** as doze medições foram executadas com relatórios HTML e JSON.

## BUG-005 · Grande deslocamento no catálogo e auditoria de robots inválida

**Estado:** correções verificadas no Lighthouse.

- **Reprodução:** abrir a raiz da aplicação em uma visita limpa. O preenchimento do banner e da grade alterava o layout. A requisição de `robots.txt` recebia o HTML da SPA.
- **Correção:** reservar a geometria da imagem, dos indicadores e dos cards. Incluir `robots.txt`, favicon, WebPs responsivos e dicas de preload para a arte principal. Dividir rotas secundárias para reduzir o código inicial.
- **Reteste:** comparar CLS, LCP, pontuações SEO e boas práticas. O relatório final traz as medianas e os pontos de desempenho que ainda afetam o mobile.

## BUG-006 · Layout recriado divergia do protótipo em `Desafio`

- **Reprodução:** comparar o primeiro build com a página HTML de referência no desktop e com os prints no mobile. O catálogo, o cabeçalho e as telas de compra estavam reorganizados.
- **Causa:** a implementação inicial recriou a marcação das telas em vez de transportar o HTML e o CSS fornecidos.
- **Correção:** copiar as referências sem alteração para `src/referencias` e ligar os componentes React à marcação original. Usar as composições dos prints nas regras mobile, incluindo checkout de carteiras e autenticação.
- **Reteste:** verificação dos hashes, capturas de revisão e cenários Playwright com a marcação de referência. Identificar diferenças de conteúdo dinâmico, acessibilidade e estados de simulação nas comparações.

## BUG-007 · A navegação mobile encobria o botão de cenários

- **Reprodução:** em 390 px, rolar até o fim do início e abrir Cenários. Em algumas posições o botão ficava atrás da navegação fixa.
- **Correção:** reservar espaço depois do painel de demonstração somente na tela mobile com navegação inferior.
- **Reteste:** teste de carregamento lento, recuperação de erro e mudança de cenário em Chromium mobile. [Trace da falha](../reports/traces/BUG-007-cenarios-mobile.zip).

## BUG-008 · Paginação de NFTs relacionados não respondia

- **Reprodução:** abrir o detalhe em desktop e acionar um dos três indicadores da seção Mais desta coleção.
- **Correção:** usar a ordem, os deslocamentos e os cinco cartões do protótipo em `Desafio/mercado/interacoes.js`. A lista usa dados da API e carrega ao se aproximar da área visível.
- **Reteste:** o teste de detalhe abre a seção, confere os cinco links e valida a mudança do cartão inicial e do estado do indicador.

## BUG-009 · Espaçamentos e controles divergiam dos prints mobile

- **Reprodução:** comparar as seis telas mobile com a área interna dos prints. A ficha do NFT tinha margens e corte diferentes, o carrinho tinha linhas mais baixas e o cadastro não exibia o controle de visibilidade da confirmação da senha.
- **Correção:** aproximar as proporções a partir das áreas internas dos prints, ajustar botões, espaçamentos e ordem das edições e ligar o controle de senha ao campo correspondente. As fontes, imagens e HTMLs de referência seguem no projeto.
- **Reteste:** snapshots Playwright e comparação lado a lado com os seis prints. As capturas também registram os valores e os estados dos dados da demonstração.

## BUG-010 · A inicialização repetia trabalho antes da primeira pintura

- **Reprodução:** abrir o catálogo ou detalhe com armazenamento limpo e inspecionar as consultas e o bundle.
- **Correção:** usar Zod Mini, limitar o processamento ao HTML da página, carregar o estado de demonstração ao abrir o painel e fazer a reconciliação REST nos eventos de reconexão. Os mocks usam um verificador pré-calculado para as contas públicas de demonstração.
- **Reteste:** suíte de fluxos incluindo login, cenários, dados persistidos, eventos e retomada de pedidos. As auditorias documentam o custo restante da inicialização.

## BUG-011 · Opções de ordenação tinham texto claro sobre fundo branco

- **Reprodução:** abrir Ordenação no Chromium com a aparência clara do sistema.
- **Correção:** declarar o esquema escuro e aplicar as cores da KURIO ao menu nativo.
- **Reteste:** as opções têm o par de cores escuro e claro correto. O teste também seleciona a ordem e verifica a URL.

## BUG-012 · A entrada por index.html abria a página inexistente

- **Reprodução:** acessar `/index.html#inicio`, conforme o segundo print.
- **Correção:** redirecionar para a raiz pelo TanStack Router com filtros e âncora preservados. Os links internos passam a informar a âncora separadamente.
- **Reteste:** acesso direto com busca e âncora, link do Mercado e rota realmente inexistente.

## BUG-013 · A grade mobile deixava espaço em excesso entre fileiras

- **Reprodução:** comparar o terceiro print com a grade do protótipo em 390 px.
- **Correção:** ajustar o espaçamento vertical, o alinhamento de título e preço e o preenchimento do card.
- **Reteste:** snapshot mobile do catálogo.

## BUG-014 · Um cenário de falha podia continuar ativo após recarregar

- **Reprodução:** selecionar falha de conexão, recarregar o catálogo e voltar ao painel.
- **Correção:** usar nomes descritivos, informar a persistência e oferecer Voltar ao normal, que preserva os dados. O reset integral pede confirmação. O detalhe agora diferencia falha de conexão de NFT inexistente. REST e Socket.IO do mock usam as mesmas origens configuradas no cliente.
- **Reteste:** MSW responde na sessão limpa e o cenário de falha recupera a listagem sem apagar o carrinho.

## BUG-015 · Troca de carteira podia reutilizar conexão anterior

- **Reprodução:** fechar a revisão, escolher outra carteira e prosseguir enquanto a desconexão anterior estiver em andamento.
- **Correção:** descartar a conexão anterior ao selecionar outra carteira e bloquear a revisão durante a desconexão. Bloquear mudança de provedor mobile enquanto conectado. Associar erros de validação aos campos do checkout.
- **Reteste:** simulação de recusa e nova tentativa pela carteira Polygon.

## BUG-016 · Estoque reservado não aparecia da mesma forma no catálogo e no detalhe

- **Correção:** ambos usam a mesma regra de estoque disponível, descontando a reserva de pedidos pendentes. A ação de adicionar ao carrinho fica desabilitada quando a edição padrão está esgotada.
- **Reteste:** leitura de catálogo e detalhe, edição esgotada e revalidação na revisão.

## BUG-017 · O teste mobile encontrava duas caixas de busca

- **Reprodução:** rodar o novo teste de respostas fora de ordem em 390 px.
- **Causa:** o seletor de teste também encontrava o campo de apoio para o desktop.
- **Correção:** acionar o campo mobile visível pelo placeholder. [Trace da rodada inicial](../reports/traces/BUG-017-busca-mobile.zip)

## BUG-018 · O teste de pedido pendente dependia da coincidência de temporizadores

- **Reprodução:** recuperar um pedido pendente no Chromium mobile após interromper a conexão e atualizar.
- **Causa:** a consulta periódica final coincidia com o limite de espera do teste.
- **Correção:** usar o relógio do Playwright. Após verificar que o pedido segue pendente no refresh, avançar a data e acionar Consultar status. O teste confirma o recibo pela API, com a mesma URL de pedido.
- **Reteste:** cenário isolado em desktop e mobile. [Trace da falha](../reports/traces/BUG-018-pedido-pendente.zip)

## BUG-019 · Falha de rede fora dos mocks aparecia como exceção do Service Worker

O navegador mostrava `Uncaught (in promise) TypeError: Failed to fetch` em `passthrough` mesmo com Cenários em Normal. Uma solicitação sem mock para um domínio indisponível reproduziu a mesma pilha no Chromium.

O worker mantém a falha de rede original e devolve uma resposta de erro ao navegador. Assim, o recurso continua reportando sua falha e o Service Worker conclui a interceptação sem uma promessa rejeitada. A configuração de cópia automática do MSW foi removida para preservar esse ajuste após `npm ci`. Ao atualizar o MSW, confira o worker gerado e reaplique o tratamento de `passthrough` caso a versão ainda lance essa exceção.

O teste de reprodução confirmou que o erro de rede chega à página e que o worker deixa de lançar a exceção. O catálogo voltou a carregar após alternar de Falha de conexão para Normal.

O reteste no Chromium mobile passou em desenvolvimento e no preview do build. No cenário Normal, o catálogo, o login, a edição do perfil e o acesso às carteiras terminaram sem erros de console nem falhas de rede. Uma conexão interrompida de propósito continuou sendo detectada pelo navegador e o DevTools Protocol registrou zero exceções no worker.

## BUG-020 · Cards desalinhados e acesso à conta no mobile

- **Reprodução:** abra a página inicial no celular e compare as imagens nas duas colunas. Entre pela navegação inferior e acesse o perfil.
- **Causa:** margens verticais alternadas deslocavam uma coluna da grade. A conta exibia o cabeçalho e a navegação lateral da referência de desktop.
- **Correção:** nivelar as imagens e mostrar nome e preço em todos os cards do catálogo mobile. A tela Minha conta usa um menu compacto com os acessos a perfil, carteiras, favoritos e saída.
- **Reteste:** suíte Playwright com verificação da grade e navegação pela conta.

## BUG-021 · Acesso à conta e retorno de Favoritos

- **Reprodução:** abra Favoritos pela barra inferior no celular ou procure o acesso a Minha conta perto dos filtros.
- **Causa:** a lista de favoritos abria em uma tela isolada, a conta só tinha um ícone na barra inferior do catálogo mobile e o coração dos cards só aparecia no mobile.
- **Correção:** adicionar Minha conta com texto no topo do catálogo, incorporar Favoritos ao menu da conta com retorno ao início e habilitar os corações do catálogo também no desktop.
- **Reteste:** Playwright verifica os acessos a partir da home, a alternância entre perfil e favoritos, o retorno com a lista preenchida e a atualização dos favoritos nos dois tamanhos.

## BUG-022 · Ficha mobile pulava a revisão do carrinho

- **Reprodução:** abra a ficha de um NFT no celular, adicione o item pelo ícone e toque em Comprar NFT para revisar a lista.
- **Causa no código:** Comprar NFT encaminhava direto ao pagamento. Uma revisão anterior inverteu a função do ícone e atribuiu a inclusão do item a Comprar NFT.
- **Correção:** o ícone adiciona a edição e a quantidade escolhidas e mantém a ficha aberta. Comprar NFT abre o carrinho com os itens existentes. Conectar e finalizar inicia o checkout.
- **Reteste:** Playwright verifica a inclusão pelo ícone, a abertura do carrinho vazio ou preenchido por Comprar NFT, os subtotais após abrir a lista e o avanço para pagamento.

## Como registrar o próximo bug

Crie uma ficha com data, estado, requisito, ambiente, viewport, cenário, passos, resultado esperado, resultado observado, causa, arquivos da correção, teste e evidência do reteste. Use `Aberto`, `Corrigido` ou `Verificado`. As regras do desafio estão em [Regras de negócio](REGRAS-DE-NEGOCIO.md).

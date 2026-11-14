# Arquitetura do KURIO

## Organização

`src/app` reúne roteamento, contexto e cache. `src/modulos` concentra as telas por fluxo, `src/componentes` reúne elementos reutilizáveis e `src/estilos` contém tokens visuais, layout e interação. `src/contratos` define formatos e validações compartilhadas. `src/integracoes` implementa Axios e Socket.IO. Os mocks de rede, regras simuladas e persistência local ficam em `src/mocks`.

## Contratos REST

As rotas abaixo ficam sob `/api`. O cliente envia `Authorization: Bearer <token>` ao autenticar e `X-Kurio-Visitante` para manter o carrinho anônimo. Respostas de falha seguem `{ codigo, mensagem, campos?, cotacao? }`. Os estados incluem 400 para protocolo inválido, 401 para sessão inválida, 403 para recurso privado, 404 para ausência, 409 para conflito, 422 para validação e 503 para falha transitória.

| Rotas | Operações |
| --- | --- |
| `POST /sessao/cadastro`, `POST /sessao/login` | Validam dados, abrem sessão e transferem linhas disponíveis do carrinho visitante. |
| `GET /sessao`, `DELETE /sessao` | Retorna sessão atual ou encerra a sessão e suas conexões. |
| `GET /nfts`, `GET /nfts/:id` | Catálogo com busca, categorias/redes combináveis, faixa, ordenação e página; detalhe por ID. |
| `GET /favoritos`, `PUT /favoritos/:id` | Lista de IDs da conta e atualização com `{ ativo }`. |
| `GET /carrinho`, `POST/PUT /carrinho/itens`, `DELETE /carrinho/itens/:nftId/:edicaoId` | Consulta cotação, adiciona, substitui quantidade ou remove linha. |
| `PUT /carrinho/cupom`, `GET /cotacao?rede=...` | Valida código, remove com string vazia e calcula totais por rede. |
| `GET/PUT /perfil`, `PUT /perfil/senha` | Dados e avatar com validação e alteração de senha. |
| `GET /carteiras`, `PUT /carteiras/:tipo` | Lista, cadastra ou atualiza carteira principal e secundária. |
| `POST /carteiras/conexao`, `DELETE /carteiras/conexao/:id` | Simula conexão por carteira, rede e provedor; encerra a conexão. |
| `POST /pedidos`, `GET /pedidos/:id`, `GET /pedidos/pendente` | Cria tentativa idempotente, consulta estado e recibo, consulta pedido em curso. |
| `GET/PUT /demo/cenario`, `POST /demo/expirar`, `POST /demo/nft`, `POST /demo/desconectar` | Controle de cenários, sessão, valores, duplicatas e reconexão pelo ambiente de demonstração. |

## Sessão, cache e compra

Sessão fictícia com limitação de tempo, identificador opaco e recuperação após refresh via `sessionStorage`. O banco de simulação persiste um snapshot em IndexedDB por origem. As senhas cadastradas são verificadas por PBKDF2 com salt. Valores em ETH são strings decimais e o cálculo interno usa wei em `BigInt`. A API REST é a referência para linhas, taxas e total.

Consultas usam chaves por parâmetros e conta. Consultas canceláveis enviam `AbortSignal` ao Axios. Leituras ficam frescas por 15 segundos, com uma nova tentativa para erro de rede ou servidor. Ações de escrita têm retry explícito, exceto quando o usuário reenvia a mesma tentativa com a chave original. Favoritos usam atualização otimista e rollback. Ao trocar ou perder sessão, dados privados e de carrinho são descartados do cache e a conexão é renovada.

O pedido é registrado com `Idempotency-Key` antes de uma eventual simulação de timeout. A mesma chave e o mesmo conteúdo recuperam o mesmo pedido para a conta; outro conteúdo recebe 409. Uma reserva protege o estoque até a transição terminal. A transação do mock congela a cotação no pedido e remove somente as unidades compradas após confirmar. O recibo usa esse snapshot. Se o navegador fechar antes do timer, uma consulta posterior conclui a evolução determinística do pedido.

## Socket.IO

`nft.updated` inclui `id`, `recursoId` e `versao`. `order.updated` inclui esses campos, `usuarioId` e `estado`. O cliente filtra versões e invalida as consultas afetadas; ao reconectar, refaz as leituras ativas via REST. O mock usa WebSocket interceptado pelo MSW com `toSocketIo`; trabalha com o namespace padrão e eventos textuais. Um BroadcastChannel leva mudanças entre abas da mesma origem até a camada de mock, que emite os eventos no próprio transporte Socket.IO. As assinaturas privadas só recebem pedidos do usuário autenticado no socket.

A simulação roda dentro do perfil do navegador e depende de HTTPS ou localhost para registrar o worker. IndexedDB e BroadcastChannel são recursos locais. A simulação atende ao ambiente avaliativo com fixtures, credenciais fictícias e reset explícito.

## Interface e referências

As sete páginas HTML e as três folhas CSS de referência estão em `src/referencias`. São cópias dos arquivos de `Desafio`, verificadas por SHA-256. Cada tela carrega sua referência HTML. Os componentes React ligam dados, estados e ações à marcação original e reutilizam os atributos convertidos de cada nó. O Tailwind compila as classes das referências no build. Zod Mini valida os contratos de busca, sessão e compra no cliente e nos mocks.

Os prints mobile orientam a apresentação responsiva quando ela diverge do HTML desktop. As regras estão em `src/estilos/referencia.css`. As imagens são as quatro artes do backup visual, codificadas em WebP. Os preços, quantidades, informações de conta, ajustes de estoque e valores do recibo vêm do mock. A interface também expõe os estados funcionais exigidos no enunciado, incluindo revisão da compra, erros de formulário, carregamento, pedido pendente e recusa. As rotas de login e cadastro usam o HTML compartilhado de autenticação.

A suíte Playwright guarda as referências de regressão do build em 1440 e 390 px. O teste de 768 px verifica acesso e largura da página. A comparação visual com os originais deve considerar o mesmo viewport e dados equivalentes. As referências mobile incluem uma moldura de apresentação fora da página, por isso a área útil precisa ser comparada separadamente.

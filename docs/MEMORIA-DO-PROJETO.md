# Memória do projeto · KURIO

**Estado:** implementação local aprovada e em validação visual. O deploy será feito manualmente pelo responsável pelo projeto. A memória permanece neste documento.

## Retomar o trabalho

1. Leia o [plano](PLANO-DE-CRIACAO.md) e a seção relevante das [regras](REGRAS-DE-NEGOCIO.md).
2. Confira os bugs do fluxo no [registro](BUGS-E-CORRECOES.md).
3. Compare interfaces com o HTML e o print correspondentes na pasta `C:\Users\Jefferson Miranda\Desktop\Desafio`. O sistema fica em `C:\Users\Jefferson Miranda\Desktop\KURIO`.

## Mapa de dependências

| Módulo | Depende de | Resultado |
| --- | --- | --- |
| Catálogo e detalhe | URL tipada, API de NFTs e eventos de catálogo | Lista, filtros, NFT e edições atuais |
| Sessão | API de conta e regras de proteção | Identidade, retorno ao fluxo e isolamento |
| Favoritos e perfil | Sessão e cache por conta | Dados persistentes de cada colecionador |
| Carteiras | Sessão e validação da API | Carteiras principal e secundária para o checkout |
| Carrinho | Identidade de visitante ou conta, estoque da edição e API de cotação | Linhas e valores atuais |
| Checkout | Sessão, carrinho, carteira, rede e cotação revisada | Tentativa persistida com chave de idempotência |
| Pedido | Tentativa, revalidação na API e transição terminal | Estado recuperável e recibo imutável |
| Reconexão | Cliente Socket.IO, versão do recurso e REST | Recuperação de dados ativos sem reaplicar efeitos |
| Publicação | Build, mocks configurados e roteamento da SPA | Aplicação pública no Netlify e repositório reproduzível |

## Decisões registradas

- A fidelidade visual à pasta Desafio é requisito de aceite. Desktop usa a marcação e os estilos fornecidos. Mobile segue os seis prints. Veja as referências copiadas em `src/referencias` e as regras de viewport em `src/estilos/referencia.css`.
- Usar a stack obrigatória completa. API simulada no MSW e persistência do mock restrita ao navegador. Cálculo decimal exato e confirmação baseada na resposta da API.
- Descrever os módulos por nomes legíveis. Extrair componentes conforme repetição e responsabilidade.
- Proposta de publicação no Netlify, com regras de acesso direto e recarregamento das rotas.
- A cada incremento, atualizar as decisões, riscos e pendências relacionadas ao fluxo trabalhado. Usar os códigos de requisito para ligar arquivos e testes. A memória cita os documentos de origem para reduzir a necessidade de reler todo o enunciado.

# Resultados da validação do KURIO

Build otimizado servido localmente, com MSW habilitado e cenário padrão. O Lighthouse fez três medições por página e perfil com suas configurações padrão de simulação.

Lighthouse 13.6.0, Chrome 158.0.0.0 headless, Node v26.11.1 e Windows 10.0.26300 em AMD Ryzen 5 7535HS.

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início mobile | 69 | 96 | 100 | 100 | 4,01 s | 0,000 | 632 ms |
| Início desktop | 100 | 96 | 100 | 100 | 0,73 s | 0,002 | 28 ms |
| Detalhe mobile | 77 | 100 | 100 | 100 | 3,71 s | 0,025 | 507 ms |
| Detalhe desktop | 100 | 97 | 100 | 100 | 0,82 s | 0,001 | 30 ms |

As metas do desafio são 90 para performance e SEO e 95 para acessibilidade e boas práticas. O build atingiu a meta de performance no desktop. No mobile, a maior imagem terminou de carregar antes de ser renderizada. O custo de inicializar React, TanStack e MSW e aplicar o HTML da referência aparece nos diagnósticos de execução de JavaScript e aumenta o TBT e o LCP simulados. Os relatórios HTML e JSON contêm as medições e os diagnósticos individuais.

## Testes e referências

Playwright em Chromium teve 33 testes aprovados e zero falhas. A repetição do teste de tablet no perfil mobile foi omitida, pois o mesmo teste rodou em 768 px no perfil desktop. Os oito snapshots das quatro telas principais estão em tests/visual.spec.ts-snapshots.

Sete HTMLs e três CSS em src/referencias reproduzem byte a byte os arquivos da pasta Desafio. O layout mobile foi comparado com os seis prints fornecidos. O comparativo mostra a implementação e os prints. Permanecem diferenças de enquadramento, detalhes de espaçamento, valores e estados de dados simulados. As baselines automatizadas verificam regressões do build.

## Publicação

Os arquivos de deploy estão em dist/ e no ZIP para upload manual. O repositório Git local e o build estão disponíveis na pasta Desktop/KURIO. O envio pelo GitHub e a publicação pública no Netlify seguem manuais.

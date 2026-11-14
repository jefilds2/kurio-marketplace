# Resultados da validação do KURIO

Build otimizado servido localmente, com os mocks habilitados e o cenário padrão. Três medições Lighthouse por página e perfil.

Lighthouse 13.6.0, Chromium 157 headless, Node v26.11.1 e Windows 10.0.26300 em AMD Ryzen 5 7535HS.

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início mobile | 81 | 96 | 96 | 100 | 4,36 s | 0,000 | 206 ms |
| Início desktop | 99 | 96 | 96 | 100 | 0,88 s | 0,002 | 6 ms |
| Detalhe mobile | 70 | 100 | 96 | 100 | 4,23 s | 0,007 | 608 ms |
| Detalhe desktop | 99 | 97 | 96 | 100 | 0,94 s | 0,001 | 42 ms |

Performance mobile ficou abaixo da meta 90. O Lighthouse mediu atraso na apresentação da imagem principal e tempo de bloqueio durante a inicialização do aplicativo, incluindo a camada de mocks e a transformação da marcação em elementos React. As demais categorias alcançaram as metas do enunciado.

Os relatórios HTML/JSON contêm medições individuais, ambiente e diagnósticos. O script reproduzível está em `scripts/audit.mjs`.

## Fidelidade visual

Sete HTMLs e três CSS reproduzem byte a byte os arquivos da pasta Desafio em `src/referencias`. O layout mobile foi conferido com os seis prints fornecidos. O comparativo lado a lado mostra diferenças de espaçamento, enquadramento das artes e dados simulados. As baselines automatizadas medem regressões do build e a comparação com os prints foi feita visualmente.

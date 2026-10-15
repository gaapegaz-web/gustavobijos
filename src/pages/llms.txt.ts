import type { APIRoute } from 'astro';
import { AREAS, NUMEROS } from '~/config/clube';
import { PAGINAS } from '~/config/paginas';
import { BIO, FAQ_PROFESSOR, MARCAS, PERFIS, SITE, TRAJETORIA, visiveis } from '~/config/site';
import { ENV } from '~/lib/env';

export const prerender = false;

/**
 * /llms.txt (llmstxt.org): resumo em Markdown para ChatGPT, Claude, Perplexity, Gemini etc.
 * entenderem quem é o Gustavo e o que é o Clube Tecnoapis. Só dados fixos e confirmados (site.ts);
 * campanhas aparecem apenas na lista de páginas, enquanto estiverem em config/paginas.ts.
 */
export const GET: APIRoute = () => {
  const site = SITE.dominio;
  const numeros = NUMEROS.map((x) => `${x.n} ${x.l}`).join(', ');
  const areas = AREAS.map((a) => `### ${a.titulo}\n${a.itens.map(([tipo, nome, det]) => `- ${tipo}: ${nome} (${det})`).join('\n')}`).join('\n\n');
  // Com a raiz redirecionando para uma campanha, a home ainda não é pública
  const paginas = PAGINAS.filter((p) => p.path !== '/' || !ENV.REDIRECT_RAIZ);
  const fixas = paginas.filter((p) => !p.campanha);
  const campanhas = paginas.filter((p) => p.campanha);

  const md = `# ${SITE.apelido} (${SITE.professor})

> ${SITE.professor}, conhecido como ${SITE.apelido}, é apicultor brasileiro com ${BIO.anos} anos de experiência. ${BIO.resumo} O ${SITE.clube} tem ${numeros}.

Este é o site oficial de ${SITE.apelido}: ${site}

## Quem é ${SITE.apelido}

${visiveis(BIO.sobre).map((x) => `- ${x.texto}`).join('\n')}
- Hoje: ${BIO.hoje.toLowerCase()}.
- Formação: ${BIO.formacao.toLowerCase()}${BIO.crmv ? ` (${BIO.crmv})` : ''}.
- Mora em ${BIO.cidade.nome} (${BIO.cidade.estado}) e atende todo o Brasil.
${BIO.cargos.map((c) => `- ${c}.`).join('\n')}
- ${BIO.palestras}

## Trajetória

${visiveis(TRAJETORIA).map((m) => `- ${m.ano}: ${m.titulo}. ${m.texto}`).join('\n')}

## Marcas e projetos

${visiveis(MARCAS).map((m) => `- ${m.nome} (${m.tipo}): ${m.descricao}`).join('\n')}
${PERFIS.length ? `\n## Perfis oficiais\n\n${PERFIS.map((p) => `- ${p.rede} (${p.de === 'gustavo' ? SITE.apelido : SITE.clube}): ${p.url}`).join('\n')}\n` : ''}
## Perguntas frequentes

${visiveis(FAQ_PROFESSOR).map((f) => `### ${f.p}\n${f.r}`).join('\n\n')}

## Conteúdo do ${SITE.clube}

${areas}

## Páginas

${fixas.map((p) => `- [${p.titulo}](${new URL(p.path, site)}): ${p.descricao}`).join('\n')}
${campanhas.length ? `\n## Campanhas em andamento\n\n${campanhas.map((p) => `- [${p.titulo}](${new URL(p.path, site)}): ${p.descricao}`).join('\n')}\n` : ''}`;

  return new Response(md, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};

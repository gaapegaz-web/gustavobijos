/**
 * Links da página /bio (link da bio do Instagram, no estilo Linktree/LittleLink).
 * `campanha: true` = link temporário: apague a linha quando a campanha acabar, o resto não muda.
 * Links de campanha passam por /r/<slug> para levar UTM e contar clique no painel /admin.
 */
import { PERFIS, SITE } from './site';

export type LinkBio = {
  id: string;
  titulo: string;
  sub?: string;
  href: string;
  icone: 'star' | 'hex' | 'youtube' | 'instagram' | 'whatsapp' | 'arrow';
  destaque?: boolean;
  externo?: boolean;
  campanha?: boolean;
};

const youtube = PERFIS.find((p) => p.rede === 'YouTube');

export const LINKS_BIO: LinkBio[] = [
  // Campanha (temporária)
  { id: 'black', titulo: 'Black Friday Tecnoapis 2026', sub: 'Evento ao vivo e grátis · entre no grupo', href: '/r/bio', icone: 'star', destaque: true, campanha: true },
  // Fixos
  { id: 'clube', titulo: `Conheça o ${SITE.clube}`, sub: 'Curso de apicultura online · 25 cursos', href: SITE.clubeUrl, icone: 'hex' },
  ...(youtube ? [{ id: 'youtube', titulo: 'Canal no YouTube', sub: youtube.usuario, href: youtube.url, icone: 'youtube' as const, externo: true }] : []),
  { id: 'gustavo', titulo: `Quem é o ${SITE.apelido}`, sub: '27 anos de apicultura', href: '/', icone: 'arrow' },
];

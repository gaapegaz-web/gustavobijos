import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { dadosOrigem } from '~/lib/origem';
export const prerender = false;
export const GET: APIRoute = ({url}) => {
  const { rows } = dadosOrigem(db(),url);
  const cols = ['Origem','Mídia','Campanha','Conjunto','Anúncio','Página','Visitas','Cadastros','Visitas com cadastro','Conversão (%)','Cliques no grupo','Cliques no checkout','Compradores'];
  const esc = (v: unknown) => { let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'; };
  const body = [cols.map(esc).join(';'),...rows.map(r=>[r.fonte,r.midia,r.campanha,r.conjunto,r.anuncio,r.pagina,r.visitas,r.leads,r.converteu,r.visitas?String(Math.round(r.converteu/r.visitas*1000)/10).replace('.',','):'',r.grupo,r.checkout,r.compras].map(esc).join(';'))].join('\r\n');
  return new Response('\uFEFF'+body,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="desempenho-origem.csv"'}});
};

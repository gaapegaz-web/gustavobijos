/** Cola a última palavra na anterior com espaço não separável, para nunca ficar sozinha na linha. */
export const semViuva = (t: string) => t.replace(/\s+(\S+)\s*$/, ' $1');

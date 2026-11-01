import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.pdf':'application/pdf'};
async function notFound(req,res) {
  res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
  try { res.end(req.method === 'HEAD' ? undefined : await readFile(path.join(root,'404.html'))); }
  catch { res.end('Página não encontrada. Execute npm run build antes de iniciar.'); }
}
const server = createServer(async (req,res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}); return res.end(); }
    const url = new URL(req.url,'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let file = path.resolve(root,'.'+pathname);
    const relative = path.relative(root,file);
    if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) return notFound(req,res);
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(308,{'Location':url.pathname+'/'+url.search}); return res.end(); }
      file = path.join(file,'index.html');
    }
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch(error) {
    if (error instanceof URIError) {res.writeHead(400);return res.end('Endereço inválido.');}
    return notFound(req,res);
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Além do Consumo: http://127.0.0.1:${port}`));


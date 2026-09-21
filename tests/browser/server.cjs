// Local test server: serve only application assets, never repository metadata.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=pathname==='/'?'index.html':pathname.slice(1);if(!/^(index\.html|styles\.css|js\/[a-z-]+\.js)$/.test(file)){res.writeHead(404);return res.end()}
 fs.readFile(path.join(process.cwd(),file),(err,data)=>{if(err){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data)});
}).listen(4173,'127.0.0.1');

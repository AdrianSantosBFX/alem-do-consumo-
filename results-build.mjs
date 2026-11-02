import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
export async function buildResults(){
  const result=await build({entryPoints:[fileURLToPath(new URL('./assets/results.jsx',import.meta.url))],bundle:true,write:false,minify:true,format:'esm',target:'es2020',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',metafile:true});
  const packages=[...new Set(Object.keys(result.metafile.inputs).map(file=>file.replaceAll('\\','/').match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1]).filter(Boolean))];
  const notices=[];
  for(const name of packages){
    let license;for(const file of ['LICENSE','LICENSE.md','LICENSE.txt']){try{license=await readFile(new URL(`./node_modules/${name}/${file}`,import.meta.url),'utf8');break;}catch(error){if(error.code!=='ENOENT')throw error;}}
    if(!license)throw new Error(`Licença não encontrada: ${name}`);
    notices.push(`${name}\n${license}`);
  }
  return {code:result.outputFiles[0].text,licenses:notices.join('\n\n---\n\n')};
}

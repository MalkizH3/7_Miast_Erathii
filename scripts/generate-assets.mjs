import {readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
async function images(directory){
 const entries=await readdir(new URL(directory,root),{withFileTypes:true});
 const nested=await Promise.all(entries.map(entry=>entry.isDirectory()?images(directory+entry.name+'/'):/\.(png|webp|jpg|jpeg|svg|gif|avif)$/i.test(entry.name)?[directory+entry.name]:[]));
 return nested.flat();
}
const assets=(await images('assets/')).sort();
await writeFile(new URL('asset-manifest.json',root),JSON.stringify(assets,null,2)+'\n');
console.log(`Manifest: ${assets.length} grafik.`);

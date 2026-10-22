// Decode with bounded concurrency; successful files stay cached across retries.
const loaded=new Set();
let loading=null;
export function preloadAssets(sources,onProgress=()=>{}){
 if(loading)return loading;
 loading=(async()=>{
  const files=[...new Set(sources)];
  let done=files.filter(source=>loaded.has(source)).length,next=0;
  const missing=files.filter(source=>!loaded.has(source));
  const failed=[];
  onProgress(done,files.length);
  async function worker(){
   while(next<missing.length){
    const source=missing[next++];
    try{
     const image=new Image();image.src=source;
     await image.decode();loaded.add(source);
    }catch{failed.push(source);}
    done++;onProgress(done,files.length);
   }
  }
  await Promise.all(Array.from({length:Math.min(6,missing.length)},worker));
  if(failed.length)throw new Error(`Nie udało się załadować ${failed.length} grafik. Spróbuj ponownie.`);
 })().finally(()=>{loading=null;});
 return loading;
}

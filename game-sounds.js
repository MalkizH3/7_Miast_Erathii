// Compare confirmed city state so online snapshot refreshes never repeat a sound.
export function createGameSounds(root){
 let context,output,previous=null,pendingWeek=false;
 const buffers={};
 const battles=Array.from({length:8},(_,i)=>`BATTLE0${i}.wav`);
 function unlock(){
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContext)return;
  try{
   context??=new AudioContext();
   if(!output){output=context.createGain();output.gain.value=0.4;output.connect(context.destination);}
   void context.resume().catch(()=>{});
   for(const file of ['BUILDTWN.wav','NEWWEEK.wav','KILLFADE.wav','CHMPWNCE.wav',...battles])buffers[file]??=fetch(new URL(`./assets/sounds/${file}?v=pcm-1`,import.meta.url))
    .then(response=>{if(!response.ok)throw Error('Sound unavailable');return response.arrayBuffer();})
    .then(data=>context.decodeAudioData(data)).catch(()=>null);
  }catch{/* Audio availability must not interrupt the game. */}
 }
 root.addEventListener('pointerdown',unlock,{capture:true});
 root.addEventListener('keydown',unlock,{capture:true});
 async function play(file,signal){
  const buffer=await buffers[file];
  if(!buffer||context?.state!=='running'||signal?.aborted)return;
  const source=context.createBufferSource();source.buffer=buffer;
  source.connect(output);
  await new Promise(resolve=>{
   const cancel=()=>{source.stop();};
   source.onended=()=>{signal?.removeEventListener('abort',cancel);source.disconnect();resolve();};
   signal?.addEventListener('abort',cancel,{once:true});
   source.start();
  });
 }
 function update(player,key,week,round,deferWeek=false){
  const current={key,cards:player.cards.length,stages:player.stages,week};
  if(previous?.key===key){
   if(current.cards>previous.cards||current.stages>previous.stages)void play('BUILDTWN.wav');
   if(current.week>previous.week)pendingWeek=true;
  }else{pendingWeek=week===1&&round===1;}
  if(pendingWeek&&!deferWeek){pendingWeek=false;void play('NEWWEEK.wav');}
  previous=current;
 }
 return {update,playWarMeeting(){void play('CHMPWNCE.wav');},playDiscard(){void play('KILLFADE.wav');},playBattle(signal){return play(battles[Math.floor(Math.random()*battles.length)],signal);},reset(){previous=null;pendingWeek=false;}};
}

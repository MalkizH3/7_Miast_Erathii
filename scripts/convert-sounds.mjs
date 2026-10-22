import {readFileSync,writeFileSync,readdirSync} from 'node:fs';

// Decode Microsoft IMA ADPCM WAV blocks to browser-compatible 16-bit PCM.
const steps=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const indices=[-1,-1,-1,-1,2,4,6,8];
const directory=new URL('../assets/sounds/',import.meta.url);
for(const file of readdirSync(directory).filter(name=>name.endsWith('.wav'))){
 const url=new URL(file,directory),input=readFileSync(url),chunks={};
 for(let offset=12;offset+8<=input.length;){
  const size=input.readUInt32LE(offset+4);
  chunks[input.toString('ascii',offset,offset+4)]=input.subarray(offset+8,offset+8+size);
  offset+=8+size+(size%2);
 }
 const fmt=chunks['fmt '],format=fmt.readUInt16LE(0);
 if(format===1)continue;
 if(format!==17)throw Error(`Unsupported format in ${file}: ${format}`);
 const channels=fmt.readUInt16LE(2),rate=fmt.readUInt32LE(4),blockSize=fmt.readUInt16LE(12),data=chunks.data,samples=[];
 for(let offset=0;offset<data.length;offset+=blockSize){
  const block=data.subarray(offset,offset+blockSize);
  if(block.length<channels*4)throw Error(`Truncated block: ${file}`);
  const states=Array.from({length:channels},(_,c)=>({value:block.readInt16LE(c*4),index:block[c*4+2]}));
  const decoded=states.map(s=>[s.value]);
  for(let position=channels*4;position<block.length;){
   for(let c=0;c<channels;c++){
    const state=states[c];
    for(let byte=0;byte<4&&position<block.length;byte++){
     const packed=block[position++];
     for(const nibble of [packed&15,packed>>4]){
      const step=steps[state.index];
      let delta=step>>3;
      if(nibble&1)delta+=step>>2;
      if(nibble&2)delta+=step>>1;
      if(nibble&4)delta+=step;
      state.value=Math.max(-32768,Math.min(32767,state.value+(nibble&8?-delta:delta)));
      state.index=Math.max(0,Math.min(88,state.index+indices[nibble&7]));
      decoded[c].push(state.value);
     }
    }
   }
  }
  for(let frame=0;frame<Math.min(...decoded.map(c=>c.length));frame++)for(let c=0;c<channels;c++)samples.push(decoded[c][frame]);
 }
 const frames=chunks.fact?chunks.fact.readUInt32LE(0):samples.length/channels;
 const count=Math.min(samples.length,frames*channels),output=Buffer.alloc(44+count*2);
 output.write('RIFF');output.writeUInt32LE(output.length-8,4);output.write('WAVEfmt ',8);
 output.writeUInt32LE(16,16);output.writeUInt16LE(1,20);output.writeUInt16LE(channels,22);
 output.writeUInt32LE(rate,24);output.writeUInt32LE(rate*channels*2,28);
 output.writeUInt16LE(channels*2,32);output.writeUInt16LE(16,34);output.write('data',36);output.writeUInt32LE(count*2,40);
 for(let i=0;i<count;i++)output.writeInt16LE(samples[i],44+i*2);
 writeFileSync(url,output);
 console.log(`${file}: PCM, ${channels} channels, ${rate} Hz, ${(count/channels/rate).toFixed(2)} s`);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../game.js',import.meta.url),'utf8');
function harness(){
 const calls=[];
 const room={status:'playing',members:['user'],players:[{name:'Tester'}]};
 const context={
  roomId:'room',room,user:{uid:'user'},local:false,onlineHome:false,busy:false,roomRef:room,
  api:{},status:{},connectionFailed:false,firebaseConfigured:true,localSave:null,
  resultsReveal:{reset(){}},townLayoutObserver:null,townLayoutFrame:null,cancelAnimationFrame(){},
  CustomEvent:class{},document:{dispatchEvent(){},body:{classList:{remove(){}}}},
  handTransfer:{reset(){}},buildMorph:{reset(){}},stageTransfer:{reset(){}},
  warAnimation:{running:false,reset(){}},gameSounds:{reset(){}},hideCardTip(){},
  root:{innerHTML:'',classList:{remove(){}},addEventListener(type,handler){context.click=handler;}},
  button:(text,action)=>`<button data-action="${action}">${text}</button>`,
  tell(){},table(){calls.push('table');},lobby(){calls.push('lobby');},
  window:{confirm:()=>false},call:async action=>{calls.push(action);},
  leaveOnlineView:(id,message)=>{calls.push(['leave',id,message]);}
 };
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function home(){'),source.indexOf('function choosePractice()')),context);
 vm.runInContext(source.slice(source.indexOf('async function closeOnlineGame(){'),source.indexOf("root.addEventListener('click'")),context);
 vm.runInContext(source.slice(source.indexOf("root.addEventListener('click'"),source.indexOf('async function connect(){')),context);
 async function click(action){
  const button={dataset:{action},isConnected:false};
  await context.click({target:{closest:selector=>selector==='button'?button:null}});
 }
 return {context,calls,click};
}
test('main-screen navigation keeps the online session and offers return to game',async()=>{
 const {context,calls,click}=harness();
 await click('home');
 assert.equal(context.onlineHome,true);
 assert.equal(context.room,context.roomRef);
 assert.equal(context.roomId,'room');
 assert.match(context.root.innerHTML,/Wróć do gry/);
 assert.doesNotMatch(context.root.innerHTML,/Utwórz partię|Rozegraj partię testową|Wyloguj/);
 assert.deepEqual(calls,[]);
 await click('return-game');
 assert.equal(context.onlineHome,false);
 assert.deepEqual(calls,['table']);
});
test('background online snapshots cannot replace the main screen',()=>{
 const {context}=harness();
 context.onlineHome=true;context.root.innerHTML='Home';
 vm.runInContext(source.slice(source.indexOf('function table(force=false){'),source.indexOf('function discardPanel(')),context);
 vm.runInContext('table()',context);
 assert.equal(context.root.innerHTML,'Home');
});
test('cancelled leave confirmation does not close or navigate away',async()=>{
 const {context,calls,click}=harness();
 await click('close-game');
 assert.deepEqual(calls,[]);
 assert.equal(context.roomId,'room');
});
test('confirmed leave closes remotely before leaving the view; failure keeps session',async()=>{
 const {context,calls,click}=harness();
 context.window.confirm=()=>true;
 await click('close-game');
 assert.equal(calls[0],'close');
 assert.equal(calls[1][0],'leave');
 const failed=harness();failed.context.window.confirm=()=>true;
 failed.context.call=async()=>{throw Error('Offline');};
 let error;failed.context.tell=e=>{error=e;};
 await failed.click('close-game');
 assert.equal(error.message,'Offline');
 assert.equal(failed.context.roomId,'room');
 assert.deepEqual(failed.calls,[]);
});

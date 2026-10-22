import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineTableUpdate} from '../online-table-update.js';
const room={status:'playing',week:1,round:1,players:[{name:'A',coins:3,cards:[]}],picked:[]};
const hand={phase:'playing',week:1,round:1,cards:[{id:'a'},{id:'b'}],picked:false};
const decide=(r,h,key=null,hasTable=true)=>onlineTableUpdate(r,h,key,hasTable,'room');
test('acknowledgements from moves, room and hand do not rebuild the table',()=>{
 const initial=decide(room,hand,null,false);
 assert.equal(initial.kind,'render');
 const acceptedRoom={...room,picked:[0],pickedUids:['A']};
 assert.equal(decide(room,hand,initial.key).kind,'status');
 assert.equal(decide(acceptedRoom,hand,initial.key).kind,'status');
 assert.equal(decide(acceptedRoom,{...hand,picked:true},initial.key).kind,'status');
});
test('new room arriving first preserves the table until its hand arrives',()=>{
 const initial=decide(room,hand);
 const next={...room,round:2,players:[{...room.players[0],coins:6}]};
 const nextHand={...hand,round:2,cards:[{id:'c'}]};
 assert.equal(decide(next,hand,initial.key).kind,'waiting');
 const rendered=decide(next,nextHand,initial.key);
 assert.equal(rendered.kind,'render');
 assert.equal(decide(next,nextHand,rendered.key).kind,'status');
});
test('new hand arriving first waits for the room without blanking the hand',()=>{
 const initial=decide(room,hand);
 const nextHand={...hand,round:2};
 assert.equal(decide(room,nextHand,initial.key).kind,'waiting');
 assert.equal(decide({...room,round:2},nextHand,initial.key).kind,'render');
});
test('bonus changes and final results still render, even without a final hand',()=>{
 const initial=decide(room,hand);
 const bonus={...room,status:'discard_choice',pendingDiscard:[0]};
 assert.equal(decide(bonus,hand,initial.key).kind,'waiting');
 assert.equal(decide(bonus,{...hand,phase:'discard_choice',bonusCards:[{id:'bonus'}]},initial.key).kind,'render');
 assert.equal(decide({...room,status:'finished',scores:[{total:42}]},hand,initial.key).kind,'render');
 assert.equal(decide(room,null,null,false).kind,'render');
});

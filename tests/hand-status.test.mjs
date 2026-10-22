import test from 'node:test';
import assert from 'node:assert/strict';
import {cardBuildStatus} from '../hand-status.js';
const card={name:'Kopalnia'},player={cards:[]};
test('hand status prioritizes duplicates, including free construction',()=>{
 assert.deepEqual(cardBuildStatus({cards:[{name:'Kopalnia'}]},card,[{bank:0,left:0,right:0}],true),{tone:'unavailable',text:'masz już taką kartę!'});
});
test('hand status displays the cheapest complete payment plan',()=>{
 assert.deepEqual(cardBuildStatus(player,card,[{bank:2,left:3,right:1},{bank:2,left:0,right:2}]),{tone:'paid',text:'zapłać 4 monety'});
});
test('hand status distinguishes unavailable, zero cost and discard bonus',()=>{
 assert.deepEqual(cardBuildStatus(player,card,[]),{tone:'unavailable',text:'nie stać cię'});
 assert.deepEqual(cardBuildStatus(player,card,[{bank:0,left:0,right:0}]),{tone:'affordable',text:'stać cię'});
 assert.deepEqual(cardBuildStatus(player,card,[],true),{tone:'affordable',text:'stać cię'});
});

test('payment labels use Polish coin inflection',()=>{
 for(const [amount,unit] of [[1,'monetę'],[2,'monety'],[3,'monety'],[4,'monety'],[5,'monet'],[6,'monet'],[11,'monet'],[12,'monet'],[14,'monet'],[21,'monet'],[22,'monety'],[24,'monety'],[25,'monet'],[112,'monet']]){
  assert.equal(cardBuildStatus(player,card,[{bank:amount,left:0,right:0}]).text,`zapłać ${amount} ${unit}`);
 }
});

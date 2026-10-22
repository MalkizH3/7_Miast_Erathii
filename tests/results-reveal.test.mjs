import test from 'node:test';
import assert from 'node:assert/strict';
import {createResultsReveal} from '../results-reveal.js';

test('results preserve the hand height throughout battle, then wait exactly two seconds',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let rendered=0;
 const reveal=createResultsReveal(()=>rendered++);
 reveal.prepare(347);
 assert.equal(reveal.pending,true);assert.equal(reveal.height,347);
 t.mock.timers.tick(10000);
 assert.equal(rendered,0);assert.equal(reveal.pending,true);
 reveal.prepare(900); // Repeated snapshots must not reserve summary-sized space.
 assert.equal(reveal.height,347);
 reveal.finishBattle();
 t.mock.timers.tick(1999);
 assert.equal(rendered,0);assert.equal(reveal.pending,true);
 reveal.finishBattle(); // Repeated notifications must not restart the delay.
 t.mock.timers.tick(1);
 assert.equal(rendered,1);assert.equal(reveal.pending,false);
});
test('leaving the table cancels a pending reveal and completed saves show immediately',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let rendered=0;
 const reveal=createResultsReveal(()=>rendered++);
 assert.equal(reveal.pending,false); // Opening a completed game has no battle to await.
 reveal.finishBattle();t.mock.timers.tick(3000);assert.equal(rendered,0);
 reveal.prepare(300);reveal.finishBattle();reveal.reset();
 t.mock.timers.tick(3000);
 assert.equal(rendered,0);assert.equal(reveal.pending,false);
});

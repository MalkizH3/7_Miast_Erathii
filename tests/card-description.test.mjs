import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeCard,polishCount} from '../card-description.js';

test('Polish point and coin forms handle one, few, teens and larger numbers',()=>{
 for(const [n,point,coin] of [[0,'punktów','monet'],[1,'punkt','monetę'],[2,'punkty','monety'],[3,'punkty','monety'],[4,'punkty','monety'],[5,'punktów','monet'],[11,'punktów','monet'],[12,'punktów','monet'],[14,'punktów','monet'],[21,'punktów','monet'],[22,'punkty','monety'],[24,'punkty','monety'],[112,'punktów','monet']]){
  assert.equal(polishCount(n,'punkt','punkty','punktów'),`${n} ${point}`);
  assert.match(describeCard({effect:{type:'points',amount:n}}),new RegExp(`${n} ${point} zwycięstwa`));
  assert.match(describeCard({effect:{type:'coin',amount:n}}),new RegExp(`${n} ${coin}\\.`));
 }
});
test('yellow mixed rewards and purple card categories use correct singular grammar',()=>{
 for(const type of ['coins_and_points_per_card','coins_and_points_per_pyramid']){
  assert.match(describeCard({effect:{type,coins:3,points:1,card_color:'yellow'}}),/3 monety natychmiast i 1 punkt/);
  assert.match(describeCard({effect:{type,coins:1,points:4,card_color:'yellow'}}),/1 monetę natychmiast i 4 punkty/);
 }
 assert.match(describeCard({effect:{type:'points_per_card',amount:1,card_colors:['brown','red']}}),/1 punkt za każdą kartę produkcyjną lub wojskową/);
 assert.match(describeCard({effect:{type:'coins_per_card',amount:2,card_color:'blue'}}),/2 monety za każdą kartę cywilną/);
});
test('every city stage has a readable description using the same grammar as cards',()=>{
 const boards=JSON.parse(readFileSync(new URL('../boards.json',import.meta.url)));
 for(const board of boards)for(const stage of board.stages){
  const description=describeCard(stage);
  assert(description.length>10);
  assert.doesNotMatch(description,/do uzupełnienia|undefined|1 punktów|3 punktów|4 punktów/);
 }
});

test('completed city bonus explicitly requires all stages',()=>{
 assert.equal(describeCard({effect:{type:'points_per_pyramid',target:'completed',amount:7}}),'Na koniec gry otrzymujesz 7 punktów za ukończenie wszystkich etapów swojego miasta.');
});

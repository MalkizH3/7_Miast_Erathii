import {describeCard} from './card-description.js';
import {cardBonusSurface} from './game-visuals.js';
export function createEffectDescription(card,text=describeCard(card)){
 const content=document.createElement('div');content.className='effect-description';
 const effect=card.effect,production=['resources','resource_choice'].includes(effect?.type);
 const paragraph=document.createElement('p');
 paragraph.textContent=production?(effect.type==='resource_choice'?'W każdej turze wybierz jedną z możliwości produkcji:':'W każdej turze produkuje:'):text;
 content.append(paragraph);
 if(production){
  const symbols=document.createElement('div');symbols.className='production-description-icons';
  symbols.setAttribute('role','img');symbols.setAttribute('aria-label',text);
  const art=cardBonusSurface(card,{maxWidth:220,maxHeight:44});art.setAttribute('aria-hidden','true');symbols.append(art);content.append(symbols);
  const note=document.createElement('p');note.className='card-info-note';
  note.textContent=effect.type==='resource_choice'?'Ukośnik oznacza „albo”. W każdej turze możesz wybrać inaczej.':'Surowce nie są zużywane podczas budowy.';
  content.append(note);
 }
 return content;
}

export function polishCount(amount,one,few,many){
 const n=Math.abs(Number(amount)),last=n%10,lastTwo=n%100;
 return `${amount} ${n===1?one:Number.isInteger(n)&&last>=2&&last<=4&&(lastTwo<12||lastTwo>14)?few:many}`;
}
const points=n=>polishCount(n,'punkt','punkty','punktów');
const coins=n=>polishCount(n,'monetę','monety','monet');
const labels={wood:'drewno',ore:'ruda',mercury:'rtęć',sulfur:'siarka',gold:'złoto',crystal:'kryształ',gems:'klejnoty',coin:'monety',sorcery:'talent',inteligence:'inteligencja',wisdom:'mądrość'};
const list=o=>Object.entries(o||{}).map(([k,v])=>`${v} × ${labels[k]||k}`).join(', ')||'bez kosztu';
function effect(e){if(!e)return 'Efekt do uzupełnienia';switch(e.type){case 'discard_free':return 'Wybuduj za darmo kartę ze stosu odrzuconych';case 'color_free':return 'Pierwszy budynek każdego koloru jest darmowy';case 'resources':return list(e.resources);case 'resource_choice':return e.options.map(list).join(' albo ');case 'points':return `${e.amount} pkt`;case 'coin':return `${coins(e.amount)}`;case 'war':return `${e.amount} siły militarnej`;case 'science':return labels[e.symbol];case 'science_choice':return 'Wybrany symbol magii';case 'trade':return `Handel za ${coins(e.price)} (${e.direction==='left'?'lewy sąsiad':e.direction==='right'?'prawy sąsiad':'sąsiedzi'})`;default:return 'Premia za karty lub etapy miasta';}}
export function describeCard(c,ownerIndex,tradeNeighbors=direction=>direction==='left'?'lewego sąsiada':direction==='right'?'prawego sąsiada':'obu sąsiadów'){
 const e=c.effect||{},scope=e.scope==='neighbors'?'u obu sąsiadów':e.scope==='self_and_neighbors'?'u siebie i obu sąsiadów':'w swoim mieście';
 const colorNames={brown:'produkcyjną',grey:'alchemiczną',gray:'alchemiczną',blue:'cywilną',red:'wojskową',green:'magiczną',yellow:'handlową',purple:'gildii'};
 switch(e.type){
 case 'resources':return `W każdej turze produkuje: ${list(e.resources)}. Surowce nie są zużywane podczas budowy.`;
 case 'resource_choice':return `W każdej turze wybierz jedną z możliwości produkcji: ${e.options.map(list).join(' albo ')}.`;
 case 'trade':return `Kupujesz wskazane surowce (${e.resources.map(r=>labels[r]||r).join(', ')}) za ${coins(e.price)} za sztukę od ${tradeNeighbors(e.direction,ownerIndex)}.`;
 case 'science':return `Zapewnia symbol magii: ${labels[e.symbol]}. Każdy rodzaj daje kwadrat liczby symboli punktów, a komplet trzech różnych symboli dodatkowo 7 punktów.`;
 case 'science_choice':return 'Zapewnia jeden wybrany symbol magii. W końcowym rozliczeniu wybór maksymalizuje liczbę punktów.';
 case 'points':return `Na koniec gry daje ${points(e.amount)} zwycięstwa.`;
 case 'coin':return `Natychmiast otrzymujesz ${coins(e.amount)}.`;
 case 'war':return `Zwiększa siłę armii o ${e.amount}. Na koniec tygodnia porównujesz siłę z każdym sąsiadem.`;
 case 'coins_per_card':return `Natychmiast otrzymujesz ${coins(e.amount)} za każdą kartę ${colorNames[e.card_color]||e.card_color} ${scope}.`;
 case 'points_per_card':return `Na koniec gry otrzymujesz ${points(e.amount)} za każdą kartę ${(e.card_colors||[]).map(k=>colorNames[k]||k).join(' lub ')} ${scope}.`;
 case 'coins_and_points_per_card':return `Za każdą kartę ${colorNames[e.card_color]||e.card_color} ${scope}: ${coins(e.coins)} natychmiast i ${points(e.points)} na koniec gry.`;
 case 'coins_and_points_per_pyramid':return `Za każdy wybudowany etap miasta ${scope}: ${coins(e.coins)} natychmiast i ${points(e.points)} na koniec gry.`;
 case 'points_per_pyramid':return e.target==='completed'?`Na koniec gry otrzymujesz ${points(e.amount)} za ukończenie wszystkich etapów ${e.scope==='neighbors'?'miast obu sąsiadów':e.scope==='self_and_neighbors'?'własnego miasta i miast obu sąsiadów':'swojego miasta'}.`:`Na koniec gry otrzymujesz ${points(e.amount)} za każdy wybudowany etap miasta ${scope}.`;
 default:return effect(e);
 }
}

export {list as describeCost};

const labels={wood:'drewno',ore:'ruda',mercury:'rtęć',sulfur:'siarka',gold:'złoto',crystal:'kryształ',gems:'klejnoty',coin:'monety',sorcery:'moc',inteligence:'inteligencja',wisdom:'mądrość'};
const list=o=>Object.entries(o||{}).map(([k,v])=>`${v} × ${labels[k]||k}`).join(', ')||'bez kosztu';
function effect(e){if(!e)return 'Efekt do uzupełnienia';switch(e.type){case 'discard_free':return 'Wybuduj za darmo kartę ze stosu odrzuconych';case 'color_free':return 'Pierwszy budynek każdego koloru jest darmowy';case 'resources':return list(e.resources);case 'resource_choice':return e.options.map(list).join(' albo ');case 'points':return `${e.amount} pkt`;case 'coin':return `${e.amount} monet`;case 'war':return `${e.amount} siły militarnej`;case 'science':return labels[e.symbol];case 'science_choice':return 'Wybrany symbol nauki';case 'trade':return `Handel za ${e.price} monetę (${e.direction==='left'?'lewy sąsiad':e.direction==='right'?'prawy sąsiad':'sąsiedzi'})`;default:return 'Premia za karty lub etapy miasta';}}
export function describeCard(c,ownerIndex,tradeNeighbors=direction=>direction==='left'?'lewego sąsiada':direction==='right'?'prawego sąsiada':'obu sąsiadów'){
 const e=c.effect||{},scope=e.scope==='neighbors'?'u obu sąsiadów':e.scope==='self_and_neighbors'?'u siebie i obu sąsiadów':'w swoim mieście';
 const colorNames={brown:'surowcowych',grey:'dóbr',blue:'cywilnych',red:'wojskowych',green:'naukowych',yellow:'handlowych',purple:'gildii'};
 switch(e.type){
 case 'resources':return `W każdej turze produkuje: ${list(e.resources)}. Surowce nie są zużywane podczas budowy.`;
 case 'resource_choice':return `W każdej turze wybierz jedną z możliwości produkcji: ${e.options.map(list).join(' albo ')}.`;
 case 'trade':return `Kupujesz wskazane surowce (${e.resources.map(r=>labels[r]||r).join(', ')}) za ${e.price} monetę za sztukę od ${tradeNeighbors(e.direction,ownerIndex)}.`;
 case 'science':return `Zapewnia symbol nauki: ${labels[e.symbol]}. Każdy rodzaj daje kwadrat liczby symboli punktów, a komplet trzech różnych symboli dodatkowo 7 punktów.`;
 case 'science_choice':return 'Zapewnia jeden wybrany symbol nauki. W końcowym rozliczeniu wybór maksymalizuje liczbę punktów.';
 case 'points':return `Na koniec gry daje ${e.amount} punktów zwycięstwa.`;
 case 'coin':return `Natychmiast otrzymujesz ${e.amount} monet.`;
 case 'war':return `Zwiększa siłę armii o ${e.amount}. Na koniec tygodnia porównujesz siłę z każdym sąsiadem.`;
 case 'coins_per_card':return `Natychmiast otrzymujesz ${e.amount} monet za każdą kartę ${colorNames[e.card_color]||e.card_color} ${scope}.`;
 case 'points_per_card':return `Na koniec gry otrzymujesz ${e.amount} punktów za każdą kartę ${(e.card_colors||[]).map(k=>colorNames[k]||k).join(' lub ')} ${scope}.`;
 case 'coins_and_points_per_card':return `Za każdą kartę ${colorNames[e.card_color]||e.card_color} ${scope}: ${e.coins} monet natychmiast i ${e.points} punktów na koniec gry.`;
 case 'coins_and_points_per_pyramid':return `Za każdy wybudowany etap miasta ${scope}: ${e.coins} monet natychmiast i ${e.points} punktów na koniec gry.`;
 case 'points_per_pyramid':return `Na koniec gry otrzymujesz ${e.amount} punktów za ${e.target==='completed'?'każde ukończone miasto':'każdy wybudowany etap miasta'} ${scope}.`;
 default:return effect(e);
 }
}

export {list as describeCost};

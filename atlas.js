/* Atlas uses the gallery renderer so previews always match the collection. */
(() => {
 const board=document.querySelector('#atlas-board'), peek=document.querySelector('#atlas-preview');
 const descriptions=import('./card-description.js');
 peek.setAttribute('role','tooltip');
 let previewVersion=0;
 const palette={brown:'#965b35',grey:'#8b918c',gray:'#8b918c',blue:'#2586a6',yellow:'#c99c29',red:'#a43d3d',green:'#50864b',purple:'#83609e'};
 const params=new URLSearchParams(location.search), embedded=params.get('embed')==='1';
 let data=[], view=embedded&&params.get('view')==='graph'?'graph':'catalog';
 if(embedded)document.body.classList.add('atlas-embedded');
 function fitEmbed(){
  if(!embedded)return;
  const scale=Math.min(1,document.documentElement.clientWidth/1200);
  board.style.zoom=scale;
  parent.postMessage({type:'atlas-height',view,height:Math.ceil(board.offsetHeight*scale)},location.origin);
 }
 // Fixed rows reproduce the reference diagram; null preserves an empty line.
 const graphRows={
  1:['Bractwo ognia','Podziemny tunel','Bractwo miecza','Wieża strażnicza','Targowisko','Handel wschodni','Handel zachodni','Chatka maga',null,'Chatka czarownicy',null,'Drzewo wiedzy'],
  2:['Wir magii','Stajnie',null,null,'Wiatrak','Mistyczny ogród','Sale ciemności','Gwiazda mocy','Kolumna oczu','Kamień wiedzy','Portal piekieł','Ogród objawienia',null,'Zaklęty krąg','Cytadela','Portal przyzwania'],
  3:[null,null,'Kolos','Podniebny galeon','Latarnia morska','Stocznia','Smocza jaskinia','Koloseum magów','Kuźnia','Szkoła magii','Więzienie dusz','Magiczne źródło','Magiczna studnia','Kaplica magicznych sekretów','Zamek','Portal chwały']
 };
 function graphRow(card){
  const rows=graphRows[Number(card.week)]||[];
  const index=rows.indexOf(card.name);
  return index<0?rows.length:index;
 }
 const groupKey=c=>[c.week,c.name,c.color,JSON.stringify(c.effect),JSON.stringify(c.cost),JSON.stringify(c.connections),JSON.stringify(c.connection_cost)].join('|');
 function groups(){
  const result=new Map(), players=Number(document.querySelector('#atlas-players').value);
  data.filter(c=>!c.players||Number(c.players)<=players).forEach(c=>{const key=groupKey(c);if(result.has(key))result.get(key).copies.push(c);else result.set(key,{...c,key,copies:[c]});});
  return [...result.values()];
 }
 function edgesFor(nodes){
  return nodes.flatMap(a=>nodes.filter(b=>Number(b.week)>Number(a.week)&&(a.connections||[]).some(s=>(b.connection_cost||[]).includes(s))).map(b=>({from:a,to:b,symbol:a.connections.find(s=>(b.connection_cost||[]).includes(s))})));
 }
 function hide(){previewVersion++;peek.hidden=true;if(embedded)parent.postMessage({type:'atlas-tip-hide'},location.origin);board.querySelectorAll('.related,.selected').forEach(n=>n.classList.remove('related','selected'));board.querySelectorAll('.edge.active').forEach(n=>n.classList.remove('active'));}
 function show(card,button,edges){
  if(embedded){
   const r=button.getBoundingClientRect();
   parent.postMessage({type:'atlas-tip-show',cardId:card.id,rect:{left:r.left,top:r.top,bottom:r.bottom,width:r.width,height:r.height}},location.origin);
  }else{
  const version=++previewVersion;
  const full=makeCard(card).querySelector('.game-card');peek.replaceChildren(full);peek.hidden=false;
  descriptions.then(({describeCard,describeCost})=>{
   if(version!==previewVersion||peek.hidden)return;
   const copy=document.createElement('div');copy.className='atlas-card-description';
   const add=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;copy.append(node);};
   add('h3',card.name);add('p','Tydzień '+card.week+' · Liczba kart: '+card.copies.length);
   add('p',describeCard(card));add('h4','Koszt budowy');add('p',describeCost(card.cost));
   const previous=[...new Set(data.filter(c=>Number(c.week)<Number(card.week)&&(c.connections||[]).some(s=>(card.connection_cost||[]).includes(s))).map(c=>c.name))];
   const next=[...new Set(data.filter(c=>Number(c.week)>Number(card.week)&&(card.connections||[]).some(s=>(c.connection_cost||[]).includes(s))).map(c=>c.name))];
   if(previous.length){add('h4','Darmowa budowa po');add('p',previous.join(', '));}
   if(next.length){add('h4','Pozwala wybudować za darmo');add('p',next.join(', '));}
   peek.append(copy);
   const rect=button.getBoundingClientRect();
   peek.style.top=Math.max(8,Math.min(innerHeight-peek.offsetHeight-8,rect.top))+'px';
  });
  const rect=button.getBoundingClientRect(), width=peek.offsetWidth, height=peek.offsetHeight;
  peek.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.right+width+24<innerWidth?rect.right+16:rect.left-width-16))+'px';
  peek.style.top=Math.max(8,Math.min(innerHeight-height-8,rect.top))+'px';
  }
  const related=new Set([card.key]);
  // Highlight the complete connected chain, including earlier and later epochs.
  let changed=true;while(changed){changed=false;edges.forEach(e=>{if(related.has(e.from.key)||related.has(e.to.key)){for(const k of [e.from.key,e.to.key])if(!related.has(k)){related.add(k);changed=true;}}});}
  board.querySelectorAll('.atlas-node').forEach(n=>{n.classList.toggle('related',related.has(n.dataset.key));n.classList.toggle('selected',n.dataset.key===card.key);});
  board.querySelectorAll('.edge').forEach(n=>n.classList.toggle('active',related.has(n.dataset.from)&&related.has(n.dataset.to)));
 }
 function render(){
  hide();const all=groups(), edges=edgesFor(all);
  let nodes=all;
  if(view==='graph') {const linked=new Set(edges.flatMap(e=>[e.from.key,e.to.key]));nodes=nodes.filter(c=>linked.has(c.key));}
  board.replaceChildren();board.className='atlas-board '+view;
  const visible=new Set(nodes.map(c=>c.key)), visibleEdges=edges.filter(e=>visible.has(e.from.key)&&visible.has(e.to.key));
  const positions=new Map(), order=['brown','grey','gray','blue','yellow','red','green','purple'];
  let maxHeight=0;
  for(const week of [1,2,3]){
   const column=document.createElement('section');column.className='epoch-column';column.style.left=((week-1)*400)+'px';
   const heading=document.createElement('h2');heading.textContent='Epoka '+['I','II','III'][week-1];column.append(heading);
   const list=nodes.filter(c=>Number(c.week)===week).sort((a,b)=>view==='graph'?graphRow(a)-graphRow(b):order.indexOf(a.color)-order.indexOf(b.color)||a.name.localeCompare(b.name,'pl'));
   const catalogPositions=new Map();
   let catalogRow=0;
   for(let index=0;index<list.length;){
    const first=list[index], second=list[index+1];
    const paired=second&&second.color===first.color;
    catalogPositions.set(first.key,{x:paired?42.5:127.5,row:catalogRow});
    if(paired)catalogPositions.set(second.key,{x:212.5,row:catalogRow});
    index+=paired?2:1;
    catalogRow++;
   }
   for(const c of list){
    const button=document.createElement('button');button.className='atlas-node';button.dataset.key=c.key;button.setAttribute('aria-describedby','atlas-preview');button.style.setProperty('--card-color',palette[c.color]||'#888');
    const background=document.createElement('img');background.className='node-background';background.src='assets/cards/template/card-top.png';background.alt='';applyCardColor(background,c.color);button.append(background);
    const slot=catalogPositions.get(c.key);
    const x=(week-1)*400+(view==='catalog'?slot.x:45), y=76+(view==='catalog'?slot.row:graphRow(c))*116;
    positions.set(c.key,{x,y});button.style.left=(x-(week-1)*400)+'px';button.style.top=y+'px';
    const name=document.createElement('span');name.className='node-name';name.textContent=c.name;
    const mini=makeCard(c), game=mini.querySelector('.game-card');const effects=game.querySelector('.card-effects').cloneNode(true);
    const symbol=document.createElement('span');symbol.className='node-symbol game-card';symbol.append(effects);
    // Fit the actual effect bounds, rather than scaling an entire card header.
    const layout=effectLayout(c);
    if(layout.length){
     const left=Math.min(...layout.map(item=>item.x)), top=Math.min(...layout.map(item=>item.y));
     const width=Math.max(...layout.map(item=>item.x+item.width))-left;
     const height=Math.max(...layout.map(item=>item.y+item.height))-top;
     const scale=Math.min(126/width,48/height);
     Object.assign(effects.style,{width:1092*scale+'px',height:1627*scale+'px',left:(130-width*scale)/2-left*scale+'px',top:(56-height*scale)/2-top*scale+'px',containerType:'inline-size'});
    }
    const count=document.createElement('span');count.className='node-count';count.textContent='×'+c.copies.length;
    button.append(name,symbol,count);button.setAttribute('aria-label',c.name+', epoka '+week+', liczba kart: '+c.copies.length);
    button.addEventListener('pointerenter',()=>show(c,button,edges));button.addEventListener('pointerleave',hide);button.addEventListener('focus',()=>show(c,button,edges));button.addEventListener('blur',hide);
    button.addEventListener('click',()=>{hide();mini.querySelector('.card-button').click();});column.append(button);maxHeight=Math.max(maxHeight,y+110);
   }
   board.append(column);
  }
  board.style.height=Math.max(250,maxHeight)+'px';
  if(view==='graph'){
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('atlas-edges');svg.setAttribute('width','1200');svg.setAttribute('height',Math.max(250,maxHeight));svg.setAttribute('aria-hidden','true');
   for(const e of visibleEdges){const a=positions.get(e.from.key),b=positions.get(e.to.key),x=a.x+145,y=a.y+48,tx=b.x,ty=b.y+48;
    const path=document.createElementNS(ns,'path');path.setAttribute('d',`M${x} ${y} L${tx} ${ty}`);path.classList.add('edge');path.dataset.from=e.from.key;path.dataset.to=e.to.key;svg.append(path);
    const badge=document.createElementNS(ns,'g');badge.classList.add('connection-badge');
    const disc=document.createElementNS(ns,'circle');disc.classList.add('connection-disc');disc.setAttribute('cx',(x+tx)/2);disc.setAttribute('cy',(y+ty)/2);disc.setAttribute('r','21');badge.append(disc);
    const icon=document.createElementNS(ns,'image');icon.classList.add('connection-symbol');icon.setAttribute('href','assets/cards/connections/'+e.symbol+'.png');icon.setAttribute('x',(x+tx)/2-14);icon.setAttribute('y',(y+ty)/2-14);icon.setAttribute('width','28');icon.setAttribute('height','28');badge.append(icon);svg.append(badge);
   }
   // Keep every badge above every line, including crossing connections.
   svg.querySelectorAll('.connection-badge').forEach(badge=>svg.append(badge));
   board.prepend(svg);
  }
  document.querySelector('#atlas-status').textContent=nodes.length+' typów kart · '+nodes.reduce((n,c)=>n+c.copies.length,0)+' kart'+(view==='graph'?' · '+visibleEdges.length+' połączeń':'');
  document.querySelector('#atlas-empty').hidden=nodes.length>0;
  fitEmbed();
 }
 document.addEventListener('cards-ready',event=>{data=event.detail;
  render();
 });
 document.querySelector('#atlas-players').addEventListener('change',render);
 window.addEventListener('message',event=>{
  if(!embedded||event.source!==parent||event.origin!==location.origin||event.data?.type!=='atlas-players')return;
  const count=Number(event.data.players),select=document.querySelector('#atlas-players');
  if(Number.isInteger(count)&&count>=3&&count<=7&&select.value!==String(count)){select.value=String(count);render();}
 });
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));render();}));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 window.addEventListener('resize',()=>{hide();fitEmbed();});window.addEventListener('scroll',hide,true);
})();




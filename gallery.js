function resourceList(resources) {
 return Object.entries(resources || {}).flatMap(([resource, amount]) => Object.hasOwn(resourceNames, resource) && Number.isInteger(amount) && amount > 0 ? Array(Math.min(amount,20)).fill(resource) : []);
}
function effectGroups(card) {
 return card.effect?.type === 'resource_choice' ? (card.effect.options || []).map(resourceList).filter(g=>g.length) : [resourceList(card.effect?.resources)].filter(g=>g.length);
}
function effectResources(card) { return card.effect?.type==='trade' ? card.effect.resources : effectGroups(card).flat(); }
function effectItems(card) {
 if(card.effect?.type==='science')return [{type:'science',symbol:card.effect.symbol}];
 if(card.effect?.type==='coin')return [{type:'coin',amount:card.effect.amount || 0}];
 if(card.effect?.type==='points')return [{type:'points',amount:card.effect.amount || 0}];
 if(card.effect?.type==='war') return Array.from({length:Math.max(1,Math.min(10,Number(card.effect.amount)||1))},()=>({type:'war'}));
 const items=[];effectGroups(card).forEach((group,index)=>{if(index)items.push({type:'slash'});group.forEach(resource=>items.push({type:'resource',resource}));});return items;
}
function effectLayout(card) {
 if(card.effect?.type==='coins_and_points_per_card')return [
 {type:'card_count_panel',color:card.effect.card_color,x:485,y:211,width:122,height:175},
 {type:'coin',amount:card.effect.coins,x:410,y:306,width:106,height:106},
 {type:'points',amount:card.effect.points,x:580,y:306,width:96,height:106}
 ];
 if(card.effect?.type==='coins_per_card')return [
 {type:'card_count_panel',color:card.effect.card_color,x:485,y:187,width:122,height:175},
 {type:'coin',amount:card.effect.amount,x:410,y:278,width:106,height:106},
 ...[{direction:'left',x:324,y:278},{direction:'right',x:703,y:278},{direction:'down',x:514,y:380}].map(a=>({...a,type:'arrow',width:64,height:64}))
 ];
 if(card.effect?.type==='trade'){
 const count=card.effect.resources.length,panelWidth=count===3?440:562,panelX=(1092-panelWidth)/2;
 const directions=card.effect.direction==='both'?['left','right']:[card.effect.direction];
 return [
 {type:'trade_panel',color:card.effect.panel_color||'brown',x:panelX,y:296,width:panelWidth,height:126},
 {type:'coin',amount:card.effect.price,x:481,y:188,width:130,height:130},
 ...card.effect.resources.map((resource,index)=>({type:'resource',resource,x:panelX+45+index*(count===3?127:121),y:306,width:106,height:106})),
 ...directions.map(direction=>({type:'arrow',direction,x:direction==='left'?panelX-74:panelX+panelWidth+10,y:328,width:64,height:64}))
 ];
 }
 const compactChoice=card.effect?.type==='resource_choice' && /(?:mistyczny_ogrod|wiatrak)\.png$/i.test(card.artwork || '');
 const windmillChoice=compactChoice && /wiatrak\.png$/i.test(card.artwork || '');
 const tokenSize=windmillChoice?138:compactChoice?180:220,slashWidth=windmillChoice?46:compactChoice?60:80;
 const items=effectItems(card),gap=compactChoice?8:18,nominal=items.reduce((sum,i)=>sum+(i.type==='slash'?slashWidth:tokenSize),0)+Math.max(0,items.length-1)*gap,scale=Math.min(1,917/Math.max(1,nominal));
 let x=(1092-nominal*scale)/2;
 return items.map(item=>{const width=(item.type==='slash'?slashWidth:tokenSize)*scale,height=(item.type==='slash'?(compactChoice?100:120):tokenSize)*scale;const layout={...item,x,y:205+(220-height)/2-(item.type==='war'?10:0),width,height};x+=width+gap*scale;return layout;});
}
const resourceNames = {wood:'drewno',ore:'ruda',mercury:'rtęć',sulfur:'siarka',crystal:'kryształ',gems:'klejnoty',gold:'złoto',coin:'moneta'};
const resourceBackgrounds = {
  wood: ['#c68b4d','#955c30','#4e2c19'],
  mercury: ['#d7d2c1','#a7a392','#58574f'],
  ore: ['#777166','#49463f','#191916'],
  sulfur: ['#f2df85','#c3ab4e','#79632b'],
  crystal: ['#e04c48','#b62c2c','#771819'],
  gems: ['#655bd8','#4941ba','#2d267d'],
  gold: ['#fae49a','#c5a14a','#765321'],
  coin: ['#fae49a','#c5a14a','#765321']
};
function resourcePalette(resource) { return resourceBackgrounds[resource] || resourceBackgrounds.wood; }
let cards = [];
const grid = document.querySelector('.card-grid');
const template = document.querySelector('#card-template');
const dialog = document.querySelector('#card-dialog');
const preview = document.querySelector('#preview-card');
const search = document.querySelector('#search');
const filters = document.querySelector('#filters');
let activeColor = 'all';
let activeWeek = 'all';
let selectedCard = null;
const colors = {blue:'Niebieskie',brown:'Brązowe',grey:'Szare',gray:'Szare',yellow:'Żółte',red:'Czerwone',green:'Zielone',purple:'Fioletowe'};
const colorFilters = {blue:'none',brown:'sepia(1) saturate(3) hue-rotate(-18deg) brightness(.8)',grey:'grayscale(1)',gray:'grayscale(1)',yellow:'sepia(1) saturate(3)',red:'hue-rotate(145deg)',green:'hue-rotate(260deg)',purple:'hue-rotate(55deg)'};
// Recolor only blue pixels, preserving the original gold ornament and borders.
const coloredSpriteCache = new Map();
function cardSpriteSource(source, color) {
  if (!['red','grey','gray','green','yellow'].includes(color)) return Promise.resolve(source);
  const key = color + ':' + source;
  if (!coloredSpriteCache.has(key)) coloredSpriteCache.set(key, (async () => {
    const image = await loadImage(source);
    const canvas = document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      if(b>r*1.3 && b>g*1.05){
        if(color === 'red'){
        pixels.data[i]=Math.min(255,b*.95);pixels.data[i+1]=r*.16;pixels.data[i+2]=r*.12;
        }else if(color === 'yellow'){pixels.data[i]=Math.min(255,b*1.42);pixels.data[i+1]=Math.min(255,b*.91);pixels.data[i+2]=b*.045;}else if(color === 'green'){pixels.data[i]=Math.min(255,b*.2208);pixels.data[i+1]=Math.min(255,b*.8096);pixels.data[i+2]=b*.023;}else{const grey=Math.min(255,b*.8);pixels.data[i]=grey;pixels.data[i+1]=grey;pixels.data[i+2]=grey;}
      }
    }
    context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  })());
  return coloredSpriteCache.get(key);
}
function applyCardColor(image, color) {
  image.style.filter=['red','grey','gray','green','yellow'].includes(color)?'none':(colorFilters[color] || 'none');
  if(['red','grey','gray','green','yellow'].includes(color))cardSpriteSource(image.getAttribute('src'),color).then(source=>{image.src=source;}).catch(console.error);
}
function costEntries(card) { return Object.entries(card.cost || {}).flatMap(([resource,amount]) => Number.isInteger(amount) && amount > 0 ? Array(Math.min(amount,20)).fill([resource,1]) : []); }
function resourceFile(resource) { return resource; }
function cardDetails(card) {
  return [card.week ? 'Tydzień ' + card.week : '', card.players ? card.players + '+ graczy' : ''].filter(Boolean).join(' · ');
}
function makeCard(card) {
  const article = template.content.firstElementChild.cloneNode(true);
  article.querySelector('.card-button').removeAttribute('id');
  article.querySelector('.card-button').setAttribute('aria-label', 'Powiększ kartę ' + card.name);
  article.querySelector('.card-art').src = card.artwork;
  article.querySelector('.card-art').alt = 'Karta ' + card.name;
  article.querySelector('.card-name > span').textContent = card.name;
  article.querySelector('h3').textContent = card.name;
  article.querySelector('.card-caption p').textContent = cardDetails(card);
  applyCardColor(article.querySelector('.card-top'),card.color);
  const costRows = costEntries(card).length;
  const originalStrip = article.querySelector('.card-cost');
  if (!costRows) originalStrip.remove();
  else {
    const strip = document.createElement('span');
    strip.className = 'card-cost dynamic-cost-strip';
    strip.style.height = ((210 + (costRows - 1) * 130) / 1627 * 100) + '%';
    originalStrip.className = 'cost-strip-art';
    applyCardColor(originalStrip,card.color);
    originalStrip.replaceWith(strip);
    strip.append(originalStrip);
  }
  const costList = document.createElement('span');
  costList.className = 'card-cost-list';
  for (const [resource, amount] of costEntries(card)) {
    const entry = document.createElement('span'); entry.className = 'cost-entry';
    const image = document.createElement('img'); image.src = 'assets/cards/resources/' + resourceFile(resource) + '.png'; image.alt = resourceNames[resourceFile(resource)] || resource;
     
    if (resource !== 'coin') {
      entry.classList.add('framed-cost');
      if (['gold','crystal','gems'].includes(resource)) entry.classList.add('octagonal-cost');
      const palette = resourcePalette(resource);
      entry.style.background = 'radial-gradient(circle at center,'+palette[0]+' 0%,'+palette[1]+' 52%,'+palette[2]+' 100%)';
      entry.style.setProperty('--cost-background', entry.style.background);
    }
    entry.append(image); costList.append(entry);
  }
  article.querySelector('.game-card').append(costList);
  if (card.connection_cost?.length) {
    const alternative=document.createElement('span');alternative.className='connection-cost-strip';
    const background=document.createElement('img');background.className='connection-cost-art';background.src='assets/cards/template/card-cost-strip.png';background.alt='';applyCardColor(background,card.color);alternative.append(background);
    card.connection_cost.forEach(connection=>{const icon=document.createElement('img');icon.className='connection-cost-icon';icon.src='assets/cards/connections/'+connection+'.png';icon.alt='Alternatywny koszt: '+connection;alternative.append(icon);});
    article.querySelector('.game-card').append(alternative);
  }

  if (card.players != null && card.players !== '') {
    const players = document.createElement('span');
    players.className = 'card-players';
    players.textContent = card.players + '+';
    players.setAttribute('aria-label', 'Od ' + card.players + ' graczy');
    article.querySelector('.game-card').append(players);
  }
  (card.connections || []).slice(0,2).forEach((connection,index)=>{
    const image=document.createElement('img');image.className='card-connection';
    image.src='assets/cards/connections/'+connection+'.png';image.alt='Powiązanie: '+connection;
    image.style.top=((180+index*128)/1627*100)+'%';
    article.querySelector('.game-card').append(image);
  });
  article.querySelector('.card-number').textContent = card.id;
  const effects = article.querySelector('.card-effects');
  effects.replaceChildren();
  effects.setAttribute('aria-label',card.effect?.type==='coins_and_points_per_card'?'Za każdą własną kartę '+colors[card.effect.card_color]+': '+card.effect.coins+' monet i '+card.effect.points+' punktów':card.effect?.type==='coins_per_card'?'Monety za każdą kartę '+card.effect.card_color+' u siebie i obu sąsiadów: '+card.effect.amount:card.effect?.type==='trade'?'Handel z sąsiadem: '+card.effect.direction+', cena '+card.effect.price:card.effect?.type==='coin'?'Monety: '+card.effect.amount:card.effect?.type==='science'?'Nauka: '+card.effect.symbol:card.effect?.type==='points'?'Punkty zwycięstwa: '+card.effect.amount:card.effect?.type==='war'?'Siła militarna: '+(card.effect.amount || 1):'Efekt karty: '+effectGroups(card).map(group=>group.map(r=>resourceNames[r]).join(' i ')).join(' albo '));
  effectLayout(card).forEach(item=>{
 let token;
 if(item.type==='card_count_panel'){
 token=document.createElement('span');token.className='card-count-panel';
 const texture=document.createElement('img');texture.src='assets/cards/template/card-top.png';texture.alt='Karty: '+item.color;Object.assign(texture.style,{left:-(item.x+9)/1092*100+'cqw',top:-(item.y+9)/1092*100+'cqw'});applyCardColor(texture,item.color);token.append(texture);
 } else if(item.type==='trade_panel'){
 token=document.createElement('span');token.className='trade-panel'+(item.color==='grey'?' grey-trade-panel':'');
 const texture=document.createElement('img');texture.src='assets/cards/template/card-top.png';texture.alt='';if(item.color==='grey')applyCardColor(texture,'grey');token.append(texture);
 } else if(item.type==='arrow'){
 token=document.createElement('span');token.className='trade-arrow';
 const icon=document.createElement('img');icon.src='assets/cards/icons/arrow-'+item.direction+'.png';icon.alt='Handel: '+item.direction;token.append(icon);
 } else if(item.type==='science'){
 token=document.createElement('span');token.className='science-effect';
 const icon=document.createElement('img');icon.src='assets/cards/science/'+item.symbol+'.png';icon.alt='Nauka: '+item.symbol;token.append(icon);
 } else if(item.type==='points'||item.type==='coin'){
 token=document.createElement('span');token.className='points-effect';
 const icon=document.createElement('img');icon.src=item.type==='coin'?'assets/cards/resources/coin.png':'assets/cards/icons/points.png';icon.alt='';
 const amount=document.createElement('span');amount.textContent=item.amount;amount.style.fontSize=(item.width*.39/1092*100)+'cqw';amount.style.webkitTextStroke=(item.width*10/220/1092*100)+'cqw #000';token.append(icon,amount);
 } else if(item.type==='war'){
 token=document.createElement('span');token.className='war-effect';
 const icon=document.createElement('img');icon.src='assets/cards/icons/war.png';icon.alt='Siła militarna';token.append(icon);
 } else if(item.type==='slash'){
 token=document.createElement('span');token.className='effect-choice-slash';token.setAttribute('aria-hidden','true');
 const image=document.createElement('img');image.src='assets/cards/template/effect-choice-slash.png';image.alt='';
 image.addEventListener('error',()=>{image.remove();token.classList.add('slash-fallback');},{once:true});token.append(image);
 } else {
 token=document.createElement('span');token.className='resource-effect';
 const octagonal=['gold','crystal','gems'].includes(item.resource);if(octagonal)token.classList.add('octagonal-effect');
 const ring=document.createElement('img');ring.className='effect-ring';ring.src=octagonal?'assets/cards/template/card-effect-octagon.png':'assets/cards/template/card-effect-ring.png';ring.alt='';
 const center=document.createElement('span');center.className='effect-center';
 const palette=resourcePalette(item.resource);center.style.background='radial-gradient(circle at center,'+palette[0]+' 0%,'+palette[1]+' 52%,'+palette[2]+' 100%)';
 const icon=document.createElement('img');icon.className='effect-resource';icon.src='assets/cards/resources/'+item.resource+'.png';icon.alt='';
 center.append(icon);token.append(ring,center);
 }
 Object.assign(token.style,{position:'absolute',left:item.x/1092*100+'%',top:item.y/1627*100+'%',width:item.width/1092*100+'%',height:item.height/1627*100+'%'});effects.append(token);
 });
  article.querySelector('.card-button').addEventListener('click',()=>{
    selectedCard=card;
    preview.replaceChildren(article.querySelector('.game-card').cloneNode(true));
    document.querySelector('#preview-title').textContent=card.name;
    document.querySelector('#download-status').textContent='';
    dialog.showModal();
  });
  return article;
}
function render() {
  const query=search.value.trim().toLocaleLowerCase('pl');
  const visible=cards.filter(card=>(activeWeek==='all'||Number(card.week)===activeWeek)&&(activeColor==='all'||card.color===activeColor)&&
    [card.id,card.name,cardDetails(card),...effectResources(card).map(r=>resourceNames[r])].join(' ').toLocaleLowerCase('pl').includes(query));
  grid.replaceChildren(...visible.map(makeCard));
  document.querySelector('#card-count').textContent=String(visible.length).padStart(2,'0');
  document.querySelector('#empty-state').hidden=visible.length!==0;
}
function renderFilters() {
  const weekFilters=document.querySelector('#week-filters');weekFilters.replaceChildren();
  const weeks=[...new Set(cards.map(card=>Number(card.week)).filter(Number.isFinite))].sort((a,b)=>a-b);
  for(const [value,label] of [['all','Wszystkie tygodnie'],...weeks.map(week=>[week,'Tydzień '+week])]){
    const button=document.createElement('button');button.type='button';button.className='filter';button.textContent=label;
    button.setAttribute('aria-pressed',String(value===activeWeek));
    button.addEventListener('click',()=>{activeWeek=value;renderFilters();render();});weekFilters.append(button);
  }
  filters.replaceChildren();
  for(const [value,label] of [['all','Wszystkie'],...Array.from(new Set(cards.map(c=>c.color))).map(color=>[color,colors[color] || color])]){
    const button=document.createElement('button');button.type='button';button.className='filter';button.textContent=label;
    button.setAttribute('aria-pressed',String(value===activeColor));
    button.addEventListener('click',()=>{activeColor=value;renderFilters();render();});filters.append(button);
  }
}
search.addEventListener('input',render);
document.querySelector('#reset-search').addEventListener('click',()=>{search.value='';activeColor='all';activeWeek='all';renderFilters();render();search.focus();});
document.querySelector('#close-card').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();});
document.querySelector('#guides').addEventListener('change',event=>document.body.classList.toggle('show-guides',event.target.checked));
document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){event.preventDefault();search.focus();}});
async function loadImage(src){const image=new Image();image.src=src;await image.decode();return image;}
async function downloadCard(){
  if(!selectedCard)return;
  const button=document.querySelector('#download-card'),status=document.querySelector('#download-status');
  button.disabled=true;status.textContent='Przygotowuję PNG…';
  try{
    const canvas=document.createElement('canvas');canvas.width=1092;canvas.height=1627;let ctx=canvas.getContext('2d');
    for(const [src,x,y,w,h] of [[selectedCard.artwork,0,473,1092,1154],['assets/cards/template/card-top.png',0,0,1092,473],['assets/cards/template/card-name-banner.png',146,81,800,87]]){
      ctx.save();
      const isTemplate = src.endsWith('card-top.png') || src.endsWith('card-cost-strip.png');
      if (isTemplate && !['red','grey','gray','green','yellow'].includes(selectedCard.color)) ctx.filter = colorFilters[selectedCard.color] || 'none';
      ctx.drawImage(await loadImage(isTemplate ? await cardSpriteSource(src,selectedCard.color) : src),x,y,w,h);ctx.restore();
    }
    const rowCount = costEntries(selectedCard).length;
    if (rowCount) {
      const strip = await loadImage(await cardSpriteSource('assets/cards/template/card-cost-strip.png',selectedCard.color));
      const height = 210 + (rowCount - 1) * 130;
      ctx.save();ctx.filter = ['red','grey','gray','green','yellow'].includes(selectedCard.color) ? 'none' : (colorFilters[selectedCard.color] || 'none');
      ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;ctx.drawImage(strip,0,Math.max(0,1012-height),150,Math.min(height,1012),71,473,150,height);ctx.restore();
    }
    if (selectedCard.connection_cost?.length) {
      const strip=await loadImage(await cardSpriteSource('assets/cards/template/card-cost-strip.png',selectedCard.color));
      const height=selectedCard.connection_cost.length*170+70;
      ctx.save();ctx.filter=['red','grey','gray','green','yellow'].includes(selectedCard.color)?'none':(colorFilters[selectedCard.color]||'none');ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;ctx.drawImage(strip,0,1012-height,150,height,247,473,150,height);ctx.restore();
      for(const [index,connection] of selectedCard.connection_cost.entries()) {
        const icon=await loadImage('assets/cards/connections/'+connection+'.png'),size=130,scale=Math.min(size/icon.width,size/icon.height);
        ctx.save();ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;ctx.drawImage(icon,257+(size-icon.width*scale)/2,493+index*170+(size-icon.height*scale)/2,icon.width*scale,icon.height*scale);ctx.restore();
      }
    }
    ctx.fillStyle='#f0d57e';ctx.font='45.864px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(selectedCard.name,546,124.5,752);
 const ring=effectResources(selectedCard).length?await loadImage('assets/cards/template/card-effect-ring.png'):null;
 let slash=null;if(effectItems(selectedCard).some(i=>i.type==='slash')){try{slash=await loadImage('assets/cards/template/effect-choice-slash.png');}catch{}}
 for(const item of effectLayout(selectedCard)){
 const outputContext=ctx,bonusCanvas=document.createElement('canvas');bonusCanvas.width=1092;bonusCanvas.height=1627;ctx=bonusCanvas.getContext('2d');
 try {
 const {x,y,width,height}=item;
 if(item.type==='card_count_panel'){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,height,18);ctx.fillStyle='#fff';ctx.fill();ctx.clip();ctx.filter=['red','grey','gray','green','yellow'].includes(item.color)?'none':(colorFilters[item.color]||'none');ctx.drawImage(await loadImage(await cardSpriteSource('assets/cards/template/card-top.png',item.color)),x+9,y+9,width-18,height-18,x+9,y+9,width-18,height-18);ctx.restore();continue;
 }
 if(item.type==='trade_panel'){
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,width,height,height/2);ctx.clip();ctx.filter=item.color==='grey'?'none':colorFilters.brown;ctx.drawImage(await loadImage(await cardSpriteSource('assets/cards/template/card-top.png',item.color)),0,170,1092,245,x,y,width,height);ctx.restore();continue;
 }
 if(item.type==='arrow'){
 ctx.save();ctx.filter='sepia(1) saturate(3) brightness(1.1)';ctx.drawImage(await loadImage('assets/cards/icons/arrow-'+item.direction+'.png'),x,y,width,height);ctx.restore();continue;
 }
 if(item.type==='science'){
 const icon=await loadImage('assets/cards/science/'+item.symbol+'.png');const scale=Math.min(width/icon.width,height/icon.height);ctx.drawImage(icon,x+(width-icon.width*scale)/2,y+(height-icon.height*scale)/2,icon.width*scale,icon.height*scale);continue;
 }
 if(item.type==='points'||item.type==='coin'){
 const icon=await loadImage(item.type==='coin'?'assets/cards/resources/coin.png':'assets/cards/icons/points.png');const scale=Math.min(width/icon.width,height/icon.height);ctx.drawImage(icon,x+(width-icon.width*scale)/2,y+(height-icon.height*scale)/2,icon.width*scale,icon.height*scale);
 ctx.save();ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=width*10/220;ctx.lineJoin='round';ctx.font='bold '+(width*.39)+'px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(String(item.amount),x+width/2,y+height*.42);ctx.fillText(String(item.amount),x+width/2,y+height*.42);ctx.restore();continue;
 }
 if(item.type==='war'){
 const icon=await loadImage('assets/cards/icons/war.png');const scale=Math.min(width/icon.width,height/icon.height)*.9;ctx.drawImage(icon,x+(width-icon.width*scale)/2,y+(height-icon.height*scale)/2,icon.width*scale,icon.height*scale);continue;
 }
 if(item.type==='slash'){
 if(slash)ctx.drawImage(slash,x,y,width,height);
 else {ctx.save();ctx.shadowColor='#160a00';ctx.shadowBlur=5;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;const fill=ctx.createLinearGradient(x,y,x+width,y);fill.addColorStop(0,'#9c8b70');fill.addColorStop(.5,'#fffdf1');fill.addColorStop(1,'#e6ddca');ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+width*.52,y+height*.08);ctx.lineTo(x+width*.84,y+height*.12);ctx.lineTo(x+width*.48,y+height*.92);ctx.lineTo(x+width*.16,y+height*.88);ctx.closePath();ctx.fill();ctx.restore();}continue;
 }
 if(['gold','crystal','gems'].includes(item.resource)) {
   const cx=x+width/2,cy=y+height/2;
   ctx.save();ctx.beginPath();
   const inset=width*.04,edge=width*.292893;
   for(const [i,[px,py]] of [[edge,inset],[width-edge,inset],[width-inset,edge],[width-inset,height-edge],[width-edge,height-inset],[edge,height-inset],[inset,height-edge],[inset,edge]].entries()) {if(i===0)ctx.moveTo(x+px,y+py);else ctx.lineTo(x+px,y+py);}
   ctx.closePath();ctx.clip();
   const palette=resourcePalette(item.resource),gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,width/2);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.52,palette[1]);gradient.addColorStop(1,palette[2]);ctx.fillStyle=gradient;ctx.fillRect(x,y,width,height);ctx.restore();
   ctx.drawImage(await loadImage('assets/cards/template/card-effect-octagon.png'),x,y,width,height);
   const icon=await loadImage('assets/cards/resources/'+item.resource+'.png');const scale=Math.min(width*.9/icon.width,height*.9/icon.height);ctx.drawImage(icon,cx-icon.width*scale/2,cy-icon.height*scale/2,icon.width*scale,icon.height*scale);
   continue;
 }
 const cx=x+width/2,cy=y+height/2,r=width*.45;
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
 const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,r);const palette=resourcePalette(item.resource);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.52,palette[1]);gradient.addColorStop(1,palette[2]);ctx.fillStyle=gradient;ctx.fillRect(cx-r,cy-r,r*2,r*2);
 ctx.restore();ctx.save();ctx.beginPath();ctx.arc(cx,cy,width/2,0,Math.PI*2);ctx.arc(cx,cy,width*.43,0,Math.PI*2,true);ctx.clip('evenodd');ctx.drawImage(ring,x,y,width,height);ctx.restore();ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
 const icon=await loadImage('assets/cards/resources/'+item.resource+'.png');const scale=Math.min(r*2/icon.width,r*2/icon.height);ctx.drawImage(icon,cx-icon.width*scale/2,cy-icon.height*scale/2,icon.width*scale,icon.height*scale);ctx.restore();
 } finally {
 ctx=outputContext;ctx.save();ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;ctx.drawImage(bonusCanvas,0,0);ctx.restore();
 }
 }
    for (const [index, [resource, amount]] of costEntries(selectedCard).entries()) {
      const costOutput=ctx,costCanvas=document.createElement('canvas');costCanvas.width=1092;costCanvas.height=1627;ctx=costCanvas.getContext('2d');
      try {
      const image = await loadImage('assets/cards/resources/' + resourceFile(resource) + '.png');
      const isResource = resource !== 'coin';
      const size = isResource ? 117 : 130, x = 81 + (130-size)/2, y = 483 + index * 130 + (130-size)/2;
      const framed = resource !== 'coin';
      if (framed) {
        const palette=resourcePalette(resource),cx=x+size/2,cy=y+size/2;
        const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,size/2);gradient.addColorStop(0,palette[0]);gradient.addColorStop(.52,palette[1]);gradient.addColorStop(1,palette[2]);
        ctx.save();
        if (['gold','crystal','gems'].includes(resource)) {
          function octagon(inset) {
            const side=size-inset*2,cut=side*.292893,ox=x+inset,oy=y+inset;
            ctx.beginPath();[[cut,0],[side-cut,0],[side,cut],[side,side-cut],[side-cut,side],[cut,side],[0,side-cut],[0,cut]].forEach(([px,py],i)=>i?ctx.lineTo(ox+px,oy+py):ctx.moveTo(ox+px,oy+py));ctx.closePath();
          }
          octagon(0);ctx.fillStyle='#e4c667';ctx.fill();octagon(10);ctx.fillStyle=gradient;ctx.fill();
        } else {
          ctx.beginPath();ctx.arc(cx,cy,size/2-5,0,Math.PI*2);ctx.fillStyle=gradient;ctx.fill();ctx.lineWidth=10;ctx.strokeStyle='#e4c667';ctx.stroke();
        }
        ctx.restore();
      }
      const iconSize=framed?size*.84:size;
      const scale = Math.min(iconSize / image.width, iconSize / image.height);
      ctx.drawImage(image, x + (size - image.width * scale)/2, y + (size - image.height * scale)/2, image.width*scale, image.height*scale);
      } finally {
        ctx=costOutput;ctx.save();ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;ctx.drawImage(costCanvas,0,0);ctx.restore();
      }
    }
    ctx.save();const panelShadow=ctx.createLinearGradient(0,473,0,485);panelShadow.addColorStop(0,'rgba(0,0,0,.7)');panelShadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=panelShadow;ctx.fillRect(0,473,1092,12);ctx.restore();
    if (selectedCard.players != null && selectedCard.players !== '') {
      ctx.save();ctx.font='bold 54px Georgia';ctx.textAlign='right';ctx.textBaseline='bottom';ctx.lineJoin='round';ctx.lineWidth=6;ctx.strokeStyle='#000';ctx.fillStyle='#fff';
      ctx.strokeText(selectedCard.players + '+',1021,1557);ctx.fillText(selectedCard.players + '+',1021,1557);ctx.restore();
    }
    for(const [index,connection] of (selectedCard.connections || []).slice(0,2).entries()) {
      const icon=await loadImage('assets/cards/connections/'+connection+'.png');
      const size=120,x=896,y=180+index*128,scale=Math.min(size/icon.width,size/icon.height);
      ctx.save();ctx.shadowColor='rgba(0,0,0,.78)';ctx.shadowOffsetX=6;ctx.shadowOffsetY=9;ctx.shadowBlur=12;
      ctx.drawImage(icon,x+(size-icon.width*scale)/2,y+(size-icon.height*scale)/2,icon.width*scale,icon.height*scale);ctx.restore();
    }
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Nie udało się utworzyć PNG')),'image/png'));
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=selectedCard.id+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Karta pobrana jako PNG.';
  }catch(error){status.textContent='Nie udało się pobrać PNG. Otwórz galerię przez lokalny serwer HTTP.';console.error(error);}
  finally{button.disabled=false;}
}
document.querySelector('#download-card').addEventListener('click',downloadCard);
async function initializeGallery() {
  try {
    const response = await fetch('cards.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('cards.json musi zawierać tablicę kart.');
    cards = data;
    renderFilters();
    render();
  } catch (error) {
    console.error(error);
    document.querySelector('#card-count').textContent = '00';
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = 'Nie udało się wczytać cards.json. Otwórz galerię przez lokalny serwer HTTP.';
    grid.replaceChildren(message);
  }
}
initializeGallery();


// Layered artwork follows the card and town gallery renderers.
function resourceList(resources) {
 return Object.entries(resources || {}).flatMap(([resource, amount]) => Object.hasOwn(resourceNames, resource) && Number.isInteger(amount) && amount > 0 ? Array(Math.min(amount,20)).fill(resource) : []);
}
function effectGroups(card) {
 return card.effect?.type === 'resource_choice' ? (card.effect.options || []).map(resourceList).filter(g=>g.length) : [resourceList(card.effect?.resources)].filter(g=>g.length);
}
function effectResources(card) { return card.effect?.type==='trade' ? card.effect.resources : effectGroups(card).flat(); }
function effectItems(card) {
 if(card.effect?.type==='science_choice')return card.effect.options.flatMap((symbol,index)=>[...(index?[{type:'slash'}]:[]),{type:'science',symbol}]);
 if(card.effect?.type==='science')return [{type:'science',symbol:card.effect.symbol}];
 if(card.effect?.type==='coin')return [{type:'coin',amount:card.effect.amount || 0}];
 if(card.effect?.type==='points')return [{type:'points',amount:card.effect.amount || 0}];
 if(card.effect?.type==='war') return Array.from({length:Math.max(1,Math.min(10,Number(card.effect.amount)||1))},()=>({type:'war'}));
 const items=[];effectGroups(card).forEach((group,index)=>{if(index)items.push({type:'slash'});group.forEach(resource=>items.push({type:'resource',resource}));});return items;
}
function effectLayout(card) {
 if(card.effect?.type==='coins_and_points_per_pyramid')return [
 {type:'pyramid',symbol:'pyramid_sliced',x:456,y:205,width:180,height:180},
 {type:'coin',amount:card.effect.coins,x:410,y:302,width:106,height:106},
 {type:'points',amount:card.effect.points,x:580,y:302,width:96,height:106}
 ];
 if(card.effect?.type==='points_per_pyramid')return [
 {type:'pyramid',symbol:card.effect.target==='stage'?'pyramid_sliced':'pyramid',x:446,y:205,width:180,height:180},
 {type:'points',amount:card.effect.amount,x:550,y:302,width:106,height:116},
 ...(['neighbors','self_and_neighbors'].includes(card.effect.scope)?[{type:'arrow',direction:'left',x:340,y:283,width:64,height:64},{type:'arrow',direction:'right',x:688,y:283,width:64,height:64}]:[]),
 ...(card.effect.scope==='self_and_neighbors'?[{type:'arrow',direction:'down',x:514,y:395,width:64,height:64}]:[])
 ].map(item=>({...item,y:item.y-(card.effect.scope==='self_and_neighbors'?30:0)})).sort((a,b)=>(a.type==='points')-(b.type==='points'));
 if(card.effect?.type==='points_per_card'){
 const palette=card.effect.card_colors,step=195,start=546-(palette.length-1)*step/2;
 return [
 ...palette.flatMap((color,index)=>[{type:'card_count_panel',color,x:start+index*step-61,y:205,width:122,height:175},{type:'points',amount:card.effect.amount,x:start+index*step-8,y:302,width:96,height:106}]),
 ...(card.effect.scope==='neighbors'?[{type:'arrow',direction:'left',x:340,y:283,width:64,height:64},{type:'arrow',direction:'right',x:688,y:283,width:64,height:64}]:[])
 ];
 }

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
 const scienceChoice=card.effect?.type==='science_choice';
 const tokenSize=scienceChoice?188.1:windmillChoice?138:compactChoice?180:220,slashWidth=scienceChoice?68.4:windmillChoice?46:compactChoice?60:80;
 const items=effectItems(card),gap=compactChoice?8:items.length===2&&items.every(item=>item.type==='resource')?42:18,nominal=items.reduce((sum,i)=>sum+(i.type==='slash'?slashWidth:tokenSize),0)+Math.max(0,items.length-1)*gap,scale=Math.min(1,917/Math.max(1,nominal));
 let x=(1092-nominal*scale)/2;
 return items.map(item=>{const width=(item.type==='slash'?slashWidth:tokenSize)*scale,height=(item.type==='slash'?(compactChoice?100:120):tokenSize)*scale;const layout={...item,x,y:205+(220-height)/2-(item.type==='war'?10:0)-(scienceChoice?15:0),width,height};x+=width+gap*scale;return layout;});
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
const colors = {blue:'Niebieskie',brown:'Brązowe',grey:'Szare',gray:'Szare',yellow:'Żółte',red:'Czerwone',green:'Zielone',purple:'Fioletowe'};
const colorFilters = {blue:'none',brown:'sepia(1) saturate(3) hue-rotate(-18deg) brightness(.8)',grey:'grayscale(1)',gray:'grayscale(1)',yellow:'sepia(1) saturate(3)',red:'hue-rotate(145deg)',green:'hue-rotate(260deg)',purple:'hue-rotate(55deg)'};
// Recolor only blue pixels, preserving the original gold ornament and borders.
const coloredSpriteCache = new Map();
function cardSpriteSource(source, color) {
  if (!['red','grey','gray','green','yellow','purple'].includes(color)) return Promise.resolve(source);
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
        }else if(color === 'purple'){pixels.data[i]=b*.64;pixels.data[i+1]=b*.32;pixels.data[i+2]=b*.86;}else if(color === 'yellow'){pixels.data[i]=Math.min(255,b*1.42);pixels.data[i+1]=Math.min(255,b*.91);pixels.data[i+2]=b*.045;}else if(color === 'green'){pixels.data[i]=Math.min(255,b*.2208);pixels.data[i+1]=Math.min(255,b*.8096);pixels.data[i+2]=b*.023;}else{const grey=Math.min(255,b*.8);pixels.data[i]=grey;pixels.data[i+1]=grey;pixels.data[i+2]=grey;}
      }
    }
    context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  })());
  return coloredSpriteCache.get(key);
}
const pendingCardColors = new WeakMap();
// Clones must follow pending recoloring, including clones of saved hand snapshots.
export function cloneCardSurface(surface) {
  const clone = surface.cloneNode(true);
  const originals = [...surface.querySelectorAll('img')];
  const copies = [...clone.querySelectorAll('img')];
  originals.forEach((image, index) => {
    const pending = pendingCardColors.get(image);
    if (pending) {
      pendingCardColors.set(copies[index], pending);
      pending.then(source => { copies[index].src = source; }).catch(console.error);
    }
  });
  return clone;
}
function applyCardColor(image, color) {
  image.style.filter=['red','grey','gray','green','yellow','purple'].includes(color)?'none':(colorFilters[color] || 'none');
    if(['red','grey','gray','green','yellow','purple'].includes(color)) {
    const pending = cardSpriteSource(image.getAttribute('src'),color);
    pendingCardColors.set(image, pending);
    pending.then(source=>{image.src=source;}).catch(console.error);
  }
}
function costEntries(card) { return Object.entries(card.cost || {}).flatMap(([resource,amount]) => Number.isInteger(amount) && amount > 0 ? Array(Math.min(amount,20)).fill([resource,1]) : []); }
function resourceFile(resource) { return resource; }
function cardDetails(card) {
  return [card.week ? 'Tydzień ' + card.week : '', card.players ? card.players + '+ graczy' : ''].filter(Boolean).join(' · ');
}
const template=document.createElement("template");
template.innerHTML="<article class=\"gallery-item\"><button class=\"card-button\" id=\"open-card\" aria-label=\"Powiększ kartę Example\"><span class=\"game-card\">\n<img class=\"card-art\" src=\"assets/cards/artwork/example.png\" alt=\"Skaliste zbocze z niewielkim wodospadem\" width=\"1092\" height=\"1154\">\n<img class=\"card-top\" src=\"assets/cards/template/card-top.png\" alt=\"\" width=\"1092\" height=\"473\">\n<img class=\"card-cost\" src=\"assets/cards/template/card-cost-strip.png\" alt=\"\" width=\"150\" height=\"1012\">\n<span class=\"card-name\"><img src=\"assets/cards/template/card-name-banner.png\" alt=\"\" width=\"800\" height=\"87\"><span>Example</span></span>\n<span class=\"card-effects\" data-resources=\"wood\" role=\"img\" aria-label=\"Efekt karty: drewno\"></span>\n<span class=\"safe-area\" aria-hidden=\"true\"></span>\n</span><span class=\"zoom-hint\">Powiększ ↗</span></button><div class=\"card-caption\"><div><h3>Example</h3><p>Karta przykładowa</p></div><span class=\"card-number\">001</span></div></article>";
async function loadImage(src){const image=new Image();image.src=src;await image.decode();return image;}
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
  effects.setAttribute('aria-label',card.effect?.type==='coins_and_points_per_pyramid'?'Za każdy własny etap piramidy: '+card.effect.coins+' monet i '+card.effect.points+' punktów':card.effect?.type==='points_per_pyramid'?card.effect.amount+' punktów za '+(card.effect.target==='stage'?'każdy etap piramid':'każdą ukończoną piramidę')+' '+(card.effect.scope==='self_and_neighbors'?'u siebie i obu sąsiadów':card.effect.scope==='neighbors'?'u obu sąsiadów':'u siebie'):card.effect?.type==='points_per_card'?'Punkty za każdą kartę ('+card.effect.card_colors.map(c=>colors[c]).join(', ')+') '+(card.effect.scope==='neighbors'?'u obu sąsiadów':'u siebie')+': '+card.effect.amount:card.effect?.type==='science_choice'?'Wybierz jeden symbol nauki: '+card.effect.options.join(', '):card.effect?.type==='coins_and_points_per_card'?'Za każdą własną kartę '+colors[card.effect.card_color]+': '+card.effect.coins+' monet i '+card.effect.points+' punktów':card.effect?.type==='coins_per_card'?'Monety za każdą kartę '+card.effect.card_color+' u siebie i obu sąsiadów: '+card.effect.amount:card.effect?.type==='trade'?'Handel z sąsiadem: '+card.effect.direction+', cena '+card.effect.price:card.effect?.type==='coin'?'Monety: '+card.effect.amount:card.effect?.type==='science'?'Nauka: '+card.effect.symbol:card.effect?.type==='points'?'Punkty zwycięstwa: '+card.effect.amount:card.effect?.type==='war'?'Siła militarna: '+(card.effect.amount || 1):'Efekt karty: '+effectGroups(card).map(group=>group.map(r=>resourceNames[r]).join(' i ')).join(' albo '));
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
 const icon=document.createElement('img');icon.src='assets/cards/icons/arrow-'+item.direction+'.png';icon.alt='Handel: '+item.direction;if(card.color==='purple')icon.style.filter='sepia(1) saturate(3) hue-rotate(220deg)';token.append(icon);
 } else if(item.type==='science'||item.type==='pyramid'){
 token=document.createElement('span');token.className='science-effect';
 const icon=document.createElement('img');icon.src='assets/cards/'+(item.type==='pyramid'?'icons/':'science/')+item.symbol+'.png';icon.alt=item.type==='pyramid'?'Piramida':'Nauka: '+item.symbol;token.append(icon);
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
  return article;
}
export function cardSurface(card){
 const crop=document.createElement('span');crop.className='play-card-crop';
 const surface=makeCard(card).querySelector('.game-card');
 surface.querySelector('.safe-area')?.remove();crop.append(surface);return crop;
}
const boardResourceNames = {wood:'drewno',ore:'ruda',mercury:'rtęć',sulfur:'siarka',crystal:'kryształ',gems:'klejnoty',gold:'złoto'};
const preciousResources = new Set(['gold', 'crystal', 'gems']);
const boardResourcePalettes = {
  wood: ['#c68b4d','#955c30','#4e2c19'],
  mercury: ['#d7d2c1','#a7a392','#58574f'],
  ore: ['#777166','#49463f','#191916'],
  sulfur: ['#f2df85','#c3ab4e','#79632b'],
  crystal: ['#e04c48','#b62c2c','#771819'],
  gems: ['#655bd8','#4941ba','#2d267d'],
  gold: ['#fae49a','#c5a14a','#765321']
};
// Same blue-pixel recoloring as cardSpriteSource in gallery.js.
const greyBoardTextures = new Map();
function greyBoardTextureSource(path) {
  if (!greyBoardTextures.has(path)) greyBoardTextures.set(path, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
          if (b > r * 1.3 && b > g * 1.05) {
            const grey = Math.min(255, b * .8);
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
          }
        }
        context.putImageData(pixels, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (error) { reject(error); }
    };
    image.onerror = () => reject(new Error('Nie udało się wczytać paska planszy.'));
    image.src = path;
  }));
  return greyBoardTextures.get(path);
}

function stageIcon(source, label) {
  const image = document.createElement('img');
  image.src = source;
  image.alt = label;
  return image;
}

function stageBonus(effect) {
  const bonus = document.createElement('span');
  bonus.className = 'board-stage-bonus';
  if (!effect) {
    bonus.textContent = '—';
    bonus.setAttribute('aria-label', 'Bonus do ustalenia');
  } else if (['discard_free', 'color_free'].includes(effect.type)) {
    bonus.classList.add('board-special-bonus');
    const discard = effect.type === 'discard_free';
    bonus.append(stageIcon('assets/towns/bonuses/' + (discard ? 'free_discard.png' : 'free_color.png'), discard ? 'Darmowa budowa ze stosu odrzuconych' : 'Darmowa budowa według koloru'));
  } else if (effect.type === 'war') {
    for (let i = 0; i < Math.max(1, Math.min(10, Number(effect.amount) || 1)); i++) {
      const token = document.createElement('span');
      token.className = 'board-stage-reward war-effect';
      token.append(stageIcon('assets/cards/icons/war.png', '1 punkt siły militarnej'));
      bonus.append(token);
    }
  } else if (['points', 'coin'].includes(effect.type)) {
    const token = document.createElement('span');
    token.className = 'board-stage-reward ' + (effect.type === 'war' ? 'war-effect' : 'points-effect');
    token.append(stageIcon(effect.type === 'coin' ? 'assets/cards/resources/coin.png' : 'assets/cards/icons/' + effect.type + '.png', effect.type === 'points' ? 'Punkty' : effect.type === 'coin' ? 'Monety' : 'Siła militarna'));
    const amount = document.createElement('span');
    amount.textContent = effect.amount ?? 1;
    amount.style.fontSize = '2.145cqw';
    amount.style.webkitTextStroke = '.25cqw #000';
    if (effect.type !== 'war') token.append(amount);
    bonus.append(token);
  } else if (effect.type === 'resources' || effect.type === 'resource_choice') {
    const options = effect.type === 'resource_choice' ? effect.options : [effect.resources];
    if (effect.type === 'resource_choice') bonus.classList.add('board-resource-choice');
    (options || []).forEach((resources, index) => {
      if (index) {
        const slash = stageIcon('assets/cards/template/effect-choice-slash.png', 'albo');
        slash.className = 'board-bonus-slash';
        bonus.append(slash);
      }
      for (const [resource, amount] of Object.entries(resources || {})) {
        if (!Object.hasOwn(boardResourceNames, resource)) continue;
        for (let i = 0; i < Math.min(20, amount); i++) {
          const token = document.createElement('span');
          token.className = 'resource-effect' + (preciousResources.has(resource) ? ' octagonal-effect' : '');
          const ring = stageIcon('assets/cards/template/card-effect-' + (preciousResources.has(resource) ? 'octagon' : 'ring') + '.png', '');
          ring.className = 'effect-ring';
          const center = document.createElement('span');
          center.className = 'effect-center';
          const palette = boardResourcePalettes[resource];
          center.style.background = 'radial-gradient(circle at center,' + palette[0] + ' 0%,' + palette[1] + ' 52%,' + palette[2] + ' 100%)';
          const icon = stageIcon('assets/cards/resources/' + resource + '.png', boardResourceNames[resource]);
          icon.className = 'effect-resource';
          center.append(icon);
          token.append(ring, center);
          bonus.append(token);
        }
      }
    });
  } else if (effect.type === 'science_choice') {
    bonus.classList.add('board-science-choice');
    (effect.options || []).forEach((symbol, index) => {
      if (index) {
        const slash = stageIcon('assets/cards/template/effect-choice-slash.png', 'albo');
        slash.className = 'board-bonus-slash';
        bonus.append(slash);
      }
      bonus.append(stageIcon('assets/cards/science/' + symbol + '.png', symbol));
    });
  } else if (effect.type === 'science') {
    bonus.append(stageIcon('assets/cards/science/' + effect.symbol + '.png', effect.symbol));
  } else {
    bonus.textContent = effect.description || effect.type;
  }
  return bonus;
}

function boardStages(board) {
  const stages = document.createElement('span');
  stages.className = 'board-stages';
  (board.stages || []).forEach((stage, index) => {
    const segment = document.createElement('span');
    segment.className = 'board-stage';
    segment.setAttribute('role', 'group');
    segment.setAttribute('aria-label', 'Etap ' + (index + 1));
    const level = stageIcon('assets/towns/levels/' + board.stages.length + 'level' + (index + 1) + '.png', 'Etap ' + (index + 1));
    level.className = 'board-stage-level';
    const cost = document.createElement('span');
    cost.className = 'board-stage-cost card-cost-list';
    if (stage.cost_columns === 2) cost.classList.add('board-cost-two-columns');
    cost.setAttribute('aria-label', 'Koszt rozbudowy');
    if (stage.cost === null) {
      cost.textContent = '—';
      cost.setAttribute('aria-label', 'Koszt do ustalenia');
    } else {
      for (const [resource, amount] of Object.entries(stage.cost || {})) {
        if (resource !== 'coin' && !Object.hasOwn(boardResourceNames, resource)) continue;
        for (let i = 0; i < Math.min(20, amount); i++) {
          const entry = document.createElement('span');
          entry.className = 'cost-entry';
          if (resource !== 'coin') {
            entry.classList.add('framed-cost');
            if (preciousResources.has(resource)) entry.classList.add('octagonal-cost');
            const palette = boardResourcePalettes[resource];
            const background = 'radial-gradient(circle at center,' + palette[0] + ' 0%,' + palette[1] + ' 52%,' + palette[2] + ' 100%)';
            entry.style.background = background;
            entry.style.setProperty('--cost-background', background);
          }
          entry.append(stageIcon('assets/cards/resources/' + resource + '.png', resource === 'coin' ? 'Moneta' : boardResourceNames[resource]));
          cost.append(entry);
        }
      }
      if (!cost.childNodes.length) cost.textContent = '0';
    }
    segment.append(cost, stageBonus(stage.effect), level);
    stages.append(segment);
  });
  return stages;
}

export function boardSurface(board) {
  const surface = document.createElement('span');
  surface.className = 'board-surface';
  const artwork = document.createElement('img');
  artwork.className = 'board-artwork';
  artwork.src = board.artwork;
  artwork.alt = 'Plansza miasta ' + board.name;
  surface.append(artwork);
  if (Object.hasOwn(boardResourceNames, board.base_resource)) {
    const panel = document.createElement('span');
    panel.className = 'board-resource-panel' + (preciousResources.has(board.base_resource) ? ' precious-resource' : '');
    const ribbon = document.createElement('span');
    ribbon.className = 'board-resource-ribbon';
    const ribbonTexture = stageIcon('assets/towns/template/resource-top.png', '');
    ribbonTexture.className = 'board-panel-texture';
    ribbon.append(ribbonTexture);
    if (preciousResources.has(board.base_resource)) {
      greyBoardTextureSource('assets/towns/template/resource-top.png').then(source => {
        ribbonTexture.src = source;
      }).catch(console.error);
    }
    const tab = document.createElement('span');
    tab.className = 'board-resource-tab';
    const tabTexture = stageIcon('assets/towns/template/resource-tab.png', '');
    tabTexture.className = 'board-panel-texture';
    tab.append(tabTexture);
    if (preciousResources.has(board.base_resource)) {
      greyBoardTextureSource('assets/towns/template/resource-tab.png').then(source => {
        tabTexture.src = source;
      }).catch(console.error);
    }
    const token = document.createElement('span');
    token.className = 'resource-effect' + (preciousResources.has(board.base_resource) ? ' octagonal-effect' : '');
    token.setAttribute('role', 'img');
    token.setAttribute('aria-label', 'Bazowy surowiec: ' + boardResourceNames[board.base_resource]);
    const ring = document.createElement('img');
    ring.className = 'effect-ring';
    ring.src = preciousResources.has(board.base_resource) ? 'assets/cards/template/card-effect-octagon.png' : 'assets/cards/template/card-effect-ring.png';
    ring.alt = '';
    const center = document.createElement('span');
    center.className = 'effect-center';
    const palette = boardResourcePalettes[board.base_resource];
    center.style.background = 'radial-gradient(circle at center,' + palette[0] + ' 0%,' + palette[1] + ' 52%,' + palette[2] + ' 100%)';
    const icon = document.createElement('img');
    icon.className = 'effect-resource';
    icon.src = 'assets/cards/resources/' + board.base_resource + '.png';
    icon.alt = '';
    center.append(icon);
    token.append(ring, center);
    tab.append(token);
    panel.append(tab, ribbon);
    surface.append(panel);
  }
  const name = document.createElement('span');
  name.className = 'board-city-name';
  name.textContent = board.name;
  surface.append(name, boardStages(board));
  return surface;
}


// Same layered effect renderer and bounds fitting as the atlas.
export function cardBonusSurface(card){
 const layout=effectLayout(card),symbol=document.createElement('span');
 symbol.className='bonus-symbol game-card';
 const effects=makeCard(card).querySelector('.card-effects');
 if(layout.length){
  const left=Math.min(...layout.map(item=>item.x)),top=Math.min(...layout.map(item=>item.y));
  const width=Math.max(...layout.map(item=>item.x+item.width))-left;
  const height=Math.max(...layout.map(item=>item.y+item.height))-top;
  // Military strength changes the field width, never the size of each icon.
  const scale=card.effect?.type==='war'?48/height:Math.min(126/width,48/height);
  const frameWidth=Math.ceil(width*scale)+8;
  symbol.style.width=frameWidth+'px';
  Object.assign(effects.style,{width:1092*scale+'px',height:1627*scale+'px',left:(frameWidth-width*scale)/2-left*scale+'px',top:(56-height*scale)/2-top*scale+'px',containerType:'inline-size'});
 }
 symbol.append(effects);return symbol;
}
export function cardBonusBackground(card){
 const image=document.createElement('img');image.className='brown-card-background';image.src='assets/cards/template/card-top.png';image.alt='';applyCardColor(image,card.color);return image;
}

// Prepare generated textures before exposing the game controls.
export async function preloadGameVisuals(){
 const variants=[];
 for(const color of ['red','grey','gray','green','yellow','purple']){
  for(const source of ['assets/cards/template/card-top.png','assets/cards/template/card-cost-strip.png']){
   variants.push(cardSpriteSource(source,color));
  }
 }
 for(const source of ['assets/towns/template/resource-top.png','assets/towns/template/resource-tab.png'])variants.push(greyBoardTextureSource(source));
 const sources=await Promise.all(variants).catch(error=>{coloredSpriteCache.clear();greyBoardTextures.clear();throw error;});
 await Promise.all([...new Set(sources)].map(async source=>{const image=new Image();image.src=source;await image.decode();}));
}

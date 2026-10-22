const townDialog = document.querySelector('#town-dialog');
const townPreview = document.querySelector('#town-preview');
let selectedBoard = null;
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

function boardSurface(board) {
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

function makeBoard(board, index) {
  const article = document.createElement('article');
  article.innerHTML = '<button class="card-button town-button" type="button"><span class="zoom-hint">Powiększ ↗</span></button><div class="card-caption"><div><h3></h3></div><span class="card-number"></span></div>';
  const button = article.querySelector('button');
  button.prepend(boardSurface(board));
  button.setAttribute('aria-label', 'Powiększ planszę ' + board.name);
  article.querySelector('h3').textContent = board.name;
  article.querySelector('.card-number').textContent = String(index + 1).padStart(2, '0');
  button.addEventListener('click', () => {
    selectedBoard = board;
    document.querySelector('#town-download-status').textContent = '';
    document.querySelector('#town-preview-title').textContent = button.closest('article').querySelector('h3').textContent;
    townPreview.replaceChildren(boardSurface(board));
    townDialog.showModal();
  });
  return article;
}

async function initializeBoards() {
  const grid = document.querySelector('.town-grid');
  const count = document.querySelector('#board-count');
  try {
    const response = await fetch('boards.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const boards = await response.json();
    if (!Array.isArray(boards)) throw new Error('boards.json musi zawierać tablicę plansz.');
    grid.replaceChildren(...boards.map(makeBoard));
    count.textContent = String(boards.length).padStart(2, '0');
  } catch (error) {
    console.error(error);
    count.textContent = '00';
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.setAttribute('role', 'status');
    message.textContent = 'Nie udało się wczytać boards.json. Otwórz galerię przez lokalny serwer HTTP.';
    grid.replaceChildren(message);
  }
}

initializeBoards();

document.querySelector('#close-town').addEventListener('click', () => townDialog.close());
townDialog.addEventListener('click', event => {
  const bounds = townDialog.getBoundingClientRect();
  if (event.target === townDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) townDialog.close();
});

// Freeze the rendered layers, including pseudo-elements, into a self-contained SVG.
// Rasterizing that snapshot keeps the PNG in sync with the gallery's CSS layout.
async function boardSnapshot(surface) {
  const width = surface.getBoundingClientRect().width;
  const assets = new Map();
  function embed(url) {
    if (url.startsWith('data:')) return Promise.resolve(url);
    if (!assets.has(url)) assets.set(url, (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Nie udało się wczytać ' + url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    })());
    return assets.get(url);
  }
  async function copyStyle(source, target, pseudo) {
    const style = getComputedStyle(source, pseudo);
    for (const property of style) {
      if (property.startsWith('--')) continue;
      let value = style.getPropertyValue(property).replace(/([\d.]+)cqw/g, (_, n) => (Number(n) * width / 100) + 'px');
      const urls = [...value.matchAll(/url\(["']?(.*?)["']?\)/g)];
      for (const match of urls) value = value.replace(match[0], 'url("' + await embed(match[1]) + '")');
      target.style.setProperty(property, value);
    }
    target.style.setProperty('animation', 'none');
    target.style.setProperty('transition', 'none');
    return style;
  }
  async function clone(source) {
    if (source.nodeType !== Node.ELEMENT_NODE) return source.cloneNode();
    const target = source.cloneNode(false);
    await copyStyle(source, target);
    if (source instanceof HTMLImageElement) {
      target.removeAttribute('srcset');
      target.src = await embed(source.currentSrc || source.src);
    }
    for (const pseudo of ['::before', '::after']) {
      const content = getComputedStyle(source, pseudo).content;
      if (content === 'none' || content === 'normal') continue;
      const layer = document.createElement('span');
      await copyStyle(source, layer, pseudo);
      layer.textContent = content === '""' ? '' : content.replace(/^["']|["']$/g, '');
      if (pseudo === '::before') target.append(layer);
      else target._after = layer;
    }
    for (const child of source.childNodes) target.append(await clone(child));
    if (target._after) { target.append(target._after); delete target._after; }
    return target;
  }
  return clone(surface);
}

document.querySelector('#download-town').addEventListener('click', async () => {
  if (!selectedBoard) return;
  const board = selectedBoard;
  const button = document.querySelector('#download-town');
  const status = document.querySelector('#town-download-status');
  const surface = townPreview.querySelector('.board-surface');
  button.disabled = true;
  status.textContent = 'Przygotowywanie PNG…';
  try {
    await document.fonts.ready;
    await Promise.all([...greyBoardTextures.values()]);
    await Promise.all([...surface.querySelectorAll('img')].map(image => image.decode()));
    const artwork = surface.querySelector('.board-artwork');
    const bounds = surface.getBoundingClientRect();
    const snapshot = await boardSnapshot(surface);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + artwork.naturalWidth + '" height="' + artwork.naturalHeight + '" viewBox="0 0 ' + bounds.width + ' ' + bounds.height + '"><foreignObject width="100%" height="100%">' + new XMLSerializer().serializeToString(snapshot) + '</foreignObject></svg>';
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = artwork.naturalWidth;
    canvas.height = artwork.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Nie udało się utworzyć PNG.')), 'image/png'));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = board.id + '.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (selectedBoard === board) status.textContent = 'Planszetka pobrana jako PNG.';
  } catch (error) {
    console.error(error);
    if (selectedBoard === board) status.textContent = 'Nie udało się pobrać PNG. Spróbuj ponownie, otwierając galerię przez serwer HTTP.';
  } finally {
    button.disabled = false;
  }
});

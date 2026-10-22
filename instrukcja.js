import {cardSurface,boardSurface} from './game-visuals.js';
const [cards,boards]=await Promise.all(['cards.json','boards.json'].map(async path=>{const response=await fetch(path);if(!response.ok)throw new Error(`Nie udało się pobrać ${path}`);return response.json();}));
for(const slot of document.querySelectorAll('[data-card], [data-card-id]')){const card=cards.find(item=>slot.dataset.cardId ? item.id===slot.dataset.cardId : item.name===slot.dataset.card);if(card)slot.append(cardSurface(card));}
for(const slot of document.querySelectorAll('[data-board]')){const board=boards.find(item=>item.id===slot.dataset.board);if(board)slot.append(boardSurface(board));}

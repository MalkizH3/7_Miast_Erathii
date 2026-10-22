const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const trophy='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5h12v8a6 6 0 0 1-12 0V5ZM10 8H5v3a6 6 0 0 0 6 6M22 8h5v3a6 6 0 0 1-6 6M16 19v7M10 27h12"/></svg>';
const guild='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m4 10 12-6 12 6H4ZM7 13v11m6-11v11m6-11v11m6-11v11M4 27h24"/></svg>';
const categories=[['buildings','Budowle i miasto','assets/cards/icons/pyramid.png'],['science','Magia','assets/cards/science/wisdom.png'],['military','Wojna','assets/cards/icons/war.png'],['coins','Monety','assets/cards/resources/coin.png'],['guilds','Premie',null]];
export function renderResults(g,scorePlayer){
 const ranked=g.players.map((p,i)=>({p,s:g.scores?.[i]??scorePlayer(g,i)})).sort((a,b)=>b.s.total-a.s.total||b.p.coins-a.p.coins);
 let place=1;
 return `<section class="game-results" aria-labelledby="results-title"><header class="results-heading"><span class="results-trophy">${trophy}</span><div><p class="eyebrow">PODSUMOWANIE ROZGRYWKI</p><h3 id="results-title">Chwała miastom Erathii</h3><p>Każde miasto ma swoją historię. Oto końcowy ranking.</p></div></header><ol class="results-ranking">${ranked.map(({p,s},index)=>{
 const tied=index>0&&s.total===ranked[index-1].s.total&&p.coins===ranked[index-1].p.coins;
 if(!tied)place=index+1;
 return `<li class="result-card${place===1?' result-winner':''}"><div class="result-player"><span class="result-place" aria-label="Miejsce ${place}">${place===1?trophy:place}</span><div class="result-identity"><span class="result-caption">${place===1?'Zwycięstwo':`${place}. miejsce`}</span><h4>${escapeHtml(p.name)}</h4><span class="result-city">${escapeHtml(p.board?.name)}</span></div><div class="result-total"><strong>${s.total}</strong><span>punktów</span></div></div><dl class="result-breakdown">${categories.map(([key,label,asset])=>`<div class="result-stat result-stat-${key}"><dt><span class="result-icon">${asset?`<img src="${asset}" alt="" width="32" height="32">`:guild}</span>${label}</dt><dd>${s[key]}</dd></div>`).join('')}</dl></li>`;
 }).join('')}</ol><p class="results-note">O kolejności decydują punkty, a przy remisie liczba monet w skarbcu. Identyczne wyniki oznaczają wspólne miejsce.</p></section>`;
}

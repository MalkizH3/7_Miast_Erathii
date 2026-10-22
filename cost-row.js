// Clone the original cost tokens, preserving their artwork, frames and palettes.
export function createCostRow(source){
 const row=document.createElement('div');row.className='card-cost-list tooltip-cost-list';
 row.setAttribute('role','group');row.setAttribute('aria-label','Koszt budowy');
 const tokens=source?[...source.querySelectorAll('.cost-entry')]:[];
 if(tokens.length)tokens.forEach(token=>row.append(token.cloneNode(true)));
 else if(source?.textContent.trim()==='—')row.textContent='Koszt do ustalenia';
 else{const free=document.createElement('strong');free.textContent='Za darmo!';row.append(free);}
 return row;
}

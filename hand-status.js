export function cardBuildStatus(player,card,plans,freeBuild=false){
 if(player.cards.some(built=>built.name===card.name))return {tone:'unavailable',text:'masz już taką kartę!'};
 if((card.connection_cost||[]).some(link=>player.cards.some(built=>(built.connections||[]).includes(link))))return {tone:'affordable',text:'powiązana'};
 if(freeBuild)return {tone:'affordable',text:'stać cię'};
 if(!plans.length)return {tone:'unavailable',text:'nie stać cię'};
 const cost=Math.min(...plans.map(plan=>plan.bank+plan.left+plan.right));
 const unit=cost===1?'monetę':cost%10>=2&&cost%10<=4&&(cost%100<12||cost%100>14)?'monety':'monet';
 return cost>0?{tone:'paid',text:`zapłać ${cost} ${unit}`}:{tone:'affordable',text:'stać cię'};
}

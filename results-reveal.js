// Keep the previous hand area's height until the final battle and its pause end.
export function createResultsReveal(onReady,{schedule=setTimeout,cancel=clearTimeout}={}){
 let pending=false,height=0,timer=null;
 return {
  prepare(previousHeight){if(!pending){pending=true;height=Math.max(0,previousHeight);}},
  finishBattle(){
   if(!pending||timer!==null)return;
   timer=schedule(()=>{timer=null;pending=false;onReady();},2000);
  },
  reset(){if(timer!==null)cancel(timer);timer=null;pending=false;height=0;},
  get pending(){return pending;},get height(){return height;}
 };
}

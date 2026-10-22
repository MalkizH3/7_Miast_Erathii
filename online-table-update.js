// Snapshot delivery order must not remove a hand or rebuild unchanged towns.
export function onlineTableUpdate(room,hand,previousKey,hasTable,roomId){
 const synced=hand?.week===room.week&&hand?.round===room.round&&hand?.phase===room.status;
 const key=JSON.stringify([roomId,room.status,room.week,room.round,room.players,room.scores,room.pendingDiscard,synced?hand?.cards:null,synced?hand?.bonusCards:null]);
 if(hasTable&&!synced&&room.status!=='finished')return {kind:'waiting',key};
 return {kind:hasTable&&key===previousKey?'status':'render',key};
}

/* Работает в отдельном потоке. Неглубокий собственный учебный анализ, НЕ Stockfish. */
self.window=self;importScripts('./engine.js');
const E=self.CC, vals={p:100,n:320,b:340,r:510,q:950,k:0};
let nodes=0;
function evalPosition(s){let v=0,wp=0,bp=0;for(let i=0;i<128;i++){if(i&136){i+=7;continue}let p=s.b[i];if(p==='.')continue;const color=E.side(p),type=p.toLowerCase(),r=i>>4,f=i&7;
 let central=(3.5-Math.abs(f-3.5))+(3.5-Math.abs(r-3.5));let bonus=0;
 if(type==='p'){const advance=color===1?6-r:r-1;bonus=advance*6+central*3;if(color===1)wp++;else bp++}
 if(type==='n')bonus=central*13+(color===1?r===7?-18:0:r===0?-18:0);
 if(type==='b')bonus=central*7;
 if(type==='q')bonus=central*2;
 if(type==='r')bonus=central*2;
 if(type==='k'){const movedFromHome=color===1?r<7:r>0;bonus=(wp+bp>9&&movedFromHome&&!([2,6].includes(f))?-30:0)+(wp+bp<5?central*7:0)}
 v+=color*(vals[type]+bonus);
 }
 return v;
}
function rankMoves(s){const moves=E.legal(s);return moves.map(m=>{const hit=s.b[m[1]],taken=hit==='.'?0:vals[hit.toLowerCase()];const promoted=m[2]?vals[m[2]]:0;return{m,order:taken*10+promoted+(m[3]==='castle'?100:0)+(E.checked(E.apply(s,m))?65:0)}}).sort((a,b)=>b.order-a.order)}
function search(s,depth,alpha,beta){nodes++;
 if(nodes>700000)return{score:evalPosition(s)*s.t,line:[]};
 const legal=E.legal(s);if(!legal.length)return{score:E.checked(s)?-20000-depth:0,line:[]};if(s.half>=150)return{score:0,line:[]};if(depth<=0)return{score:evalPosition(s)*s.t,line:[]};
 let best=-Infinity,line=[],moves=rankMoves(s);
 for(const {m} of moves){const next=E.apply(s,m),result=search(next,depth-1,-beta,-alpha),sc=-result.score;if(sc>best){best=sc;line=[E.key(m),...result.line]}alpha=Math.max(alpha,sc);if(alpha>=beta)break}
 return{score:best,line};
}
function analyse(s,played,depth=2){nodes=0;const moves=rankMoves(s);let best=-Infinity,bestUci='',bestLine=[],playedScore=-Infinity,white=s.t;for(const {m} of moves){const after=E.apply(s,m),result=search(after,depth-1,-Infinity,Infinity),score=-result.score,uci=E.key(m);if(score>best){best=score;bestUci=uci;bestLine=[uci,...result.line]}if(uci===played)playedScore=score}
 const selected=moves.find(x=>E.key(x.m)===played),after=selected?E.apply(s,selected.m):s;
 return{bestUci,bestLine,playedScore,bestScore:best,gap:Math.max(0,Math.round(best-playedScore)),evalAfter:Math.round(evalPosition(after)),depth,nodes,side:white};
}
self.addEventListener('message',async event=>{const data=event.data;if(data?.type!=='start')return;const id=data.id;try{let s=E.start();const list=(data.uci||[]).slice(0,180);for(let i=0;i<list.length;i++){
 const played=list[i],move=E.legal(s).find(m=>E.key(m)===played);if(!move)throw Error('Некорректный ход '+played);
 const depth=2,result=analyse(s,played,depth);self.postMessage({type:'item',id,index:i,result});s=E.apply(s,move);
 if(i%2===1)await new Promise(resolve=>setTimeout(resolve,0));
 }self.postMessage({type:'done',id,count:list.length});}catch(e){self.postMessage({type:'error',id,message:String(e.message||e)})}});

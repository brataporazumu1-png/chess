(()=>{'use strict';
const $=id=>document.getElementById(id);
const clock={seconds:[180,180],running:false,turn:0,last:0,interval:null};
const fmt=n=>`${Math.floor(Math.max(0,n)/60)}:${String(Math.floor(Math.max(0,n)%60)).padStart(2,'0')}`;
function paint(){ $('whiteClock').textContent=fmt(clock.seconds[0]);$('blackClock').textContent=fmt(clock.seconds[1]);$('clockState').textContent=clock.running?'Часы идут — '+(clock.turn===0?'ход белых':'ход чёрных'):'Часы на паузе';}
function tick(){if(!clock.running)return;const now=performance.now();clock.seconds[clock.turn]-=(now-clock.last)/1000;clock.last=now;if(clock.seconds[clock.turn]<=0){clock.seconds[clock.turn]=0;clock.running=false;$('clockState').textContent='Время вышло: '+(clock.turn===0?'белые':'чёрные');}else paint();}
function reset(){clock.seconds=[180,180];clock.running=false;clock.turn=0;clock.last=performance.now();paint();}
$('clockStart').addEventListener('click',()=>{if(clock.seconds.some(n=>n<=0))reset();clock.running=!clock.running;clock.last=performance.now();paint();});
$('clockReset').addEventListener('click',reset);
document.addEventListener('chesscoach:move',()=>{if(!clock.running)return;tick();if(!clock.running)return;clock.seconds[clock.turn]+=2;clock.turn=1-clock.turn;clock.last=performance.now();paint();});
document.addEventListener('chesscoach:reset',reset);
clock.interval=setInterval(tick,200);paint();
const user='margix_01';$('profileName').textContent=user;
const api='https://api.chess.com/pub/player/'+encodeURIComponent(user)+'/games/';
const state={games:[]};
function dateMonth(d){return d.getUTCFullYear()+'/'+String(d.getUTCMonth()+1).padStart(2,'0');}
function result(g){const isWhite=g.white?.username?.toLowerCase()===user;const self=isWhite?g.white:g.black;return self?.result==='win'?'Победа':self?.result==='agreed'||self?.result==='repetition'||self?.result==='stalemate'||self?.result==='insufficient'||self?.result==='50move'?'Ничья':'Поражение';}
function show(games){const blitz=games.filter(g=>g.time_class==='blitz'&&String(g.time_control)==='180+2'&&(g.white?.username?.toLowerCase()===user||g.black?.username?.toLowerCase()===user)).sort((a,b)=>(b.end_time||0)-(a.end_time||0));state.games=blitz;const wins=blitz.filter(g=>result(g)==='Победа').length,draws=blitz.filter(g=>result(g)==='Ничья').length;
$('gameSummary').textContent=blitz.length?`Найдено партий 3+2: ${blitz.length}. Побед: ${wins}, ничьих: ${draws}, поражений: ${blitz.length-wins-draws}.`:'В загруженных данных нет партий 3+2. Попробуй другой месяц.';
$('gameList').replaceChildren();blitz.slice(0,12).forEach(g=>{const row=document.createElement('div');row.className='game-row';const d=new Date((g.end_time||0)*1000).toLocaleDateString('ru-RU');const opponent=g.white?.username?.toLowerCase()===user?g.black?.username:g.white?.username;row.textContent=`${d} · ${result(g)} · против ${opponent||'соперника'}`;$('gameList').append(row);});
}
async function load(){const btn=$('loadGames');btn.disabled=true;$('gameSummary').textContent='Загружаем публичные партии…';try{const now=new Date(),months=[0,1,2].map(i=>dateMonth(new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1))));const data=await Promise.all(months.map(async month=>{const r=await fetch(api+month,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}));show(data.flatMap(x=>x.games||[]));}catch(e){$('gameSummary').textContent='Не удалось получить партии автоматически. Возможны ограничения сети или Chess.com. Попробуй позднее. '+e.message;}finally{btn.disabled=false;}}
$('loadGames').addEventListener('click',load);
$('pgnFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5e6){$('gameSummary').textContent='Файл слишком большой (максимум 5 МБ).';return;}const raw=await f.text();const blocks=raw.split(/(?=\[Event\s+")/).filter(x=>x.trim());const games=blocks.map(b=>{const tags={};for(const m of b.matchAll(/^\[(\w+)\s+"([^"]*)"\]/gm))tags[m[1]]=m[2];const t=tags.TimeControl||'';const white=tags.White||'',black=tags.Black||'';const resultTag=tags.Result||'';return {time_class:'blitz',time_control:t,white:{username:white,result:resultTag==='1-0'?'win':resultTag==='1/2-1/2'?'agreed':'lose'},black:{username:black,result:resultTag==='0-1'?'win':resultTag==='1/2-1/2'?'agreed':'lose'},end_time:Date.parse(tags.UTCDate?.replaceAll('.','-')||tags.Date?.replaceAll('.','-')||'')/1000||0};}).filter(g=>g.white.username||g.black.username);show(games);e.target.value='';});
})();

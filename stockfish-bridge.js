/* Chess Coach 7: Stockfish 19 Lite single-threaded loader.
   Downloads the official npm build in the user's browser on demand.
   No claim that the engine is installed unless the UCI handshake succeeds. */
(()=>{'use strict';
const ROOT='https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/';
const NAME='stockfish-19-lite-single';
async function get(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);try{const response=await fetch(url,{signal:controller.signal,mode:'cors',cache:'force-cache'});if(!response.ok)throw Error('HTTP '+response.status);return response}finally{clearTimeout(timer)}}
async function create(onLine,onStatus){
 const resources=[];
 const localJS='./stockfish/'+NAME+'.js';
 // A pair of local copies may be uploaded for offline use. Otherwise use official CDN.
 let jsText,wasmData,source='CDN';
 try{
  const [js,wasm]=await Promise.all([get(localJS),get('./stockfish/'+NAME+'.wasm')]);
  const type=js.headers.get('content-type')||'';
  if(type.includes('text/html'))throw Error('Локальные файлы не обнаружены');
  jsText=await js.text();wasmData=await wasm.arrayBuffer();source='локальные файлы';
 }catch(_){
  onStatus?.('Загружаю Stockfish Lite (~2 МБ)…');
  const [js,wasm]=await Promise.all([get(ROOT+NAME+'.js'),get(ROOT+NAME+'.wasm')]);
  jsText=await js.text();wasmData=await wasm.arrayBuffer();
 }
 if(jsText.length<2000||wasmData.byteLength<100000)throw Error('Получены повреждённые файлы движка');
 const wasmURL=URL.createObjectURL(new Blob([wasmData],{type:'application/wasm'}));resources.push(wasmURL);
 // Emscripten locates the WASM by its file name; both methods below redirect to a blob.
 const wasmName=NAME+'.wasm';
 const patched=jsText.split(wasmName).join(wasmURL);
 const preamble=`self.Module=self.Module||{};self.Module.locateFile=function(path){return path.endsWith('.wasm')?${JSON.stringify(wasmURL)}:path};\n`;
 const workerURL=URL.createObjectURL(new Blob([preamble,patched],{type:'text/javascript'}));resources.push(workerURL);
 const worker=new Worker(workerURL);
 const dispose=()=>{try{worker.terminate()}catch(_){}for(const u of resources)URL.revokeObjectURL(u)};
 let ready=false;
 try{
  await new Promise((resolve,reject)=>{
   const deadline=setTimeout(()=>reject(Error('Stockfish не ответил на команду UCI')),12000);
   worker.onerror=e=>{clearTimeout(deadline);reject(Error('Ошибка загрузки WebAssembly'))};
   worker.onmessage=e=>{const lines=String(e.data).split('\n');for(const line of lines){if(line.startsWith('uciok')){clearTimeout(deadline);ready=true;resolve()}else onLine?.(line)}};
   worker.postMessage('uci');
  });
  if(!ready)throw Error('Нет подтверждения UCI');
  worker.onmessage=e=>{for(const line of String(e.data).split('\n'))onLine?.(line)};
  worker.onerror=()=>onStatus?.('Ошибка выполнения Stockfish');
  onStatus?.('Stockfish 19 Lite · '+source);
  return {worker,source,dispose,send:cmd=>worker.postMessage(cmd)};
 }catch(error){dispose();throw error}
}
window.CCStockfish={create};
})();

const R=String.raw,$=s=>document.querySelector(s);
const BASE=[
['ESPACIO',R`\s+`,'skip','Espacios, tabuladores y saltos de línea (se ignoran)'],
['COMENTARIO',R`//.*`,'skip','Comentario de línea (se ignora)'],
['CADENA',R`"[^"\n]*"`,'','Texto entre comillas dobles'],
['ERR_CADENA',R`"[^"\n]*`,'err','Cadena sin cerrar'],
['PALABRA_RESERVADA',R`\b(?:if|else|while|for|int|float|return|print)\b`,'','Palabra propia del lenguaje'],
['NUM_REAL',R`\d+\.\d+`,'','Número con parte decimal'],
['ERR_ID',R`\d+[A-Za-z_]\w*`,'err','Identificador mal formado (empieza con dígito)'],
['ERR_REAL',R`\d+\.(?!\d)`,'err','Número real incompleto'],
['NUM_ENTERO',R`\d+`,'','Número entero'],
['IDENTIFICADOR',R`[A-Za-z_]\w*`,'','Nombre de variable o función'],
['OP_RELACIONAL',R`==|!=|<=|>=|<|>`,'','Operador de comparación'],
['OP_ASIGNACION',R`=`,'','Asignación'],
['OP_ARITMETICO',R`[+\-*/%]`,'','Operación aritmética'],
['DELIMITADOR',R`[(){};,]`,'','Separador o agrupador'],
['ERR_CARACTER',R`\S`,'err','Carácter fuera del alfabeto del lenguaje']];
let rules,rx,last={toks:[],errs:[],parts:[]};
const mk=a=>({n:a[0],re:a[1],t:a[2],d:a[3]});
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const col=i=>rules[i].t==='err'?'#e5173f':`hsl(${228+(i*19)%58} 82% ${38+(i%3)*7}%)`;

// El "generador": une todas las reglas en una sola regex y construye el escáner
function build(){
  rx=new RegExp(rules.map((r,i)=>`(?<g${i}>${r.re})`).join('|'),'y');
  $('#spec').textContent='%%\n'+rules.map(r=>(r.re.padEnd(34)+(r.t==='skip'?'{ /* ignorar */ }':r.t==='err'?`{ error("${r.d}"); }`:`{ return ${r.n}; }`))).join('\n')+'\n%%';
}
function scan(text){
  const toks=[],errs=[],parts=[];let pos=0,line=1,c=1;
  while(pos<text.length){
    rx.lastIndex=pos;const m=rx.exec(text);
    const i=m?rules.findIndex((_,k)=>m.groups['g'+k]!==undefined):-1;
    const lex=m&&m[0].length?m[0]:text[pos],r=i<0||!m[0].length?rules[rules.length-1]:rules[i],ri=rules.indexOf(r);
    const o={i:ri,lex,line,c};
    if(r.t==='err'){errs.push({...o,msg:r.d});parts.push({...o,e:1})}
    else if(r.t!=='skip'){toks.push(o);parts.push(o)}else parts.push({...o,sk:1});
    for(const ch of lex){ch==='\n'?(line++,c=1):c++}
    pos+=lex.length;
  }
  return{toks,errs,parts,line};
}
function run(){
  const text=$('#entrada').value,s=scan(text);last=s;
  const kinds=new Set(s.toks.map(t=>t.i));
  $('#stats').innerHTML=[['Tokens',s.toks.length,'#14163a'],['Componentes',kinds.size,'#14163a'],['Errores',s.errs.length,s.errs.length?'#e5173f':'#14163a'],['Líneas',text?s.line:0,'#14163a']].map(a=>`<div style="--k:${a[2]}">${a[1]}<small>${a[0]}</small></div>`).join('');
  const src=$('#src');src.classList.remove('scan');void src.offsetWidth;src.classList.add('scan');
  let n=0;src.innerHTML=s.parts.map(p=>p.sk?esc(p.lex):`<span class="${p.e?'e':''}" style="--c:${col(p.i)};--i:${Math.min(n++,40)}" title="${rules[p.i].n}">${esc(p.lex)}</span>`).join('')||'(escribe algo para analizar)';
  // Componentes léxicos
  const g={};s.toks.forEach(t=>(g[t.i]??=[]).push(t.lex));
  $('#comps').innerHTML=Object.keys(g).map((k,j)=>`<div class="comp" style="--c:${col(+k)};--i:${j}"><b>${rules[k].n}<span>×${g[k].length}</span></b><small>${rules[k].d}</small><div>${[...new Set(g[k])].map(l=>`<span class="chip">${esc(l)}</span>`).join('')}</div></div>`).join('')||'<p class="def">Sin componentes todavía.</p>';
  // Patrones y lexemas
  $('#tPat').innerHTML='<thead><tr><th>Componente léxico</th><th>Patrón (expresión regular)</th><th>Lexemas encontrados</th></tr></thead><tbody>'+rules.map((r,i)=>{
    const all=r.t==='err'?s.errs.filter(e=>e.i===i).map(e=>e.lex):(g[i]||[]);
    return`<tr class="${all.length?'on':''}" style="--i:${i}"><td style="color:${col(i)}">${r.n}</td><td>${esc(r.re)}</td><td>${[...new Set(all)].map(l=>`<span class="chip" style="--c:${col(i)}">${esc(l)}</span>`).join('')||'—'}</td></tr>`}).join('')+'</tbody>';
  // Tabla de tokens
  const ts={};
  $('#tTok').innerHTML='<thead><tr><th>#</th><th>Token</th><th>Lexema</th><th>Línea</th><th>Col.</th><th>Atributo</th></tr></thead><tbody>'+(s.toks.map((t,j)=>{
    const n=rules[t.i].n;let a='—';
    if(n.startsWith('NUM'))a=Number(t.lex);else if(n==='IDENTIFICADOR'){ts[t.lex]??=Object.keys(ts).length;a='TS['+ts[t.lex]+']'}
    return`<tr style="--i:${Math.min(j,40)}"><td>${j+1}</td><td style="color:${col(t.i)}">${n}</td><td>${esc(t.lex)}</td><td>${t.line}</td><td>${t.c}</td><td>${a}</td></tr>`}).join('')||'<tr><td colspan="6">Sin tokens.</td></tr>')+'</tbody>';
  // Errores
  $('#errs').innerHTML=s.errs.map((e,j)=>`<li style="--i:${j}"><b>Línea ${e.line}, columna ${e.c}:</b> ${e.msg} → <code>${esc(e.lex)}</code></li>`).join('')||'<li class="ok">Sin errores léxicos. Prueba con <b>@</b>, <b>3abc</b> o una cadena sin cerrar.</li>';
}
function reset(){rules=BASE.map(mk);build();run();$('#msg').textContent=''}
$('#btnAnalizar').onclick=run;
$('#entrada').addEventListener('input',run);
document.querySelectorAll('.ej').forEach(b=>{if(b.dataset.e!==undefined)b.onclick=()=>{$('#entrada').value=b.dataset.e;run()}});
$('#btnReset').onclick=reset;
$('#btnRegla').onclick=()=>{
  const n=$('#rn').value.trim().toUpperCase().replace(/\W+/g,'_'),re=$('#rr').value;
  if(!n||!re){$('#msg').textContent='Escribe el nombre y el patrón de la regla.';return}
  const old=rules.slice();
  try{rules.splice(2,0,{n,re,t:'',d:'Regla agregada por el usuario'});build();run();$('#msg').textContent=`Regla ${n} agregada con prioridad alta. Escribe un lexema que la cumpla.`}
  catch(e){rules=old;build();$('#msg').textContent='Patrón inválido: '+e.message}
};
reset();

// Utilidades
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// Escape seguro para usar texto del usuario dentro de un RegExp.
function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Botones de copiar código
function setupCopy(){
  $$('.copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy');
      const el = document.getElementById(id);
      if(!el) return;
      const text = el.innerText;
      try{
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(()=> btn.textContent = old, 900);
      }catch(e){
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        const old = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(()=> btn.textContent = old, 900);
      }
    });
  });
}

// Navegación con scroll spy
function setupScrollSpy(){
  const links = $$('.navlink');
  const mainSections = $$('main section[id]');
  const sectionById = new Map(mainSections.map(s => [s.id, s]));

  const OFFSET = 14;
  const ACTIVATE_AT = 120;

  // Scroll suave + aterrizaje exacto
  links.forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      if(!hash || !hash.startsWith('#')) return;
      e.preventDefault();

      if(hash === '#top'){
        history.replaceState(null, '', hash);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const id = hash.slice(1);
      const target = sectionById.get(id) || document.getElementById(id);
      if(!target) return;

      history.replaceState(null, '', hash);
      const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  function setActive(id){
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+id));
  }

  function onScroll(){
    if(!mainSections.length) return;
    const y = window.scrollY + ACTIVATE_AT;
    let currentId = mainSections[0].id;

    for(const s of mainSections){
      if(s.offsetTop <= y) currentId = s.id;
      else break;
    }

    setActive(currentId);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  requestAnimationFrame(() => {
    if(location.hash && location.hash !== '#top'){
      const id = location.hash.slice(1);
      const target = sectionById.get(id);
      if(target){
        const top = target.getBoundingClientRect().top + window.scrollY - OFFSET;
        window.scrollTo({ top });
      }
    }
    onScroll();
  });
}

// Progreso de lectura
function setupProgress(){
  const bar = $('#progressBar');
  const label = $('#progressLabel');
  const main = $('#main');

  function onScroll(){
    const total = main.scrollHeight - window.innerHeight;
    const scrolled = window.scrollY;
    const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
    bar.style.width = pct.toFixed(0) + '%';
    label.textContent = pct.toFixed(0) + '%';
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
}

// Resaltado de búsqueda
function clearMarks(){
  $$('mark').forEach(m => {
    const parent = m.parentNode;
    const text = document.createTextNode(m.textContent);
    parent.replaceChild(text, m);
    parent.normalize();
  });
}

function highlight(term){
  if(!term) return;

  const root = $('#main');
  if(!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if(!node.parentElement) return NodeFilter.FILTER_REJECT;
      const tag = node.parentElement.tagName;
      if(['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);

  const escaped = escapeRegExp(term);
  const re = new RegExp(escaped, 'ig');

  nodes.forEach(node => {
    if(!node.nodeValue || node.nodeValue.trim().length === 0) return;

    const parent = node.parentNode;
    if(parent && parent.closest && parent.closest('code')) return;

    const val = node.nodeValue;
    re.lastIndex = 0;
    if(!re.test(val)) return;
    re.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    val.replace(re, (match, offset) => {
      frag.appendChild(document.createTextNode(val.slice(lastIndex, offset)));
      const mark = document.createElement('mark');
      mark.textContent = match;
      frag.appendChild(mark);
      lastIndex = offset + match.length;
    });

    frag.appendChild(document.createTextNode(val.slice(lastIndex)));
    parent.replaceChild(frag, node);
  });
}

function setupSearch(){
  const input = $('#search');
  const clear = $('#clear');
  if(!input || !clear) return;

  function run(){
    clearMarks();
    const term = input.value.trim();
    highlight(term);
  }

  input.addEventListener('input', () => {
    window.clearTimeout(input._t);
    input._t = window.setTimeout(run, 120);
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clearMarks();
    input.focus();
  });
}

// Botón imprimir
function setupButtons(){
  $('#print')?.addEventListener('click', () => window.print());
}

// Menú hamburguesa
function setupHamburger(){
  const toggle = $('#menuToggle');
  const body = $('#sidebarBody');
  if(!toggle || !body) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    body.classList.toggle('open');
  });

  $$('#sidebarBody .navlink').forEach(a => {
    a.addEventListener('click', () => {
      if(window.innerWidth <= 980){
        toggle.classList.remove('active');
        body.classList.remove('open');
      }
    });
  });
}

// Auto-tests (consola del navegador)
function runSelfTests(){
  const samples = [
    'indentación',
    'Si',
    '[test]',
    'a+b',
    '(x)',
    'foo\\bar',
    '$money',
    'dot.',
    '^start$',
    'pipe|or'
  ];

  samples.forEach(s => {
    const esc = escapeRegExp(s);
    const re = new RegExp(esc, 'ig');
    console.assert(re.test('___' + s + '___'), 'SelfTest RegExp falló para:', s);
  });

  console.assert(typeof highlight === 'function', 'SelfTest: highlight no existe');
  console.assert(typeof clearMarks === 'function', 'SelfTest: clearMarks no existe');
}

// Syntax highlighting para PSeInt
function highlightPSeInt(){
  // Palabras clave de PSeInt (comparación case-insensitive)
  const KEYWORDS = new Set([
    'algoritmo','finalgoritmo','proceso','finproceso',
    'subproceso','finsubproceso','funcion','finfuncion',
    'definir','como','dimension',
    'si','entonces','sino','finsi',
    'segun','hacer','de','otro','modo','finsegun',
    'para','hasta','con','paso','finpara',
    'mientras','finmientras',
    'repetir','que',
    'leer','escribir','imprimir',
    'y','o','no',
    'verdadero','falso',
    'mod','retornar'
  ]);

  // Tipos de datos
  const TYPES = new Set([
    'entero','real','cadena','logico','caracter',
    'numero','numerico','texto'
  ]);

  // Funciones incorporadas
  const BUILTINS = new Set([
    'rc','raiz','abs','trunc','redon','azar',
    'sen','cos','tan','ln','exp','asen','acos','atan',
    'longitud','subcadena','concatenar',
    'convertitanumero','convertiratexto',
    'mayusculas','minusculas'
  ]);

  function tokenize(code){
    const tokens = [];
    let i = 0;
    while(i < code.length){
      // Comentarios //
      if(code[i] === '/' && code[i+1] === '/'){
        let end = code.indexOf('\n', i);
        if(end === -1) end = code.length;
        tokens.push({type:'comment', text:code.slice(i, end)});
        i = end;
        continue;
      }
      // Strings
      if(code[i] === '"' || code[i] === "'"){
        const q = code[i];
        let j = i + 1;
        while(j < code.length && code[j] !== q){
          if(code[j] === '\\') j++;
          j++;
        }
        j = Math.min(j + 1, code.length);
        tokens.push({type:'string', text:code.slice(i, j)});
        i = j;
        continue;
      }
      // Operador de asignación <-
      if(code[i] === '<' && code[i+1] === '-'){
        tokens.push({type:'operator', text:'<-'});
        i += 2;
        continue;
      }
      // Números
      if(/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i-1]))){
        let j = i;
        while(j < code.length && /[\d.]/.test(code[j])) j++;
        tokens.push({type:'number', text:code.slice(i, j)});
        i = j;
        continue;
      }
      // Palabras (identificadores y keywords)
      if(/[a-zA-ZáéíóúÁÉÍÓÚñÑ_]/.test(code[i])){
        let j = i;
        while(j < code.length && /[\wáéíóúÁÉÍÓÚñÑ]/.test(code[j])) j++;
        const word = code.slice(i, j);
        const lower = word.toLowerCase();

        if(KEYWORDS.has(lower)){
          tokens.push({type:'keyword', text:word});
        } else if(TYPES.has(lower)){
          tokens.push({type:'type', text:word});
        } else if(BUILTINS.has(lower)){
          tokens.push({type:'builtin', text:word});
        } else {
          const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
          if(prev && prev.type === 'keyword' && (prev.text.toLowerCase() === 'funcion' || prev.text.toLowerCase() === 'subproceso')){
            tokens.push({type:'func-name', text:word});
          } else if(prev && prev.type === 'keyword' && prev.text.toLowerCase() === 'algoritmo'){
            tokens.push({type:'func-name', text:word});
          } else if(prev && prev.type === 'keyword' && prev.text.toLowerCase() === 'proceso'){
            tokens.push({type:'func-name', text:word});
          } else {
            tokens.push({type:'plain', text:word});
          }
        }
        i = j;
        continue;
      }
      // Resto (operadores, espacios, etc.)
      tokens.push({type:'plain', text:code[i]});
      i++;
    }
    return tokens;
  }

  function esc(text){
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  $$('pre > code').forEach(block => {
    const raw = block.textContent;
    const tokens = tokenize(raw);
    const classMap = {
      'keyword':'gd-keyword',
      'type':'gd-type',
      'string':'gd-string',
      'comment':'gd-comment',
      'number':'gd-number',
      'func-name':'gd-func-name',
      'builtin':'gd-annotation',
      'operator':'gd-keyword'
    };
    let html = '';
    for(const t of tokens){
      const cls = classMap[t.type];
      if(cls){
        html += `<span class="${cls}">${esc(t.text)}</span>`;
      } else {
        html += esc(t.text);
      }
    }
    block.innerHTML = html;
  });
}

// Inicialización
highlightPSeInt();
setupCopy();
setupButtons();
setupHamburger();
setupScrollSpy();
setupProgress();
setupSearch();
runSelfTests();

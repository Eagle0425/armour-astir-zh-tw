(() => {
  'use strict';
  const D = window.AA_DATA, $ = s => document.querySelector(s), view = $('#view');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups = [...new Set(D.chapters.map(c => c.group))], byId = new Map(D.chapters.map(c => [c.id,c]));
  const pages = D.chapters.flatMap(c => c.pages.map(p => ({...p,group:c.group,chapterTitle:c.title,english:c.english})));
  let saved = [], lastFocus, searchTimer;
  try { saved = JSON.parse(localStorage.getItem('aa-advent-saved') || '[]').filter(x => byId.has(x)); } catch {}
  try { const theme = localStorage.getItem('aa-advent-theme'); if(theme) document.documentElement.dataset.theme = theme; else if(matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme='dark'; } catch {}
  function toast(text) { $('.toast')?.remove(); const el=document.createElement('div');el.className='toast';el.setAttribute('role','status');el.textContent=text;document.body.append(el);setTimeout(()=>el.remove(),2500); }
  function syncMenuAccess(){ $('#sidebar').inert=innerWidth<=800&&!document.body.classList.contains('menu-open'); }
  function closeMenu() { document.body.classList.remove('menu-open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#menu-scrim').hidden=true;syncMenuAccess(); }
  $('#menu-toggle').addEventListener('click',()=>{const open=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#menu-scrim').hidden=!open;syncMenuAccess();});
  addEventListener('resize',syncMenuAccess);
  $('.skip').addEventListener('click',e=>{e.preventDefault();$('#main').focus();$('#main').scrollIntoView();});
  $('#menu-scrim').addEventListener('click',closeMenu);
  $('#theme-toggle').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('aa-advent-theme',theme);}catch{} updateThemeLabel();});
  function updateThemeLabel(){ $('#theme-toggle').setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'切換淺色模式':'切換深色模式'); } updateThemeLabel();
  $('#chapter-nav').innerHTML=groups.map(g=>`<details open><summary>${esc(g)}</summary>${D.chapters.filter(c=>c.group===g).map(c=>`<a href="#${c.id}" data-chapter="${c.id}">${esc(c.title)}</a>`).join('')}</details>`).join('');
  $('#search-scope').innerHTML += groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
  $('#saved-count').textContent=saved.length;
  $('#saved-open').addEventListener('click',()=>{location.hash='saved';});
  function home(){
    const books=D.chapters.filter(c=>['arcanist','impostor','paradigm','witch','captain','diplomat','artificer','scout'].includes(c.id));
    return `<section class="hero"><div><div class="kicker">HIGH FANTASY / MECHA / REBELLION</div><h1>ARMOUR<br>ASTIR: ADVENT<span>魔法、鋼鐵與反抗</span></h1><p>與同伴創造一個值得反抗的世界。駕駛魔鎧、守護母艦，讓你的信念與牽絆推動戰局。</p><div class="hero-quote">不願冒險，就很難改變世界。</div><a class="primary-link" href="#intro/p005">從快速開局開始 →</a></div><img class="cover" src="assets/cover.jpg" alt="原書封面，Zac Morrison 繪製的魔鎧與角色" width="655" height="927"></section>
    <div class="meta-strip"><div><strong>174</strong><small>原書頁面已收錄</small></div><div><strong>08</strong><small>完整扮演書</small></div><div><strong>05</strong><small>任務引子</small></div><div><strong>04</strong><small>範例世界</small></div></div>
    <h2 class="section-title">從這裡出發 <span>CHOOSE YOUR ROUTE</span></h2><div class="cards">
    <a class="card" href="#setup"><span class="number">01 / START</span><span class="arrow">↗</span><h3>建立你的故事</h3><p>定義威權與義軍，選擇角色、特質和牽引，準備第一次出擊。</p></a>
    <a class="card" href="#basic-summary"><span class="number">02 / PLAY</span><span class="arrow">↗</span><h3>桌上規則速查</h3><p>基本動作、危難、優勢與劣勢。每個動作都有原書的解說與範例。</p></a>
    <a class="card" href="#astir"><span class="number">03 / BUILD</span><span class="arrow">↗</span><h3>建造專屬魔鎧</h3><p>核心、零件、武裝與機體動作，加上母艦艙室和完整裝備清單。</p></a>
    <a class="card" href="#conflict-turn"><span class="number">04 / DIRECT</span><span class="arrow">↗</span><h3>拉遠鏡頭看戰局</h3><p>部門、派系與支柱，透過衝突場景改寫戰局；另附完整導演指引。</p></a></div>
    <h2 class="section-title">選擇你的扮演書 <span>CHANNELER / SUPPORT</span></h2><div class="book-grid">${books.map((c,i)=>`<a href="#${c.id}">${esc(c.title)}<small>${i<4?'引導者':'支援者'} · ${esc(c.english)}</small></a>`).join('')}</div><p class="source-note">設定選項、裝備與專屬動作在同一頁完整呈現，無須跳頁查詢。</p>
    <h2 class="section-title">出擊前記住 <span>AT A GLANCE</span></h2><div class="quick-rules"><div><strong>擲 2d6 ＋ 特質</strong>6− 失敗、7–9 部分成功、10+ 完全成功。各動作的具體結果優先。<br><a href="#concepts/p009">擲骰與優劣勢 →</a></div><div><strong>三項危難後，毫無防備</strong>風險是暫時問題，險境需要休整處理。毫無防備再遭攻擊時，擲「倒下」。<br><a href="#concepts/p013">危難與重擔 →</a></div></div>
    <div class="notice"><strong>譯稿與校訂</strong><br>以英文插畫版原書逐頁翻譯，未採用機翻檔。全書譯稿已收錄，校訂範圍、原書疑點與來源指紋另行記錄；頁數齊全不代表官方認證或零誤譯。<a href="#about">查看翻譯紀錄 →</a></div>`;
  }
  function article(c){
    const idx=D.chapters.indexOf(c),prev=D.chapters[idx-1],next=D.chapters[idx+1];
    return `<div class="breadcrumb"><a href="#home">規則庫</a> / ${esc(c.group)}</div><header class="article-head"><h1>${esc(c.title)}</h1><div class="english">${esc(c.english)}</div><div class="article-tools"><span>英文原書 p.${c.start}${c.end!==c.start?'–'+c.end:''}</span><span class="status-pill">完整譯稿</span><button id="bookmark" class="${saved.includes(c.id)?'saved':''}" aria-pressed="${saved.includes(c.id)}">${saved.includes(c.id)?'★ 已收藏':'☆ 收藏本章'}</button><button id="copy-link">複製連結</button><button id="print-chapter">列印本章</button></div></header>${c.pages.map(p=>`<section class="page-block" id="p${String(p.page).padStart(3,'0')}"><div class="page-marker"><a href="#${c.id}/p${String(p.page).padStart(3,'0')}">SOURCE / 原書第 ${p.page} 頁 ↗</a></div>${p.html}</section>`).join('')}<div class="source-note">譯自英文插畫版《Armour Astir: Advent》，Briar Sovereign。<a href="#about">來源與校訂說明</a> · <a href="https://weregazelle.itch.io/armour-astir">取得原書</a></div><nav class="article-nav" aria-label="相鄰章節">${prev?`<a href="#${prev.id}">← ${esc(prev.title)}</a>`:'<span></span>'}${next?`<a href="#${next.id}">${esc(next.title)} →</a>`:''}</nav>`;
  }
  function about(){
    return `<div class="article-head"><h1>來源與翻譯紀錄</h1><div class="english">SOURCES / TRANSLATION NOTES</div></div><div class="page-block"><h2>閱讀範圍</h2><p>本規則庫依英文插畫版 <em>Armour Astir: Advent</em> 的 174 個 PDF 頁面翻譯，整理為 ${D.chapters.length} 個主題章節。包含正文、遊玩範例、扮演書、機體與裝備選項、衝突場景、導演規則、五個任務引子、四個世界、附錄及製作名單。插畫頁保留頁碼與簡短圖說；本站使用的封面原繪為 Zac Morrison。</p><p>扮演書起始內容與所有專屬動作在同一章呈現。網站不另行提供尚未製作的中文角色卡 PDF；全書可透過<a href="reader.html">靜態閱讀與列印版</a>閱讀或另存。</p><h2>來源與版本</h2><p>以工作區英文原檔 ArmourAstir_af_illus.pdf 為正文依據；認證頁日期為 2023 年 12 月 31 日，內含 v1.5 版本紀錄。免費版與參考表僅辨認用途與重複範圍，沒有用較早版本的規則覆蓋本書。依使用者要求，未讀取或採用任何機翻檔。</p><div class="table-wrap"><table><tr><th>來源</th><th>頁數</th><th>語言</th></tr>${D.sources.filter(s=>s.used).map(s=>`<tr><td>${esc(s.file)}</td><td>${s.pages}</td><td>英文原文</td></tr>`).join('')}</table></div><p>頁碼一律採原 PDF 的實體頁序，與本檔標示頁碼一致。原書文字未重新上傳供下載；來源指紋與中文逐頁內容保存在儲存庫。</p><h2>目前校訂狀態</h2><p>${esc(D.reviews.note||'完整譯稿已收錄；校訂詳情請查看儲存庫。')}</p><p>自動檢查會確認 174 頁一一對應、中文內容指紋、導覽與頁碼連結、搜尋及發布資源。這些檢查只能證明結構與版本一致，不能代替規則語義判斷。</p><p><a href="translation-quality.json">本版檢查紀錄</a> · <a href="https://github.com/Eagle0425/armour-astir-zh-tw/tree/main/translation">詳細來源、覆核與修訂紀錄 ↗</a></p><h2>原書疑點</h2><p>若原書本身存在矛盾、舊名稱引用或重複表格編號，譯文原則上保留並加註，沒有自行發明修正版規則。例如附錄兩個 d66 表都重複使用 23，封底標示四個任務引子，但正文實際有五個。其他機體數值與部門門檻疑點列於儲存庫的校訂紀錄。</p><h2>網站與翻譯方法</h2><p>參考 <a href="https://github.com/wayne930242/game-doc-template">game-doc-template</a> 的集中術語、完整翻譯、來源追蹤與語義覆核方法；沿用 <a href="https://eagle0425.github.io/root-rpg-player-reference/">Root 玩家手冊</a> 的靜態閱讀、搜尋、收藏及手機查閱經驗。本站以無外部依賴的靜態檔案建置，經 GitHub Pages 發布。</p><h2>權利與資料</h2><p>本網站為非官方繁體中文譯稿，並非官方授權譯本。原作、商標及圖像的權利歸 Briar Sovereign 與各權利人；不將原作文字或圖像宣告為開源。<a href="https://weregazelle.itch.io/armour-astir">請支持原作</a>。</p><p>收藏與顯示主題只儲存在你的瀏覽器，不會上傳；若關閉瀏覽器儲存權限，仍可閱讀與搜尋。網站沒有分析追蹤或外部字體請求。</p></div>`;
  }
  function render(){
    let route; try { route=decodeURIComponent(location.hash.slice(1)); } catch { route=''; }
    const [id='home',anchor]=route.split('/'),c=byId.get(id);closeMenu();
    if(c) view.innerHTML=article(c);
    else if(id==='about') view.innerHTML=about();
    else if(id==='saved') view.innerHTML=`<header class="article-head"><h1>我的收藏</h1><div class="english">SAVED IN THIS BROWSER</div></header>${saved.length?`<div class="cards">${saved.map(x=>{const b=byId.get(x);return `<a class="card" href="#${b.id}"><span class="number">${esc(b.group)}</span><h3>${esc(b.title)}</h3><p>原書 p.${b.start}–${b.end} →</p></a>`;}).join('')}</div>`:'<p>還沒有收藏。打開任一章節，點選「☆ 收藏本章」即可加入。</p>'}`;
    else if(!id||id==='home') view.innerHTML=home();
    else view.innerHTML='<h1>找不到這個章節</h1><p>連結可能已更動。請使用搜尋，或<a href="#home">回到規則庫</a>。</p>';
    document.title=(c?c.title:id==='about'?'來源與翻譯紀錄':id==='saved'?'我的收藏':'繁體中文規則庫')+' · Armour Astir: Advent';
    document.querySelectorAll('[data-chapter]').forEach(a=>{if(a.dataset.chapter===id){a.setAttribute('aria-current','page');a.closest('details').open=true;}else a.removeAttribute('aria-current');});
    $('#on-this-page').innerHTML=c?'<strong>本章內容</strong><p>原書 p.'+c.start+'–'+c.end+'</p>'+c.pages.flatMap(p=>p.headings).map(h=>`<a class="${h.level>2?'toc-minor':''}" href="#${c.id}/${h.anchor}">${esc(h.text)}</a>`).join(''):'<strong>閱讀路線</strong><p>從世界與角色建立開始，或直接查找桌上需要的規則。</p><a href="#intro/p005">快速開局</a><a href="#basic-summary">基本動作</a><a href="#playbooks">選擇扮演書</a><a href="#about">來源與校訂</a>';
    if(c){
      $('#bookmark').addEventListener('click',()=>{const had=saved.includes(id);saved=had?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('aa-advent-saved',JSON.stringify(saved));}catch{toast('瀏覽器未允許儲存，收藏僅在本次閱讀保留。');}$('#saved-count').textContent=saved.length;const b=$('#bookmark');b.classList.toggle('saved',!had);b.setAttribute('aria-pressed',String(!had));b.textContent=had?'☆ 收藏本章':'★ 已收藏';});
      $('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('已複製本章連結');}catch{toast('可直接從網址列複製本章連結');}});
      $('#print-chapter').addEventListener('click',()=>window.print());
    }
    if(anchor) requestAnimationFrame(()=>{const target=document.getElementById(anchor);if(target) target.scrollIntoView({behavior:'instant'});else toast('此頁內位置已更動，已開啟所屬章節。');});
    else window.scrollTo({top:0,behavior:'instant'});
  }
  window.addEventListener('hashchange',render);render();
  function openSearch(){lastFocus=document.activeElement;$('#search-dialog').showModal();$('#search-input').focus();search();}
  $('#search-open').addEventListener('click',openSearch);
  $('#search-close').addEventListener('click',()=>$('#search-dialog').close());
  $('#search-dialog').addEventListener('close',()=>lastFocus?.focus());
  $('#search-dialog').addEventListener('click',e=>{if(e.target===$('#search-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('#search-dialog').open){e.preventDefault();openSearch();}if(e.key==='Escape')closeMenu();});
  function normalize(t){return t.normalize('NFKC').toLowerCase().replace(/[‐‑–—−]/g,'-');}
  function search(){
    const query=$('#search-input').value.trim(),scope=$('#search-scope').value,terms=normalize(query).split(/\s+/).filter(Boolean),status=$('#search-status');
    if(!query){status.textContent='';$('#search-results').innerHTML='<p class="source-note">輸入關鍵字搜尋完整正文。可查「過熱」「牽引」「Arcanist」，或輸入 p83 定位原書頁面。</p>';return;}
    const pageQuery=/^(?:p\.?|頁\s*|第\s*)?(\d{1,3})(?:\s*頁)?$/i.exec(query);
    const found=pages.filter(p=>!scope||p.group===scope).map(p=>{const text=normalize(p.text),title=normalize(p.title+' '+p.chapterTitle+' '+p.english),matched=pageQuery?p.page===Number(pageQuery[1]):terms.every(t=>text.includes(t)||title.includes(t));return {...p,matched,score:terms.reduce((s,t)=>s+(title.includes(t)?10:0)+(text.includes(t)?1:0),0)};}).filter(p=>p.matched).sort((a,b)=>b.score-a.score||a.page-b.page);
    status.textContent=`找到 ${found.length} 頁${found.length>60?'，顯示前 60 頁':''}`;
    $('#search-results').innerHTML=found.length?found.slice(0,60).map(p=>{let pos=terms.length?normalize(p.text).indexOf(terms[0]):-1;pos=Math.max(0,pos-45);let excerpt=p.text.slice(pos,pos+180).replace(/\n+/g,' ');return `<a class="result" href="#${p.chapter}/p${String(p.page).padStart(3,'0')}"><strong>${esc(p.title)}</strong><small>${esc(p.chapterTitle)} / 原書 p.${p.page}</small><p>${pos?'…':''}${esc(excerpt)}…</p></a>`;}).join(''):'<p class="source-note">找不到符合的內容。可縮短關鍵字，或把範圍改為全書。</p>';
    $('#search-results').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('#search-dialog').close()));
  }
  $('#search-input').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,100);});$('#search-scope').addEventListener('change',search);
})();

(() => {
  'use strict';
  const D = window.AA_DATA, $ = s => document.querySelector(s), view = $('#view');
  const isGM=D.mode==='gm', roleName=isGM?'GM 工作台':'玩家手冊';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groups = [...new Set(D.chapters.map(c => c.group))], byId = new Map(D.chapters.map(c => [c.id,c]));
  const directory=new Map(D.directory.map(c=>[c.id,c]));
  const routeHref=(id,anchor='')=>{if(D.anchorRoutes[anchor])id=D.anchorRoutes[anchor];const c=directory.get(id),other=c&&c.audience!=='shared'&&c.audience!==D.mode;return (other?(c.audience==='gm'?'gm.html':'index.html'):'')+'#'+id+(anchor?'/'+anchor:'');};
  const pageAnchor=p=>p.anchor||'p'+String(p.page).padStart(3,'0');
  const sourceLabel=p=>p.sourceLabel||'原書 p.'+p.page;
  const chapterSource=c=>c.supplement?'配套補充':`英文原書 p.${c.start}${c.end!==c.start?'–'+c.end:''}`;
  const visibleSaved=()=>saved.filter(id=>byId.has(id));
  const pages = D.chapters.flatMap(c => c.pages.map(p => ({...p,group:c.group,chapterTitle:c.title,english:c.english})));
  let saved = [], lastFocus, searchTimer;
  try { saved = JSON.parse(localStorage.getItem('aa-advent-saved') || '[]').filter(x => directory.has(x)); } catch {}
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
  $('#saved-count').textContent=visibleSaved().length;
  $('#search-title').textContent='搜尋'+roleName;
  if(isGM) $('#search-input').placeholder='試試：部門、支柱、宿敵、p113';
  $('#saved-open').addEventListener('click',()=>{location.hash='saved';});
  function companionLinks(){
    const items=D.chapters.filter(c=>c.supplement);
    return `<h2 class="section-title">配套速查與指引 <span>COMPANION REFERENCES</span></h2><div class="cards">${items.map(c=>`<a class="card" href="#${c.id}"><span class="number">${c.audience==='shared'?'共用版本資料':isGM?'主持速查':'玩家速查'}</span><h3>${esc(c.title)}</h3><p>${esc(c.english)} →</p></a>`).join('')}</div>`;
  }
  function gmHome(){
    const links=[['conflict-turn','衝突回合','部門、派系、支柱與掌控；掌握整場戰役的戰略節奏。'],['director','主持遊戲','目標、原則、導演動作、安全工具，以及聚會準備。'],['foes','建立敵人與宿敵','行動者範例、敵人數值與宿敵的關係和動作。'],['optional-rules','擴展戰役結構','多方勢力與跨世代衝突，保留各項完整規則。']];
    return `<header class="gm-intro"><span class="eyebrow">DIRECTOR / CAMPAIGN WORKSHOP</span><h1>GM 工作台</h1><p>讓衝突有分量，也讓玩家的選擇改變世界。</p><a href="index.html#home">← 回到玩家手冊</a></header><div class="meta-strip"><div><strong>06</strong><small>衝突場景</small></div><div><strong>24</strong><small>敵人範例</small></div><div><strong>05</strong><small>任務引子</small></div><div><strong>04</strong><small>範例世界</small></div></div><nav class="reading-path" aria-label="GM 常用規則"><a href="#director/p120">目標與原則</a><a href="#director/p123">導演動作</a><a href="#director/p126">安全工具</a><a href="#director/p129">建立行動者</a><a href="#conflict-scenes">衝突場景</a><a href="#rivals">宿敵</a><a href="#gm-notes">玩家動作的導演筆記</a></nav><h2 class="section-title">主持時快速查閱 <span>RUN THE GAME</span></h2><div class="cards">${links.map(([id,title,desc],i)=>`<a class="card" href="#${id}"><span class="number">0${i+1} / DIRECT</span><span class="arrow">↗</span><h3>${title}</h3><p>${desc}</p></a>`).join('')}</div><h2 class="section-title">準備下一次出擊 <span>MISSIONS / WORLDS</span></h2><div class="cards"><a class="card" href="#mission-grand-melee"><h3>五個任務引子</h3><p>大混戰、中立地帶、護送、最後關頭與威權來襲，包含地點、人物與事物選項。</p></a><a class="card" href="#ghost-reaches"><h3>四個範例世界</h3><p>幽魂群島、奧術學院、睡夢沼澤與 Valdemar 冰原，包含勢力與裝備範例。</p></a></div><div class="notice">衝突回合由全桌參與，這裡集中流程、勢力與場景資料，方便主持時共用。基本動作與扮演書請查<a href="index.html#basic-summary">玩家手冊</a>；共用術語和危難範例在兩區皆可閱讀。</div>${companionLinks()}<p class="source-note"><a href="#resources">查看核心書以外的資源翻譯盤點 →</a> · <a href="gm-reader.html">列印 GM 工作台</a></p>`;
  }
  function home(){
    if(isGM)return gmHome();
    const books=D.chapters.filter(c=>['arcanist','impostor','paradigm','witch','captain','diplomat','artificer','scout'].includes(c.id));
    return `<section class="hero"><div><div class="kicker">PLAYER / FIELD MANUAL</div><h1>ARMOUR<br>ASTIR: ADVENT<span>玩家手冊</span></h1><p>與同伴創造一個值得反抗的世界。駕駛魔鎧、守護母艦，讓你的信念與牽絆推動戰局。</p><div class="hero-quote">不願冒險，就很難改變世界。</div><a class="primary-link" href="#intro/p005">從快速開局開始 →</a></div><img class="cover" src="assets/cover.jpg" alt="原書封面，Zac Morrison 繪製的魔鎧與角色" width="655" height="927"></section>
    <div class="meta-strip"><div><strong>${D.chapters.length}</strong><small>玩家與共用章節</small></div><div><strong>08</strong><small>完整扮演書</small></div><div><strong>11</strong><small>戲法</small></div><div><strong>14</strong><small>士兵動作</small></div></div>
    <h2 class="section-title">從這裡出發 <span>CHOOSE YOUR ROUTE</span></h2><div class="cards">
    <a class="card" href="#setup"><span class="number">01 / START</span><span class="arrow">↗</span><h3>建立你的故事</h3><p>定義威權與義軍，選擇角色、特質和牽引，準備第一次出擊。</p></a>
    <a class="card" href="#basic-summary"><span class="number">02 / PLAY</span><span class="arrow">↗</span><h3>桌上規則速查</h3><p>基本動作、危難、優勢與劣勢。每個動作都有原書的解說與範例。</p></a>
    <a class="card" href="#astir"><span class="number">03 / BUILD</span><span class="arrow">↗</span><h3>建造專屬魔鎧</h3><p>核心、零件、武裝與機體動作，加上母艦艙室和完整裝備清單。</p></a>
    <a class="card" href="#downtime"><span class="number">04 / RECOVER</span><span class="arrow">↗</span><h3>休整與下次出擊</h3><p>修理、休息、深化牽絆，利用休整場景與代幣為下一次出擊做準備。</p></a></div>
    <h2 class="section-title">選擇你的扮演書 <span>CHANNELER / SUPPORT</span></h2><div class="book-grid">${books.map((c,i)=>`<a href="#${c.id}">${esc(c.title)}<small>${i<4?'引導者':'支援者'} · ${esc(c.english)}</small></a>`).join('')}</div><p class="source-note">設定選項、裝備與專屬動作在同一頁完整呈現，無須跳頁查詢。</p>
    <h2 class="section-title">出擊前記住 <span>AT A GLANCE</span></h2><div class="quick-rules"><div><strong>擲 2d6 ＋ 特質</strong>6− 失敗、7–9 部分成功、10+ 完全成功。各動作的具體結果優先。<br><a href="#concepts/p009">擲骰與優劣勢 →</a></div><div><strong>三項危難後，毫無防備</strong>風險是暫時問題，險境需要休整處理。毫無防備再遭攻擊時，擲「倒下」。<br><a href="#concepts/p013">危難與重擔 →</a></div></div>
    ${companionLinks()}<div class="notice"><strong>譯稿與校訂</strong><br>以英文插畫版原書逐頁翻譯，未採用機翻檔。全書譯稿已收錄，校訂範圍、原書疑點與來源指紋另行記錄；頁數齊全不代表官方認證或零誤譯。<a href="#about">查看翻譯紀錄 →</a></div>`;
  }
  function relatedCompanion(c){
    const targets=c.supplement?[]:['setup','playbooks'].includes(c.id)?['creation-checklist','sheet-guide']:['arcanist','impostor','paradigm','witch','captain','diplomat','scout','artificer','carrier','astir'].includes(c.id)?['sheet-guide','version-notes']:['concepts','basic-summary','conflict-tiers'].includes(c.id)?['roll-reference']:['conflict-turn','conflict-scenes'].includes(c.id)?['conflict-reference','version-notes']:[];
    return targets.length?`<nav class="notice" aria-label="相關配套資料">配套資料：${targets.map(id=>`<a href="${routeHref(id)}">${esc(directory.get(id).title)}</a>`).join(' · ')}</nav>`:'';
  }
  function article(c){
    const idx=D.chapters.indexOf(c),prev=D.chapters[idx-1],next=D.chapters[idx+1];
    return `<div class="breadcrumb"><a href="#home">規則庫</a> / ${esc(c.group)}</div><header class="article-head"><h1>${esc(c.title)}</h1><div class="english">${esc(c.english)}</div><div class="article-tools"><span>${esc(chapterSource(c))}</span><span class="status-pill">${c.supplement?'選錄翻譯與整理':'完整譯稿'}</span>${c.gmNotes?.length?`<a href="gm.html#gm-notes/p${String(c.gmNotes[0]).padStart(3,'0')}">導演筆記 ↗</a>`:''}<button id="bookmark" class="${saved.includes(c.id)?'saved':''}" aria-pressed="${saved.includes(c.id)}">${saved.includes(c.id)?'★ 已收藏':'☆ 收藏本章'}</button><button id="copy-link">複製連結</button><button id="print-chapter">列印本章</button></div></header>${relatedCompanion(c)}${c.pages.map(p=>`<section class="page-block" id="${pageAnchor(p)}"><div class="page-marker"><a href="#${c.id}/${pageAnchor(p)}">SOURCE / ${esc(sourceLabel(p))} ↗</a></div>${p.html}</section>`).join('')}<div class="source-note">${c.supplement?esc(c.review)+' 來源：'+esc(c.sourceLabel):'譯自英文插畫版《Armour Astir: Advent》，Briar Sovereign。'}<a href="#about">來源與校訂說明</a> · <a href="https://weregazelle.itch.io/armour-astir">取得原書</a></div><nav class="article-nav" aria-label="相鄰章節">${prev?`<a href="#${prev.id}">← ${esc(prev.title)}</a>`:'<span></span>'}${next?`<a href="#${next.id}">${esc(next.title)} →</a>`:''}</nav>`;
  }
  function about(){
    return `<div class="article-head"><h1>來源與翻譯紀錄</h1><div class="english">SOURCES / TRANSLATION NOTES</div></div><div class="page-block"><h2>閱讀範圍</h2><p>本規則庫依英文插畫版 <em>Armour Astir: Advent</em> 的 174 個 PDF 頁面翻譯，整理為 ${D.totalChapters} 個主題章節。包含正文、遊玩範例、扮演書、機體與裝備選項、衝突場景、導演規則、五個任務引子、四個世界、附錄及製作名單。插畫頁保留頁碼與簡短圖說；本站使用的封面原繪為 Zac Morrison。</p><p>扮演書起始內容與所有專屬動作在同一章呈現。網站不另行提供尚未製作的中文角色卡 PDF；玩家可使用<a href="player-reader.html">玩家列印版</a>；主持資料另有<a href="gm-reader.html">GM 列印版</a>。<a href="reader.html">完整原書列印版（含 GM）</a>仍保留全部174頁。</p><h2>來源與版本</h2><p>以工作區英文原檔 ArmourAstir_af_illus.pdf 為正文依據；認證頁日期為 2023 年 12 月 31 日，內含 v1.5 版本紀錄。免費版與參考表已盤點用途、重複範圍及具體異版差異；沒有以配套表的不同版本規則覆蓋核心書。詳見<a href="#resources">資源翻譯盤點</a>。依使用者要求，未讀取或採用任何機翻檔。</p><div class="table-wrap"><table><tr><th>來源</th><th>頁數</th><th>語言</th></tr>${D.sources.filter(s=>s.used).map(s=>`<tr><td>${esc(s.file)}</td><td>${s.pages}</td><td>英文原文</td></tr>`).join('')}</table></div><p>核心書頁碼採原 PDF 的實體頁序。配套補充另標示來源檔名及該檔頁序，不續接核心書的頁碼。原書文字未重新上傳供下載；來源指紋與中文逐頁內容保存在儲存庫。</p><h2>配套補充</h2><p>已加入創角檢核、角色與母艦表欄位、擲骰狀態來源、衝突主持速查及版本差異，並連回重複規則的既有章節。這五章依英文原文整理與自校，尚未經獨立終校；不列入核心書 174 頁的校訂完成數。</p><h2>目前核心書校訂狀態</h2><p>${esc(D.reviews.note||'完整譯稿已收錄；校訂詳情請查看儲存庫。')}</p><p>自動檢查會確認 174 頁一一對應、中文內容指紋、導覽與頁碼連結、搜尋及發布資源。這些檢查只能證明結構與版本一致，不能代替規則語義判斷。</p><p><a href="translation-quality.json">本版檢查紀錄</a> · <a href="https://github.com/Eagle0425/armour-astir-zh-tw/tree/main/translation">詳細來源、覆核與修訂紀錄 ↗</a></p><h2>原書疑點</h2><p>若原書本身存在矛盾、舊名稱引用或重複表格編號，譯文原則上保留並加註，沒有自行發明修正版規則。例如附錄兩個 d66 表都重複使用 23，封底標示四個任務引子，但正文實際有五個。其他機體數值與部門門檻疑點列於儲存庫的校訂紀錄。</p><h2>網站與翻譯方法</h2><p>參考 <a href="https://github.com/wayne930242/game-doc-template">game-doc-template</a> 的集中術語、完整翻譯、來源追蹤與語義覆核方法；沿用 <a href="https://eagle0425.github.io/root-rpg-player-reference/">Root 玩家手冊</a> 的靜態閱讀、搜尋、收藏及手機查閱經驗。本站以無外部依賴的靜態檔案建置，經 GitHub Pages 發布。</p><h2>權利與資料</h2><p>本網站為非官方繁體中文譯稿，並非官方授權譯本。原作、商標及圖像的權利歸 Briar Sovereign 與各權利人；不將原作文字或圖像宣告為開源。<a href="https://weregazelle.itch.io/armour-astir">請支持原作</a>。</p><p>收藏與顯示主題只儲存在你的瀏覽器，不會上傳；若關閉瀏覽器儲存權限，仍可閱讀與搜尋。網站沒有分析追蹤或外部字體請求。</p></div>`;
  }
  function resourceInventory(){
    const audit=D.resources;
    return `<header class="article-head"><h1>資源翻譯盤點</h1><div class="english">SUPPLEMENTARY RESOURCES / ${esc(audit.checked_on)}</div></header><div class="page-block"><p>${esc(audit.conclusion)}</p><p>「規則內容已在網站」與「這份 PDF 已翻譯、排版」是不同的完成狀態。以下五份原檔目前皆沒有對應中文 PDF。</p><div class="table-wrap"><table><tr><th>資源</th><th>頁數</th><th>目前狀態</th></tr>${audit.resources.map(x=>`<tr><td>${esc(x.title)}<br><small>${esc(x.file)}</small></td><td>${x.pages}</td><td>${esc(x.status)}</td></tr>`).join('')}</table></div>${audit.resources.map(x=>`<section><h2>${esc(x.title)}</h2><p><strong>${esc(x.file)}</strong> · ${x.pages} 頁</p><p>${esc(x.details)}</p><p><strong>內容：</strong>${esc(x.content_status)}<br><strong>成品：</strong>${esc(x.artifact_status)}</p><p>相關中文正文：${x.chapters.map(id=>`<a href="${routeHref(id)}">${esc(directory.get(id).title)}${directory.get(id).audience==='gm'?'（GM）':''}</a>`).join('、')}</p><ul>${x.evidence.map(e=>`<li>此 PDF 第 ${e.pdf_page} 頁：${esc(e.finding)}</li>`).join('')}</ul><p class="source-note">後續建議：${esc(x.priority)}</p></section>`).join('')}<h2>版本差異先保留</h2><p>角色卡的「解放」（Let Loose）及「奧術發電機」（Arcane Generator），與核心書有不同效果；綜合參考表則把次要部門寫成 3+，核心書預設為 4+。網站已在<a href="#version-notes">配套文件版本差異</a>分開列出，速查頁依核心書判定。</p><p>${esc(audit.method)}</p></div>`;
  }
  function render(){
    let route; try { route=decodeURIComponent(location.hash.slice(1)); } catch { route=''; }
    const [id='home',anchor]=route.split('/'),c=byId.get(id);closeMenu();
    if(anchor&&D.anchorRoutes[anchor]&&id!==D.anchorRoutes[anchor]){location.replace(routeHref(id,anchor));return;}
    if(!c&&directory.has(id)){location.replace(routeHref(id,anchor));return;}
    if(c) view.innerHTML=article(c);
    else if(id==='about') view.innerHTML=about();
    else if(id==='resources')view.innerHTML=resourceInventory();
    else if(id==='saved') view.innerHTML=`<header class="article-head"><h1>${roleName}收藏</h1><div class="english">SAVED IN THIS BROWSER</div></header>${visibleSaved().length?`<div class="cards">${visibleSaved().map(x=>{const b=byId.get(x);return `<a class="card" href="#${b.id}"><span class="number">${esc(b.group)}</span><h3>${esc(b.title)}</h3><p>${esc(chapterSource(b))} →</p></a>`;}).join('')}</div>`:'<p>本區還沒有收藏。打開任一章節，點選「☆ 收藏本章」即可加入。另一區的收藏會繼續保留。</p>'}`;
    else if(!id||id==='home') view.innerHTML=home();
    else view.innerHTML='<h1>找不到這個章節</h1><p>連結可能已更動。請使用搜尋，或<a href="#home">回到規則庫</a>。</p>';
    document.title=(c?c.title:id==='about'?'來源與翻譯紀錄':id==='resources'?'資源翻譯盤點':id==='saved'?'本區收藏':roleName)+' · Armour Astir: Advent';
    view.querySelectorAll('a[href^="#"]').forEach(a=>{const [target,part]=a.getAttribute('href').slice(1).split('/');if(directory.has(target))a.setAttribute('href',routeHref(target,part));});
    document.querySelectorAll('[data-chapter]').forEach(a=>{if(a.dataset.chapter===id){a.setAttribute('aria-current','page');a.closest('details').open=true;}else a.removeAttribute('aria-current');});
    $('#on-this-page').innerHTML=c?'<strong>本章內容</strong><p>'+esc(chapterSource(c))+'</p>'+c.pages.flatMap(p=>p.headings).map(h=>`<a class="${h.level>2?'toc-minor':''}" href="#${c.id}/${h.anchor}">${esc(h.text)}</a>`).join(''):'<strong>閱讀路線</strong><p>從世界與角色建立開始，或直接查找桌上需要的規則。</p><a href="#intro/p005">快速開局</a><a href="#basic-summary">基本動作</a><a href="#playbooks">選擇扮演書</a><a href="#about">來源與校訂</a>';
    if(!c&&isGM) $('#on-this-page').innerHTML='<strong>GM 常用資料</strong><a href="#director/p120">目標與原則</a><a href="#director/p123">導演動作</a><a href="#conflict-turn">衝突回合</a><a href="#conflict-scenes">衝突場景</a><a href="#resources">資源翻譯盤點</a>';
    if(c){
      $('#bookmark').addEventListener('click',()=>{const had=saved.includes(id);saved=had?saved.filter(x=>x!==id):[...saved,id];try{localStorage.setItem('aa-advent-saved',JSON.stringify(saved));}catch{toast('瀏覽器未允許儲存，收藏僅在本次閱讀保留。');}$('#saved-count').textContent=visibleSaved().length;const b=$('#bookmark');b.classList.toggle('saved',!had);b.setAttribute('aria-pressed',String(!had));b.textContent=had?'☆ 收藏本章':'★ 已收藏';});
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
    if(!query){status.textContent='';$('#search-results').innerHTML='<p class="source-note">搜尋'+roleName+'與共用規則。另一區的正文不會混入搜尋結果；可用頁碼定位本區內容。</p>';return;}
    const pageQuery=/^(?:p\.?|頁\s*|第\s*)?(\d{1,3})(?:\s*頁)?$/i.exec(query);
    const found=pages.filter(p=>!scope||p.group===scope).map(p=>{const text=normalize(p.text),title=normalize(p.title+' '+p.chapterTitle+' '+p.english),matched=pageQuery?p.page===Number(pageQuery[1]):terms.every(t=>text.includes(t)||title.includes(t));return {...p,matched,score:terms.reduce((s,t)=>s+(title.includes(t)?10:0)+(text.includes(t)?1:0),0)};}).filter(p=>p.matched).sort((a,b)=>b.score-a.score||a.page-b.page);
    status.textContent=`找到 ${found.length} 頁${found.length>60?'，顯示前 60 頁':''}`;
    $('#search-results').innerHTML=found.length?found.slice(0,60).map(p=>{let pos=terms.length?normalize(p.text).indexOf(terms[0]):-1;pos=Math.max(0,pos-45);let excerpt=p.text.slice(pos,pos+180).replace(/\n+/g,' ');return `<a class="result" href="#${p.chapter}/${pageAnchor(p)}"><strong>${esc(p.title)}</strong><small>${esc(p.chapterTitle)} / ${esc(sourceLabel(p))}</small><p>${pos?'…':''}${esc(excerpt)}…</p></a>`;}).join(''):'<p class="source-note">找不到符合的內容。可縮短關鍵字、把範圍改為本區全部，或切換另一閱讀區。</p>';
    $('#search-results').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>$('#search-dialog').close()));
  }
  $('#search-input').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,100);});$('#search-scope').addEventListener('change',search);
})();

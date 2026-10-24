"""Build a dependency-free reader from complete page-aligned Markdown translations."""
from pathlib import Path
import json, re, html, hashlib, shutil, copy
ROOT = Path(__file__).resolve().parents[1]

def digest(s):
    return hashlib.sha256(s.encode('utf-8')).hexdigest()

def inline(s):
    s = html.escape(s, quote=True)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', s)
    def link(m):
        label, url = m.group(1), html.unescape(m.group(2))
        if not (url.startswith(('#', 'https://', 'http://', 'mailto:'))):
            return label
        return '<a href="' + html.escape(url, quote=True) + '">' + label + '</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, s)

def render(md, page):
    lines=md.splitlines(); result=[]; para=[]; stack=[]; quote=[]; table=[]; code=None; heads=[]; hcount=0
    def flush_para():
        if para:
            result.append('<p>'+inline(' '.join(para))+'</p>');para.clear()
    def close_lists():
        while stack: result.append('</li></'+stack.pop()[1]+'>')
    def flush_quote():
        if quote:
            text='\n'.join(quote);result.append('<blockquote>'+''.join('<p>'+inline(x.replace('\n',' '))+'</p>' for x in re.split(r'\n\s*\n',text) if x.strip())+'</blockquote>');quote.clear()
    def flush_table():
        if table:
            rows=[x.strip().strip('|').split('|') for x in table]
            rows=[x for x in rows if not all(re.fullmatch(r'\s*:?-{2,}:?\s*', c) for c in x)]
            body=[]
            for i,cells in enumerate(rows):
                tag='th' if i==0 else 'td';body.append('<tr>'+''.join(f'<{tag}>'+inline(c.strip()).replace('&lt;br&gt;','<br>').replace('&lt;br/&gt;','<br>')+f'</{tag}>' for c in cells)+'</tr>')
            result.append('<div class="table-wrap"><table>'+''.join(body)+'</table></div>');table.clear()
    for line in lines:
        if line.startswith('```'):
            flush_para();close_lists();flush_quote();flush_table()
            if code is None: code=[]
            else:result.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');code=None
            continue
        if code is not None:code.append(line);continue
        if line.startswith('>'):
            flush_para();close_lists();flush_table();quote.append(line.lstrip('>').lstrip());continue
        flush_quote()
        if line.lstrip().startswith('|'):
            flush_para();close_lists();table.append(line);continue
        flush_table()
        m=re.match(r'^(#{1,6})\s+(.+)',line)
        if m:
            flush_para();close_lists();level=min(6,len(m[1])+1);hcount+=1;anchor=f'p{page:03}-h{hcount}'
            heads.append({'level':level,'text':re.sub(r'[*`]', '',m[2]),'anchor':anchor})
            result.append(f'<h{level} id="{anchor}">'+inline(m[2])+f'</h{level}>');continue
        m=re.match(r'^(\s*)([-*+]|\d+[.)])\s+(.+)',line)
        if m:
            flush_para();indent=len(m[1].replace('\t','    '));kind='ul' if m[2] in '-*+' else 'ol'
            while stack and (stack[-1][0]>indent or (stack[-1][0]==indent and stack[-1][1]!=kind)):
                result.append('</li></'+stack.pop()[1]+'>')
            if stack and stack[-1]==(indent,kind):result.append('</li><li>')
            else:result.append('<'+kind+'><li>');stack.append((indent,kind))
            result.append(inline(m[3]));continue
        if not line.strip():flush_para();continue
        if re.fullmatch(r'\s*([-*_])\1\1+\s*',line):flush_para();close_lists();result.append('<hr>');continue
        close_lists();para.append(line.strip())
    flush_para();close_lists();flush_quote();flush_table()
    assert code is None, f'Unclosed code fence page {page}'
    return '\n'.join(result),heads

def edition(chapters, mode):
    selected=[dict(c) for c in chapters if c['audience'] in (mode,'shared')]
    if mode=='gm':
        selected.sort(key=lambda c: (c['audience']=='shared',c.get('derived',False),c['start']))
        for c in selected:
            if c['audience']=='shared':c['group']='共用規則與資料'
    return selected

def split_director_notes(chapters):
    views=copy.deepcopy(chapters);notes=[];routes={}
    for c in views:
        if c['audience']=='gm':continue
        kept=[];c['gmNotes']=[]
        for p in c['pages']:
            headings=list(re.finditer(r'<h([2-6]) id="([^"]+)">(.+?)</h\1>',p['html']))
            ranges=[]
            for i,h in enumerate(headings):
                title=html.unescape(re.sub('<[^>]+>','',h[3]))
                if '導演筆記' not in title and '導演備註' not in title:continue
                level=int(h[1]);end=next((n.start() for n in headings[i+1:] if int(n[1])<=level),len(p['html']))
                ranges.append((h.start(),end))
            if not ranges:kept.append(p);continue
            body='\n'.join(p['html'][a:b] for a,b in ranges)
            moved_ids={h[2] for h in headings if any(a<=h.start()<b for a,b in ranges)}
            for anchor in moved_ids:routes[anchor]='gm-notes'
            is_whole=ranges[0][0]==0 and ranges[-1][1]==len(p['html'])
            note_title=p['title'] if is_whole else p['title']+'：導演筆記'
            note_heads=[h for h in p['headings'] if h['anchor'] in moved_ids]
            if not is_whole:
                title_anchor=f'p{p["page"]:03}-notes'
                body=f'<h2 id="{title_anchor}">{html.escape(note_title)}</h2>\n'+body
                note_heads=[{'level':2,'text':note_title,'anchor':title_anchor}]+note_heads
            notes.append({'page':p['page'],'title':note_title,'html':body,'text':html.unescape(re.sub('<[^>]+>',' ',body)),'headings':note_heads,'chapter':'gm-notes','original_chapter':c['id']})
            c['gmNotes'].append(p['page'])
            if is_whole:
                routes[f'p{p["page"]:03}']='gm-notes'
                continue
            for a,b in reversed(ranges):
                p['html']=p['html'][:a]+f'<p class="source-note"><a href="#gm-notes/p{p["page"]:03}">此節導演筆記移至 GM 工作台 ↗</a></p>'+p['html'][b:]
            p['headings']=[h for h in p['headings'] if h['anchor'] not in moved_ids]
            p['text']=html.unescape(re.sub('<[^>]+>',' ',p['html']))
            kept.append(p)
        c['pages']=kept
    if notes:
        views.append({'id':'gm-notes','title':'玩家規則的導演筆記','english':'Director Notes for Player Rules','start':min(p['page'] for p in notes),'end':max(p['page'] for p in notes),'audience':'gm','group':'主持補充','derived':True,'pages':notes})
    return views,routes,[p['page'] for p in notes]

def write_reader(site, chapters, directory, name, title):
    is_full=name=='reader.html'; included={p['page'] for c in chapters for p in c['pages']};included_chapters={c['id'] for c in chapters}
    home='gm.html' if name=='gm-reader.html' else 'index.html'
    reader=['<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' · Armour Astir</title><link rel="stylesheet" href="styles.css?v=20261025-3"></head><body><main style="max-width:900px;margin:auto"><h1>'+title+'</h1><p>Armour Astir: Advent · <a href="'+home+'">回到閱讀介面</a></p>']
    if is_full:reader.append('<p class="notice">這是含 GM 內容的完整原書列印版。分區列印請開啟<a href="player-reader.html">玩家手冊</a>或<a href="gm-reader.html">GM 工作台</a>。</p>')
    reader.append('<nav><ol>')
    reader += [f'<li><a href="#{c["id"]}">{html.escape(c["title"])}</a>（{c["start"]}–{c["end"]}）</li>' for c in chapters]
    reader.append('</ol></nav>')
    for c in chapters:
        reader.append(f'<header class="article-head" id="{c["id"]}"><h1>{html.escape(c["title"])}</h1><p>{html.escape(c["english"])}</p></header>')
        for p in c['pages']:
            def target(m):
                anchor=m[2];number=int(re.match(r'p(\d+)',anchor)[1])
                if number in included and m[1] in included_chapters:return 'href="#'+anchor+'"'
                other=next(x for x in directory if x['id']==m[1])
                path='gm-reader.html' if other['audience']=='gm' else 'player-reader.html'
                return 'href="'+path+'#'+anchor+'"'
            body=re.sub(r'href="#([a-z0-9-]+)/(p\d{3}(?:-h\d+)?)"',target,p['html'])
            reader.append(f'<section class="page-block" id="p{p["page"]:03}"><div class="page-marker">英文原書第 {p["page"]} 頁</div>{body}</section>')
    reader.append('</main></body></html>')
    (site/name).write_text('\n'.join(reader),encoding='utf8',newline='\n')

def build():
    chapters=json.loads((ROOT/'chapters.json').read_text(encoding='utf8'))
    source_path=ROOT/'source/pages.json'
    source=json.loads(source_path.read_text(encoding='utf8')) if source_path.exists() else []
    existing_audit=json.loads((ROOT/'translation/coverage.json').read_text(encoding='utf8')) if (ROOT/'translation/coverage.json').exists() else {}
    previous={p['page']:p for p in existing_audit.get('pages',[])}
    all_pages=[];audit=[]
    for c in chapters:
        c['pages']=[]
        for n in range(c['start'],c['end']+1):
            path=ROOT/f'content/pages/p{n:03}.md'
            if not path.exists():raise SystemExit(f'Missing translated page: {n}')
            md=path.read_text(encoding='utf8');body,heads=render(md,n)
            text=re.sub(r'[#*`>|]', '', md)
            p={'page':n,'title':heads[0]['text'],'html':body,'text':text,'headings':heads,'chapter':c['id']}
            c['pages'].append(p);all_pages.append(p)
            if source:
                src=source[n-1]['text'];sh=digest(src);sl=len(src)
            else:sh=previous[n]['source_sha256'];sl=previous[n]['source_characters']
            audit.append({'page':n,'source_sha256':sh,'source_characters':sl,'target_sha256':digest(md),'target_characters':len(md),'file':f'content/pages/p{n:03}.md','status':'translated','review':'see translation/reviews.json'})
    assert sorted(p['page'] for p in all_pages)==list(range(1,175)), 'Page coverage must be 1–174 exactly once'
    sources=json.loads((ROOT/'translation/sources.json').read_text(encoding='utf8'))
    reviews_path=ROOT/'translation/reviews.json'
    reviews=json.loads(reviews_path.read_text(encoding='utf8')) if reviews_path.exists() else {'status':'draft','note':'獨立初校尚在進行。'}
    site=ROOT/'site'
    view_chapters,anchor_routes,note_pages=split_director_notes(chapters)
    directory=[{k:c[k] for k in ['id','title','start','end','audience']} for c in view_chapters]
    inventory=json.loads((ROOT/'translation/resource-inventory.json').read_text(encoding='utf8'))
    counts={}
    for mode,name in [('player','data.js'),('gm','gm-data.js')]:
        selected=edition(view_chapters,mode)
        data={'title':'Armour Astir: Advent','updated':'2026-10-25','mode':mode,'chapters':selected,'directory':directory,'anchorRoutes':anchor_routes,'sources':sources,'reviews':reviews,'totalPages':174,'totalChapters':len(chapters),'resources':inventory}
        (site/name).write_text('window.AA_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8',newline='\n')
        counts[mode]={'chapters':len(selected),'pages':sum(len(c['pages']) for c in selected),'chapter_ids':[c['id'] for c in selected]}
    shell=(site/'index.html').read_text(encoding='utf8').replace('src="data.js?', 'src="gm-data.js?').replace('<body>','<body class="gm-workshop">').replace('玩家手冊 · Armour Astir','GM 工作台 · Armour Astir').replace('ADVENT ／ 玩家手冊','ADVENT ／ GM 工作台').replace('PLAYER / FIELD MANUAL','DIRECTOR / WORKSHOP').replace('href="gm.html#home">GM 工作台 ↗','href="index.html#home">← 玩家手冊').replace('id="reader-link" href="player-reader.html">玩家手冊列印版','id="reader-link" href="gm-reader.html">GM 工作台列印版').replace('搜尋玩家手冊','搜尋 GM 工作台').replace('href="player-reader.html">玩家手冊靜態閱讀版','href="gm-reader.html">GM 工作台靜態閱讀版')
    (site/'gm.html').write_text(shell,encoding='utf8',newline='\n')
    (ROOT/'translation/coverage.json').write_text(json.dumps({'source_policy':'English originals only; machine-translated files not used','source_pages':174,'translated_pages':len(all_pages),'chapters':len(chapters),'pages':audit},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    write_reader(site,chapters,directory,'reader.html','完整原書閱讀／列印（含 GM）')
    write_reader(site,edition(view_chapters,'player'),directory,'player-reader.html','玩家手冊閱讀／列印')
    write_reader(site,edition(view_chapters,'gm'),directory,'gm-reader.html','GM 工作台閱讀／列印')
    (ROOT/'translation/editions.json').write_text(json.dumps({'date':'2026-10-25','policy':'Public reading partitions, not access control; shared rules appear in both. Canonical translation pages are unchanged. Director notes are transferred to a derived GM-only chapter; old note anchors redirect.','director_note_pages':note_pages,'editions':counts},ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    (site/'translation-quality.json').write_text(json.dumps({'source_pages':174,'translated_pages':len(all_pages),'chapters':len(chapters),'reviews':reviews,'editions':counts,'resource_inventory_count':len(inventory['resources']),'note':'頁數與雜湊檢查不能取代語義校訂。'},ensure_ascii=False,indent=2),encoding='utf8')
    print(f'Built {len(chapters)} chapters, {len(all_pages)} pages; '+str(sum(p['target_characters'] for p in audit))+' translated characters.')

if __name__=='__main__':build()

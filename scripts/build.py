"""Build a dependency-free reader from complete page-aligned Markdown translations."""
from pathlib import Path
import json, re, html, hashlib, shutil
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
    data={'title':'Armour Astir: Advent','updated':'2026-10-25','chapters':chapters,'sources':sources,'reviews':reviews,'totalPages':174}
    site=ROOT/'site'
    (site/'data.js').write_text('window.AA_DATA = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
    (ROOT/'translation/coverage.json').write_text(json.dumps({'source_policy':'English originals only; machine-translated files not used','source_pages':174,'translated_pages':len(all_pages),'chapters':len(chapters),'pages':audit},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    reader=['<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Armour Astir 全書閱讀／列印</title><link rel="stylesheet" href="styles.css?v=20261025-1"></head><body><main style="max-width:900px;margin:auto"><h1>Armour Astir: Advent</h1><p>繁體中文全書譯稿 · 依英文插畫版逐頁翻譯 · <a href="index.html">回到規則庫</a></p><p>來源與校訂狀態見 <a href="index.html#about">翻譯紀錄</a>。使用瀏覽器列印可另存 PDF。</p><nav><ol>']
    reader += [f'<li><a href="#{c["id"]}">{html.escape(c["title"])}</a>（{c["start"]}–{c["end"]}）</li>' for c in chapters]
    reader+=['</ol></nav>']
    for c in chapters:
        reader.append(f'<header class="article-head" id="{c["id"]}"><h1>{html.escape(c["title"])}</h1><p>{html.escape(c["english"])}</p></header>')
        for p in c['pages']:
            body=re.sub(r'href="#[a-z0-9-]+/(p\d{3}(?:-h\d+)?)"',r'href="#\1"',p['html'])
            reader.append(f'<section class="page-block" id="p{p["page"]:03}"><div class="page-marker">英文原書第 {p["page"]} 頁</div>{body}</section>')
    reader+=['</main></body></html>'];(site/'reader.html').write_text('\n'.join(reader),encoding='utf8')
    (site/'translation-quality.json').write_text(json.dumps({'source_pages':174,'translated_pages':len(all_pages),'chapters':len(chapters),'reviews':reviews,'note':'頁數與雜湊檢查不能取代語義校訂。'},ensure_ascii=False,indent=2),encoding='utf8')
    print(f'Built {len(chapters)} chapters, {len(all_pages)} pages; '+str(sum(p['target_characters'] for p in audit))+' translated characters.')

if __name__=='__main__':build()

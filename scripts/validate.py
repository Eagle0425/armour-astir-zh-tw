"""Validate the published text, provenance, routes and static HTML as one release."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, re
from build import ROOT, render

def check(ok, message):
    if not ok: raise SystemExit('FAIL: '+message)

class Scan(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.links=[];self.resources=[];self.text=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='a':self.links.append(a.get('href',''))
        if tag in ['script','img','link']:
            url=a.get('src',a.get('href',''))
            if url:self.resources.append(url)
        check(tag not in ['iframe','object','embed'],'Unexpected active embedding')
        check(not any(k.startswith('on') for k in a),'Inline event handler is not allowed')
    def handle_data(self,s):self.text.append(s)

coverage=json.loads((ROOT/'translation/coverage.json').read_text(encoding='utf8'))
chapters=json.loads((ROOT/'chapters.json').read_text(encoding='utf8'))
ids={c['id'] for c in chapters};page_routes={}
all_headings=set()
for c in chapters:
    for n in range(c['start'],c['end']+1):page_routes[n]=c['id']
check(sorted(page_routes)==list(range(1,175)),'Chapter ranges must cover all 174 pages')
check(len(coverage['pages'])==174,'Missing page provenance')
for record in coverage['pages']:
    n=record['page'];md=(ROOT/record['file']).read_text(encoding='utf8')
    check(hashlib.sha256(md.encode()).hexdigest()==record['target_sha256'],f'Stale target fingerprint p{n}')
    check('�' not in md,f'Invalid replacement character p{n}')
    check(md.startswith('# '),f'Missing source-page title p{n}')
    check(not any(x in md for x in ['TODO','待翻譯','PLACEHOLDER']),f'Untranslated placeholder p{n}')
    body,heads=render(md,n);all_headings.update(h['anchor'] for h in heads)
    check(len(heads)>=1,f'Empty rendered page p{n}')
    scan=Scan();scan.feed(body)
    for href in scan.links:
        if href.startswith('#'):
            route=href[1:].split('/')
            check(route[0] in ids,f'Bad chapter link p{n}: {href}')
            if len(route)>1:
                m=re.fullmatch(r'p(\d{3})(?:-h\d+)?',route[1]);check(m is not None,f'Bad page anchor {href}')
                check(page_routes.get(int(m[1]))==route[0],f'Page linked to wrong chapter: {href}')
reader=Scan();reader.feed((ROOT/'site/reader.html').read_text(encoding='utf8'))
check(len(reader.ids)==len(set(reader.ids)),'Duplicate reader anchors')
for href in reader.links:
    if href.startswith('#'):check(href[1:] in reader.ids,f'Broken static reader link: {href}')
for name in ['index.html','reader.html']:
    parser=Scan();parser.feed((ROOT/'site'/name).read_text(encoding='utf8'))
    for resource in parser.resources:
        check(not resource.startswith(('http:','https:','//')),'Unexpected external asset dependency')
        path=resource.split('?')[0]
        check(not path.startswith('/'),'Root-relative asset will break project Pages')
        check((ROOT/'site'/path).is_file(),f'Missing resource {path}')
book_ids=['arcanist','impostor','paradigm','witch','captain','diplomat','artificer','scout']
check(all(i in ids for i in book_ids),'Missing playbook')
cantrips=(ROOT/'content/pages/p060.md').read_text(encoding='utf8')
check(len(re.findall(r'^## ',cantrips,re.M))==11,'Expected all 11 cantrips')
soldiers='\n'.join((ROOT/f'content/pages/p{n:03}.md').read_text(encoding='utf8') for n in [61,62])
check(len(re.findall(r'^#{2,3} .+（[A-Z][A-Z ’!]+）',soldiers,re.M))==14,'Expected all 14 Soldier moves')
check('THE ARITY METHOD' in soldiers,'Missing Arity method')
for page in [150,155,160,165]:
    md=(ROOT/f'content/pages/p{page:03}.md').read_text(encoding='utf8')
    check(not re.search(r'\| 過熱 \| (?!空白記錄欄)',md),f'Card subsystem mistaken for overheating p{page}')
check('直到本次出擊結束，擲「倒下」時都在絕境中擲骰' in (ROOT/'content/pages/p013.md').read_text(encoding='utf8'),'Danger overflow review fix regressed')
reviews=json.loads((ROOT/'translation/reviews.json').read_text(encoding='utf8'))
check(reviews['reviewed_pages']==list(range(1,175)),'Independent review coverage incomplete')
for resolution in json.loads((ROOT/'translation/resolutions.json').read_text(encoding='utf8'))['resolutions']:
    target=ROOT/f'content/pages/p{resolution["page"]:03}.md'
    check(hashlib.sha256(target.read_bytes()).hexdigest()==resolution['target_sha256'],f'Review resolution stale p{resolution["page"]}; update review rather than just rebuilding')
print('PASS: 174 source-page fingerprints; 58 chapters; eight complete playbook ranges; cantrip/Soldier inventory; internal routes; reader links; source card structure; relative static assets; review regression checks.')

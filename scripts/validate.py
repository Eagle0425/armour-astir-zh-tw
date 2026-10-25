"""Validate the published text, provenance, routes and static HTML as one release."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json, re
from build import ROOT, render, edition, load_supplements, page_anchor

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
supplements=load_supplements()
ids={c['id'] for c in chapters+supplements};page_routes={}
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
readers={}
for name in ['reader.html','player-reader.html','gm-reader.html']:
    parser=Scan();parser.feed((ROOT/'site'/name).read_text(encoding='utf8'));readers[name]=parser
    check(len(parser.ids)==len(set(parser.ids)),f'Duplicate reader anchors in {name}')
for name,parser in readers.items():
    for href in parser.links:
        if href.startswith('#'):check(href[1:] in parser.ids,f'Broken static reader link {name}: {href}')
        elif '#' in href:
            dest,anchor=href.split('#',1)
            if dest in readers:check(anchor in readers[dest].ids,f'Broken cross-reader link {name}: {href}')
for name in ['index.html','gm.html',*readers]:
    parser=Scan();parser.feed((ROOT/'site'/name).read_text(encoding='utf8'))
    for resource in parser.resources:
        check(not resource.startswith(('http:','https:','//')),'Unexpected external asset dependency')
        path=resource.split('?')[0]
        check(not path.startswith('/'),'Root-relative asset will break project Pages')
        check((ROOT/'site'/path).is_file(),f'Missing resource {path}')
datasets={}
for mode,name in [('player','data.js'),('gm','gm-data.js')]:
    raw=(ROOT/'site'/name).read_text(encoding='utf8')
    data=json.loads(raw.removeprefix('window.AA_DATA = ').strip().removesuffix(';'))
    datasets[mode]=data
    check(data['mode']==mode,f'Wrong reader mode in {name}')
    expected=edition(chapters+[{'id':'gm-notes','audience':'gm','start':21,'derived':True,'group':'主持補充'}]+supplements,mode)
    check([c['id'] for c in data['chapters']]==[c['id'] for c in expected],f'Wrong audience or order in {name}')
    check(all(c['audience'] in [mode,'shared'] for c in data['chapters']),f'Other-role body leaked into {name}')
    check(data['totalChapters']==58 and len(data['directory'])==59+len(supplements),'Cross-role route directory incomplete')
    rendered_pages={int(x[1:]) for x in readers['gm-reader.html' if mode=='gm' else 'player-reader.html'].ids if re.fullmatch('p[0-9]{3}',x)}
    expected_pages={p['page'] for c in data['chapters'] for p in c['pages'] if p['page'] is not None}
    check(rendered_pages==expected_pages,f'Wrong printable edition {mode}')
player_pages={p['page'] for c in datasets['player']['chapters'] for p in c['pages'] if p['page'] is not None}
gm_pages={p['page'] for c in datasets['gm']['chapters'] for p in c['pages'] if p['page'] is not None}
check(player_pages|gm_pages==set(range(1,175)),'Reader split dropped core pages')
shared_pages={n for c in chapters if c['audience']=='shared' for n in range(c['start'],c['end']+1)}
note_pages={21,22,23,24,25,26,27,28,29,31,32,33,36,37,44,90}
check(player_pages&gm_pages==shared_pages|(note_pages-{44}),'Unexpected source-page overlap between player and GM')
check(44 not in player_pages and 44 in gm_pages,'Impostor director-only page not moved')
notes=next(c for c in datasets['gm']['chapters'] if c['id']=='gm-notes')
check({p['page'] for p in notes['pages']}==note_pages,'Director notes incomplete')
check(not any('導演筆記' in h['text'] for c in datasets['player']['chapters'] for p in c['pages'] for h in p['headings']),'GM note headings remain in player edition')
check('早期版本' not in next(p['text'] for c in datasets['player']['chapters'] for p in c['pages'] if p['page']==21),'Player search still indexes director-only prose')
check('早期版本' in next(p['text'] for p in notes['pages'] if p['page']==21),'Director note prose lost')
check('gm-data.js' not in (ROOT/'site/index.html').read_text(encoding='utf8'),'Player shell loads GM dataset')
check('src="data.js?' not in (ROOT/'site/gm.html').read_text(encoding='utf8'),'GM shell loads player dataset')
inventory=json.loads((ROOT/'translation/resource-inventory.json').read_text(encoding='utf8'))
check(len(inventory['resources'])==5,'Supplement inventory incomplete')
check({x['pages'] for x in inventory['resources']}=={127,17,6,4,10},'Source PDF page counts changed')
check(all(not x['chinese_pdf_available'] for x in inventory['resources']),'Do not claim untranslated PDF artifacts exist')
for resource in inventory['resources']:
    check(all(i in ids for i in resource['chapters']),'Inventory points to unknown chapter')
    local_source=ROOT.parent/resource['relative_path']
    if local_source.exists():check(hashlib.sha256(local_source.read_bytes()).hexdigest()==resource['sha256'],'Inventory source changed; inspect again')
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
    check(hashlib.sha256(target.read_text(encoding='utf8').encode()).hexdigest()==resolution['target_sha256'],f'Review resolution stale p{resolution["page"]}; update review rather than just rebuilding')
print('PASS: 174 source-page fingerprints; 58 chapters; eight complete playbook ranges; cantrip/Soldier inventory; internal routes; reader links; source card structure; relative static assets; review regression checks.')
print('PASS: separate player/GM datasets, search scope and printable page sets; complete cross-reader anchors; five-resource inventory and source fingerprints.')

# Companion pages have their own source labels and anchors, never fake core page numbers.
resource_map={x['file']:x for x in inventory['resources']}
for c in supplements:
    check(c['id'] not in {x['id'] for x in chapters},'Supplement collides with core chapter')
    for src in c['sources']:
        check(src['sha256']==resource_map[src['file']]['sha256'],'Stale companion source fingerprint')
        check(all(1<=n<=resource_map[src['file']]['pages'] for n in src['pages']),'Invalid companion source page')
    p=c['pages'][0];check(p['page'] is None and p['sourceLabel'],'Supplement must not impersonate core pagination')
    scan=Scan();scan.feed(p['html'])
    for href in scan.links:
        if not href.startswith('#'):continue
        target,*part=href[1:].split('/')
        check(target in ids or target in ['resources','about'],'Bad companion route '+href)
        if part:check(part[0] in all_headings or (re.fullmatch('p[0-9]{3}',part[0]) and page_routes.get(int(part[0][1:]))==target),'Bad companion core anchor '+href)
    for mode,data in datasets.items():
        selected=[x for x in data['chapters'] if x['id']==c['id']]
        check(bool(selected)==(c['audience'] in [mode,'shared']),'Companion audience mismatch')
        if selected:
            check(selected[0]['pages'][0]['text']==p['text'],'Stale companion search text')
            reader=readers['gm-reader.html' if mode=='gm' else 'player-reader.html']
            check(page_anchor(p) in reader.ids,'Companion missing from print edition')
    check(page_anchor(p) in readers['reader.html'].ids,'Companion missing from full reader')
check(len(supplements)==5,'Expected five companion chapters')
print('PASS: five companion chapters; source/target fingerprints; role isolation; core cross-links; distinct supplemental pagination and print anchors.')

# Art is attached to source-aligned pages without changing reviewed Markdown.
art=json.loads((ROOT/'illustrations.json').read_text(encoding='utf8'))
core_source=json.loads((ROOT/'translation/sources.json').read_text(encoding='utf8'))[0]
check(art['source_sha256']==core_source['sha256'],'Art extracted from a different core PDF')
check(len(art['items'])==55 and len({x['id'] for x in art['items']})==55,'Art inventory incomplete or duplicated')
check(json.loads((ROOT/'site/illustrations.json').read_text(encoding='utf8'))==art,'Stale public illustration provenance')
asset_paths=set();placements=0
for item in art['items']:
    check(1<=item['source_page']<=174 and item['alt'] and item['title'],'Missing art source or accessible description')
    check(len(item['variants'])==2,'Missing responsive art variant')
    for variant in item['variants']:
        path=variant['src'];check(path.startswith('assets/illustrations/') and '..' not in path,'Unsafe art path')
        check(path not in asset_paths,'Repeated illustration asset path');asset_paths.add(path)
        raw=(ROOT/'site'/path).read_bytes()
        check(hashlib.sha256(raw).hexdigest()==variant['sha256'] and len(raw)==variant['bytes'],'Art fingerprint mismatch '+path)
        check(raw[:4]==b'RIFF' and raw[8:12]==b'WEBP','Invalid WebP file '+path)
        check(abs(variant['width']/variant['height']-item['original_width']/item['original_height'])<0.01,'Art aspect ratio changed '+path)
    for placement in item['placements']:
        placements+=1
        for mode,data in datasets.items():
            expected=[c for c in data['chapters'] if c['id']==placement['chapter']]
            matches=[(c,p) for c in data['chapters'] for p in c['pages'] if 'data-art="'+item['id']+'"' in p['html'] and p['page']==placement['page']]
            check(len(matches)==(1 if expected else 0),'Art in wrong reader or page: '+item['id']+' '+mode)
            if matches:check(matches[0][0]['id']==placement['chapter'],'Art in wrong chapter: '+item['id'])
    for reader in readers.values():
        check(item['variants'][0]['src'] in reader.resources or reader is not readers['reader.html'],'Art missing from full print edition '+item['id'])
check(placements==56,'Missing art placement')
check(len([x for x in art['items'] if x['layout']=='portrait'])==8,'Expected one portrait per playbook')
print('PASS: 55 original illustrations, 56 placements, 110 WebP fingerprints; aspect ratios, player/GM placement and printable assets.')

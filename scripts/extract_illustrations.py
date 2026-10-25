"""Optional asset preparation; building the site only needs the committed WebP files.

Usage: python scripts/extract_illustrations.py /path/to/ArmourAstir_af_illus.pdf
Requires pypdf and Pillow. Only the visually reviewed PDF image objects in the
manifest are extracted. No page screenshots or generated artwork are used.
"""
from pathlib import Path
import hashlib, json, sys
from pypdf import PdfReader
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

def main():
    source=Path(sys.argv[1]);manifest=ROOT/'illustrations.json'
    data=json.loads(manifest.read_text(encoding='utf8'))
    assert hashlib.sha256(source.read_bytes()).hexdigest()==data['source_sha256'],'Unexpected source PDF'
    reader=PdfReader(source)
    for item in data['items']:
        # pypdf combines the embedded soft mask with the image, where present.
        original=reader.pages[item['source_page']-1].images[item['object']].image.convert('RGBA')
        item['original_width'],item['original_height']=original.size
        white=Image.new('RGBA',original.size,'white');white.alpha_composite(original)
        original=white.convert('RGB');item['variants']=[]
        for suffix,box in [('',(1400,1600)),('-small',(640,960))]:
            image=original.copy();image.thumbnail(box,Image.Resampling.LANCZOS)
            name=f'assets/illustrations/{item["id"]}{suffix}.webp'
            output=ROOT/'site'/name;output.parent.mkdir(parents=True,exist_ok=True)
            image.save(output,'WEBP',quality=90,method=6)
            # Decode the result as well, so corrupt encodings fail before publication.
            with Image.open(output) as check:check.load();assert check.size==image.size
            item['variants'].append({'src':name,'width':image.width,'height':image.height,'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()})
    manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
    print(f'Extracted {len(data["items"])} original artworks; '+str(sum(v['bytes'] for x in data['items'] for v in x['variants']))+' bytes including responsive variants.')

if __name__=='__main__':main()

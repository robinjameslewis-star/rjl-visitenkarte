from pathlib import Path
import json, textwrap, argparse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader

PARSER = argparse.ArgumentParser(description='Build the two blank AcroForm pilot questionnaires.')
PARSER.add_argument('--schema', type=Path, default=Path(__file__).resolve().parent.parent/'questionnaire-schema.json')
PARSER.add_argument('--design', type=Path, default=Path.home()/'Documents/Second Brain/90_Meta/Design')
PARSER.add_argument('--font', type=Path, default=Path.home()/'Library/Fonts/EBGaramond[wght].ttf')
PARSER.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent/'downloads')
ARGS = PARSER.parse_args()
DESIGN = ARGS.design
TOKENS = json.loads((DESIGN/'tokens.json').read_text())
C = {k: HexColor(v) for k,v in TOKENS['color'].items()}
SCHEMA = json.loads(ARGS.schema.read_text())
FIELD = {f['name']:f for f in SCHEMA['fields']}
OUT = ARGS.output
pdfmetrics.registerFont(TTFont('EBGaramond', str(ARGS.font)))
W,H = A4
L,R = 70.87,56.69
CW=W-L-R
TEXTURE=ImageReader(str(DESIGN/'Vorlagen/Assets/papier_textur_512.jpg'))
BIRD=ImageReader(str(DESIGN/'Vorlagen/Assets/rotkehlchen_freigestellt.png'))

COPY={
'de': {
 'title':['Ihre Kanzlei. Ihr Unternehmen.','Ihre Vision.'],
 'intro':'Dieser Fragebogen ersetzt die Vor-Ort-IST-Aufnahme für den Pilot und bildet den Startpunkt unserer Zusammenarbeit.',
 'how':'Stichpunkte genügen. Unklare Angaben können offenbleiben. Ich kläre offene Punkte mit Ihnen und bereite daraus Ihr persönliches Startprofil vor.',
 'privacy':'Bitte keine Mandanten-, Beschäftigten- oder Gesundheitsdaten, Zugangsdaten oder Einzelfallunterlagen eintragen. Rollen statt Namen Dritter genügen.',
 'sections':['Betrieb und Menschen','Vision und erster Schwerpunkt','Alltag, Team und Technik','So arbeiten wir zusammen'],
 'leads':['','Was soll sich verändern? Ein klares erstes Thema hilft uns, schnell ins Machen zu kommen.','Wir knüpfen an das an, was bereits vorhanden ist, und machen Reibung im Alltag sichtbar.','Ich halte mich aktiv auf dem Stand und organisiere das Follow-up im vereinbarten Rahmen.'],
 'support':'Wo wünschen Sie sich Unterstützung? Mehrfachauswahl möglich.',
 'end':'Ihre Angaben sind eine Selbstauskunft für den Pilot, kein Auftrag und keine Zugriffsfreigabe. Nach meiner Durchsicht entsteht daraus unser gemeinsamer Arbeitsstand.',
 'save':'PDF ausfüllen und speichern, nicht über „Drucken als PDF“. Rückgabe über den mit Robin vereinbarten Weg.',
 'footer':'Pilotprofil 1.0  |  Organisatorische Bestandsaufnahme',
 'continued':'Die ausgefüllte PDF bildet dieselben Profilfelder ab wie das spätere Online-Onboarding.'
},
'en': {
 'title':['Your firm. Your business.','Your vision.'],
 'intro':'For the pilot, this questionnaire replaces the on-site baseline assessment and gives us a starting point for our collaboration.',
 'how':'Brief notes are enough. Leave anything unclear open. I will follow up with you and use your answers to prepare your personal starting profile.',
 'privacy':'Please do not include client, employee or health data, credentials or case documents. Use roles rather than other people\'s names.',
 'sections':['Your organization and people','Your vision and first priority','Daily work, people and technology','How we work together'],
 'leads':['','What would you like to change? One clear priority helps us take the first practical step.','We build on what is already in place and make everyday friction visible.','I actively stay up to date and arrange follow-up within our agreed scope.'],
 'support':'Where would support help? Select as many as apply.',
 'end':'These answers are your account of the starting point for the pilot, not an order or access permission. After my review, they form our shared working baseline.',
 'save':'Complete the PDF and save it; do not use Print to PDF. Return it using the channel agreed with Robin.',
 'footer':'Pilot profile 1.0  |  Organizational baseline',
 'continued':'This PDF uses the same profile fields as the planned online onboarding.'
}}

class Form:
 def __init__(self,lang):
  self.lang=lang; self.copy=COPY[lang]
  self.path=OUT/f'pilot-questionnaire-{lang}.pdf'
  self.c=canvas.Canvas(str(self.path),pagesize=A4,pageCompression=1)
  self.c.setTitle(self.copy['title'][0]+' '+self.copy['title'][1])
  self.c.setAuthor('Robin James Lewis | robin.vision')
  self.c.setSubject('rv-pilot-1 | Fillable pilot onboarding questionnaire | '+lang)
  self.c.setKeywords('rv-pilot-1, robin.vision, pilot, onboarding, '+lang)
  self.boxes=[]
 def text(self,text,x,y,font='Helvetica',size=10,color='ink',width=None,leading=None):
  width=width or CW; leading=leading or size*1.35
  lines=[]
  for paragraph in text.split('\n'):
   words=paragraph.split(); line=''
   for word in words:
    nextline=(line+' '+word).strip()
    if pdfmetrics.stringWidth(nextline,font,size)>width and line:
     lines.append(line);line=word
    else:line=nextline
   lines.append(line)
  self.c.setFillColor(C[color]);self.c.setFont(font,size)
  for i,line in enumerate(lines):self.c.drawString(x,y-leading*i,line)
  return y-leading*len(lines)
 def page(self,n):
  c=self.c
  c.setFillColor(C['paper']);c.rect(0,0,W,H,fill=1,stroke=0)
  for x in range(0,int(W)+256,256):
   for y in range(0,int(H)+256,256):c.drawImage(TEXTURE,x,y,width=256,height=256)
  c.saveState()
  t=c.beginText(L,H-76);t.setFont('EBGaramond',13 if n==1 else 10);t.setFillColor(C['green']);t.setCharSpace(2.2 if n==1 else 1.3);t.textOut('ROBIN JAMES LEWIS');c.drawText(t)
  c.restoreState()
  if n==1:c.drawImage(BIRD,W-R-119,H-112,width=119,height=119*710/1153,mask='auto')
  self.text('robin.vision',L,H-93,size=9,color='inkSoft')
  c.setStrokeColor(C['line']);c.setLineWidth(.45);c.line(L,53,W-R,53)
  self.text(self.copy['footer'],L,39,size=8,color='inkSoft')
  c.setFillColor(C['inkSoft']);c.setFont('Helvetica',8);c.drawRightString(W-R,39,f'{n:02d} / 04')
  if n==1:
   self.text(self.copy['title'][0],L,690,font='EBGaramond',size=25,color='green')
   self.text(self.copy['title'][1],L,661,font='EBGaramond',size=25,color='green')
   self.text(self.copy['intro'],L,636,size=9.5,color='inkSoft',leading=12.5)
   self.text(self.copy['how'],L,600,size=9,color='inkSoft',leading=12)
   self.text(self.copy['privacy'],L,563,size=8.4,color='inkSoft',leading=11)
   self.heading(n,519)
  else:
   self.text(self.copy['sections'][n-1],L,706,font='EBGaramond',size=26,color='green')
   self.text(self.copy['leads'][n-1],L,676,size=10,color='inkSoft',leading=14)
   self.heading(n,632)
 def heading(self,n,y):
  self.text(f'{n:02d}',L,y,font='EBGaramond',size=17,color='copper')
  self.text(self.copy['sections'][n-1],L+31,y+1,font='Helvetica',size=10.5,color='green')
 def field(self,name,y,h=25,x=None,w=None):
  f=FIELD[name];x=L if x is None else x;w=CW if w is None else w
  y=self.text(f['label'][self.lang],x,y,size=9.5,width=w,leading=12)
  if 'hint' in f:y=self.text(f['hint'][self.lang],x,y-1,size=8.1,color='inkSoft',width=w,leading=10.5)
  top=y-4;bottom=top-h
  kw=dict(name=name,tooltip=f['label'][self.lang],x=x,y=bottom,width=w,height=h,borderStyle='solid',borderWidth=.6,borderColor=C['line'],fillColor=C['paperWarm'],textColor=C['ink'],forceBorder=True,fontName='Helvetica',fontSize=10)
  if f['type']=='choice':
   opts=f['options'][self.lang]
   self.c.acroForm.choice(**kw,options=opts,value=opts[0],fieldFlags='combo',annotationFlags='print')
  else:
   self.c.acroForm.textfield(**kw,value='',maxlen=f['maxLength'],fieldFlags='multiline' if f['type']=='multiline' else '',annotationFlags='print')
  self.boxes.append({'name':name,'page':f['page'],'rect':[x,bottom,x+w,top]})
  assert bottom>=64,(name,bottom)
  return bottom-14
 def pair(self,a,b,y,h=25):
  width=(CW-18)/2
  return min(self.field(a,y,h,L,width),self.field(b,y,h,L+width+18,width))
 def checkbox(self,name,y):
  f=FIELD[name]
  self.c.acroForm.checkbox(name=name,tooltip=f['label'][self.lang],x=L,y=y-3,size=12,borderWidth=.6,borderColor=C['line'],fillColor=C['paperWarm'],textColor=C['green'],checked=False,buttonStyle='check',annotationFlags='print')
  self.text(f['label'][self.lang],L+22,y,size=10)
  self.boxes.append({'name':name,'page':4,'rect':[L,y-3,L+12,y+9]})
  return y-23
 def build(self):
  self.page(1);y=492
  y=self.field('org_name',y,24)
  y=self.pair('contact_name','contact_role',y,24)
  y=self.pair('email','website',y,24)
  y=self.pair('sector','team_size',y,24)
  y=self.field('locations',y,24)
  y=self.field('purpose',y,47)
  y=self.field('strengths',y,47)
  self.c.showPage()
  self.page(2);y=602
  y=self.field('vision',y,87)
  y=self.field('success',y,62)
  y=self.field('pain',y,72)
  y=self.field('priority',y,62)
  y=self.field('target_date',y,26)
  self.text(self.copy['continued'],L,77,size=8,color='inkSoft')
  self.c.showPage()
  self.page(3);y=602
  y=self.field('process',y,76)
  y=self.field('handoffs',y,57)
  y=self.field('tools',y,57)
  y=self.field('team_change',y,57)
  y=self.field('constraints',y,57)
  self.c.showPage()
  self.page(4);y=602
  y=self.text(self.copy['support'],L,y,size=9.5)-10
  for f in SCHEMA['fields']:
   if f['type']=='checkbox':y=self.checkbox(f['name'],y)
  y-=8
  y=self.field('collaboration',y,25)
  y=self.field('information_flow',y,53)
  y=self.field('expectation',y,53)
  y=self.field('open_questions',y,42)
  y=self.field('completed_on',y,24,w=180)
  self.text(self.copy['end'],L,91,size=8.1,color='inkSoft',leading=10.3)
  self.text(self.copy['save'],L,66,size=7.7,color='inkSoft',leading=9)
  self.c.showPage();self.c.save()
  from pypdf import PdfReader, PdfWriter
  from pypdf.generic import NameObject, TextStringObject
  reader=PdfReader(self.path); writer=PdfWriter(); writer.clone_document_from_reader(reader)
  writer.add_metadata({'/RVFormVersion':SCHEMA['schemaVersion'],'/RVLanguage':self.lang})
  writer.root_object[NameObject('/Lang')]=TextStringObject('de-DE' if self.lang=='de' else 'en-GB')
  from io import BytesIO
  output=BytesIO(); writer.write(output); self.path.write_bytes(output.getvalue())
  return {'file':str(self.path),'fields':self.boxes}

if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True)
 reports=[Form(lang).build() for lang in ['de','en']]
 (OUT/'field-layout.json').write_text(json.dumps(reports,indent=2))
 print(json.dumps([{'file':r['file'],'fieldCount':len(r['fields'])} for r in reports]))

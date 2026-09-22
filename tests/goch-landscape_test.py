"""Regressionsprüfung: tiefer Anflug, konstante Nachtfilter und mobiles Chatfenster über Kalender.
Aufruf: python3 tests/goch-landscape_test.py http://127.0.0.1:8788 /tmp/goch-reparatur
Chrome + websockets; Kalender wird lokal als iframe nachgebildet, keine Fremdanfrage.
"""
import asyncio,base64,json,os,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
import websockets
BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8788').rstrip('/')
OUT=Path(sys.argv[2] if len(sys.argv)>2 else tempfile.mkdtemp(prefix='goch-repair-'));OUT.mkdir(parents=True,exist_ok=True)
async def main():
 proc=subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless=new','--remote-debugging-port=9356','--user-data-dir='+tempfile.mkdtemp(prefix='goch-chrome-'),'--no-first-run','about:blank'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  for _ in range(50):
   try: pages=json.load(urllib.request.urlopen('http://127.0.0.1:9356/json'));break
   except Exception:await asyncio.sleep(.2)
  async with websockets.connect(next(p['webSocketDebuggerUrl'] for p in pages if p['type']=='page'),max_size=50000000) as ws:
   seq=0;errors=[];requests=[];results=[]
   async def send(method,params=None):
    nonlocal seq
    seq+=1;await ws.send(json.dumps({'id':seq,'method':method,'params':params or {}}))
    while True:
     m=json.loads(await ws.recv())
     if m.get('method')=='Runtime.exceptionThrown':errors.append(m['params'])
     if m.get('method')=='Network.requestWillBeSent':requests.append(m['params']['request']['url'])
     if m.get('id')==seq:
      if 'error'in m:raise RuntimeError(m['error'])
      return m.get('result',{})
   async def ev(js):
    r=await send('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True})
    if 'exceptionDetails'in r:raise RuntimeError(r['exceptionDetails'])
    return r.get('result',{}).get('value')
   async def shot(name):
    r=await send('Page.captureScreenshot',{'format':'png'});(OUT/(name+'.png')).write_bytes(base64.b64decode(r['data']))
   await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Emulation.setTimezoneOverride',{'timezoneId':'Europe/Berlin'})
   await send('Page.addScriptToEvaluateOnNewDocument',{'source':"window.__now=0;window.__raf=new Map();let rid=0;performance.now=()=>window.__now;window.requestAnimationFrame=f=>{__raf.set(++rid,f);return rid};window.cancelAnimationFrame=i=>__raf.delete(i);window.__step=t=>{__now=t;let q=[...__raf.values()];__raf.clear();q.forEach(f=>f(t))};"})
   for width in [1440,390]:
    await send('Emulation.setDeviceMetricsOverride',{'width':width,'height':900,'deviceScaleFactor':1,'mobile':False})
    for mode in ['an','aus']:
     await send('Page.navigate',{'url':BASE+'/?landschaft='+mode+'&zeit=2026-10-15T00:00&ort=48.27,8.85'})
     await asyncio.sleep(1.3)
     await ev("document.getElementById('consent-deny').click();window.scrollTo(0,0)")
     states=[]
     for t in [0,700,1600,2600,3500,4190,5200]:
      await ev('__step('+str(t)+')');await asyncio.sleep(.15)
      s=await ev("({t:__now,pose:scene.dataset.pose,route:scene.dataset.flightRoute||'',state:scene.dataset.state,filter:[...document.querySelectorAll('img[data-pose]')].map(x=>getComputedStyle(x).filter),branch:getComputedStyle(document.querySelector('.branch img')).filter,move:getComputedStyle(document.querySelector('.bird-move')).filter,transform:document.querySelector('.bird-move').style.transform})")
      states.append(s)
      if mode=='an' and t in [700,1600,2600,5200]:await shot(f'{width}-nacht-{t}')
     assert states[-1]['state']=='rest'
     if mode=='an':
      assert all(len(set(s['filter']+[s['branch']]))==1 for s in states),states
      assert all(s['move']=='none' for s in states)
      assert all('brightness(0.6)' in s['filter'][0] for s in states)
      assert states[0]['route']=='under-branch'
     else:assert states[0]['route']==''
     # Lokaler Kalender mit eigenem Stacking Context, wie bei einer Einbettung.
     await ev("document.querySelector('.booking').style.cssText='position:relative;z-index:5';document.getElementById('cal-embed').innerHTML='<iframe title=Testkalender srcdoc=\"Kalender\" style=\"height:600px;width:100%\"></iframe>';scene.click()")
     await asyncio.sleep(.2)
     panel=await ev("(()=>{const p=document.getElementById('goch'),r=p.getBoundingClientRect();let covered=[];for(let y=r.top+8;y<r.bottom-8;y+=35)for(let x=r.left+8;x<r.right-8;x+=35){if(y<0||y>=innerHeight)continue;let e=document.elementFromPoint(x,y);if(e!==p&&!p.contains(e))covered.push(e&&e.tagName)}return {parent:p.parentNode.tagName,hidden:p.hidden,covered,position:getComputedStyle(p).position,width:r.width,height:r.height}})()")
     assert not panel['hidden']
     if width==390:assert panel['parent']=='BODY' and not panel['covered'],panel
     await shot(f'{width}-chat-{mode}')
     results.append({'width':width,'mode':mode,'flight':states,'chat':panel})
   # Geöffnete mobile Blase kehrt bei breitem Fenster zum Ast zurück.
   await send('Emulation.setDeviceMetricsOverride',{'width':1024,'height':900,'deviceScaleFactor':1,'mobile':False});await asyncio.sleep(.2)
   assert await ev("document.getElementById('goch').parentNode.classList.contains('perch')")
   assert not errors,errors
   foreign=[u for u in requests if u.startswith('http') and not u.startswith(BASE)]
   assert not foreign,foreign
   (OUT/'report.json').write_text(json.dumps(results,indent=2));print('OK: Anflug/Nachtfilter, Smartphone-Ebenen, Breitenwechsel, keine Fremdanfragen. '+str(OUT))
 finally:proc.terminate();proc.wait()
asyncio.run(main())

'use strict';
// Browser-/Pixelprüfung gegen einen lokalen Website-Server. Benötigt playwright und pngjs.
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {chromium}=require('playwright'), {PNG}=require('pngjs');
const base=(process.argv[2]||'http://127.0.0.1:8789').replace(/\/$/, '');
const out=process.argv[3]||'/private/tmp/moon-browser-qa'; fs.mkdirSync(out,{recursive:true});
const checks=[];
const passed=(name,data={})=>{checks.push({name,...data}); console.log('OK:',name,JSON.stringify(data));};
const phases=[0,.125,.25,.375,.5,.625,.75,.875];
async function difference(page,selector,clip){
  const a=PNG.sync.read(await page.screenshot({clip}));
  await page.locator(selector).evaluate(e=>e.style.visibility='hidden');
  const b=PNG.sync.read(await page.screenshot({clip}));
  await page.locator(selector).evaluate(e=>e.style.visibility='');
  let changed=0,max=0;
  for(let i=0;i<a.data.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(a.data[i+k]-b.data[i+k]));if(d>2)changed++;max=Math.max(max,d);}
  return {changed,max};
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try {
  const context=await browser.newContext({timezoneId:'Europe/Berlin',viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function open(date='2026-10-10T15:21'){
    await page.goto(base+'/?landschaft=an&zeit='+date+'&ort=48.27,8.85',{waitUntil:'networkidle'});
    if(await page.locator('#consent-deny').isVisible()) await page.locator('#consent-deny').click();
    await page.waitForFunction(()=>document.querySelector('.landscape-far img')?.naturalWidth>0&&getComputedStyle(document.querySelector('.landscape-celestial')).maskImage.startsWith('url('));
  }
  async function state(phase,sun=-18,position={x:.17,altitude:38}){
    return page.evaluate(({phase,sun,position})=>{
      const api=window.RJLLandscape,rad=Math.PI/180;
      const f=(1-Math.cos(phase*2*Math.PI))/2;
      let x=position.x,altitude=position.altitude;
      if(position.terrain){
        const far=document.querySelector('.landscape-far').getBoundingClientRect(),area=document.querySelector('.landscape').getBoundingClientRect();
        const img=document.querySelector('.landscape-far img'),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
        const col=Math.floor(c.width*.48),line=api.terrainHorizon(data,c.width,c.height);
        const y=far.top-area.top+line[col]/c.height*far.height+position.offset;
        x=(far.left-area.left+far.width*.48)/area.width;
        altitude=65*(1-y/parseFloat(document.documentElement.style.getPropertyValue('--horizon')));
      }
      api.sunPosition=()=>({altitude:sun*rad,azimuth:-1});
      api.moonPosition=()=>({altitude:altitude*rad,azimuth:Math.asin(1-2*x),parallacticAngle:0,distance:384400});
      api.moonIllumination=()=>({fraction:f,phase,angle:phase<.5?Math.PI/2:-Math.PI/2});
      document.dispatchEvent(new Event('visibilitychange'));
      const m=document.querySelector('.landscape-moon'),a=document.querySelector('.landscape').getBoundingClientRect();
      return {appearance:api.state.appearance,moonAltitude:altitude,box:m.getBoundingClientRect().toJSON(),area:a.toJSON(),fraction:f};
    },{phase,sun,position});
  }
  await open('2026-10-05T19:46');
  const hidden=await page.locator('.landscape-moon').evaluate(m=>({attr:m.hasAttribute('hidden'),display:getComputedStyle(m).display,altitude:window.RJLLandscape.state.moon.altitude*180/Math.PI}));
  assert.ok(hidden.altitude<0&&hidden.attr&&hidden.display==='none');passed('Screenshotdatum: Mond unter Horizont ausgeblendet',hidden);
  await page.screenshot({path:path.join(out,'abend-horizont.png')});
  await page.setViewportSize({width:390,height:844});await open();
  assert.equal(await page.locator('.landscape-moon .dark').evaluate(e=>getComputedStyle(e).opacity),'0');
  await page.screenshot({path:path.join(out,'tagesneumond-mobil.png')});passed('Echter Tagesneumond ohne dunkle Scheibe');

  const raster=await page.evaluate(()=>{
    const api=window.RJLLandscape,size=256,r=100,c=document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d'),results=[];
    for(let step=0;step<=32;step++){
      const phase=step/32,f=(1-Math.cos(phase*2*Math.PI))/2;
      ctx.clearRect(0,0,size,size);ctx.save();ctx.translate(128,128);ctx.fillStyle='white';ctx.fill(new Path2D(api.moonPhasePath(f,phase<.5,r)));ctx.restore();
      const rgba=ctx.getImageData(0,0,size,size).data;let area=0,left=0,right=0;
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=rgba[(y*size+x)*4+3]/255;area+=a;if(x<128)left+=a;else right+=a;}
      results.push({phase,f,measured:area/(Math.PI*r*r),side:Math.sign(right-left)});
    }return results;
  });
  for(const r of raster){assert.ok(Math.abs(r.measured-r.f)<.003,JSON.stringify(r));if(r.f>.01&&r.f<.99)assert.equal(r.side,r.phase<.5?1:-1);}
  passed('33 gerasterte Mondphasen: korrekte Lichtfläche und Sichelrichtung',{maxAreaError:Math.max(...raster.map(r=>Math.abs(r.measured-r.f)))});

  // Auf beiden Größen acht Hauptphasen × Tag/Dämmerung/Nacht in der tatsächlichen Seite.
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:1000});await open();
    const appearance=[];
    for(const sun of [35,-4,-18])for(const phase of phases){
      const s=await state(phase,sun);assert.ok(s.box.width>0);
      if(sun>=0)assert.equal(s.appearance.earthshine,0);
      if(phase===0)assert.equal(s.appearance.light,0);
      appearance.push({phase,sun,...s.appearance});
    }
    passed(width+' px: 24 Phasen-/Lichtkombinationen', {cases:appearance.length});
    for(const phase of phases){
      const s=await state(phase,-18,{terrain:true,offset:24});
      // Falls der Mittelpunkt geometrisch schon unter dem Horizont liegt, ist Ausblenden ebenfalls korrekt.
      if(s.box.width){const clip={x:Math.floor(s.box.x)-2,y:Math.floor(s.box.y)-2,width:32,height:32};const d=await difference(page,'.landscape-moon',clip);assert.equal(d.changed,0,JSON.stringify({width,phase,d}));}
    }
    passed(width+' px: alle acht Phasen hinter Burg vollständig verdeckt');
    const partial=await state(.5,-18,{terrain:true,offset:-3});
    assert.ok(partial.box.width>0&&partial.moonAltitude>0);
    const clip={x:Math.floor(partial.box.x)-2,y:Math.floor(partial.box.y)-2,width:32,height:32};
    const d=await difference(page,'.landscape-moon',clip);assert.ok(d.changed>3&&d.changed<500,JSON.stringify(d));
    await page.screenshot({path:path.join(out,'mondaufgang-'+width+'.png')});
    passed(width+' px: Mond am Burggrat nur teilweise sichtbar',d);

    // Ein heller Teststern hinter der dunklen Sichelhälfte darf den Screenshot nicht verändern.
    const st=await state(.125,-18);
    const starProbe=await page.evaluate(()=>{
      const m=document.querySelector('.landscape-moon').getBoundingClientRect(),s=document.querySelector('.landscape-stars'),b=s.getBoundingClientRect();
      const x=m.left+m.width/2-4-b.left,y=m.top+m.height/2-b.top;
      const star=document.createElementNS('http://www.w3.org/2000/svg','circle');star.id='moon-test-star';star.setAttribute('cx',x/b.width*1000);star.setAttribute('cy',y/b.height*400);star.setAttribute('r','2');star.style.opacity='1';star.style.fill='#fff';s.append(star);
      return {x:m.x,y:m.y,width:m.width,height:m.height};
    });
    const sd=await difference(page,'#moon-test-star',{x:Math.floor(starProbe.x)-2,y:Math.floor(starProbe.y)-2,width:32,height:32});
    assert.equal(sd.changed,0,JSON.stringify(sd));await page.locator('#moon-test-star').evaluate(e=>e.remove());passed(width+' px: Stern hinter dunkler Mondhälfte unsichtbar');
  }

  // resize ohne Minutenupdate: y/horizon muss sofort derselbe Anteil bleiben.
  await state(.25,-18,{x:.2,altitude:30});
  async function ratio(){return page.evaluate(()=>{const m=document.querySelector('.landscape-moon').getBoundingClientRect(),a=document.querySelector('.landscape').getBoundingClientRect();return(m.top+m.height/2-a.top)/parseFloat(document.documentElement.style.getPropertyValue('--horizon'));});}
  const before=await ratio();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);const after=await ratio();assert.ok(Math.abs(before-after)<.003,{before,after});passed('Hoch-/Querformat: Mondhöhe bleibt unmittelbar korrekt',{before,after});

  // Winter-Bild und Überblendung nutzen ebenfalls echte Geländedaten.
  for(const date of ['2026-12-15T18:00','2026-11-30T18:00']){
    await open(date);const frames=await page.locator('.landscape-far').count();assert.ok(frames>=1);
    await state(.5,-18,{terrain:true,offset:24});
    const box=await page.locator('.landscape-moon').boundingBox();
    if(box){const d=await difference(page,'.landscape-moon',{x:Math.floor(box.x)-2,y:Math.floor(box.y)-2,width:32,height:32});assert.equal(d.changed,0);}
    passed('Geländeverdeckung '+date,{frames});
  }

  // Sichttafel: echte SVG-Pfade und aktuelle Erscheinungswerte, vergrößert für die Abnahme.
  await page.evaluate(()=>{
    const names=['Neumond','Zunehmende Sichel','Erstes Viertel','Zunehmender Mond','Vollmond','Abnehmender Mond','Letztes Viertel','Abnehmende Sichel'],api=window.RJLLandscape;
    const board=document.createElement('div');board.id='moon-audit-board';board.style='position:absolute;z-index:1000;left:0;top:0;width:1280px;background:#fff;font:16px system-ui;color:#444;padding:24px;box-sizing:border-box';
    board.innerHTML='<h2 style="font-size:23px;font-weight:500">Mondphasen – Tag, Dämmerung und Nacht</h2>';
    for(const [label,alt,bg] of [['Tag',35,'#e6e6dc'],['Dämmerung',-4,'#626974'],['Nacht',-18,'#242c38']]){
      let row='<div style="margin:16px 0;padding:12px;background:'+bg+';color:'+(alt>0?'#484b4a':'#eee8d9')+'"><b>'+label+'</b><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px">';
      names.forEach((name,i)=>{const f=(1-Math.cos(i/8*2*Math.PI))/2,a=api.moonAppearance(alt*Math.PI/180,f,30*Math.PI/180),n=api.nightFactor(alt*Math.PI/180),face='rgb('+[238,232,217].map(v=>Math.round(255+(v-255)*n)).join(',')+')';row+='<div style="text-align:center"><svg style="display:block;margin:18px auto;width:64px;height:64px" viewBox="-16 -16 32 32"><circle r="15" fill="#eee8d9" opacity="'+a.earthshine+'"/><path fill="'+face+'" opacity="'+a.light+'" d="'+api.moonPhasePath(f,i<4)+'"/></svg><small>'+name+'</small></div>';});
      board.innerHTML+=row+'</div></div>';
    }document.body.append(board);
  });
  await page.setViewportSize({width:1328,height:1000});await page.locator('#moon-audit-board').screenshot({path:path.join(out,'mondphasen-prueftafel.png')});
  await page.locator('#moon-audit-board').evaluate(e=>e.remove());
  assert.deepEqual(errors,[]);passed('Keine JavaScript-Fehler');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks,raster,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

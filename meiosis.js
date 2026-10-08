(()=>{'use strict';
const $=s=>document.querySelector(s),C=$('#cv'),ctx=C.getContext('2d'),M=window.MeiosisModel;
const steps=[['간기','DNA가 복제됩니다.'],['감수 1분열 전기','상동 염색체가 짝을 이루어 2가 염색체가 됩니다.'],['감수 1분열 중기','2가 염색체가 세포 중앙에 배열됩니다.'],['감수 1분열 후기','상동 염색체가 양쪽으로 분리됩니다.'],['감수 1분열 말기','세포질이 나뉘어 두 개의 세포가 됩니다.'],['감수 2분열 전기','두 세포가 다시 분열을 준비합니다.'],['감수 2분열 중기','염색체가 각 세포의 중앙에 배열됩니다.'],['감수 2분열 후기','자매 염색분체가 양쪽으로 분리됩니다.'],['감수 2분열 말기','핵막이 생기고 세포질이 나뉩니다.'],['완료','염색체 수가 절반인 딸세포 네 개가 만들어집니다.']];
const marks=[0,.115,.245,.315,.44,.55,.655,.72,.87,1],colors={b1:'#2878db',b2:'#10a66a',r1:'#d94857',r2:'#e0ac00'};
let p=0,playing=false,repeat=false,range=[0,1],track='all',last=0,raf=0,seek=null,W=1000,H=560,scale=1,ox=500,oy=280,labelRects=[];
const stageButtons=steps.map((step,i)=>{const b=document.createElement('button');b.className='stage';b.innerHTML=i===0?'<small>분열 준비</small>간기':i===9?'<small>4개의 딸세포</small>완료':`<small>감수 ${i<5?'1':'2'}분열</small>${['전기','중기','후기','말기'][(i-1)%4]}`;b.setAttribute('aria-label',step[0]);b.onclick=()=>{stop();setRange(0,1,'playAll');moveTo(marks[i])};$('#stages').appendChild(b);return b;});
function fillRange(el){const min=Number(el.min)||0,max=Number(el.max)||10000;el.style.setProperty('--fill',((+el.value-min)/(max-min)*100)+'%')}
function resize(){const r=C.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);const mobile=r.width<620;W=mobile?720:1000;H=W*r.height/r.width;C.width=Math.round(r.width*d);C.height=Math.round(r.height*d);ctx.setTransform(C.width/W,0,0,C.height/H,0,0);ox=W/2;oy=H/2;scale=mobile?.9:Math.min(1,(H-100)/380);draw();}
function line(a,b,color,width=1,opacity=1){ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.restore();}
function xy(v){return [ox+v[0]*scale,oy+v[1]*scale]}
function ellipse(x,y,rx,ry,alpha,broken=0){if(alpha<.001)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#a8b6d2';ctx.fillStyle='#eaf0ff';ctx.lineWidth=1.6;ctx.setLineDash(broken>.01?[M.lerp(16,2,broken),M.lerp(1,10,broken)]:[]);ctx.beginPath();ctx.ellipse(...xy([x,y]),rx*scale,ry*scale,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
function pole(pos,opacity){if(opacity<.001)return;const [x,y]=xy(pos);ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle='#ccb17a';ctx.lineWidth=1.2;for(let j=0;j<10;j++){const a=j*Math.PI/5;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*4,y+Math.sin(a)*4);ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10);ctx.stroke()}ctx.fillStyle='#c5a468';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawMembranes(){for(const points of M.membranes(p)){ctx.beginPath();points.forEach((v,i)=>{const pt=xy(v);i?ctx.lineTo(...pt):ctx.moveTo(...pt)});ctx.closePath();ctx.fillStyle='#f0f5fd';ctx.fill();ctx.strokeStyle='#9badcd';ctx.lineWidth=2;ctx.stroke();}}
function drawSpindles(s){for(const chrom of s.chromosomes){const opacity=track==='all'||track===chrom.id?1:.55;const target=xy([chrom.x,chrom.y]);if(s.spindle1>.001){const pole1=xy(s.poles1[chrom.side<0?0:1]);line(pole1,target,'#b3c5dc',1.3,s.spindle1*opacity);}
if(s.spindle2>.001)for(const sister of chrom.sisters){const pole2=xy(s.poles2[(chrom.side<0?0:2)+(sister.k<0?0:1)]);line(pole2,xy(sister.center),'#b3c5dc',1.3,s.spindle2*opacity);}}
for(const pole1 of s.poles1)pole(pole1,s.spindle1);for(const pole2 of s.poles2)pole(pole2,s.spindle2);}
function drawChromosomes(s){for(const ch of s.chromosomes)for(const sister of ch.sisters){ctx.save();ctx.globalAlpha=sister.opacity*(track==='all'||track===ch.id?1:.55);ctx.lineWidth=sister.width*scale;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=colors[ch.id];ctx.beginPath();ctx.moveTo(...xy(sister.path[0]));ctx.bezierCurveTo(...xy(sister.path[1]),...xy(sister.path[2]),...xy(sister.path[3]));ctx.bezierCurveTo(...xy(sister.path[4]),...xy(sister.path[5]),...xy(sister.path[6]));ctx.stroke();ctx.fillStyle='#526179';ctx.beginPath();ctx.globalAlpha*=s.condensed;ctx.arc(...xy(sister.center),2.6*scale,0,Math.PI*2);ctx.fill();ctx.restore();}}
function roundBox(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function label(text,target,index,opacity=1,important=false,color='#596779',branches=[]){
if(opacity<.002)return;
const mobile=W<900,font=important?(mobile?22:20):(mobile?17:18);
ctx.font=`${important?700:600} ${font}px Pretendard, system-ui, sans-serif`;
const caption=(important?'★ ':'')+text,textWidth=ctx.measureText(caption).width,boxW=Math.max(mobile?120:110,textWidth+18),boxH=30;
let x,y;
if(index===8){x=W/2;y=mobile?H*.2:22;}
else if(mobile){x=(index%4+.5)*W/4;y=index<4?48:H-48;}
else{x=index<4?96:W-96;y=H*(.24+(index%4)*.18);}
const left=x-boxW/2,top=y-boxH/2;
labelRects.push({text,x:left,y:top,w:boxW,h:boxH});
const targets=[{point:target,alpha:1},...branches];
ctx.save();ctx.globalAlpha=opacity;
for(const entry of targets){if(entry.alpha<.001)continue;const dest=xy(entry.point),dx=dest[0]-x,dy=dest[1]-y,k=1/Math.max(Math.abs(dx)/(textWidth/2+7),Math.abs(dy)/(font/2+6),1);const start=[x+dx*k,y+dy*k];line(start,dest,important?'#bca365':'#aab7c6',1.15,opacity*entry.alpha);}
ctx.fillStyle=important?'#a08643':color;ctx.textAlign='center';ctx.textBaseline='middle';
ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.lineJoin='round';ctx.strokeText(caption,x,y);ctx.fillText(caption,x,y);ctx.restore();
}
function drawLabels(s){labelRects=[];if(!$('#labels').checked)return;
const mappings=[['b1','1번 부계',0],['r1','1번 모계',1],['b2','2번 부계',2],['r2','2번 모계',3]];
for(const [id,text,index] of mappings){const ch=s.chromosomes.find(c=>c.id===id);const slot=W<900?index:({b1:0,b2:1,r1:4,r2:5}[id]);
const alpha=track==='all'||track===id?1:.55;
label(text,ch.sisters[0].center,slot,alpha,false,id==='r2'?'#9a7000':colors[id],[{point:ch.sisters[1].center,alpha:s.sep2}]);}
const pairAlpha=M.phase(p,.13,.21)*(1-M.phase(p,.3,.36));
if(pairAlpha>.001){const a=s.chromosomes[0],b=s.chromosomes[1],y=-79;line(xy([a.x-13,y+5]),xy([a.x-13,y]),'#bca365',1,pairAlpha);line(xy([a.x-13,y]),xy([b.x+13,y]),'#bca365',1,pairAlpha);line(xy([b.x+13,y]),xy([b.x+13,y+5]),'#bca365',1,pairAlpha);}
label('2가 염색체',[0,-79],8,pairAlpha,true);
const membranePoint=M.membranes(p)[0].reduce((best,point)=>point[0]<best[0]?point:best);
label('세포막',membranePoint,W<900?4:2);
const nucleusPoint=s.nucleus1>=Math.max(s.nucleusMid,s.nucleusFinal)?[0,-135]:s.nucleusMid>=s.nucleusFinal?[-s.cellX,-78]:[-263,-67];
label('핵막',nucleusPoint,7,Math.max(s.nucleus1,s.nucleusMid,s.nucleusFinal));
const firstSpindle=s.spindle1>=s.spindle2,poleTarget=firstSpindle?s.poles1[0]:s.poles2[0],spindleEnd=firstSpindle?[s.chromosomes[0].x,s.chromosomes[0].y]:s.chromosomes[0].sisters[0].center;
label('방추사',poleTarget.map((v,i)=>(v+spindleEnd[i])/2),W<900?5:3,Math.max(s.spindle1,s.spindle2));
label('중심체',firstSpindle?s.poles1[1]:s.poles2[3],6,Math.max(s.spindle1,s.spindle2));
}
function draw(){ctx.clearRect(0,0,W,H);const s=M.state(p);drawMembranes();ellipse(0,0,135,135,s.nucleus1,1-s.nucleus1);for(const x of [-s.cellX,s.cellX])ellipse(x,0,78,78,s.nucleusMid,1-s.nucleusMid);for(const x of [-263,-87,87,263])ellipse(x,0,67,67,s.nucleusFinal,1-s.nucleusFinal);drawSpindles(s);drawChromosomes(s);drawLabels(s);const idx=Math.max(0,marks.reduce((last,v,i)=>p>=v?i:last,0));$('#stageTitle').textContent=steps[idx][0];$('#stageDesc').textContent=steps[idx][1];$('#stageNo').textContent=String(idx+1).padStart(2,'0')+' / 10';$('#divisionBadge').textContent=p<.115?'분열 준비':p<.53?'감수 1분열':p<1?'감수 2분열':'분열 완료';$('#timeline').value=p*10000;$('#progressText').textContent=Math.round(p*100)+'%';fillRange($('#timeline'));stageButtons.forEach((b,i)=>{b.classList.toggle('on',i===idx);b.setAttribute('aria-current',i===idx?'step':'false')});}
function stop(){playing=false;seek=null;cancelAnimationFrame(raf);$('#playText').textContent='재생';$('#playGlyph').textContent='▶';$('#play').setAttribute('aria-label','재생');}
function moveTo(target){const from=p,start=performance.now();seek={from,target,start};raf=requestAnimationFrame(function frame(now){if(!seek)return;const u=Math.min(1,(now-start)/650);p=M.lerp(from,target,M.phase(u,0,1));draw();if(u<1)raf=requestAnimationFrame(frame);else{p=target;seek=null;draw();}});}
function play(){stop();if(p>=range[1]-.0001||p<range[0])p=range[0];playing=true;last=performance.now();$('#playText').textContent='정지';$('#playGlyph').textContent='Ⅱ';$('#play').setAttribute('aria-label','일시정지');raf=requestAnimationFrame(tick);}
function tick(now){if(!playing)return;p=Math.min(range[1],p+Math.min(now-last,80)/42000*(+$('#speed').value));last=now;draw();if(p>=range[1]){if(repeat){p=range[0];raf=requestAnimationFrame(tick);}else stop();}else raf=requestAnimationFrame(tick);}
function setRange(a,b,id){range=[a,b];for(const name of ['playAll','meiosis1','meiosis2']){$('#'+name).classList.toggle('selected',id===name);$('#'+name).setAttribute('aria-pressed',String(id===name));}}
$('#timeline').max='10000';$('#timeline').oninput=e=>{stop();p=M.clamp(+e.target.value/10000);if(p<range[0]||p>range[1])setRange(0,1,'playAll');draw();};
$('#speed').min='.25';$('#speed').max='4';$('#speed').value='2';$('#speed').oninput=()=>{$('#speedText').textContent=Number($('#speed').value).toFixed(2)+'×';fillRange($('#speed'));};$('#speed').oninput();
$('#play').onclick=()=>playing?stop():play();
for(const [id,a,b] of [['playAll',0,1],['meiosis1',0,.53],['meiosis2',.53,1]])$('#'+id).onclick=()=>{stop();setRange(a,b,id);p=a;draw();play();};
$('#prev').onclick=()=>{stop();setRange(0,1,'playAll');const index=marks.findLastIndex(t=>t<p-.005);moveTo(marks[Math.max(0,index)]);};
$('#next').onclick=()=>{stop();setRange(0,1,'playAll');const index=marks.findIndex(t=>t>p+.005);moveTo(marks[index<0?9:index]);};
$('#repeat').onclick=()=>{repeat=!repeat;$('#repeat').setAttribute('aria-pressed',String(repeat));if(repeat&&!playing)play();};
$('#labels').onchange=draw;
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{track=b.dataset.track;document.querySelectorAll('[data-track]').forEach(z=>{z.classList.toggle('on',z===b);z.setAttribute('aria-pressed',String(z===b))});draw();});
$('#mobileView').onclick=()=>{const on=document.body.classList.toggle('mobile-preview');$('#mobileView').setAttribute('aria-pressed',String(on));document.body.classList.toggle('desktop-preview',!on);$('#mobileView').textContent=on?'PC 버전':'모바일 버전';$('#mobileView').title=on?'PC 버전으로 전환':'모바일 버전으로 전환';resize();};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{document.body.classList.toggle('expanded-view');$('#fullscreen').setAttribute('aria-pressed',String(document.body.classList.contains('expanded-view')));resize();}}catch(e){document.body.classList.toggle('expanded-view');resize();}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));resize();});
document.addEventListener('keydown',e=>{if(['INPUT','BUTTON','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();$('#play').onclick();}else if(e.code==='ArrowLeft')$('#prev').onclick();else if(e.code==='ArrowRight')$('#next').onclick();});
$('.brand').onclick=e=>{e.preventDefault();stop();setRange(0,1,'playAll');moveTo(0);};
document.addEventListener('visibilitychange',()=>{last=performance.now();});
new ResizeObserver(resize).observe(C);window.addEventListener('resize',resize);
// Read-only diagnostics for validating actual frames and label placement.
window.meiosisInspect=()=>({p,labels:labelRects,chromosomes:M.state(p).chromosomes,membranes:M.membranes(p)});
if(window.matchMedia?.('(max-width:800px)').matches){document.body.classList.add('mobile-preview');$('#mobileView').textContent='PC 버전';$('#mobileView').setAttribute('aria-pressed','true');}
if(document.fonts)document.fonts.ready.then(draw);
resize();
})();

(()=>{'use strict';
const $=s=>document.querySelector(s),C=$('#cv'),ctx=C.getContext('2d'),M=window.MeiosisModel;
const steps=[['간기','DNA가 복제됩니다.'],['감수 1분열 전기','상동 염색체가 짝을 이루어 2가 염색체가 됩니다.'],['감수 1분열 중기','2가 염색체가 세포 중앙에 배열됩니다.'],['감수 1분열 후기','상동 염색체가 양쪽으로 분리됩니다.'],['감수 1분열 말기','세포질이 나뉘어 두 개의 세포가 됩니다.'],['감수 2분열 전기','두 세포가 다시 분열을 준비합니다.'],['감수 2분열 중기','염색체가 각 세포의 중앙에 배열됩니다.'],['감수 2분열 후기','자매 염색분체가 양쪽으로 분리됩니다.'],['감수 2분열 말기','핵막이 생기고 세포질이 나뉩니다.'],['완료','염색체 수가 절반인 딸세포 네 개가 만들어집니다.']];
const marks=[0,.115,.245,.315,.44,.55,.655,.72,.87,1],colors={b1:'#5389dc',b2:'#5389dc',r1:'#df788d',r2:'#df788d'};
let p=0,playing=false,range=[0,1],track='all',last=0,raf=0,seek=null,W=1000,H=560,scale=1,ox=500,oy=280,labelRects=[];
const stageButtons=steps.map((step,i)=>{const b=document.createElement('button');b.className='stage';b.innerHTML=i===0?'<small>분열 준비</small>간기':i===9?'<small>4개의 딸세포</small>완료':`<small>감수 ${i<5?'1':'2'}분열</small>${['전기','중기','후기','말기'][(i-1)%4]}`;b.setAttribute('aria-label',step[0]);b.onclick=()=>{stop();setRange(0,1,'playAll');moveTo(marks[i])};$('#stages').appendChild(b);return b;});
function fillRange(el){const min=Number(el.min)||0,max=Number(el.max)||10000;el.style.setProperty('--fill',((+el.value-min)/(max-min)*100)+'%')}
function resize(){const r=C.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);const mobile=r.width<620;W=mobile?720:1000;H=mobile?740:560;C.width=Math.round(r.width*d);C.height=Math.round(r.height*d);ctx.setTransform(C.width/W,0,0,C.height/H,0,0);ox=W/2;oy=H/2;scale=mobile?.9:1;draw();}
function line(a,b,color,width=1,opacity=1){ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.restore();}
function xy(v){return [ox+v[0]*scale,oy+v[1]*scale]}
function ellipse(x,y,rx,ry,alpha,broken=0){if(alpha<.001)return;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#a8b6d2';ctx.fillStyle='#eaf0ff';ctx.lineWidth=1.6;ctx.setLineDash(broken>.01?[M.lerp(16,2,broken),M.lerp(1,10,broken)]:[]);ctx.beginPath();ctx.ellipse(...xy([x,y]),rx*scale,ry*scale,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}
function pole(pos,opacity){if(opacity<.001)return;const [x,y]=xy(pos);ctx.save();ctx.globalAlpha=opacity;ctx.strokeStyle='#ccb17a';ctx.lineWidth=1.2;for(let j=0;j<10;j++){const a=j*Math.PI/5;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*4,y+Math.sin(a)*4);ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10);ctx.stroke()}ctx.fillStyle='#c5a468';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawMembranes(){for(const points of M.membranes(p)){ctx.beginPath();points.forEach((v,i)=>{const pt=xy(v);i?ctx.lineTo(...pt):ctx.moveTo(...pt)});ctx.closePath();ctx.fillStyle='#f0f5fd';ctx.fill();ctx.strokeStyle='#9badcd';ctx.lineWidth=2;ctx.stroke();}}
function drawSpindles(s){for(const chrom of s.chromosomes){const opacity=track==='all'||track===chrom.id?1:.55;const target=xy([chrom.x,chrom.y]);if(s.spindle1>.001){const pole1=xy(s.poles1[chrom.side<0?0:1]);line(pole1,target,'#b3c5dc',1.3,s.spindle1*opacity);}
if(s.spindle2>.001)for(const sister of chrom.sisters){const pole2=xy(s.poles2[(chrom.side<0?0:2)+(sister.k<0?0:1)]);line(pole2,xy(sister.center),'#b3c5dc',1.3,s.spindle2*opacity);}}
for(const pole1 of s.poles1)pole(pole1,s.spindle1);for(const pole2 of s.poles2)pole(pole2,s.spindle2);}
function drawChromosomes(s){for(const ch of s.chromosomes)for(const sister of ch.sisters){ctx.save();ctx.globalAlpha=sister.opacity*(track==='all'||track===ch.id?1:.55);ctx.lineWidth=7*scale;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=colors[ch.id];ctx.beginPath();sister.nodes.forEach((v,i)=>{i?ctx.lineTo(...xy(v)):ctx.moveTo(...xy(v))});ctx.stroke();ctx.fillStyle='#526179';ctx.beginPath();ctx.arc(...xy(sister.center),2.6*scale,0,Math.PI*2);ctx.fill();ctx.restore();}}
function roundBox(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function label(text,target,index,opacity=1,important=false){if(opacity<.002)return;const mobile=W<900,font=mobile?21:14;ctx.font=`${important?700:600} ${font}px system-ui`;const caption=(important?'★ ':'')+text;const boxW=Math.max(mobile?130:100,ctx.measureText(caption).width+24),boxH=mobile?40:32;let x,y;if(mobile){x=(index%3+.5)*W/3;y=index<3?62:H-70;}else{x=index<3?96:W-96;y=135+(index%3)*130;}const left=x-boxW/2,top=y-boxH/2;labelRects.push({text,x:left,y:top,w:boxW,h:boxH});const dest=xy(target);const start=mobile?[x,index<3?y+boxH/2:y-boxH/2]:[index<3?x+boxW/2:x-boxW/2,y];ctx.save();ctx.globalAlpha=opacity;line(start,dest,important?'#bca365':'#c3cede',1.15);const a=Math.atan2(dest[1]-start[1],dest[0]-start[0]);ctx.fillStyle=important?'#bca365':'#a2b2cb';ctx.beginPath();ctx.moveTo(...dest);ctx.lineTo(dest[0]-7*Math.cos(a-.4),dest[1]-7*Math.sin(a-.4));ctx.lineTo(dest[0]-7*Math.cos(a+.4),dest[1]-7*Math.sin(a+.4));ctx.closePath();ctx.fill();roundBox(left,top,boxW,boxH,8);ctx.fillStyle=important?'#fff7e5':'#fff';ctx.fill();ctx.strokeStyle=important?'#ead8aa':'#e4eaf3';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=important?'#a08643':'#7586a2';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(caption,x,y);ctx.restore();}
function drawLabels(s){labelRects=[];if(!$('#labels').checked)return;
const pairOn=M.phase(p,.13,.21)*(1-M.phase(p,.3,.36));label('2가 염색체',[0,-47],0,pairOn,true);
label('핵막',[110,-75],3,1-M.phase(p,.16,.25));
label('상동 염색체',[s.chromosomes[0].x,s.chromosomes[0].y],1,M.phase(p,.07,.12)*(1-M.phase(p,.43,.5)));
label('자매 염색분체',[s.chromosomes[0].x,s.chromosomes[0].y-82*s.sep2],1,M.phase(p,.55,.62)*(1-M.phase(p,.85,.91)));
label('세포막',[-200,55],2,1-M.phase(p,.43,.5));
label('방추사',p<.5?[-100,-22]:[-145,-60],4,Math.max(s.spindle1,s.spindle2));
label('중심체',p<.5?s.poles1[1]:s.poles2[3],5,Math.max(s.spindle1,s.spindle2));
label('핵막',[-130,-82],3,s.nucleusMid+s.nucleusFinal);
label('딸세포',[-130,82],2,M.phase(p,.93,.985));
}
function draw(){ctx.clearRect(0,0,W,H);const s=M.state(p);drawMembranes();ellipse(0,0,158,123,s.nucleus1,1-s.nucleus1);for(const x of [-130,130])ellipse(x,0,65,65,s.nucleusMid,1-s.nucleusMid);for(const x of [-130,130])for(const y of [-82,82])ellipse(x,y,63,43,s.nucleusFinal,1-s.nucleusFinal);drawSpindles(s);drawChromosomes(s);drawLabels(s);const idx=Math.max(0,marks.reduce((last,v,i)=>p>=v?i:last,0));$('#stageTitle').textContent=steps[idx][0];$('#stageDesc').textContent=steps[idx][1];$('#stageNo').textContent=String(idx+1).padStart(2,'0')+' / 10';$('#divisionBadge').textContent=p<.115?'분열 준비':p<.53?'감수 1분열':p<1?'감수 2분열':'분열 완료';$('#cellCount').textContent=p<.5?'2n = 4':p<.93?'2개 세포 · n = 2':'4개 딸세포 · n = 2';$('#timeline').value=p*10000;$('#progressText').textContent=Math.round(p*100)+'%';fillRange($('#timeline'));stageButtons.forEach((b,i)=>{b.classList.toggle('on',i===idx);b.setAttribute('aria-current',i===idx?'step':'false')});}
function stop(){playing=false;seek=null;cancelAnimationFrame(raf);$('#playText').textContent='재생';$('#playGlyph').textContent='▶';$('#play').setAttribute('aria-label','재생');}
function moveTo(target){const from=p,start=performance.now();seek={from,target,start};raf=requestAnimationFrame(function frame(now){if(!seek)return;const u=Math.min(1,(now-start)/650);p=M.lerp(from,target,M.phase(u,0,1));draw();if(u<1)raf=requestAnimationFrame(frame);else{p=target;seek=null;draw();}});}
function play(){stop();if(p>=range[1]-.0001||p<range[0])p=range[0];playing=true;last=performance.now();$('#playText').textContent='정지';$('#playGlyph').textContent='Ⅱ';$('#play').setAttribute('aria-label','일시정지');raf=requestAnimationFrame(tick);}
function tick(now){if(!playing)return;p=Math.min(range[1],p+Math.min(now-last,80)/42000*(+$('#speed').value));last=now;draw();if(p>=range[1])stop();else raf=requestAnimationFrame(tick);}
function setRange(a,b,id){range=[a,b];for(const name of ['playAll','meiosis1','meiosis2']){$('#'+name).classList.toggle('selected',id===name);$('#'+name).setAttribute('aria-pressed',String(id===name));}}
$('#timeline').max='10000';$('#timeline').oninput=e=>{stop();p=M.clamp(+e.target.value/10000);if(p<range[0]||p>range[1])setRange(0,1,'playAll');draw();};
$('#speed').min='.25';$('#speed').max='2';$('#speed').oninput=()=>{$('#speedText').textContent=Number($('#speed').value).toFixed(2)+'×';fillRange($('#speed'));};$('#speed').oninput();
$('#play').onclick=()=>playing?stop():play();
for(const [id,a,b] of [['playAll',0,1],['meiosis1',0,.53],['meiosis2',.53,1]])$('#'+id).onclick=()=>{stop();setRange(a,b,id);p=a;draw();play();};
$('#prev').onclick=()=>{stop();setRange(0,1,'playAll');const index=marks.findLastIndex(t=>t<p-.005);moveTo(marks[Math.max(0,index)]);};
$('#next').onclick=()=>{stop();setRange(0,1,'playAll');const index=marks.findIndex(t=>t>p+.005);moveTo(marks[index<0?9:index]);};
$('#labels').onchange=draw;
document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{track=b.dataset.track;document.querySelectorAll('[data-track]').forEach(z=>{z.classList.toggle('on',z===b);z.setAttribute('aria-pressed',String(z===b))});draw();});
$('#mobileView').onclick=()=>{const on=document.body.classList.toggle('mobile-preview');$('#mobileView').setAttribute('aria-pressed',String(on));$('#mobileView').title=on?'기본 화면으로 전환':'모바일 화면 전환';resize();};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{document.body.classList.toggle('expanded-view');$('#fullscreen span').textContent=document.body.classList.contains('expanded-view')?'화면 복원':'전체 화면';resize();}}catch(e){document.body.classList.toggle('expanded-view');resize();}};
document.addEventListener('fullscreenchange',()=>{$('#fullscreen span').textContent=document.fullscreenElement?'화면 복원':'전체 화면';resize();});
document.addEventListener('keydown',e=>{if(['INPUT','BUTTON','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.code==='Space'){e.preventDefault();$('#play').onclick();}else if(e.code==='ArrowLeft')$('#prev').onclick();else if(e.code==='ArrowRight')$('#next').onclick();});
$('.brand').onclick=e=>{e.preventDefault();stop();setRange(0,1,'playAll');moveTo(0);};
document.addEventListener('visibilitychange',()=>{last=performance.now();});
new ResizeObserver(resize).observe(C);window.addEventListener('resize',resize);
// Read-only diagnostics for validating actual frames and label placement.
window.meiosisInspect=()=>({p,labels:labelRects,chromosomes:M.state(p).chromosomes,membranes:M.membranes(p)});
resize();
})();

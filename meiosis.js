const C=document.querySelector("#cv"),ctx=C.getContext("2d");
const timeline=document.querySelector("#timeline"), title=document.querySelector("#stageTitle"), desc=document.querySelector("#stageDesc");
const stages=[
["간기","DNA가 복제됩니다."],["감수 1분열 전기","상동 염색체가 짝을 이루어 2가 염색체가 됩니다."],
["감수 1분열 중기","2가 염색체가 세포 중앙에 배열됩니다."],["감수 1분열 후기","상동 염색체가 서로 반대쪽으로 이동합니다."],
["감수 1분열 말기","세포질이 나뉘어 두 세포가 됩니다."],["감수 2분열 전기","두 세포가 다시 분열을 준비합니다."],
["감수 2분열 중기","염색체가 각 세포 중앙에 배열됩니다."],["감수 2분열 후기","자매 염색분체가 서로 반대쪽으로 이동합니다."],
["감수 2분열 말기","세포질 분열이 진행됩니다."],["완료","4개의 딸세포가 만들어집니다."]];
const marks=[0,.11,.22,.34,.45,.54,.65,.76,.89,1];
let p=0,playing=false,raf=0,track="all",targetEnd=1,last=0;

const $=s=>document.querySelector(s), clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)}, mix=(a,b,t)=>a+(b-a)*smooth(t);
function seg(a,b){return smooth(clamp((p-a)/(b-a)))}
function resize(){let r=C.getBoundingClientRect(),d=devicePixelRatio||1;C.width=r.width*d;C.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);draw()}
addEventListener("resize",resize);addEventListener("orientationchange",()=>setTimeout(resize,100));

const ids=["b1","r1","b2","r2"], colors={b1:"#3379d5",r1:"#e15d6a",b2:"#3379d5",r2:"#e15d6a"};
function alpha(id){return track==="all"||track===id?1:.48}
function line(x1,y1,x2,y2,color="#91a2b7",w=1.5,a=1,dash=[]){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore()}
function circle(x,y,r,stroke="#8392a5",fill=null,w=2,a=1){ctx.save();ctx.globalAlpha=a;ctx.beginPath();ctx.arc(x,y,r,0,7);if(fill){ctx.fillStyle=fill;ctx.fill()}ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke();ctx.restore()}
function chrom(id,x,y,size=25,split=0,angle=0){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha(id);ctx.strokeStyle=colors[id];ctx.lineWidth=5;ctx.lineCap="round";
 let gap=split*size*.7;
 for(let k of [-1,1]){ctx.beginPath();ctx.moveTo(-size*.34+k*gap,-size);ctx.lineTo(k*gap,0);ctx.lineTo(-size*.34+k*gap,size);ctx.stroke()}
 ctx.fillStyle="#24364d";ctx.beginPath();ctx.arc(0,0,3.2,0,7);ctx.fill();ctx.restore()
}
function chromatid(id,x,y,size=23,flip=1){ctx.save();ctx.globalAlpha=alpha(id);ctx.strokeStyle=colors[id];ctx.lineWidth=5;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x+flip*size*.28,y-size);ctx.lineTo(x,y);ctx.lineTo(x+flip*size*.28,y+size);ctx.stroke();ctx.restore()}
function centrosome(x,y,a=1){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle="#d18a25";ctx.lineWidth=2;for(let i=0;i<8;i++){let q=i*Math.PI/4;line(x+Math.cos(q)*4,y+Math.sin(q)*4,x+Math.cos(q)*11,y+Math.sin(q)*11,"#d18a25",1.5,a)}ctx.restore()}
function nuclear(x,y,r,visibility,broken){
 if(visibility<=0)return; let dash=broken<.15?[]:broken<.45?[15,6]:broken<.75?[8,9]:[3,10];
 circle(x,y,r,"#7f91a7",null,2,visibility); if(dash.length){ctx.save();ctx.setLineDash(dash);ctx.strokeStyle="#7f91a7";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.stroke();ctx.restore()}
}
function arrowLabel(text,x,y,tx,ty,star=false){
 if(!$("#labels").checked)return;ctx.save();ctx.font="700 12px system-ui";ctx.fillStyle="#34445a";ctx.textAlign="center";ctx.fillText((star?"★ ":"")+text,x,y);
 line(x,y+5,tx,ty,"#596a80",1);let a=Math.atan2(ty-y,tx-x);ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-8*Math.cos(a-.45),ty-8*Math.sin(a-.45));ctx.lineTo(tx-8*Math.cos(a+.45),ty-8*Math.sin(a+.45));ctx.closePath();ctx.fillStyle="#596a80";ctx.fill();ctx.restore()
}
function membranePinch(cx,cy,rx,ry,pinch,vertical=false){
 ctx.save();ctx.strokeStyle="#5b6f87";ctx.lineWidth=2.3;ctx.beginPath();
 if(!vertical){ // left/right division
   for(let i=0;i<=160;i++){let a=i/160*Math.PI*2, co=Math.cos(a),si=Math.sin(a);let x=cx+rx*co*(1-pinch*Math.exp(-Math.pow(si/.25,2))*.55),y=cy+ry*si;(i?ctx.lineTo(x,y):ctx.moveTo(x,y))}
 }else{
   for(let i=0;i<=160;i++){let a=i/160*Math.PI*2,co=Math.cos(a),si=Math.sin(a);let x=cx+rx*co,y=cy+ry*si*(1-pinch*Math.exp(-Math.pow(co/.25,2))*.55);(i?ctx.lineTo(x,y):ctx.moveTo(x,y))}
 }ctx.closePath();ctx.stroke();ctx.restore()
}
function state(){
 const W=C.clientWidth,H=C.clientHeight,cx=W/2,cy=H/2,R=Math.min(W*.28,H*.36,155);
 // meiosis I continuous geometry
 let pair=seg(.11,.22), align=seg(.18,.28), sep=seg(.30,.43), divide=seg(.38,.48);
 let nucBreak=seg(.11,.22), spindle=seg(.13,.24);
 let poleX=mix(cx-R*.35,cx-R*.83,spindle), poleXR=2*cx-poleX;
 let d=mix(R*.30,R*.08,pair); d=mix(d,R*.04,align); d=mix(d,R*.58,sep);
 let y1=cy-R*.23,y2=cy+R*.23;
 return {W,H,cx,cy,R,pair,align,sep,divide,nucBreak,spindle,poleX,poleXR,d,y1,y2}
}
function drawMI(s){
 let {cx,cy,R,pair,divide,nucBreak,spindle,poleX,poleXR,d,y1,y2}=s;
 membranePinch(cx,cy,R,R*.86,divide,false);
 nuclear(cx,cy,R*.67,1-nucBreak,nucBreak);
 centrosome(poleX,cy,spindle);centrosome(poleXR,cy,spindle);
 let pos={b1:[cx-d,y1],r1:[cx+d,y1],b2:[cx+d,y2],r2:[cx-d,y2]};
 if(spindle>.02) for(let id of ids){let [x,y]=pos[id];line(poleX,cy,x,y,"#a7b4c5",1.2,spindle*.8);line(poleXR,cy,x,y,"#a7b4c5",1.2,spindle*.8)}
 for(let id of ids){let [x,y]=pos[id];chrom(id,x,y,R*.14)}
 if(pair>.25 && p<.34) arrowLabel("2가 염색체",cx,cy-R*.72,cx,y1-R*.08,true);
 if(p<.12)arrowLabel("핵막",cx+R*.78,cy-R*.52,cx+R*.56,cy-R*.40);
 if(p>.13&&p<.38)arrowLabel("방추사",cx,cy-R*.77,poleX+(cx-poleX)*.55,cy-R*.12);
}
function drawMII(s){
 let {cx,cy,R}=s, start=.45;
 let enter=seg(.45,.54),align=seg(.55,.66),sep=seg(.68,.82),divide=seg(.80,.94),finish=seg(.90,1);
 let cellX=mix(cx,cx-R*.56,enter), cellXR=2*cx-cellX, rr=R*.67;
 let centers=[[cellX,cy],[cellXR,cy]];
 for(let c=0;c<2;c++){let [ccx,ccy]=centers[c];membranePinch(ccx,ccy,rr,rr*.84,divide,true);let poleY=mix(ccy-rr*.25,ccy-rr*.76,align),poleY2=2*ccy-poleY;centrosome(ccx,poleY,align);centrosome(ccx,poleY2,align);
   let owned=c===0?["b1","r2"]:["r1","b2"];
   owned.forEach((id,j)=>{let xx=ccx+(j?rr*.18:-rr*.18), yy=ccy;
     if(sep<.02){chrom(id,xx,yy,rr*.20)}
     else {let off=mix(0,rr*.48,sep);chromatid(id,xx,yy-off,rr*.18,-1);chromatid(id,xx,yy+off,rr*.18,1)}
     if(align>.05){line(ccx,poleY,xx,yy-(sep?mix(0,rr*.48,sep):0),"#a7b4c5",1.1,.75);line(ccx,poleY2,xx,yy+(sep?mix(0,rr*.48,sep):0),"#a7b4c5",1.1,.75)}
   })
 }
 if(p>.57&&p<.72)arrowLabel("방추사",cx,cy-R*.67,cellX,cy-R*.27);
 if(p>.70&&p<.87)arrowLabel("자매 염색분체",cx,cy-R*.72,cellX-R*.12,cy-R*.22);
 if(finish>.05){ // nuclear envelopes reform continuously
   for(let [ccx,ccy] of centers) for(let sy of [-1,1]) nuclear(ccx,ccy+sy*rr*.43,rr*.34,finish,1-finish);
 }
}
function drawFinal(s){
 if(p<.93)return;let q=seg(.93,1),{cx,cy,R}=s,dx=R*.58,dy=R*.43,rr=R*.31;
 [["b1",-1,-1],["r2",-1,1],["r1",1,-1],["b2",1,1]].forEach(([id,sx,sy])=>{let x=cx+sx*dx,y=cy+sy*dy;circle(x,y,rr,"#5b6f87","#fbfdff",2,q);chromatid(id,x,y,rr*.38,sy)});
 if(q>.55)arrowLabel("딸세포",cx,cy-R*.84,cx-dx,cy-dy-rr);
}
function draw(){
 ctx.clearRect(0,0,C.clientWidth,C.clientHeight);let s=state();
 if($("#daughterOnly").checked){p=Math.max(p,.93)}
 if(p<.50)drawMI(s); else drawMII(s);
 drawFinal(s);
 let idx=0;for(let i=0;i<marks.length;i++)if(p>=marks[i]-.001)idx=i;
 title.textContent=stages[idx][0];desc.textContent=stages[idx][1];timeline.value=Math.round(p*1000);
 document.querySelectorAll(".stage").forEach((b,i)=>b.classList.toggle("on",i===idx))
}
const stageBox=$("#stages");stages.forEach((s,i)=>{let b=document.createElement("button");b.className="stage";b.textContent=s[0];b.onclick=()=>{stop();p=marks[i];draw()};stageBox.appendChild(b)});
timeline.oninput=e=>{stop();p=e.target.value/1000;draw()};
function stop(){playing=false;cancelAnimationFrame(raf);$("#play").textContent="재생"}
function animate(end=1){stop();playing=true;targetEnd=end;last=performance.now();$("#play").textContent="정지";raf=requestAnimationFrame(tick)}
function tick(now){if(!playing)return;let sp=+$("#speed").value;p+=((now-last)/16000)*sp;last=now;if(p>=targetEnd){p=targetEnd;draw();stop();return}draw();raf=requestAnimationFrame(tick)}
$("#play").onclick=()=>playing?stop():animate(targetEnd>p?targetEnd:1);$("#playAll").onclick=()=>{p=0;draw();animate(1)};
$("#meiosis1").onclick=()=>{p=0;$("#daughterOnly").checked=false;draw();animate(.48)};
$("#meiosis2").onclick=()=>{p=.48;$("#daughterOnly").checked=false;draw();animate(1)};
$("#prev").onclick=()=>{stop();let i=marks.findLastIndex(v=>v<p-.015);p=marks[Math.max(0,i)];draw()};
$("#next").onclick=()=>{stop();let i=marks.findIndex(v=>v>p+.015);p=marks[i<0?marks.length-1:i];draw()};
$("#daughterOnly").onchange=()=>{stop();if($("#daughterOnly").checked)p=.93;draw()};
$("#labels").onchange=draw;document.querySelectorAll("[data-track]").forEach(b=>b.onclick=()=>{track=b.dataset.track;document.querySelectorAll("[data-track]").forEach(z=>z.classList.toggle("on",z===b));draw()});
$("#fullscreen").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
resize();
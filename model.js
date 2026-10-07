/* Every chromatid keeps the same identity and continuous coordinates. */
(function(root){
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
const phase=(p,a,b)=>ease((p-a)/(b-a));const lerp=(a,b,t)=>a+(b-a)*t;
const ids=['b1','r1','r2','b2'];
function state(p){p=clamp(p);const pair=phase(p,.1,.24),sep1=phase(p,.3,.435),layout2=phase(p,.49,.65),sep2=phase(p,.7,.835),replicate=phase(p,.015,.095);
const chromosomes=ids.map((id,i)=>{const side=i===0||i===2?-1:1, row=i<2?-1:1,slot=row<0?-1:1;
let x=side*lerp(lerp(72,19,pair),130,sep1),y=row*lerp(55,47,pair);
x=lerp(x,side*130+slot*28,layout2);y=lerp(y,0,layout2);
const size=id.endsWith('1')?27:21;const angle=lerp((i%2?-.32:.26),0,pair);
const sisters=[-1,1].map(k=>{const sx=x+k*1.3*(1-sep2),sy=y+k*82*sep2;
const top=[lerp(k*size*.44,-size*.42,sep2),lerp(-size,-k*size*.7,sep2)];
const bottom=[lerp(-k*size*.44,size*.42,sep2),lerp(size,-k*size*.7,sep2)];
const rotate=v=>[sx+v[0]*Math.cos(angle)-v[1]*Math.sin(angle),sy+v[0]*Math.sin(angle)+v[1]*Math.cos(angle)];
return {key:id+':'+k,id,k,center:[sx,sy],nodes:[rotate(top),[sx,sy],rotate(bottom)],opacity:k<0?1:replicate};});return {id,side,row,x,y,sisters};});
const spindle1=phase(p,.14,.27)*(1-phase(p,.43,.5)),spindle2=phase(p,.56,.67)*(1-phase(p,.835,.91));
const poles1=[[-lerp(76,202,phase(p,.13,.27)),0],[lerp(76,202,phase(p,.13,.27)),0]];
const poles2=[[-130,-lerp(45,126,phase(p,.54,.67))],[-130,lerp(45,126,phase(p,.54,.67))],[130,-lerp(45,126,phase(p,.54,.67))],[130,lerp(45,126,phase(p,.54,.67))]];
return {p,chromosomes,sep1,sep2,pair,spindle1,spindle2,poles1,poles2,nucleus1:1-phase(p,.115,.235),nucleusMid:phase(p,.44,.51)*(1-phase(p,.55,.64)),nucleusFinal:phase(p,.875,.985)};
}
/* Pinch the existing outline to a zero-width neck, then settle each lobe.
   At the topology change, both descriptions have identical coordinates. */
function outline(rx,ry,q){return Array.from({length:193},(_,i)=>{const a=i/192*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [rx*c,ry*s*(1-q*Math.exp(-Math.pow(c/.4,2)))];});}
function lobes(rx,ry,settle,cx,ax,ay){return [-1,1].map(side=>Array.from({length:97},(_,i)=>{const u=i/96,a=Math.PI/2+u*Math.PI;const c=Math.cos(a),s=Math.sin(a);const oldX=side*(-rx*c),oldY=ry*s*(1-Math.exp(-Math.pow(c/.4,2)));
const theta=side<0?u*Math.PI*2:Math.PI-u*Math.PI*2;
return [lerp(oldX,side*cx+ax*Math.cos(theta),settle),lerp(oldY,ay*Math.sin(theta),settle)];}));}
function membranes(p){if(p<=.5)return [outline(225,175,phase(p,.385,.5))];
if(p<.58)return lobes(225,175,phase(p,.5,.58),130,112,145);
const second=phase(p,.795,.93),settle=phase(p,.93,1);let shapes=[];
for(const x of [-130,130]){if(p<=.93){shapes.push(outline(145,112,second).map(([u,v])=>[x+v,u]));}else{shapes.push(...lobes(145,112,settle,82,72,102).map(points=>points.map(([u,v])=>[x+v,u])));}}
return shapes;}
const api={state,membranes,phase,lerp,clamp,ids};if(typeof module==='object'&&module.exports)module.exports=api;root.MeiosisModel=api;
})(typeof window==='object'?window:globalThis);

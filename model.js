/* One time axis. Stable chromosome identities; both divisions are horizontal. */
(function(root){
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
const phase=(p,a,b)=>ease((p-a)/(b-a)),lerp=(a,b,t)=>a+(b-a)*t;
const ids=['b1','r1','r2','b2'];
function state(p){p=clamp(p);
const pair=phase(p,.105,.255),sep1=phase(p,.315,.435),layout2=phase(p,.5,.675),sep2=phase(p,.715,.84),replicate=phase(p,.015,.09);
const cellX=lerp(132,175,phase(p,.565,.715)),cellRX=lerp(110,165,phase(p,.6,.775));
const condensed=phase(p,.105,.22)*(1-phase(p,.445,.5))+phase(p,.57,.65)*(1-phase(p,.9,.99));
const chromosomes=ids.map((id,i)=>{const side=i===0||i===2?-1:1,row=i<2?-1:1;
let x=side*lerp(lerp(70,19,pair),132,sep1),y=row*lerp(50,44,pair);
x=lerp(x,side*cellX,layout2);y=lerp(y,row*29,layout2);
const size=id.endsWith('1')?27:21,angle=lerp((i%2?-.3:.25),0,pair);
const sisters=[-1,1].map(k=>{const sx=x+k*lerp(1.3,88,sep2),sy=y;
const top=[lerp(k*size*.44,-k*size*.7,sep2),lerp(-size,-size*.42,sep2)];
const bottom=[lerp(-k*size*.44,-k*size*.7,sep2),lerp(size,size*.42,sep2)];
const rotate=v=>[sx+v[0]*Math.cos(angle)-v[1]*Math.sin(angle),sy+v[0]*Math.sin(angle)+v[1]*Math.cos(angle)];
const nodes=[rotate(top),[sx,sy],rotate(bottom)];
// Two cubic curves continuously straighten from chromatin into a chromatid.
const straight=[top,[top[0]*.68,top[1]*.68],[top[0]*.32,top[1]*.32],[0,0],[bottom[0]*.32,bottom[1]*.32],[bottom[0]*.68,bottom[1]*.68],bottom];
const sign=i%2?-1:1;
const loose=[[sign*18,-24],[sign*43,-34],[-sign*31,-7],[0,0],[sign*34,15],[-sign*38,39],[-sign*17,24]];
const path=straight.map((v,j)=>rotate([lerp(loose[j][0],v[0],condensed),lerp(loose[j][1],v[1],condensed)]));
return {key:id+':'+k,id,k,center:[sx,sy],nodes,path,opacity:k<0?1:replicate,width:lerp(2.5,7,condensed)};});
return {id,side,row,x,y,sisters};});
const spindle1=phase(p,.15,.26)*(1-phase(p,.435,.49)),spindle2=phase(p,.575,.675)*(1-phase(p,.855,.92));
const poles1=[[-208,0],[208,0]];
const poles2=[[-cellX-cellRX*.91,0],[-cellX+cellRX*.91,0],[cellX-cellRX*.91,0],[cellX+cellRX*.91,0]];
return {p,chromosomes,sep1,sep2,pair,spindle1,spindle2,poles1,poles2,cellX,cellRX,condensed,nucleus1:1-phase(p,.12,.24),nucleusMid:phase(p,.445,.51)*(1-phase(p,.57,.65)),nucleusFinal:phase(p,.905,.995)};
}
// Blend a parent ellipse into two exactly tangent ellipses. At full pinch,
// its left and right halves are already the two daughter outlines.
function outline(rx,ry,q){return Array.from({length:257},(_,i)=>{const a=i/256*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [lerp(rx*c,Math.sign(c)*rx*c*c,q),lerp(ry*s,ry*s*Math.abs(c),q)];});}
function lobes(rx,ry,settle,cx,ax,ay){return [-1,1].map(side=>Array.from({length:129},(_,i)=>{const a=Math.PI/2+i/128*Math.PI,c=Math.cos(a),s=Math.sin(a);const oldX=side*rx*c*c,oldY=ry*s*Math.abs(c);
const u=i/128,theta=side<0?u*Math.PI*2:Math.PI-u*Math.PI*2;
return [lerp(oldX,side*cx+ax*Math.cos(theta),settle),lerp(oldY,ay*Math.sin(theta),settle)];}));}
function membranes(p){
if(p<=.5)return [outline(lerp(190,225,phase(p,.36,.435)),190,phase(p,.395,.5))];
if(p<.565)return lobes(225,190,phase(p,.5,.565),132,110,110);
const cx=lerp(132,175,phase(p,.565,.715)),rx=lerp(110,165,phase(p,.6,.775)),ry=lerp(110,160,phase(p,.6,.775));
let shapes=[];for(const side of [-1,1]){if(p<=.935)shapes.push(outline(rx,ry,phase(p,.805,.935)).map(([x,y])=>[side*cx+x,y]));
else shapes.push(...lobes(165,160,phase(p,.935,1),88,84,84).map(poly=>poly.map(([x,y])=>[side*175+x,y])));}
return shapes;}
const api={state,membranes,phase,lerp,clamp,ids};if(typeof module==='object'&&module.exports)module.exports=api;root.MeiosisModel=api;
})(typeof window==='object'?window:globalThis);

// Deterministic exports of the approved DÜMBÜK drawing. Requires sharp (Next dependency)
// and potrace in BRAND_TOOLS_DIR; the application has no additional runtime dependency.
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const {trace}=require(path.join(process.env.BRAND_TOOLS_DIR||'/tmp/dumbuk-brand-tools','node_modules/potrace'));
const out='public/brand';
const wrap=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const paths=svg=>svg.match(/<path[\s\S]*?\/>/g)?.join('')||'';
async function layer(data,w,h,predicate,color){
 const mask=Buffer.alloc(w*h);for(let i=0;i<w*h;i++)mask[i]=predicate(data[i*3],data[i*3+1],data[i*3+2])?0:255;
 const png=await sharp(mask,{raw:{width:w,height:h,channels:1}}).png().toBuffer();
 return new Promise((resolve,reject)=>trace(png,{color,threshold:128,turdSize:8,optTolerance:.35},(err,svg)=>err?reject(err):resolve(paths(svg))));
}
async function make(crop){
 const {data,info}=await sharp('docs/branding/approved-concept.png').flatten({background:'#fffbef'}).removeAlpha().extract(crop).raw().toBuffer({resolveWithObject:true});
 const yellow=await layer(data,info.width,info.height,(r,g,b)=>r>140&&g>140&&b<120,'#dafa28');
 const ink=await layer(data,info.width,info.height,(r,g,b)=>r<115&&g<115&&b<115,'#191919');
 return {w:info.width,h:info.height,yellow,ink};
}
async function save(name,w,h,body){const svg=wrap(w,h,body);fs.writeFileSync(`${out}/${name}.svg`,svg);await sharp(Buffer.from(svg)).resize({width:w*2}).png().toFile(`${out}/${name}.png`);return svg;}
(async()=>{
 const logo=await make({left:118,top:277,width:1304,height:423});
 const face=await make({left:118,top:277,width:405,height:423});
 const word=await make({left:528,top:342,width:894,height:315});
 await save('logo-horizontal',logo.w,logo.h,logo.yellow+logo.ink);
 await save('logo-black',logo.w,logo.h,logo.ink);
 await save('logo-white',logo.w,logo.h,logo.ink.replaceAll('#191919','#ffffff'));
 await save('logo-on-dark',logo.w+80,logo.h+80,`<rect width="100%" height="100%" fill="#191919"/><g transform="translate(40 40)">${logo.yellow}${logo.ink.replaceAll('#191919','#fffbef')}</g>`);
 await save('mascot',face.w,face.h,face.yellow+face.ink);
 await save('wordmark',word.w,word.h,word.ink);
 await save('logo-stacked',920,805,`<g transform="translate(253 20)">${face.yellow}${face.ink}</g><g transform="translate(13 460)">${word.ink}</g>`);
 const icon=wrap(512,512,`<rect width="512" height="512" rx="100" fill="#fffbef"/><g transform="translate(76 70) scale(.87)">${face.yellow}${face.ink}</g>`);
 fs.writeFileSync(`${out}/favicon.svg`,icon);
 for(const size of [16,32,48,180,192,512])await sharp(Buffer.from(icon)).resize(size,size).png().toFile(`${out}/${size===180?'apple-touch-icon':`icon-${size}`}.png`);
 const maskable=wrap(512,512,`<rect width="512" height="512" fill="#fffbef"/><g transform="translate(122 117) scale(.65)">${face.yellow}${face.ink}</g>`);
 await sharp(Buffer.from(maskable)).png().toFile(`${out}/icon-maskable-512.png`);
 const bufs=await Promise.all([16,32,48].map(n=>fs.promises.readFile(`${out}/icon-${n}.png`)));
 const header=Buffer.alloc(6+16*bufs.length);header.writeUInt16LE(1,2);header.writeUInt16LE(bufs.length,4);let offset=header.length;
 bufs.forEach((b,i)=>{const k=6+i*16;header[k]=[16,32,48][i];header[k+1]=header[k];header.writeUInt16LE(1,k+4);header.writeUInt16LE(32,k+6);header.writeUInt32LE(b.length,k+8);header.writeUInt32LE(offset,k+12);offset+=b.length;});
 fs.writeFileSync('public/favicon.ico',Buffer.concat([header,...bufs]));fs.copyFileSync('public/favicon.ico',`${out}/favicon.ico`);
 const og=wrap(1200,630,`<rect width="1200" height="630" fill="#fffbef"/><rect x="48" y="48" width="1104" height="534" rx="20" fill="none" stroke="#191919" stroke-width="3"/><g transform="translate(100 120) scale(.77)">${logo.yellow}${logo.ink}</g><text x="600" y="505" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="30" fill="#191919">Muhabbet baki. Skor geçici.</text>`);
 fs.writeFileSync(`${out}/og.svg`,og);await sharp(Buffer.from(og)).png().toFile('public/opengraph-image.png');fs.copyFileSync('public/opengraph-image.png',`${out}/og-1200x630.png`);
 fs.writeFileSync('public/manifest.webmanifest',JSON.stringify({name:'DÜMBÜK',short_name:'DÜMBÜK',description:'Arkadaş arası rekabet kurumu.',lang:'tr',start_url:'/',display:'standalone',background_color:'#fffbef',theme_color:'#fffbef',icons:[{src:'/brand/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/brand/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/brand/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,2));
 const manifest=[];for(const file of fs.readdirSync(out).filter(f=>/\.(png|svg|ico)$/.test(f))){const meta=await sharp(`${out}/${file}`).metadata().catch(()=>({}));manifest.push({file,width:meta.width,height:meta.height,bytes:fs.statSync(`${out}/${file}`).size});}
 fs.writeFileSync(`${out}/manifest.json`,JSON.stringify({brand:'DÜMBÜK',source:'User-approved AI-generated concept, converted to actual vector paths with Potrace; deterministic exports with sharp.',assets:manifest},null,2));console.log(`Exported ${manifest.length} assets`);
})();

import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {questions,cosmetics,practicePacks} from '../packages/content/farm.mjs';
const require=createRequire(import.meta.url),rootRequire=createRequire(new URL('../package.json',import.meta.url));
const esbuild=createRequire(rootRequire.resolve('vite'))('esbuild');
mkdirSync('.local/art-review',{recursive:true});
esbuild.buildSync({stdin:{contents:`export {WordArt,illustratedWords} from './apps/web/src/components/WordArt';export {Character} from './apps/web/src/art';export {ConversationScene} from './apps/web/src/components/ConversationScene';export {FillPicture} from './apps/web/src/components/FillPicture';`,resolveDir:process.cwd(),loader:'tsx'},outfile:'.local/art-review/render.cjs',bundle:true,format:'cjs',platform:'node',external:['react','react-dom']});
const React=rootRequire('react'),{renderToStaticMarkup:render}=rootRequire('react-dom/server');
const {WordArt,illustratedWords,Character,ConversationScene,FillPicture}=rootRequire('./.local/art-review/render.cjs');
let serial=0;const node=(Component,props)=>render(React.createElement('svg',null,React.createElement(Component,props)),{identifierPrefix:'review'+(++serial)+'-'}).replace(/^<svg>/,'').replace(/<\/svg>$/,'');
function sheet(name,items,columns,size,cell){const width=Math.max(columns*cell,Math.ceil(items.length/columns)*cell),height=width;const body=items.map(({label,art},i)=>`<g transform="translate(${i%columns*cell} ${Math.floor(i/columns)*cell})"><rect x="3" y="3" width="${cell-6}" height="${cell-6}" rx="12" fill="#faf5e9"/>${art}<text x="${cell/2}" y="${cell-9}" text-anchor="middle" font-family="Arial" font-size="14" fill="#654f6d">${label}</text></g>`).join('');writeFileSync(`.local/art-review/${name}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fffdf6"/>${body}</svg>`);}
const pictures=practicePacks.filter(p=>illustratedWords.has(p.word)).map(p=>{assert.ok(illustratedWords.has(p.word),p.word);const svg=node(WordArt,{word:p.word});assert.ok(svg.length>80,p.word);assert.ok(!svg.includes('undefined'),p.word);return {label:`${p.number}. ${p.word}`,art:`<g transform="translate(20 10) scale(.7)">${svg}</g>`};});
sheet('100-words',pictures,10,1800,180);
const themes=['ski','summer','autumn','party','christmas'];
sheet('wardrobe-themes',themes.map(theme=>({label:theme,art:`<g transform="translate(20 0) scale(.8)">${node(Character,{outfit:cosmetics.filter(c=>c.theme===theme&&(['head','feet','face','gear'].includes(c.slot)||c.slot==='body'&&c.id===cosmetics.find(x=>x.theme===theme&&x.slot==='body').id)).map(c=>c.id).join('|')}).replace('<svg ','<svg width="220" height="260" ')}</g>`})),3,720,240);
const scenes=questions.filter(q=>q.module==='conversation'&&q.scene).map(q=>{assert.ok(q.scene,q.id);const svg=node(ConversationScene,{question:q});assert.ok(svg.length>300,q.id);return {label:q.id,art:svg.replace('<svg ','<svg x="6" y="10" width="288" height="235" ')};});
sheet('conversation-scenes',scenes,4,1200,300);
const fills=questions.filter(q=>q.type==='fill'&&q.module!=='phonics');for(const q of fills){assert.ok(q.picture,q.id);assert.ok(node(FillPicture,{word:q.picture}).length>300,q.id);}
console.log(`Reviewed render coverage: ${pictures.length} word illustrations, ${scenes.length} conversation scenes, ${fills.length} fill hints, ${themes.length} wardrobe themes.`);

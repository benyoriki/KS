/* Helper bersama untuk dashboard & halaman. Hanya membaca data (perhitungan tetap di Calc). */
var H=(function(){
var N=Calc.n,fmt=UI.fmt,esc=UI.esc,BR=Calc.BR;
var JL={PENJUALAN:'Penjualan',SUPPLIER:'Supplier',MUTASI:'Mutasi'};
function me(){return Auth.user()}
function master(k,lab){return DB.get(k).filter(function(x){return x.aktif}).map(function(x){return[x.nama,lab?lab(x):x.nama]})}
function link(href,ico,label,cls,desc){return'<a class="qa '+(cls||'')+'" href="#'+href+'"><span class="qi">'+UI.ic(ico)+'</span>'+(desc?'<span class="qt"><b>'+label+'</b><small>'+desc+'</small></span>':'<span>'+label+'</span>')+'</a>'}
function btn(a,l,c,ico){return'<button class="btn '+(c||'')+'" data-act="'+a+'">'+(ico?UI.ic(ico):'')+l+'</button>'}
function scopeLow(s){return s==='GALON'?'galon':'sps'}
function route(d){return d.arah==='KELUAR'?'Depo → '+esc(d.pihak):esc(d.pihak)+' → Depo'}
function jenisTxt(d){return JL[d.jenis]+' · '+(d.arah==='KELUAR'?'Keluar':'Masuk')}
/* chip isi dokumen */
function chips(scope,lines,mode){return'<div class="dchips">'+(lines||[]).map(function(l){
 if(Calc.isGal(l)){var p=[];if(N(l.isi))p.push((mode==='btb'?'Sisa ':'Isi ')+fmt(l.isi));if(N(l.ksg))p.push('Kosong '+fmt(l.ksg));if(N(l.tIsi))p.push('Tolakan isi '+fmt(l.tIsi));if(N(l.tKsg))p.push('Tolakan kosong '+fmt(l.tKsg));return'<span class="dch ch-'+l.k.toLowerCase()+'">'+BR[l.k]+' · '+(p.join(' · ')||'0')+'</span>'}
 var pr=Calc.prod(l.k),b=pr?pr.brand.toLowerCase():'sps';return'<span class="dch ch-b-'+b+'" title="'+esc(Calc.spsName(l.k))+'">'+esc(pr&&(pr.brand==='PALLET'||pr.brand==='JUGRAK')?pr.nama:l.k)+' · '+fmt(l.qty)+'</span>'}).join('')+'</div>'}
var SCLS={'Menunggu Muat':'s-wait','Di Jalan':'s-road','Menunggu BTB':'s-wait','Menunggu Barang Keluar':'s-road','Perlu Revisi':'s-bad','Selesai':'s-done','Diterima':'s-done','Dibatalkan':'s-void'};
/* aksi utama per role & status */
function action(d,role){var st=Calc.status(d),sc=Perm.scopeOf(role);
 if(sc&&d.scope===sc){
  if(st==='Menunggu Muat')return{label:'Cek & Muat',href:'doc/'+d.id,cls:'go'};
  if(st==='Di Jalan')return{label:'Driver Pulang → Input BTB',href:'btb/'+d.id,cls:'go2'};
  if(st==='Menunggu BTB')return{label:Calc.isSupIn(d)?'Cek Fisik & Terima Barang':'Input BTB (Terima Barang)',href:'btb/'+d.id,cls:'go2'};
  if(st==='Menunggu Barang Keluar')return{label:'Input Barang Keluar',href:'out/'+d.id,cls:'go2'}}
 return{label:'Lihat detail',href:'doc/'+d.id,cls:'ghost'}}
function docCard(d,role){var st=Calc.status(d),a=action(d,role),df=Calc.docDiff(d),today=Calc.today();
 var meta=[JL[d.jenis]+(d.arah==='KELUAR'?' (BKB)':' masuk'),(d.date===today?'':UI.dmy(d.date)+' ')+'input '+d.time];
 if(d.muat)meta.push('muat '+d.muat.time);if(d.btb)meta.push('BTB '+d.btb.time);
 return'<a class="dc '+(SCLS[st]||'')+'" href="#'+a.href+'"><div class="dc1"><span class="dno">'+esc(d.no)+'</span><span>'+(d.btb&&d.btb.bon?UI.tag('Bon Putih')+' ':'')+(df.length?UI.tag('Ada Selisih')+' ':'')+UI.tag(st)+'</span></div>'+
 '<div class="dc2"><b>'+esc(d.driver)+'</b>'+(d.rit?'<span class="rit">Rit '+d.rit+'</span>':'')+'<span class="dr">'+route(d)+'</span></div>'+chips(d.scope,d.lines)+
 (d.out?'<div class="dout">'+UI.ic('out')+'<span>Keluar: '+esc(Calc.outTxt(d))+'</span></div>':'')+'<div class="dc4">'+meta.join(' · ')+'</div>'+(a.cls==='ghost'?'':'<span class="btn dcb '+a.cls+'">'+a.label+'</span>')+'</a>'}
function docList(list,role,empty){return list.length?'<div class="dlist">'+list.map(function(d){return docCard(d,role)}).join('')+'</div>':UI.empty(empty||'Belum ada dokumen')}
/* dokumen terurut: yang masih terbuka dulu */
function sortDocs(list){return list.slice().sort(function(a,b){var oa=Calc.isOpen(a)?0:1,ob=Calc.isOpen(b)?0:1;return oa!==ob?oa-ob:(a.ts<b.ts?1:-1)})}
function docsFor(scope){return Calc.docs().filter(function(d){return!scope||d.scope===scope})}
function unread(role){return DB.get('notifs').filter(function(x){return x.to===role&&!x.read})}
function notifsFor(role){return DB.get('notifs').filter(function(x){return x.to===role}).sort(function(a,b){return a.ts<b.ts?1:-1})}
var NI={BKB_BARU:['truck','warn','BKB baru'],MASUK_BARU:['box','warn','Barang masuk'],MUAT_SELESAI:['load','ok','Selesai muat'],RITASE_SELESAI:['flag','ok','Ritase selesai'],BTB_MASUK:['check','ok','BTB diterima'],BON_PUTIH:['alert','bad','Bon Putih'],REVISI_MINTA:['edit','bad','Minta revisi'],REVISI_SELESAI:['ok','ok','Sudah direvisi'],KELUAR_PABRIK:['out','info','Barang keluar'],DOK_BATAL:['alert','bad','Dibatalkan'],DOK_RESET:['alert','bad','Koreksi'],JUGRAK_UPDATE:['chat','info','Jugrak Set & Antrian']};
function notifRow(x){var i=NI[x.type]||['bell','warn','Info'];return'<li class="nf nf-'+i[1]+(x.read?'':' un')+'"><span class="ck ck-'+i[1]+'">'+UI.ic(i[0])+'</span><div class="nb"><div class="nt"><em>'+i[2]+'</em><time>'+esc(x.time||'')+(x.date!==Calc.today()?' · '+UI.dmy(x.date):'')+'</time></div><a href="#'+(x.docId?'doc/'+x.docId:x.link?x.link:'dash')+'">'+esc(x.text)+'</a></div></li>'}
function dlong(d){return UI.longDate(d)}
/* bar filter tanggal: ‹ [tanggal] ›  Hari Ini · Kemarin · Semua. base = path hash, sfx = bagian setelah tanggal (mis. '/open') */
function dbar(base,cur,o){o=o||{};var t=Calc.today(),y=Calc.addDays(t,-1),sfx=o.sfx||'',isD=/^\d{4}-\d{2}-\d{2}$/.test(cur),chip=function(v,l){return'<a class="dchip2'+((v===cur||(v==='today'&&cur===t))?' on':'')+'" href="#'+base+'/'+v+sfx+'">'+l+'</a>'};
 return'<div class="dbar"><div class="dnav"><a class="dstep" href="#'+base+'/'+Calc.addDays(isD?cur:t,-1)+sfx+'" aria-label="Hari sebelumnya">‹</a><input type="date" value="'+(isD?cur:'')+'" data-dp="'+base+'" data-sfx="'+sfx+'" aria-label="Pilih tanggal"><a class="dstep" href="#'+base+'/'+Calc.addDays(isD?cur:t,1)+sfx+'" aria-label="Hari berikutnya">›</a></div><div class="dchips2">'+chip(t,'Hari Ini')+chip(y,'Kemarin')+(o.open?chip('open','Belum Selesai'):'')+(o.all===false?'':chip('all','Semua'))+'</div></div>'}
function normDate(v){var t=Calc.today();if(!v||v==='today')return t;if(v==='yesterday')return Calc.addDays(t,-1);return v}
/* kelompokkan per tanggal (terbaru dulu): render(listDalamTanggal) */
function byDate(list,get,render,emptyTxt){if(!list.length)return UI.empty(emptyTxt||'Tidak ada data');var g={};list.forEach(function(x){var k=get(x);(g[k]=g[k]||[]).push(x)});
 return Object.keys(g).sort().reverse().map(function(k){return'<section class="dgrp"><h4 class="dh"><span>'+dlong(k)+(k===Calc.today()?' <em>hari ini</em>':'')+'</span><b>'+g[k].length+'</b></h4>'+render(g[k],k)+'</section>'}).join('')}
function sumKeys(map,keys){var s=0;keys.forEach(function(k){s+=N(map[k])});return s}
function selTag(v){return'<b class="'+(v?'neg':'pos')+'">'+(v>0?'+':'')+fmt(v)+'</b>'}
return{dlong:dlong,dbar:dbar,normDate:normDate,byDate:byDate,JL:JL,BR:BR,me:me,master:master,link:link,btn:btn,scopeLow:scopeLow,route:route,jenisTxt:jenisTxt,chips:chips,action:action,docCard:docCard,docList:docList,sortDocs:sortDocs,docsFor:docsFor,unread:unread,notifsFor:notifsFor,notifRow:notifRow,sumKeys:sumKeys,selTag:selTag}})();

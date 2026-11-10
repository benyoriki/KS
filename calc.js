/* Logika saldo V3 — terpisah dari UI.
   Saldo (per tanggal) = Saldo Awal (manual, per tanggal)  +  Masuk (semua BTB)  −  Keluar (semua BKB).
   Dokumen (doc): {scope:'GALON'|'SPS', jenis:'PENJUALAN'|'SUPPLIER'|'MUTASI', arah:'KELUAR'|'MASUK', driver, pihak, lines[], muat, btb}
   - KELUAR (BKB)  : stock berkurang saat Admin menyimpan BKB.
   - Retur BTB     : (Penjualan) sisa isi + botol kosong yang kembali ke Depo, stock bertambah saat Checker menyimpan BTB.
   - MASUK         : stock bertambah saat Checker menyimpan BTB (jumlah fisik yang diterima).
   Galon  : kunci stock AQ_ISI, AQ_KSG, VT_ISI, VT_KSG ; baris {k:'AQ',isi,ksg}
   SPS    : kunci stock SPS_<idProduk>              ; baris {k:'<idProduk>',qty} */
var Calc=(function(){
function n(x){return Number(x)||0}
var BR={AQ:'Aqua',VT:'Vit'};
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
/* Shift (WIB): 1 = 07:00-15:00 · 2 = 15:00-23:00 · 3 = 23:00-07:00 */
function wibHour(){try{return Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',hour12:false}).format(new Date()))%24}catch(e){return(new Date().getUTCHours()+7)%24}}
function shiftNow(){var h=wibHour();return h>=7&&h<15?'Shift 1 (07:00 - 15:00 WIB)':h>=15&&h<23?'Shift 2 (15:00 - 23:00 WIB)':'Shift 3 (23:00 - 07:00 WIB)'}
function prods(scope){return DB.get('products').filter(function(p){return p.aktif&&p.scope===scope})}
function spsProducts(){return prods('SPS').filter(function(p){return p.brand!=='PALLET'})}
function prod(id){return DB.get('products').find(function(x){return String(x.idDms)===String(id)})||null}
function spsName(id){var p=prod(id);return p?p.nama:''}
function unitOf(id){var p=prod(id);return p&&p.satuan?p.satuan:'Karton'}
/* grup pilihan di form. extra=true => hanya untuk Supplier (Jugrak / Pallet) */
var GROUPS={GALON:[['AQ','Galon Aqua'],['VT','Galon Vit'],['JUGRAK','Jugrak (produk lain)',1]],SPS:[['AQUA','SPS Aqua'],['VIT','SPS Vit'],['MIZONE','SPS Mizone'],['SGM','SPS SGM'],['LAIN','SPS Beverage Lain'],['PALLET','Pallet (produk lain)',1]]};
function prodList(scope,grp){return prods(scope).filter(function(p){return p.brand===grp})}
function isGal(l){return l.k==='AQ'||l.k==='VT'}
/* daftar item stock: [kunci, label, scope, kode, brand] */
function items(scope){var L=[];
 if(!scope||scope==='GALON'){['AQ','VT'].forEach(function(m){L.push([m+'_ISI',BR[m]+' – Isi','GALON',m,m],[m+'_KSG',BR[m]+' – Kosong','GALON',m,m])});prods('GALON').forEach(function(p){L.push(['SPS_'+p.idDms,p.nama,'GALON',p.idDms,p.brand])})}
 if(!scope||scope==='SPS')prods('SPS').forEach(function(p){L.push(['SPS_'+p.idDms,p.idDms+' '+p.nama,'SPS',p.idDms,p.brand])});return L}
function spsKeys(){return items('SPS').filter(function(i){return i[4]!=='PALLET'}).map(function(i){return i[0]})}
function name(k){var f=items().find(function(x){return x[0]===k});return f?f[1]:k}
function addDays(d,n){var t=new Date(d+'T00:00:00');t.setDate(t.getDate()+n);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')}
/* ritase ke-N untuk driver & tanggal yang sama (otomatis) */
function nextRit(driver,date){return docs().filter(function(d){return!d.void&&d.jenis==='PENJUALAN'&&d.driver===driver&&d.date===date}).length+1}
function docs(){return DB.get('docs')}
function byId(id){return docs().find(function(d){return d.id===id})||null}
/* ---- baris dokumen -> perubahan stock ---- */
function lineDeltas(scope,l,sign){var d={};
 if(isGal(l)){var qi=n(l.isi)+n(l.tIsi),qk=n(l.ksg)+n(l.tKsg);if(qi)d[l.k+'_ISI']=sign*qi;if(qk)d[l.k+'_KSG']=sign*qk}else if(n(l.qty))d['SPS_'+l.k]=sign*n(l.qty);return d}
function merge(a,b){Object.keys(b).forEach(function(k){a[k]=(a[k]||0)+b[k]});return a}
/* semua pergerakan stock (tidak termasuk dokumen dibatalkan) */
function moves(){var out=[];
 docs().forEach(function(d){if(d.void)return;
  if(d.arah==='KELUAR'){var m={};d.lines.forEach(function(l){merge(m,lineDeltas(d.scope,l,-1))});out.push({date:d.date,ts:d.ts,kind:'KELUAR',doc:d,d:m})}
  if(d.btb){var m2={};d.btb.lines.forEach(function(l){merge(m2,lineDeltas(d.scope,l,1))});out.push({date:d.btb.date,ts:d.btb.ts,kind:d.arah==='KELUAR'?'RETUR':'MASUK',doc:d,d:m2})}
  if(d.out){var m3={};d.out.lines.forEach(function(l){merge(m3,lineDeltas(d.scope,l,-1))});out.push({date:d.out.date,ts:d.out.ts,kind:'KELUAR_PBK',doc:d,d:m3})}});
 return out.sort(function(a,b){return a.ts<b.ts?-1:1})}
/* ---- status dokumen ---- */
/* Supplier masuk dari pabrik (alur V3.2): Admin input -> Checker cek fisik (BTB / Bon Putih / minta revisi) -> Checker input barang keluar (kosong, RB / pallet) */
function isSupIn(d){return d.jenis==='SUPPLIER'&&d.arah==='MASUK'}
function needsOut(d){return isSupIn(d)&&d.flow===2}
function status(d){if(d.void)return'Dibatalkan';
 if(d.arah==='KELUAR'){if(!d.muat)return'Menunggu Muat';if(d.jenis==='PENJUALAN')return d.btb?'Selesai':'Di Jalan';return'Selesai'}
 if(d.rev&&d.rev.open)return'Perlu Revisi';
 if(!d.btb)return'Menunggu BTB';
 if(needsOut(d)&&!d.out)return'Menunggu Barang Keluar';
 return'Diterima'}
function isOpen(d){var s=status(d);return s==='Menunggu Muat'||s==='Di Jalan'||s==='Menunggu BTB'||s==='Perlu Revisi'||s==='Menunggu Barang Keluar'}
var GF=[['isi','Isi'],['ksg','Kosong'],['tIsi','Tolakan isi'],['tKsg','Tolakan kosong']];
/* selisih BTB vs dokumen (khusus dokumen MASUK) */
function docDiff(d){if(!d.btb||d.arah!=='MASUK')return[];var out=[];
 d.lines.forEach(function(l){var a=d.btb.lines.find(function(x){return x.k===l.k})||{};
  if(isGal(l)){GF.forEach(function(f){var e=n(l[f[0]]),ac=n(a[f[0]]);if(e!==ac)out.push({k:l.k,f:f[0],label:BR[l.k]+' '+f[1],exp:e,act:ac,diff:ac-e})})}
  else{var e2=n(l.qty),a2=n(a.qty);if(e2!==a2)out.push({k:l.k,f:'qty',label:l.k+' '+spsName(l.k),exp:e2,act:a2,diff:a2-e2})}});return out}
/* ---- teks ringkas isi dokumen ---- */
function linesTxt(scope,lines,mode){return(lines||[]).map(function(l){
 if(isGal(l)){var p=[];if(n(l.isi))p.push((mode==='btb'?'sisa ':'')+n(l.isi).toLocaleString('id-ID')+' isi');if(n(l.ksg))p.push(n(l.ksg).toLocaleString('id-ID')+' kosong');if(n(l.tIsi))p.push('tolakan '+n(l.tIsi).toLocaleString('id-ID')+' isi');if(n(l.tKsg))p.push('tolakan '+n(l.tKsg).toLocaleString('id-ID')+' kosong');return BR[l.k]+' '+(p.join(' + ')||'0')}
 return l.k+' '+(spsName(l.k)||'')+' × '+n(l.qty).toLocaleString('id-ID')+' '+unitOf(l.k).toLowerCase()}).join(' · ')}
/* teks barang keluar ke pabrik (Checker): galon = kosong + RB ; SPS = pallet */
function outTxt(d){if(!d.out)return'';return d.out.lines.map(function(l){if(isGal(l)){var p=[];if(n(l.ksg))p.push(n(l.ksg).toLocaleString('id-ID')+' kosong');if(n(l.isi))p.push(n(l.isi).toLocaleString('id-ID')+' RB');return BR[l.k]+' '+(p.join(' + ')||'0')}
 return(spsName(l.k)||l.k)+' × '+n(l.qty).toLocaleString('id-ID')}).join(' · ')||'tidak ada barang keluar'}
/* ---- saldo awal harian ---- */
function openings(){return DB.get('openings')}
function savedOpening(date){return openings().find(function(o){return o.date===date})||null}
function zeros(){var z={};items().forEach(function(i){z[i[0]]=0});return z}
function sumMoves(from,to){var s={};moves().forEach(function(m){if(m.date>=from&&m.date<to)merge(s,m.d)});return s}
/* Saldo awal untuk tanggal tertentu: yang disimpan Admin; jika belum ada, saldo akhir hari sebelumnya (dihitung otomatis). */
function openingFor(date){var s=savedOpening(date),z=zeros();
 if(s){Object.keys(s.items||{}).forEach(function(k){z[k]=n(s.items[k])});return{items:z,saved:true,rec:s}}
 var prev=openings().filter(function(o){return o.date<date}).sort(function(a,b){return a.date<b.date?1:-1})[0];
 if(!prev)return{items:z,saved:false,none:true};
 var m=sumMoves(prev.date,date);Object.keys(prev.items||{}).forEach(function(k){z[k]=n(prev.items[k])});Object.keys(m).forEach(function(k){z[k]=(z[k]||0)+m[k]});
 return{items:z,saved:false,from:prev.date}}
/* ringkasan 1 hari per item: {open,masuk,keluar,close} */
function saldoDay(date){var o=openingFor(date),r={},mv=moves().filter(function(m){return m.date===date});
 items().forEach(function(i){r[i[0]]={open:n(o.items[i[0]]),masuk:0,keluar:0,close:0}});
 mv.forEach(function(m){Object.keys(m.d).forEach(function(k){if(!r[k])return;if(m.d[k]>0)r[k].masuk+=m.d[k];else r[k].keluar-=m.d[k]})});
 Object.keys(r).forEach(function(k){r[k].close=r[k].open+r[k].masuk-r[k].keluar});
 return{items:r,opening:o}}
function saldoNow(){var s=saldoDay(today()).items,o={};Object.keys(s).forEach(function(k){o[k]=s[k].close});return o}
/* barang yang masih di jalan / menunggu BTB */
function onRoad(scope){var m={};docs().forEach(function(d){if(d.void||d.scope!==scope||d.jenis!=='PENJUALAN'||!d.muat||d.btb)return;d.lines.forEach(function(l){merge(m,lineDeltas(d.scope,l,1))})});return m}
function inbound(scope){var m={};docs().forEach(function(d){if(d.void||d.scope!==scope||d.arah!=='MASUK'||d.btb)return;d.lines.forEach(function(l){merge(m,lineDeltas(d.scope,l,1))})});return m}
/* ritase = 1 dokumen Penjualan yang BTB-nya sudah selesai */
function ritaseDocs(date,scope){return docs().filter(function(d){return!d.void&&d.jenis==='PENJUALAN'&&d.btb&&d.btb.date===date&&(!scope||d.scope===scope)})}
function ritase(date,scope){return ritaseDocs(date,scope).length}
function closingToday(){var t=today();return DB.get('closings').filter(function(c){return c.date===t}).pop()||null}
/* terjual per dokumen penjualan (setelah BTB) */
function sold(d){if(d.jenis!=='PENJUALAN'||!d.btb)return null;var out=[];
 d.lines.forEach(function(l){var b=d.btb.lines.find(function(x){return x.k===l.k})||{};
  if(isGal(l))out.push({k:l.k,keluar:n(l.isi),sisa:n(b.isi),terjual:n(l.isi)-n(b.isi),kosong:n(b.ksg)});else out.push({k:l.k,keluar:n(l.qty),sisa:n(b.qty),terjual:n(l.qty)-n(b.qty),kosong:0})});return out}
return{isSupIn:isSupIn,needsOut:needsOut,outTxt:outTxt,GF:GF,n:n,BR:BR,today:today,shiftNow:shiftNow,items:items,name:name,spsName:spsName,spsProducts:spsProducts,prods:prods,prod:prod,unitOf:unitOf,GROUPS:GROUPS,prodList:prodList,isGal:isGal,spsKeys:spsKeys,addDays:addDays,nextRit:nextRit,docs:docs,byId:byId,lineDeltas:lineDeltas,moves:moves,status:status,isOpen:isOpen,docDiff:docDiff,linesTxt:linesTxt,openings:openings,savedOpening:savedOpening,openingFor:openingFor,saldoDay:saldoDay,saldoNow:saldoNow,onRoad:onRoad,inbound:inbound,ritase:ritase,ritaseDocs:ritaseDocs,closingToday:closingToday,sold:sold}})();

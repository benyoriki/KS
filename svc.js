/* Service layer: SEMUA penulisan data lewat sini. Setiap fungsi memeriksa hak akses (Perm.require) dan validasi,
   sehingga pembatasan role berlaku di JavaScript, bukan hanya di tampilan menu.
   Alur V3: Admin input BKB/Supplier/Mutasi → Checker "Selesai Muat" → (driver pulang) Checker input BTB → Admin dapat notifikasi. */
var Svc=(function(){
var N=Calc.n,me=function(){return Auth.user()};
function fail(m){throw new Error(m)}
function isInt(v){return N(v)>=0&&Math.floor(N(v))===N(v)}
function pad(x,l){return String(x).padStart(l||2,'0')}
function ctx(){var d=new Date();return{ts:d.toISOString(),date:Calc.today(),time:pad(d.getHours())+':'+pad(d.getMinutes()),by:me().username,shift:Calc.shiftNow()}}
function spsName(id){return Calc.spsName(id)}
var JENIS={PENJUALAN:'Penjualan',SUPPLIER:'Supplier',MUTASI:'Mutasi'};
var COMBO={PENJUALAN:['KELUAR'],SUPPLIER:['MASUK','KELUAR'],MUTASI:['MASUK','KELUAR']};
function checkerRole(scope){return scope==='GALON'?'CHECKER_GALON':'CHECKER_SPS'}
function nextNo(prefix,date,list){var ymd=date.slice(2).replace(/-/g,''),c=list.filter(function(x){return x&&x.no&&x.no.indexOf(prefix+'-'+ymd)===0}).length+1;return prefix+'-'+ymd+'-'+pad(c,3)}
/* ---------- notifikasi ---------- */
function notify(role,type,text,docId){var c=ctx();DB.add('notifs',{ts:c.ts,date:c.date,time:c.time,to:role,type:type,text:text,docId:docId||'',read:false,from:c.by})}
function readNotifs(role,ids){Perm.require('notif');var a=DB.get('notifs'),ch=false;a.forEach(function(x){if(x.to===role&&!x.read&&(!ids||ids.indexOf(x.id)>=0)){x.read=true;ch=true}});if(ch)DB.set('notifs',a)}
/* ---------- Admin: dokumen ---------- */
function normLines(scope,jenis,raw,arah){var out=[],seen={},supIn=jenis==='SUPPLIER'&&arah==='MASUK';
 (raw||[]).forEach(function(l){
  if(Calc.isGal(l)){var isi=N(l.isi),ksg=jenis==='PENJUALAN'?0:N(l.ksg),tI=0,tK=0;if(supIn){tI=N(l.tIsi);tK=N(l.tKsg);ksg=0}
   if(!isInt(isi)||!isInt(ksg)||!isInt(tI)||!isInt(tK))fail('Qty harus bilangan bulat ≥ 0');if(!isi&&!ksg&&!tI&&!tK)return;if(scope!=='GALON')fail('Galon hanya untuk dokumen Galon');
   if(seen[l.k]){seen[l.k].isi+=isi;seen[l.k].ksg+=ksg;if(supIn){seen[l.k].tIsi+=tI;seen[l.k].tKsg+=tK}return}var o={k:l.k,isi:isi,ksg:ksg};if(supIn){o.tIsi=tI;o.tKsg=tK}seen[l.k]=o;out.push(o)}
  else{if(!l.k)return;var p=Calc.prod(l.k);if(!p||p.scope!==scope)fail('Produk '+l.k+' tidak valid untuk dokumen '+(scope==='GALON'?'Galon':'SPS'));if((p.brand==='PALLET'||p.brand==='JUGRAK')&&jenis!=='SUPPLIER')fail(p.nama+' hanya dapat diinput lewat Supplier');
   var q=N(l.qty);if(!isInt(q))fail('Qty harus bilangan bulat ≥ 0');if(!q)return;if(seen[l.k]){seen[l.k].qty+=q;return}var o2={k:String(l.k),qty:q};seen[l.k]=o2;out.push(o2)}});return out}
function addDoc(d){Perm.require('doc.add');
 if(['GALON','SPS'].indexOf(d.scope)<0)fail('Jenis barang harus Galon atau SPS');
 if(!COMBO[d.jenis])fail('Jenis dokumen tidak valid');if(COMBO[d.jenis].indexOf(d.arah)<0)fail('Arah tidak valid untuk '+JENIS[d.jenis]);
 var driver=String(d.driver||'').trim(),pihak=String(d.pihak||'').trim();
 if(!driver)fail('Nama driver wajib diisi');if(pihak.length<2)fail((d.arah==='KELUAR'?'Tujuan':'Asal')+' wajib diisi');
 var lines=normLines(d.scope,d.jenis,d.lines,d.arah);if(!lines.length)fail('Isi minimal satu qty barang');
 var direct=d.jenis==='MUTASI'&&d.arah==='MASUK'&&!!d.direct,src=null;
 if(d.fromMut){if(d.jenis!=='PENJUALAN')fail('Sumber mutasi hanya untuk BKB Penjualan');src=Calc.byId(d.fromMut);if(!src||src.void||!src.direct)fail('Mutasi sumber tidak valid');if(src.usedBy)fail('Mutasi '+src.no+' sudah dipakai di BKB lain');if(src.scope!==d.scope)fail('Jenis barang mutasi berbeda')}
 if(d.arah==='KELUAR'){var cur=Calc.saldoNow(),need={};lines.forEach(function(l){var x=Calc.lineDeltas(d.scope,l,1);Object.keys(x).forEach(function(k){need[k]=(need[k]||0)+x[k]})});
  Object.keys(need).forEach(function(k){if(need[k]>N(cur[k]))fail('Stock '+Calc.name(k)+' tidak cukup: diminta '+need[k].toLocaleString('id-ID')+', tersedia '+N(cur[k]).toLocaleString('id-ID')+(Calc.openingFor(Calc.today()).none?' (saldo awal belum diisi)':''))})}
 if(d.jenis==='PENJUALAN'&&!String(d.noDok||'').trim())fail('Nomor PB wajib diisi');
 var kd=masterKode(d.scope,driver),pk=pabrikKode(pihak);
 var c=ctx(),prefix=d.arah==='KELUAR'?'BKB':'SJM';
 var doc={scope:d.scope,jenis:d.jenis,arah:d.arah,driver:driver,rit:d.jenis==='PENJUALAN'?Calc.nextRit(driver,c.date):0,pihak:pihak,noDok:String(d.noDok||'').trim(),ket:String(d.ket||'').trim(),lines:lines,flow:(d.jenis==='SUPPLIER'&&d.arah==='MASUK')?2:1,
  no:nextNo(prefix,c.date,Calc.docs()),ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,muat:null,btb:null,void:false};
 if(kd)doc.driverKode=kd;if(pk&&d.jenis==='SUPPLIER')doc.pihakKode=pk;
 if(direct){doc.direct=true;doc.btb={no:nextNo('BTB',c.date,Calc.docs().map(function(x){return x.btb||null}).filter(Boolean)),ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,lines:JSON.parse(JSON.stringify(lines)),ket:'BTB oleh Admin — barang langsung dijual (tanpa masuk gudang)',auto:true}}
 if(src){doc.fromMut=src.id;doc.muat={ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,ket:'Barang dari mutasi '+src.no+' (sudah di mobil driver)',auto:true}}
 DB.add('docs',doc);if(src)DB.upd('docs',src.id,{usedBy:doc.id});DB.log('DOK '+doc.no,JSON.stringify({jenis:doc.jenis,arah:doc.arah,driver:driver,pihak:pihak,lines:lines}));
 var who=d.arah==='KELUAR'?'BKB baru'+(doc.rit?' (Rit '+doc.rit+')':'')+': Driver '+driver+' → '+pihak+' · '+Calc.linesTxt(d.scope,lines)+'. Silakan cek & muat.':(doc.jenis==='SUPPLIER'?'Supplier masuk: ':'Barang masuk: ')+pihak+' → Depo (Driver '+driver+') · '+Calc.linesTxt(d.scope,lines)+'. Silakan cek fisik barang.';
 if(src)who='BKB baru'+(doc.rit?' (Rit '+doc.rit+')':'')+': Driver '+driver+' → '+pihak+' · '+Calc.linesTxt(d.scope,lines)+'. Barang dari mutasi '+src.no+' (sudah di mobil driver) — tidak perlu muat. Tunggu BTB saat driver pulang.';
 if(!direct)notify(checkerRole(d.scope),d.arah==='KELUAR'?'BKB_BARU':'MASUK_BARU',who,doc.id);
 return doc}
function masterKode(scope,nama){var r=DB.get('drivers').concat(DB.get('sales')).find(function(x){return x.aktif&&String(x.nama).toUpperCase()===String(nama).toUpperCase()&&(!x.jenis||x.jenis===scope)});return r&&r.kode?r.kode:''}
function pabrikKode(nama){var r=DB.get('pabrik').find(function(x){return String(x.nama).toUpperCase()===String(nama).toUpperCase()});return r?r.kode:''}
/* Impor kode dari teks hasil salin tabel (website UangRitase atau Excel). target: driver_galon | driver_sps | sales | pabrik */
function parseCodes(target,text){var out=[];String(text||'').split(/\r?\n/).forEach(function(raw){var ln=raw.replace(/^\s*\d+[.)]\s+/,'').trim();if(!ln||/^(kode|nama|no\b)/i.test(ln))return;var kode,nama,m;
 if(target==='pabrik'){var p=ln.split(/\t|\s{2,}|\s*[|;,]\s*/).filter(Boolean);if(p.length<2){m=/^(\S+)\s+(.+)$/.exec(ln);if(!m)return;p=[m[1],m[2]]}kode=p[0].toUpperCase();nama=p.slice(1).join(' ').trim()}
 else{m=/(\d{2,4}-[A-Za-z]\d+)/.exec(ln);if(!m)return;kode=m[1].toUpperCase();nama=ln.replace(m[1],'').replace(/[\t|;,]+/g,' ').replace(/\s{2,}/g,' ').trim()}
 if(kode&&nama)out.push({kode:kode,nama:nama.toUpperCase()===nama?nama:nama})});return out}
function importCodes(target,text){Perm.require('master.edit');var rows=parseCodes(target,text);if(!rows.length)fail('Tidak ada baris yang terbaca. Format: "281-R003 ABDUL ROHIM" atau "KODE [tab] NAMA".');
 var key=target==='pabrik'?'pabrik':target==='sales'?'sales':'drivers',jenis=target==='driver_sps'?'SPS':target==='driver_galon'?'GALON':'',cur=DB.get(key),add=0,upd=0;
 rows.forEach(function(r){var ex=cur.find(function(x){return String(x.kode||'').toUpperCase()===r.kode&&(key!=='drivers'||x.jenis===jenis)});
  if(ex){if(ex.nama!==r.nama||!ex.aktif){DB.upd(key,ex.id,{nama:r.nama,aktif:true});upd++}}
  else{var o={kode:r.kode,nama:r.nama,aktif:true};if(key==='drivers'){o.idDriver=r.kode;o.jenis=jenis}if(key==='sales')o.idSales=r.kode;DB.add(key,o);add++}});
 DB.log('IMPOR KODE',target+' +'+add+' ~'+upd);return{add:add,upd:upd,total:rows.length}}
function cancelDoc(id,reason){Perm.require('doc.cancel');var d=Calc.byId(id);if(!d)fail('Dokumen tidak ditemukan');if(d.void)fail('Dokumen sudah dibatalkan');
 if(String(reason||'').trim().length<3)fail('Alasan pembatalan wajib diisi');
 if(Perm.role()==='ADMIN'&&(d.muat||d.btb))fail('Dokumen sudah diproses Checker — minta KA Gudang membatalkan');
 DB.upd('docs',id,{void:true,voidBy:me().username,voidTs:new Date().toISOString(),voidReason:String(reason).trim()});DB.log('BATAL DOK',d.no+' alasan: '+String(reason).trim());
 notify(checkerRole(d.scope),'DOK_BATAL','Dokumen '+d.no+' (Driver '+d.driver+' · '+d.pihak+') dibatalkan: '+String(reason).trim(),id);return true}
/* ---------- Checker: Selesai Muat & BTB ---------- */
function guard(d,act){if(!d)fail('Dokumen tidak ditemukan');Perm.require(act+'.'+d.scope.toLowerCase());if(!Perm.docOk(d))fail('Dokumen ini bukan bidang Anda');if(d.void)fail('Dokumen sudah dibatalkan')}
function setMuat(id,ket){var d=Calc.byId(id);guard(d,'muat');if(d.arah!=='KELUAR')fail('Selesai Muat hanya untuk BKB (barang keluar)');if(d.muat)fail('Dokumen ini sudah ditandai selesai muat');
 var c=ctx(),m={ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,ket:String(ket||'').trim()};DB.upd('docs',id,{muat:m});DB.log('SELESAI MUAT',d.no+' '+d.driver);
 notify('ADMIN','MUAT_SELESAI','Driver '+d.driver+(d.rit?' (Rit '+d.rit+')':'')+' selesai muat '+UI.dmy(c.date)+' '+c.time+' → '+d.pihak+' · '+Calc.linesTxt(d.scope,d.lines)+'. Driver berangkat.',id);return m}
/* baca hasil cek fisik Checker untuk dokumen d (dipakai BTB & permintaan revisi) */
function readLines(d,data,sup){var lines=[];
 d.lines.forEach(function(l){var r=(data.lines||[]).find(function(x){return x.k===l.k})||{};
  if(Calc.isGal(l)){var isi=N(r.isi),ksg=N(r.ksg),tI=N(r.tIsi),tK=N(r.tKsg);if(!isInt(isi)||!isInt(ksg)||!isInt(tI)||!isInt(tK))fail('Qty harus bilangan bulat ≥ 0');
   if(d.arah==='KELUAR'&&isi>N(l.isi))fail('Sisa '+Calc.BR[l.k]+' ('+isi+') melebihi BKB ('+N(l.isi)+')');lines.push(sup?{k:l.k,isi:isi,ksg:ksg,tIsi:tI,tKsg:tK}:{k:l.k,isi:isi,ksg:ksg})}
  else{var q=N(r.qty);if(!isInt(q))fail('Qty harus bilangan bulat ≥ 0');if(d.arah==='KELUAR'&&q>N(l.qty))fail('Retur '+l.k+' ('+q+') melebihi BKB ('+N(l.qty)+')');lines.push({k:l.k,qty:q})}});return lines}
function diffTxt(diff){return diff.map(function(x){return x.label+' '+(x.diff>0?'+':'')+x.diff}).join(', ')}
function addBtb(id,data){var d=Calc.byId(id);guard(d,'btb');data=data||{};
 if(d.btb)fail('BTB untuk dokumen ini sudah diinput');
 if(d.rev&&d.rev.open)fail('Dokumen sedang menunggu revisi Admin');
 if(d.arah==='KELUAR'){if(d.jenis!=='PENJUALAN')fail('BTB hanya untuk Penjualan (driver kembali dari toko) atau barang masuk');if(!d.muat)fail('Tandai "Selesai Muat" dulu sebelum input BTB')}
 var ket=String(data.ket||'').trim(),sup=Calc.isSupIn(d),lines=readLines(d,data,sup),
  tmp=Object.assign({},d,{btb:{lines:lines}}),diff=d.arah==='MASUK'?Calc.docDiff(tmp):[],bon=null;
 if(diff.length){
  if(sup){var sh=diff.filter(function(x){return x.diff<0});
   if(data.mode!=='bon')fail('Fisik tidak sesuai dokumen Admin — pilih Bon Putih, atau minta Admin revisi');
   if(!sh.length)fail('Tidak ada kekurangan fisik untuk Bon Putih — gunakan "Minta Admin revisi"');
   if(ket.length<3)fail('Isi catatan Bon Putih (min. 3 huruf)');
   bon={driver:d.driver,items:sh.map(function(x){return{label:x.label,qty:-x.diff}})}}
  else if(ket.length<3)fail('Ada selisih dengan dokumen Admin — isi keterangan (min. 3 huruf)')}
 var c=ctx(),all=Calc.docs().map(function(x){return x.btb||null}).filter(Boolean);
 var b={no:nextNo('BTB',c.date,all),ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,lines:lines,ket:ket};if(bon)b.bon=bon;
 DB.upd('docs',id,{btb:b});DB.log('BTB '+b.no,d.no+' '+JSON.stringify(lines)+(bon?' BON PUTIH '+JSON.stringify(bon.items):''));
 var full=Object.assign({},d,{btb:b});
 if(d.jenis==='PENJUALAN'){var s=Calc.sold(full).map(function(x){return(Calc.isGal(x)?Calc.BR[x.k]:x.k)+' terjual '+x.terjual.toLocaleString('id-ID')+(Calc.isGal(x)?' · sisa '+x.sisa.toLocaleString('id-ID')+' · kosong kembali '+x.kosong.toLocaleString('id-ID'):' · retur '+x.sisa.toLocaleString('id-ID'))}).join(' | ');
  notify('ADMIN','RITASE_SELESAI','Driver '+d.driver+' selesai dari '+d.pihak+' — Rit '+(d.rit||1)+' selesai. '+s+'. BTB '+b.no+' jam '+c.time+'.',id)}
 else if(bon)notify('ADMIN','BON_PUTIH','BON PUTIH '+d.no+': Driver '+d.driver+' ('+d.pihak+') harus bayar kekurangan — '+bon.items.map(function(x){return x.label+' '+x.qty}).join(', ')+'. Catatan Checker: '+ket,id);
 else notify('ADMIN','BTB_MASUK','BTB '+b.no+': '+d.pihak+' → Depo (Driver '+d.driver+') diterima '+Calc.linesTxt(d.scope,lines)+(diff.length?' — ADA SELISIH ('+diffTxt(diff)+')':' — fisik sesuai')+'.'+(Calc.needsOut(d)?' Menunggu Checker input barang keluar.':''),id);
 return b}
/* Checker menolak fisik: dokumen kembali ke Admin untuk direvisi (BTB belum tersimpan, stock belum berubah) */
function requestRevision(id,data){var d=Calc.byId(id);guard(d,'btb');data=data||{};
 if(!Calc.isSupIn(d))fail('Permintaan revisi hanya untuk Supplier masuk');if(d.btb)fail('BTB sudah diinput');if(d.rev&&d.rev.open)fail('Dokumen sudah menunggu revisi Admin');
 var ket=String(data.ket||'').trim(),lines=readLines(d,data,true),diff=Calc.docDiff(Object.assign({},d,{btb:{lines:lines}}));
 if(!diff.length)fail('Fisik sudah sesuai dokumen — langsung simpan BTB');if(ket.length<3)fail('Isi catatan untuk Admin (min. 3 huruf)');
 var c=ctx();DB.upd('docs',id,{rev:{open:true,fisik:lines,ket:ket,ts:c.ts,date:c.date,time:c.time,by:c.by}});DB.log('MINTA REVISI',d.no+' '+diffTxt(diff));
 notify('ADMIN','REVISI_MINTA','Fisik tidak sesuai — '+d.no+' (Driver '+d.driver+' · '+d.pihak+'): '+diffTxt(diff)+'. Catatan: '+ket+'. Mohon revisi dokumen.',id);return true}
/* Admin merevisi dokumen sesuai hasil cek fisik */
function reviseDoc(id,raw){Perm.require('doc.revise');var d=Calc.byId(id);if(!d)fail('Dokumen tidak ditemukan');if(d.void)fail('Dokumen sudah dibatalkan');if(!d.rev||!d.rev.open)fail('Dokumen tidak sedang menunggu revisi');
 var lines=normLines(d.scope,d.jenis,raw,d.arah);if(!lines.length)fail('Isi minimal satu qty barang');var c=ctx();
 DB.upd('docs',id,{lines:lines,rev:Object.assign({},d.rev,{open:false,doneBy:c.by,doneTs:c.ts,doneDate:c.date,doneTime:c.time,old:d.lines})});
 DB.log('REVISI DOK',d.no+' dari '+JSON.stringify(d.lines)+' menjadi '+JSON.stringify(lines));
 notify(checkerRole(d.scope),'REVISI_SELESAI','Admin sudah merevisi '+d.no+' (Driver '+d.driver+') → '+Calc.linesTxt(d.scope,lines)+'. Silakan cek fisik & input BTB.',id);return true}
/* Checker: barang keluar ke pabrik setelah BTB (galon: kosong + RB ; SPS: pallet + pabrik) */
function addOut(id,data){var d=Calc.byId(id);guard(d,'out');data=data||{};
 if(!Calc.needsOut(d))fail('Dokumen ini tidak memakai input barang keluar');if(!d.btb)fail('Selesaikan cek fisik (BTB) dulu');if(d.out)fail('Barang keluar sudah diinput');
 var lines=[],pabrik=String(data.pabrik||d.pihak||'').trim(),need={};
 (data.lines||[]).forEach(function(r){
  if(d.scope==='GALON'){if(!Calc.isGal(r))return;var ksg=N(r.ksg),rb=N(r.rb);if(!isInt(ksg)||!isInt(rb))fail('Qty harus bilangan bulat ≥ 0');if(!ksg&&!rb)return;
   lines.push({k:r.k,isi:rb,ksg:ksg});need[r.k+'_KSG']=(need[r.k+'_KSG']||0)+ksg;need[r.k+'_ISI']=(need[r.k+'_ISI']||0)+rb}
  else{if(!r.k)return;var p=Calc.prod(r.k);if(!p||p.brand!=='PALLET')fail('Barang keluar SPS hanya Pallet');var q=N(r.qty);if(!isInt(q))fail('Qty harus bilangan bulat ≥ 0');if(!q)return;
   var ex=lines.find(function(x){return x.k===r.k});if(ex)ex.qty+=q;else lines.push({k:String(r.k),qty:q});need['SPS_'+r.k]=(need['SPS_'+r.k]||0)+q}});
 if(d.scope==='SPS'&&lines.length&&pabrik.length<2)fail('Pabrik tujuan wajib diisi');
 var cur=Calc.saldoNow();Object.keys(need).forEach(function(k){if(need[k]>N(cur[k]))fail('Stock '+Calc.name(k)+' tidak cukup: keluar '+need[k].toLocaleString('id-ID')+', tersedia '+N(cur[k]).toLocaleString('id-ID'))});
 var c=ctx(),o={ts:c.ts,date:c.date,time:c.time,by:c.by,shift:c.shift,lines:lines,pabrik:pabrik,ket:String(data.ket||'').trim()};
 DB.upd('docs',id,{out:o});DB.log('BARANG KELUAR',d.no+' '+JSON.stringify(lines));var full=Object.assign({},d,{out:o});
 notify('ADMIN','KELUAR_PABRIK','Barang keluar ke '+(pabrik||d.pihak)+' — '+d.no+' (Driver '+d.driver+'): '+Calc.outTxt(full)+'. Dokumen selesai.',id);return o}
/* Koreksi resmi KA Gudang: reset Muat / BTB (data lama tetap tercatat di audit log) */
function resetStep(id,what,reason){Perm.require('doc.reset');var d=Calc.byId(id);if(!d)fail('Dokumen tidak ditemukan');if(String(reason||'').trim().length<3)fail('Alasan koreksi wajib diisi');
 if(what==='out'){if(!d.out)fail('Barang keluar belum ada');DB.log('RESET KELUAR',d.no+' '+JSON.stringify(d.out)+' alasan: '+reason.trim());DB.upd('docs',id,{out:null})}
 else if(what==='btb'){if(d.out)fail('Reset barang keluar dulu');if(!d.btb)fail('BTB belum ada');DB.log('RESET BTB',d.no+' '+JSON.stringify(d.btb)+' alasan: '+reason.trim());DB.upd('docs',id,{btb:null})}
 else if(what==='muat'){if(!d.muat)fail('Belum ada tanda Selesai Muat');if(d.btb)fail('Reset BTB dulu');DB.log('RESET MUAT',d.no+' '+JSON.stringify(d.muat)+' alasan: '+reason.trim());DB.upd('docs',id,{muat:null})}
 else fail('Langkah tidak dikenal');
 notify(checkerRole(d.scope),'DOK_RESET','KA Gudang mereset '+(what==='btb'?'BTB':what==='out'?'Barang Keluar':'Selesai Muat')+' dokumen '+d.no+': '+reason.trim(),id);return true}
/* ---------- Saldo awal harian (manual, bisa diubah) ---------- */
function setOpening(date,items){Perm.require('opening.set');if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))fail('Tanggal tidak valid');
 var valid=Calc.items().map(function(i){return i[0]}),it={};
 Object.keys(items||{}).forEach(function(k){if(valid.indexOf(k)<0)return;var v=N(items[k]);if(!isInt(v))fail('Saldo '+Calc.name(k)+' harus bilangan bulat ≥ 0');it[k]=v});
 var a=DB.get('openings'),i=a.findIndex(function(o){return o.date===date}),prev=i>=0?a[i]:null,rec={id:prev?prev.id:DB.uid(),date:date,items:it,by:me().username,ts:new Date().toISOString(),rev:(prev&&prev.rev?prev.rev:0)+(prev?1:0)};
 if(i>=0)a[i]=rec;else a.push(rec);DB.set('openings',a);DB.log(prev?'UBAH SALDO AWAL':'SALDO AWAL',date+' '+JSON.stringify(it)+(prev?' (sebelumnya '+JSON.stringify(prev.items)+')':''));return rec}
/* ---------- Closing (snapshot saja; tidak mengubah saldo) ---------- */
function doClose(shift,depo){Perm.require('closing');var d=Calc.today(),s=Calc.saldoDay(d).items,snap={};Object.keys(s).forEach(function(k){snap[k]=s[k].close});
 var open=Calc.docs().filter(function(x){return!x.void&&Calc.isOpen(x)}).length,c={ts:new Date().toISOString(),date:d,shift:shift,depo:depo,by:me().username,snap:snap,ritase:Calc.ritase(d),openDocs:open};
 DB.add('closings',c);DB.log('CLOSING',shift+' · dokumen belum selesai '+open);return c}
/* ---------- Master & data ---------- */
function masterAdd(key,v){Perm.require('master.edit');var rows=DB.get(key);
if(key==='users'){if(!Perm.ROLES[v.role])throw new Error('Role harus salah satu: '+Object.keys(Perm.ROLES).join(', '));if(rows.some(function(u){return u.username===v.username}))throw new Error('Username sudah ada')}
if(key==='pabrik'){v.kode=String(v.kode).trim().toUpperCase();if(rows.some(function(p){return p.kode===v.kode}))throw new Error('Kode pabrik sudah ada')}
if(key==='drivers'){v.jenis=String(v.jenis||'').toUpperCase();if(['GALON','SPS'].indexOf(v.jenis)<0)throw new Error('Bidang harus GALON atau SPS');v.kode=String(v.kode).trim().toUpperCase();v.idDriver=v.kode;if(rows.some(function(p){return p.kode===v.kode&&p.jenis===v.jenis}))throw new Error('Kode driver sudah ada')}
if(key==='sales'){v.kode=String(v.kode).trim().toUpperCase();v.idSales=v.kode}
if(key==='products'){if(rows.some(function(p){return String(p.idDms)===String(v.idDms)}))throw new Error('ID Produk sudah ada');v.scope=String(v.scope).toUpperCase();v.brand=String(v.brand).toUpperCase();if(['SPS','GALON'].indexOf(v.scope)<0)throw new Error('Scope harus SPS atau GALON');if(['AQUA','VIT','MIZONE','SGM','LAIN','PALLET','JUGRAK'].indexOf(v.brand)<0)throw new Error('Grup harus salah satu: AQUA, VIT, MIZONE, SGM, LAIN, PALLET, JUGRAK');v.kategori=v.scope;v.merek=v.brand}
v.aktif=true;DB.add(key,v);DB.log('MASTER ADD',key)}
function masterToggle(key,id){Perm.require('master.edit');var o=DB.get(key).find(function(x){return x.id===id});if(!o)return;if(key==='users'&&o.username===me().username)throw new Error('Tidak dapat menonaktifkan akun sendiri');DB.upd(key,id,{aktif:!o.aktif});DB.log('MASTER TOGGLE',key+' '+id)}
function backup(){Perm.require('backup');DB.log('BACKUP');return JSON.stringify(DB.exportAll(),null,1)}
function importJson(text){Perm.require('import');DB.importAll(JSON.parse(text));DB.log('IMPORT')}
function reset(){Perm.require('reset');DB.reset()}
/* ---------- RESET DATA (fase uji coba): titik pulih otomatis, reset terpilih/per tanggal, pulihkan ---------- */
var SNAP='ks_snap_',TRX=['closings','reconciliations','dms_snapshots','stock_balances','admin_transactions','checker_transactions'];
function snapKeys(){var o=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(SNAP)===0)o.push(k)}return o.sort().reverse()}
function snapList(){return snapKeys().map(function(k){try{var raw=localStorage.getItem(k),o=JSON.parse(raw);return{key:k,at:o.at,label:o.label,by:o.by,docs:(o.data.docs||[]).length,notifs:(o.data.notifs||[]).length,kb:Math.round(raw.length/1024)}}catch(e){return null}}).filter(Boolean)}
function dataStats(){var g=function(k){return DB.get(k).length};return{docs:g('docs'),notifs:g('notifs'),openings:g('openings'),closings:g('closings'),audit:g('audit_logs'),drivers:DB.get('drivers').filter(function(x){return x.aktif}).length,pabrik:DB.get('pabrik').filter(function(x){return x.aktif}).length,snaps:snapKeys().length}}
function takeSnapshot(label){Perm.require('data.reset');var s=JSON.stringify({at:new Date().toISOString(),label:label||'Manual',by:ctx().by,data:DB.exportAll()}),key=SNAP+Date.now();
 try{localStorage.setItem(key,s)}catch(e){fail('Memori HP penuh. Unduh cadangan, lalu hapus titik pulih lama.')}
 snapKeys().slice(6).forEach(function(k){localStorage.removeItem(k)});return key}
function resetData(o){Perm.require('data.reset');o=o||{};
 if(String(o.confirm||'').trim().toUpperCase()!=='RESET')fail('Ketik RESET untuk konfirmasi');
 var why=String(o.reason||'').trim();if(why.length<3)fail('Isi alasan reset (min. 3 huruf)');
 if(!(o.all||o.docs||o.notifs||o.openings||o.audit||o.master))fail('Pilih data yang akan direset');
 var dt=o.date||'';if(dt&&!/^\d{4}-\d{2}-\d{2}$/.test(dt))fail('Tanggal tidak valid');
 var snap=takeSnapshot('Sebelum reset: '+why),sum=[];
 if(o.all){DB.reset();DB.init();sum.push('RESET PENUH')}
 else{
  if(o.docs){var d0=DB.get('docs').length;if(dt){DB.set('docs',DB.get('docs').filter(function(d){return d.date!==dt}));DB.set('closings',DB.get('closings').filter(function(x){return x.date!==dt}))}else{DB.set('docs',[]);TRX.forEach(function(k){DB.set(k,[])})}sum.push('dokumen '+(d0-DB.get('docs').length))}
  if(o.notifs){var n0=DB.get('notifs').length;DB.set('notifs',dt?DB.get('notifs').filter(function(x){return x.date!==dt}):[]);sum.push('notifikasi '+(n0-DB.get('notifs').length))}
  if(o.openings){var p0=DB.get('openings').length;DB.set('openings',dt?DB.get('openings').filter(function(x){return x.date!==dt}):[]);sum.push('saldo '+(p0-DB.get('openings').length))}
  if(o.audit){DB.set('audit_logs',[]);sum.push('audit log')}
  if(o.master){DB.applyRefCodes(true);sum.push('master kode')}}
 DB.log('RESET DATA',sum.join(', ')+(dt?' (tanggal '+dt+')':'')+' — '+why);return{snap:snap,summary:sum}}
function restoreSnapshot(key){Perm.require('data.reset');var raw=localStorage.getItem(key);if(!raw)fail('Titik pulih tidak ditemukan');var o;try{o=JSON.parse(raw)}catch(e){fail('Titik pulih rusak')}
 takeSnapshot('Sebelum pemulihan');DB.importAll(o.data);DB.init();DB.log('PEMULIHAN DATA',(o.label||'')+' '+(o.at||''));return true}
function deleteSnapshot(key){Perm.require('data.reset');if(key.indexOf(SNAP)!==0)fail('Kunci tidak valid');localStorage.removeItem(key)}
function importFileData(obj){Perm.require('data.reset');takeSnapshot('Sebelum impor file');DB.importAll(obj);DB.init();DB.log('IMPOR CADANGAN','dari file');return true}
return{dataStats:dataStats,snapList:snapList,takeSnapshot:takeSnapshot,resetData:resetData,restoreSnapshot:restoreSnapshot,deleteSnapshot:deleteSnapshot,importFileData:importFileData,importCodes:importCodes,parseCodes:parseCodes,addDoc:addDoc,cancelDoc:cancelDoc,setMuat:setMuat,addBtb:addBtb,requestRevision:requestRevision,reviseDoc:reviseDoc,addOut:addOut,resetStep:resetStep,setOpening:setOpening,doClose:doClose,notify:notify,readNotifs:readNotifs,masterAdd:masterAdd,masterToggle:masterToggle,backup:backup,importJson:importJson,reset:reset,spsName:spsName,JENIS:JENIS}})();

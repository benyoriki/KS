/* Form (halaman penuh): Admin input BKB / Supplier / Mutasi / Saldo Awal, dan Checker input BTB.
   Semua penyimpanan lewat Svc (cek role + validasi).
   V3.1: produk berupa PILIHAN (grup → produk dari Excel KODE DEPO); "Tambah produk lain" (Supplier: Jugrak / Pallet); Rit otomatis. */
var Forms=(function(){
var fmt=UI.fmt,esc=UI.esc,N=Calc.n,BR=Calc.BR;
function numIn(name,val,ph){return'<input name="'+name+'" type="number" inputmode="numeric" min="0" step="1" placeholder="'+(ph||'0')+'" value="'+(val===''||val==null?'':val)+'">'}
function seg(name,label,opts,cur,cls){return'<div class="f full"><label>'+label+'</label><div class="seg '+(cls||'')+'" data-seg="'+name+'">'+opts.map(function(o){return'<button type="button" class="sg-'+(o[2]||'x')+(o[0]===cur?' on':'')+'" data-v="'+esc(o[0])+'">'+esc(o[1])+'</button>'}).join('')+'</div></div>'}
function pihakList(){var s={'Pabrik Aqua':1};DB.get('depos').filter(function(d){return d.aktif}).forEach(function(d){s[d.nama]=1});Calc.docs().forEach(function(d){if(d.pihak)s[d.pihak]=1});return Object.keys(s)}
/* opsi Kode Driver / Sales (sesuai bidang) dan Kode Pabrik (Master Data) */
function driverOpts(scope,mode){var seen={},out=[];DB.get('drivers').concat(DB.get('sales')).filter(function(x){return x.aktif&&(!x.jenis||x.jenis===scope)}).sort(function(a,b){return String(a.nama).localeCompare(String(b.nama))}).forEach(function(r){var k=String(r.nama).toUpperCase();if(seen[k])return;seen[k]=1;out.push([r.nama,(mode==='kode'&&r.kode)?r.kode+' \u2013 '+r.nama:r.nama])});return out}
function pabrikOpts(){var seen={},out=[];DB.get('pabrik').filter(function(x){return x.aktif}).forEach(function(x){seen[x.nama]=1;out.push([x.nama,x.kode+' \u2013 '+x.nama])});Calc.docs().forEach(function(d){[d.jenis==='SUPPLIER'?d.pihak:'',d.out&&d.out.pabrik].forEach(function(n){if(n&&!seen[n]){seen[n]=1;out.push([n,n])}})});return out}
/* pilihan Kode Pabrik: daftar + opsi ketik sendiri. selName/txtName = nama field */
function pbField(label,val,other,selName,txtName,ph){var L=pabrikOpts(),cur=other?'__other':(val||'');
 return'<div class="f"><label>'+label+' <i>*</i></label><select name="'+selName+'" class="psel" data-title="'+esc(label)+'"><option value="">\u2014 Pilih kode pabrik \u2014</option>'+L.map(function(x){return opt(x[0],x[1],cur)}).join('')+opt('__other','\u270e Lainnya (ketik sendiri)',cur)+'</select>'+(other?'<input class="pbtxt" name="'+txtName+'" value="'+esc(val||'')+'" placeholder="'+esc(ph||'Ketik kode & nama pabrik')+'" autofocus>':'')+'</div>'}
function errBox(){return'<div class="err" role="alert"></div>'}
function opt(v,l,cur){return'<option value="'+esc(v)+'"'+(String(cur)===String(v)?' selected':'')+'>'+esc(l)+'</option>'}
function prodOpts(scope,grp,cur){return'<option value="">— Pilih produk —</option>'+Calc.prodList(scope,grp).map(function(p){return opt(p.idDms,p.idDms+' – '+p.nama,cur)}).join('')}
function lineTitle(l){return Calc.isGal(l)?'Galon '+BR[l.k]:esc(l.k)+' – '+esc(Calc.spsName(l.k))}

/* ============ ADMIN: BKB / Supplier / Mutasi ============ */
var CFG={
 pen:{jenis:'PENJUALAN',t:'BKB/BTB Distribusi',ic:'cart',fix:'KELUAR',btn:'Simpan BKB & Kirim ke Checker',
  hint:'Barang keluar dari Depo ke toko. Setelah disimpan, Checker langsung dapat notifikasi untuk cek & muat. Saat driver pulang, Checker yang input BTB (sisa isi & botol kosong).',pl:function(){return'Nama Toko Tujuan'},ph:'Contoh: Toko ABC'},
 sup:{jenis:'SUPPLIER',t:'BKB/BTB Supplier',ic:'truck',arahs:[['MASUK','Masuk','in'],['KELUAR','Keluar','out']],btn:'Simpan & Kirim ke Checker',
  hint:'Masuk dari pabrik: isi galon, jugrak dan tolakan pabrik. Checker cek fisik (sesuai / Bon Putih / minta revisi), lalu Checker input barang keluar (kosong, RB atau pallet). Keluar ke pabrik: Checker tekan Selesai Muat.',pl:function(){return'Kode Pabrik'},ph:'Contoh: BTA \u2013 Nama pabrik',defP:''},
 mut:{jenis:'MUTASI',t:'BKB/BTB Mutasi Depo',ic:'swap',arahs:[['KELUAR','Keluar ke Depo/Toko','out'],['MASUK','Masuk dari Depo','in']],btn:'Simpan & Kirim ke Checker',
  hint:'Keluar ke Depo/Toko lain: Checker tekan "Selesai Muat". Masuk dari Depo/Toko lain: Checker input BTB setelah barang diterima.',pl:function(a){return a==='KELUAR'?'Depo / Toko Tujuan':'Depo / Toko Asal'},ph:'Contoh: LP SENTUL'}};
function docForm(host,key){var cfg=CFG[key],mut=cfg.jenis==='MUTASI',pen=cfg.jenis==='PENJUALAN',sup=cfg.jenis==='SUPPLIER';
 var st={scope:'GALON',arah:cfg.fix||cfg.arahs[0][0],driver:'',pihak:cfg.defP||'',other:false,noDok:'',ket:'',rows:[],direct:'Y',fromMut:''};
 function isDirect(){return mut&&st.arah==='MASUK'&&st.direct==='Y'}
 function unusedMut(){return Calc.docs().filter(function(d){return!d.void&&d.direct&&!d.usedBy&&d.scope===st.scope})}
 function drvOpts(){return driverOpts(st.scope,sup?'nama':'kode')}
 function btnText(){return isDirect()?'Simpan BTB Mutasi':(pen&&st.fromMut)?'Simpan BKB (Barang dari Mutasi)':cfg.btn}
 function hintText(){if(isDirect())return'Barang dari depo lain langsung dijual driver, tidak masuk gudang Parung. Admin yang input BTB mutasi di sini (stock langsung bertambah, Checker tidak perlu cek). Lanjutkan dengan BKB Penjualan untuk driver yang sama.';if(mut&&st.arah==='MASUK')return'Barang masuk ke gudang Parung: Checker input BTB setelah barang diterima.';if(pen&&st.fromMut)return'Barang sudah ada di mobil driver (dari mutasi). Status langsung Di Jalan, Checker tidak perlu muat. Checker input BTB saat driver pulang.';return cfg.hint}
 function supIn(){return sup&&st.arah==='MASUK'}
 function defRow(){return{g:st.scope==='GALON'?'AQ':'AQUA',k:'',isi:'',ksg:'',qty:'',tIsi:'',tKsg:''}}
 st.rows=[defRow()];
 function groups(){return Calc.GROUPS[st.scope].filter(function(g){return!g[2]||sup})}
 function payload(){return{scope:st.scope,jenis:cfg.jenis,arah:st.arah,driver:st.driver,pihak:st.pihak,noDok:st.noDok,ket:st.ket,
  direct:isDirect(),fromMut:st.fromMut||'',
  lines:st.rows.map(function(r){return(r.g==='AQ'||r.g==='VT')?{k:r.g,isi:N(r.isi),ksg:N(r.ksg),tIsi:N(r.tIsi),tKsg:N(r.tKsg)}:{k:r.k,qty:N(r.qty)}})}}
 function sum(){var el=host.querySelector('#sum');if(!el)return;if(st.arah!=='KELUAR'){el.innerHTML=isDirect()?'Stock bertambah <b>langsung</b> setelah BTB mutasi ini disimpan (tanpa cek Checker).':supIn()?'Stock bertambah setelah <b>Checker cek fisik &amp; simpan BTB</b> (jumlah fisik yang diterima, termasuk tolakan). Setelah itu Checker menginput barang keluar.':'Stock bertambah setelah <b>Checker input BTB</b> (sesuai jumlah fisik yang diterima).';return}
  var cur=Calc.saldoNow(),need={};payload().lines.forEach(function(l){if(!Calc.isGal(l)&&!l.k)return;var x=Calc.lineDeltas(st.scope,{k:l.k,isi:l.isi,ksg:(pen?0:l.ksg),qty:l.qty},1);Object.keys(x).forEach(function(k){need[k]=(need[k]||0)+x[k]})});
  var rows=Object.keys(need).map(function(k){var a=N(cur[k]),after=a-need[k];return'<div class="sl'+(after<0?' bad':'')+'"><span>'+esc(Calc.name(k))+'</span><span>'+fmt(a)+' → <b>'+fmt(after)+'</b>'+(after<0?' (kurang!)':'')+'</span></div>'});
  el.innerHTML=rows.length?'<div class="slh">Stock setelah BKB disimpan</div>'+rows.join(''):'Isi qty barang untuk melihat dampak ke stock.'}
 function tot(){host.querySelectorAll('[data-tt]').forEach(function(e){var r=st.rows[+e.dataset.tt];if(r)e.textContent=fmt(N(r.tIsi)+N(r.tKsg))})}
 function ritTxt(){var el=host.querySelector('#rit');if(!el)return;el.innerHTML=(pen&&st.driver)?'<span class="rit big">Rit '+Calc.nextRit(st.driver,Calc.today())+'</span> <span>ritase ke-'+Calc.nextRit(st.driver,Calc.today())+' <b>'+esc(st.driver)+'</b> hari ini (otomatis)</span>':''}
 function rowH(r,i){var gal=(r.g==='AQ'||r.g==='VT'),cls=gal?'lb-'+r.g.toLowerCase():'lb-b-'+r.g.toLowerCase(),unit=r.k?Calc.unitOf(r.k):'Karton';
  var gl=(groups().find(function(g){return g[0]===r.g})||[0,r.g])[1],h='<div class="lbox '+cls+'"><div class="lbh">'+((sup&&i===0)?'<div class="lbtitle">'+UI.ic(gal?'drop':'box')+'<b>'+esc(gl)+'</b></div>':'<select name="r_'+i+'_g" class="gsel psel" data-title="Pilih jenis produk" aria-label="Pilih jenis produk">'+groups().map(function(g){return opt(g[0],g[1],r.g)}).join('')+'</select>')+(st.rows.length>1?'<button type="button" class="btn s red rm" data-rm="'+i+'" aria-label="Hapus baris">'+UI.ic('x')+'</button>':'')+'</div>';
  if(gal&&supIn())h+='<div class="lbr one"><div><small>Isi dari pabrik (galon + air)</small>'+numIn('r_'+i+'_isi',r.isi)+'</div></div><div class="tolak"><div class="tl1"><b>Tolakan pabrik</b><span>galon dari Depo yang ditolak pabrik, dibawa balik ke Depo</span></div><div class="lbr"><div><small>Isi / air</small>'+numIn('r_'+i+'_tIsi',r.tIsi)+'</div><div><small>Kosong</small>'+numIn('r_'+i+'_tKsg',r.tKsg)+'</div></div><div class="ttot">Total tolakan <b data-tt="'+i+'">'+fmt(N(r.tIsi)+N(r.tKsg))+'</b> galon</div></div>';
  else if(gal)h+='<div class="lbr"><div><small>Isi (galon + air)'+(pen?' dibawa':'')+'</small>'+numIn('r_'+i+'_isi',r.isi)+'</div>'+(pen?'':'<div><small>Kosong (botol kosong)</small>'+numIn('r_'+i+'_ksg',r.ksg)+'</div>')+'</div>';
  else h+='<div class="lbr sp"><div class="gr2"><small>Pilih produk (kode – nama)</small><select name="r_'+i+'_k" class="psel" data-title="Pilih produk" aria-label="Pilih produk">'+prodOpts(st.scope,r.g,r.k)+'</select></div><div><small>Qty ('+esc(unit)+')</small>'+numIn('r_'+i+'_qty',r.qty)+'</div></div>';
  return h+'</div>'}
 function pihakH(){if(sup)return pbField('Kode Pabrik',st.pihak,st.other,'pihakSel','pihak',cfg.ph);
  return'<div class="f"><label>'+(isDirect()?'Depo Asal':cfg.pl(st.arah))+' <i>*</i></label><input name="pihak" list="dlp" value="'+esc(st.pihak)+'" placeholder="'+esc(cfg.ph)+'"><datalist id="dlp">'+pihakList().map(function(x){return'<option value="'+esc(x)+'">'}).join('')+'</datalist></div>'}
function driverH(){
  if(!pen)return'<div class="f full"><label>Nama Driver <i>*</i></label><input name="driver" value="'+esc(st.driver)+'" placeholder="Ketik nama driver" autocomplete="off" autocapitalize="characters" enterkeyhint="next"></div>';
  var L=drvOpts();if(st.driver&&!L.some(function(o){return o[0]===st.driver}))L.unshift([st.driver,st.driver]);
  return'<div class="f full"><label>Kode Driver / Kode Sales <i>*</i></label><select name="driver" class="psel" data-title="Pilih kode driver / sales"><option value="">\u2014 Pilih kode driver / sales \u2014</option>'+L.map(function(o){return opt(o[0],o[1],st.driver)}).join('')+'</select><div id="rit" class="ritline"></div></div>'}
 function jenisH(){if(!sup)return'';var main=groups().filter(function(g){return!g[2]});return'<div class="f full"><label>Jenis Produk <i>*</i></label><select name="jenisProd" class="psel" data-title="Pilih jenis produk">'+main.map(function(g){return opt(g[0],g[1],st.rows[0]&&st.rows[0].g)}).join('')+'</select></div>'}
 function shiftsH(){var cur=Calc.shiftNow().slice(0,7);return'<div class="f full"><div class="shifts">'+[['Shift 1','07:00 \u2013 15:00'],['Shift 2','15:00 \u2013 23:00'],['Shift 3','23:00 \u2013 07:00']].map(function(x){return'<span class="'+(cur===x[0]?'on':'')+'"><b>'+x[0]+'</b><small>'+x[1]+' WIB</small></span>'}).join('')+'</div></div>'}
 function mutH(){var h='';if(mut&&st.arah==='MASUK')h+=seg('direct','Barang ini',[['Y','Langsung dijual','in'],['N','Masuk gudang','x']],st.direct,'two');
  if(pen){var L=unusedMut();if(L.length)h+='<div class="f full"><label>Barang dari mutasi (opsional)</label><select name="fromMut" class="psel" data-title="Barang dari mutasi masuk"><option value="">\u2014 Ambil dari gudang Parung \u2014</option>'+L.map(function(d){return opt(d.id,d.no+' \u2013 '+d.driver+' \u00b7 '+Calc.linesTxt(d.scope,d.lines)+' dari '+d.pihak,st.fromMut)}).join('')+'</select></div>'}return h}
 function flowNote(){if(!supIn())return'';return'<div class="f full"><ol class="flowmini"><li><b>Admin</b> input masuk</li><li><b>Checker</b> cek fisik</li><li><b>Checker</b> input keluar</li></ol></div>'}
 function draw(){var h='<form class="fbox docf" novalidate autocomplete="off"><div class="fg">'+
  '<div class="f"><label>Tanggal (otomatis)</label><input value="'+UI.dmy(Calc.today())+'" readonly tabindex="-1"></div><div class="f"><label>Shift (otomatis)</label><input value="'+esc(Calc.shiftNow())+'" readonly tabindex="-1"></div>'+
  shiftsH()+seg('scope','Jenis Barang',[['GALON','Galon','x'],['SPS','Produk SPS','x']],st.scope,'two')+
  (cfg.arahs?seg('arah','Arah Barang',cfg.arahs,st.arah,'two'):'')+mutH()+jenisH()+
  '<div class="f full"><div class="note-box info">'+UI.ic('ok')+'<span>'+hintText()+'</span></div></div>'+flowNote()+
  '<div class="f full fsec"><span>1</span>Siapa &amp; ke mana</div>'+driverH()+
  pihakH()+
  '<div class="f"><label>'+(pen?'Input Nomor PB <i>*</i>':'No. Dokumen kertas (opsional)')+'</label><input name="noDok" value="'+esc(st.noDok)+'" placeholder="'+(pen?'Nomor PB':'No. SJ / BKB manual')+'" autocapitalize="characters">'+(pen?'<small class="fh">Tulis nomor PB sesuai dokumen.</small>':'')+'</div>'+
  '<div class="f full fsec"><span>2</span>Barang &amp; jumlah</div><div class="f full">'+(isDirect()||true?'':'')+'<label>Produk &amp; Qty <i>*</i></label><div class="lbs">'+st.rows.map(rowH).join('')+'<button type="button" class="more" data-add>'+UI.ic('plus')+'Tambah produk lain'+(sup?' (Jugrak / Pallet / lainnya)':'')+'</button></div></div>'+
  '<div class="f full"><label>Keterangan (opsional)</label><textarea name="ket" rows="2">'+esc(st.ket)+'</textarea></div><div class="f full"><div class="calc" id="sum"></div></div></div>'+errBox()+'<div class="row fa sticky"><button class="btn big2">'+btnText()+'</button></div></form>';
  host.innerHTML=h;UI.enhance(host);sum();ritTxt()}
 host.addEventListener('input',function(e){var t=e.target,nm=t.name||'',m;if(!nm||t.tagName==='SELECT')return;
  if((m=/^r_(\d+)_(isi|ksg|qty|tIsi|tKsg)$/.exec(nm))){st.rows[+m[1]][m[2]]=t.value;tot()}else st[nm]=t.value;sum()});
 host.addEventListener('change',function(e){var t=e.target,m;if(t.tagName!=='SELECT'||!t.name)return;
  if(t.name==='jenisProd'){st.rows[0]=Object.assign(defRow(),{g:t.value});draw();return}
  if(t.name==='fromMut'){st.fromMut=t.value;var src=Calc.byId(t.value);if(src){var mm=driverOpts(st.scope,'kode').find(function(o){return o[0].toUpperCase()===String(src.driver).toUpperCase()});st.driver=mm?mm[0]:src.driver;st.rows=src.lines.map(function(l){if(Calc.isGal(l))return Object.assign(defRow(),{g:l.k,isi:String(l.isi)});var p=Calc.prod(l.k);return Object.assign(defRow(),{g:p?p.brand:'LAIN',k:l.k,qty:String(l.qty)})})}draw();return}
  if(t.name==='driver'){st.driver=t.value;ritTxt();return}
  if(t.name==='pihakSel'){if(t.value==='__other'){st.other=true;st.pihak=''}else{st.other=false;st.pihak=t.value}draw();return}
  if((m=/^r_(\d+)_(g|k)$/.exec(t.name))){var r=st.rows[+m[1]];r[m[2]]=t.value;if(m[2]==='g'){r.k='';r.qty='';r.isi='';r.ksg='';r.tIsi='';r.tKsg=''}draw();return}
  st[t.name]=t.value;if(t.name==='driver')ritTxt()});
 host.addEventListener('click',function(e){var b=e.target.closest('[data-v]'),a=e.target.closest('[data-add]'),r=e.target.closest('[data-rm]');
  if(b&&b.parentNode.dataset.seg){var k=b.parentNode.dataset.seg;if(st[k]!==b.dataset.v){st[k]=b.dataset.v;if(k==='scope'){st.rows=[defRow()];st.driver='';st.fromMut=''}if(k==='arah'){st.pihak=cfg.defP||'';st.other=false}}draw();return}
  if(a){st.rows.push(defRow());draw();return}if(r){st.rows.splice(+r.dataset.rm,1);draw()}});
 host.addEventListener('submit',function(e){e.preventDefault();var er=host.querySelector('.err');
  try{var d=Svc.addDoc(payload());if(d.direct){UI.toast(d.no+' tersimpan \u00b7 stock bertambah \u00b7 lanjut buat BKB Penjualan');location.hash='#input/pen';return}UI.toast(d.no+(d.rit?' (Rit '+d.rit+')':'')+(d.fromMut?' tersimpan \u00b7 status Di Jalan':' tersimpan \u00b7 notifikasi terkirim ke '+(d.scope==='GALON'?'Checker Galon':'Checker SPS')));location.hash='#docs/'+H.scopeLow(d.scope)+'/'+d.date}catch(ex){er.textContent=ex.message;if(er.scrollIntoView)er.scrollIntoView({block:'center'})}});
 draw()}

/* ============ CHECKER: BTB (cek fisik) ============ */
function btbForm(host,d){var pen=d.arah==='KELUAR',sup=Calc.isSupIn(d),mode='bon',any=false;
 function nm(l,f){return'b_'+l.k+'_'+f}
 function ico(l){return Calc.isGal(l)?'drop':'box'}
 var FT=pen?{isi:['Sisa isi','tidak terjual, dibawa pulang'],ksg:['Botol kosong','kembali ke Depo']}:{isi:[sup?'Isi diterima':'Isi diterima','hasil cek fisik'],ksg:['Kosong diterima','hasil cek fisik'],tIsi:['Tolakan isi / air','dibawa balik pabrik'],tKsg:['Tolakan kosong','dibawa balik pabrik']};
 function flds(l){return pen?['isi','ksg']:(sup?['isi','tIsi','tKsg'].concat(N(l.ksg)?['ksg']:[]):['isi','ksg'])}
 var rows=d.lines.map(function(l){var gal=Calc.isGal(l),unit=gal?'galon':Calc.unitOf(l.k).toLowerCase(),cls=gal?'bl-'+l.k.toLowerCase():'bl-sps',h,fl=gal?flds(l):[];
  var ref=gal?(pen?'<span>BKB</span><b>'+fmt(l.isi)+'</b> isi':'<span>Dokumen</span><b>'+fmt(l.isi)+'</b> isi'+(N(l.tIsi)?' · tolakan <b>'+fmt(l.tIsi)+'</b> isi':'')+(N(l.tKsg)?' · tolakan <b>'+fmt(l.tKsg)+'</b> kosong':'')+(N(l.ksg)?' · <b>'+fmt(l.ksg)+'</b> kosong':'')):'<span>'+(pen?'BKB':'Dokumen')+'</span><b>'+fmt(l.qty)+'</b> '+esc(unit);
  h='<div class="bl '+cls+'"><div class="blh"><span class="bi">'+UI.ic(ico(l))+'</span><div class="bt"><b>'+lineTitle(l)+'</b><small class="bref">'+ref+'</small></div></div>';
  if(gal)h+='<div class="bgrid'+(fl.length>2?' three':'')+'">'+fl.map(function(f){return'<label class="bf"><span class="bl1">'+FT[f][0]+'</span><span class="bl2">'+FT[f][1]+'</span>'+numIn(nm(l,f))+'</label>'}).join('')+'</div>';
  else h+='<div class="bgrid one"><label class="bf"><span class="bl1">'+(pen?'Retur / sisa':'Qty diterima')+'</span><span class="bl2">'+(pen?'dibawa pulang':'hasil cek fisik')+' ('+esc(unit)+')</span>'+numIn(nm(l,'qty'))+'</label></div>';
  return h+'<div class="bres" data-res="'+l.k+'"></div></div>'}).join('');
 host.innerHTML='<form class="fbox docf btbf" novalidate autocomplete="off"><div class="btbsec"><span>'+(pen?'Hasil pemeriksaan fisik saat driver pulang':'Cek fisik — samakan dengan dokumen Admin')+'</span></div><div class="lbs">'+rows+'</div>'+
 (sup?'<div id="mm" class="mm"></div>':'')+
 '<div class="f"><label>Catatan <span id="kr"></span></label><textarea name="ket" rows="2" placeholder="Opsional (wajib jika ada selisih)"></textarea></div>'+errBox()+'<div class="row fa sticky"><button class="btn big2 go2" id="sbtn">'+UI.ic('check')+' Simpan BTB</button></div></form>';
 var fm=host.querySelector('form');
 function read(){return d.lines.map(function(l){var g=function(f){var e=fm.querySelector('[name="'+nm(l,f)+'"]');return e?N(e.value):0};return Calc.isGal(l)?{k:l.k,isi:g('isi'),ksg:g('ksg'),tIsi:g('tIsi'),tKsg:g('tKsg')}:{k:l.k,qty:g('qty')}})}
 function pill(c,t){return'<span class="bp bp-'+c+'">'+t+'</span>'}
 function panel(){var el=fm.querySelector('#mm'),b=fm.querySelector('#sbtn');if(!el)return;
  if(!any){el.innerHTML='<div class="mm-ok">'+UI.ic('ok')+'<span><b>Fisik sesuai dokumen Admin.</b> Simpan BTB, lalu input barang keluar (kosong / RB'+(d.scope==='SPS'?' / pallet':'')+').</span></div>';b.innerHTML=UI.ic('check')+' Simpan BTB — fisik sesuai';b.className='btn big2 go2';return}
  el.innerHTML='<div class="mm-bad"><div class="mm-t">'+UI.ic('alert')+'<span><b>Fisik tidak sesuai dokumen Admin.</b> Pilih tindakan:</span></div><div class="mm-opt"><button type="button" data-m="bon" class="'+(mode==='bon'?'on':'')+'"><b>Bon Putih</b><small>Driver bayar kekurangan. Barang yang ada tetap diterima.</small></button><button type="button" data-m="revisi" class="'+(mode==='revisi'?'on':'')+'"><b>Minta Admin revisi</b><small>BTB belum disimpan. Admin merevisi dokumen dulu.</small></button></div></div>';
  b.innerHTML=mode==='bon'?UI.ic('check')+' Simpan BTB + Bon Putih':UI.ic('edit')+' Kirim permintaan revisi ke Admin';b.className='btn big2 '+(mode==='bon'?'red2':'go')}
 function live(){var L=read();any=false;d.lines.forEach(function(l,i){var b=L[i],el=fm.querySelector('[data-res="'+l.k+'"]'),t='',gal=Calc.isGal(l);
  if(pen){if(gal){t=pill(b.isi>N(l.isi)?'bad':'ok','Terjual <b>'+fmt(N(l.isi)-b.isi)+'</b>')+pill('info','Kosong kembali <b>'+fmt(b.ksg)+'</b>')+(b.isi>N(l.isi)?pill('bad','Sisa melebihi BKB!'):'')}else{t=pill(b.qty>N(l.qty)?'bad':'ok','Terjual <b>'+fmt(N(l.qty)-b.qty)+'</b>')+(b.qty>N(l.qty)?pill('bad','Retur melebihi BKB!'):'')}}
  else{if(gal){Calc.GF.forEach(function(f){if(sup?(f[0]==='ksg'&&!N(l.ksg)):0)return;var df=N(b[f[0]])-N(l[f[0]]);if(df){any=true;t+=pill('bad',f[1]+' selisih <b>'+(df>0?'+':'')+fmt(df)+'</b>')}else if(N(l[f[0]])||N(b[f[0]]))t+=pill('ok',f[1]+' sesuai ✓')})}else{var df2=b.qty-N(l.qty);if(df2){any=true;t=pill('bad','Selisih <b>'+(df2>0?'+':'')+fmt(df2)+'</b>')}else t=pill('ok','Sesuai ✓')}}
  if(el)el.innerHTML=t});var k=fm.querySelector('#kr');if(k)k.innerHTML=(!pen&&any)?'<i style="color:var(--bad)">* wajib — ada selisih</i>':'';panel()}
 fm.addEventListener('input',live);fm.addEventListener('click',function(e){var b=e.target.closest('[data-m]');if(b){mode=b.dataset.m;panel()}});live();
 fm.addEventListener('submit',function(e){e.preventDefault();var er=fm.querySelector('.err'),ket=fm.querySelector('[name="ket"]').value;
  try{if(sup&&any&&mode==='revisi'){Svc.requestRevision(d.id,{lines:read(),ket:ket});UI.toast('Permintaan revisi terkirim ke Admin');location.hash='#dash';return}
   Svc.addBtb(d.id,{lines:read(),ket:ket,mode:mode});
   if(sup&&Calc.needsOut(Calc.byId(d.id))){UI.toast((any?'BTB + Bon Putih tersimpan':'BTB tersimpan')+' · lanjut input barang keluar');location.hash='#out/'+d.id}
   else{UI.toast(pen?'BTB tersimpan · '+d.driver+(d.rit?' Rit '+d.rit:'')+' selesai · Admin diberi notifikasi':'BTB tersimpan · Admin diberi notifikasi');location.hash='#dash'}}
  catch(ex){er.textContent=ex.message;if(er.scrollIntoView)er.scrollIntoView({block:'center'})}})}

/* ============ CHECKER: barang keluar ke pabrik (galon kosong + RB / pallet) ============ */
function outForm(host,d){var gal=d.scope==='GALON',S=Calc.saldoNow(),st={rows:[],pabrik:d.pihak||'',other:false,ket:''};
 if(gal)d.lines.filter(Calc.isGal).forEach(function(l){st.rows.push({k:l.k,ksg:'',rb:''})});else st.rows.push({k:'',qty:''});
 var pl=Calc.prodList('SPS','PALLET');if(!gal&&pl.length===1)st.rows[0].k=pl[0].idDms;
 
 function recv(k){var l=d.lines.find(function(x){return x.k===k})||{};return N(l.isi)+N(l.tIsi)}
 function rowG(r,i){var l=d.lines.find(function(x){return x.k===r.k})||{},rc=recv(r.k);
  return'<div class="bl bl-'+r.k.toLowerCase()+'"><div class="blh"><span class="bi">'+UI.ic('drop')+'</span><div class="bt"><b>Galon '+BR[r.k]+'</b><small class="bref"><span>Isi diterima</span><b>'+fmt(rc)+'</b>'+(N(l.tIsi)||N(l.tKsg)?' · termasuk tolakan '+fmt(N(l.tIsi)+N(l.tKsg)):'')+'</small></div></div>'+
  '<div class="bgrid"><label class="bf"><span class="bl1">Galon kosong</span><span class="bl2">stock kosong: '+fmt(S[r.k+'_KSG'])+'</span>'+numIn('o_'+i+'_ksg',r.ksg)+'</label><label class="bf"><span class="bl1">Galon RB</span><span class="bl2">isi menyusut, masih tersegel</span>'+numIn('o_'+i+'_rb',r.rb)+'</label></div>'+
  '<div class="bres" data-os="'+i+'"></div><button type="button" class="more fill" data-fill="'+i+'">'+UI.ic('swap')+'Semua kosong = '+fmt(rc)+'</button></div>'}
 function rowP(r,i){return'<div class="lbox lb-b-pallet"><div class="lbh"><select name="o_'+i+'_k" class="psel" data-title="Pilih pallet">'+prodOpts('SPS','PALLET',r.k)+'</select>'+(st.rows.length>1?'<button type="button" class="btn s red rm" data-rm="'+i+'" aria-label="Hapus baris">'+UI.ic('x')+'</button>':'')+'</div><div class="lbr one"><div><small>Jumlah pallet keluar</small>'+numIn('o_'+i+'_qty',r.qty)+'</div></div></div>'}
 function draw(){host.innerHTML='<form class="fbox docf btbf" novalidate autocomplete="off"><div class="btbsec"><span>'+(gal?'Barang yang dibawa driver kembali ke pabrik':'Pallet yang dibawa driver kembali ke pabrik')+'</span></div><div class="lbs">'+
  (gal?st.rows.map(rowG).join(''):st.rows.map(rowP).join('')+'<button type="button" class="more" data-add>'+UI.ic('plus')+'Tambah pallet lain</button>')+'</div>'+
  (gal?'<div class="note-box info mt">'+UI.ic('ok')+'<span>Isi <b>kosong</b> dan/atau <b>RB</b> sesuai yang dibawa. Boleh hanya kosong saja, tanpa RB. Kolom dibiarkan 0 jika tidak ada.</span></div>':'<div class="fg" style="margin-top:12px">'+pbField('Kode Pabrik tujuan',st.pabrik,st.other,'pbSel','pabrik','Ketik nama pabrik')+'</div>')+
  '<div class="f"><label>Catatan (opsional)</label><textarea name="ket" rows="2">'+esc(st.ket)+'</textarea></div>'+errBox()+'<div class="row fa sticky"><button class="btn big2 go2">'+UI.ic('out')+' Simpan Barang Keluar</button></div></form>';UI.enhance(host);live()}
 function live(){if(!gal)return;st.rows.forEach(function(r,i){var el=host.querySelector('[data-os="'+i+'"]');if(!el)return;var rc=recv(r.k),t=N(r.ksg)+N(r.rb),df=t-rc,pill=function(c,x){return'<span class="bp bp-'+c+'">'+x+'</span>'};
  el.innerHTML=(t?pill('info','Total keluar <b>'+fmt(t)+'</b> = kosong '+fmt(N(r.ksg))+' + RB '+fmt(N(r.rb))):'')+(t&&!df?pill('ok','Sama dengan isi diterima ✓'):t?pill('warn','Beda dari isi diterima <b>'+(df>0?'+':'')+fmt(df)+'</b>'):'')+(N(r.ksg)>N(S[r.k+'_KSG'])?pill('bad','Melebihi stock kosong!'):'')+(N(r.rb)>N(S[r.k+'_ISI'])?pill('bad','RB melebihi stock isi!'):'')})}
 host.addEventListener('input',function(e){var t=e.target,m=/^o_(\d+)_(ksg|rb|qty)$/.exec(t.name||'');if(m){st.rows[+m[1]][m[2]]=t.value;live();return}if(t.name==='ket')st.ket=t.value;if(t.name==='pabrik')st.pabrik=t.value});
 host.addEventListener('change',function(e){var t=e.target,m;if(t.name==='pbSel'){if(t.value==='__other'){st.other=true;st.pabrik=''}else{st.other=false;st.pabrik=t.value}draw();return}if((m=/^o_(\d+)_k$/.exec(t.name||'')))st.rows[+m[1]].k=t.value});
 host.addEventListener('click',function(e){var a=e.target.closest('[data-add]'),r=e.target.closest('[data-rm]'),f=e.target.closest('[data-fill]');if(a){st.rows.push({k:'',qty:''});draw();return}if(r){st.rows.splice(+r.dataset.rm,1);draw();return}
  if(f){var row=st.rows[+f.dataset.fill];row.ksg=String(recv(row.k));row.rb='';draw()}});
 host.addEventListener('submit',function(e){e.preventDefault();var er=host.querySelector('.err');
  try{Svc.addOut(d.id,{lines:st.rows,pabrik:st.pabrik,ket:st.ket});UI.toast('Barang keluar tersimpan · '+d.no+' selesai · Admin diberi notifikasi');location.hash='#dash'}catch(ex){er.textContent=ex.message;if(er.scrollIntoView)er.scrollIntoView({block:'center'})}});
 draw()}

/* ============ ADMIN: Saldo Awal harian (manual) ============ */
function saldoForm(host,date){date=/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date:Calc.today();var o=Calc.openingFor(date);
 var info=o.saved?'<div class="note-box ok">'+UI.ic('ok')+'<span>Saldo awal <b>'+UI.dmy(date)+'</b> sudah disimpan oleh <b>'+esc(o.rec.by)+'</b> ('+new Date(o.rec.ts).toLocaleString('id-ID')+'). Masih bisa diubah — perubahan tercatat di audit log.</span></div>':
  o.none?'<div class="note-box warn">'+UI.ic('alert')+'<span>Belum ada saldo awal sebelumnya. Isi manual lalu simpan.</span></div>':'<div class="note-box warn">'+UI.ic('alert')+'<span>Saldo awal <b>'+UI.dmy(date)+'</b> belum disimpan. Angka di bawah = saldo akhir '+UI.dmy(o.from)+' (otomatis). Periksa, ubah bila perlu, lalu simpan.</span></div>';
 var qkeys=Calc.items().filter(function(i){return i[0].indexOf('SPS_')===0});
 var rows=qkeys.filter(function(i){return N(o.items[i[0]])!==0||(o.saved&&o.rec.items&&o.rec.items[i[0]]!==undefined&&N(o.rec.items[i[0]])!==0)}).map(function(i){var p=Calc.prod(i[3]);return{g:p?p.brand:'AQUA',k:i[3],qty:o.items[i[0]]}});
 var GAL={},AL=Calc.GROUPS.SPS.concat([Calc.GROUPS.GALON[2]]);['AQ','VT'].forEach(function(m){GAL[m]={isi:o.items[m+'_ISI'],ksg:o.items[m+'_KSG']}});
 function scopeOfG(g){return g==='JUGRAK'?'GALON':'SPS'}
 function box(cls,title,fields){return'<div class="lbox '+cls+'"><b>'+title+'</b><div class="lbr">'+fields+'</div></div>'}
 function rowH(r,i){var cls='lb-b-'+r.g.toLowerCase();return'<div class="lbox '+cls+'"><div class="lbh"><select name="q_'+i+'_g" class="gsel psel" data-title="Pilih jenis produk">'+AL.map(function(g){return opt(g[0],g[1].replace(' (produk lain)',''),r.g)}).join('')+'</select><button type="button" class="btn s red rm" data-rm="'+i+'" aria-label="Hapus baris">✕</button></div><div class="lbr sp"><div class="gr2"><small>Pilih Produk (kode – nama)</small><select name="q_'+i+'_k" class="psel" data-title="Pilih produk">'+prodOpts(scopeOfG(r.g),r.g,r.k)+'</select></div><div><small>Saldo awal ('+esc(r.k?Calc.unitOf(r.k):'Karton')+')</small>'+numIn('q_'+i+'_qty',r.qty,'0')+'</div></div></div>'}
 function draw(){host.innerHTML='<form class="fbox docf" novalidate autocomplete="off">'+info+'<div class="fg"><div class="f full"><label>Tanggal saldo awal</label><input type="date" name="tgl" value="'+date+'"></div><div class="f full"><label>Galon</label><div class="lbs">'+
  ['AQ','VT'].map(function(m){return box('lb-'+m.toLowerCase(),UI.ic('drop')+' Galon '+BR[m],'<div><small>Isi (galon + air)</small>'+numIn('o_'+m+'_ISI',GAL[m].isi,'0')+'</div><div><small>Kosong (botol kosong)</small>'+numIn('o_'+m+'_KSG',GAL[m].ksg,'0')+'</div>')}).join('')+
  '</div></div><div class="f full"><label>Produk SPS, Pallet & Jugrak</label><div class="lbs">'+rows.map(rowH).join('')+'<button type="button" class="more" data-add>+ Tambah produk (SPS / Pallet / Jugrak)</button></div></div></div>'+errBox()+'<div class="row fa"><button class="btn big2">Simpan Saldo Awal</button></div></form>';
  UI.enhance(host);host.querySelector('[name="tgl"]').addEventListener('change',function(e){if(e.target.value)location.hash='#input/saldo/'+e.target.value})}
 host.addEventListener('input',function(e){var t=e.target,nm=t.name||'',m;if(t.tagName==='SELECT')return;if((m=/^o_(AQ|VT)_(ISI|KSG)$/.exec(nm)))GAL[m[1]][m[2].toLowerCase()]=t.value;else if((m=/^q_(\d+)_qty$/.exec(nm)))rows[+m[1]].qty=t.value});
 host.addEventListener('change',function(e){var t=e.target,m;if(t.tagName!=='SELECT')return;if((m=/^q_(\d+)_(g|k)$/.exec(t.name))){var r=rows[+m[1]];r[m[2]]=t.value;if(m[2]==='g'){r.k='';r.qty=''}draw()}});
 host.addEventListener('click',function(e){if(e.target.closest('[data-add]')){rows.push({g:'AQUA',k:'',qty:''});draw();return}var r=e.target.closest('[data-rm]');if(r){rows.splice(+r.dataset.rm,1);draw()}});
 host.addEventListener('submit',function(e){e.preventDefault();var er=host.querySelector('.err'),items={},tgl=host.querySelector('[name="tgl"]').value;
  ['AQ','VT'].forEach(function(m){items[m+'_ISI']=N(GAL[m].isi);items[m+'_KSG']=N(GAL[m].ksg)});
  qkeys.forEach(function(i){items[i[0]]=0});
  var seen={};try{rows.forEach(function(r){if(!r.k)return;if(seen[r.k])throw new Error('Produk '+r.k+' terisi dua kali');seen[r.k]=1;items['SPS_'+r.k]=N(r.qty)});Svc.setOpening(tgl,items);UI.toast('Saldo awal '+UI.dmy(tgl)+' tersimpan');location.hash='#dash'}catch(ex){er.textContent=ex.message}});
 draw()}
var DEF={pen:{t:CFG.pen.t,ic:'cart',f:function(h){docForm(h,'pen')}},sup:{t:CFG.sup.t,ic:'truck',f:function(h){docForm(h,'sup')}},mut:{t:CFG.mut.t,ic:'swap',f:function(h){docForm(h,'mut')}},saldo:{t:'Saldo Per Tanggal KS',ic:'db',f:function(h,p){saldoForm(h,p)}}};
return{DEF:DEF,btb:btbForm,out:outForm,CFG:CFG}})();

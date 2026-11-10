/* Router + navigasi per role + aksi (event delegation). Logika saldo di calc.js, penulisan data di svc.js, hak akses di rbac.js */
(function(){
var $=function(s){return document.querySelector(s)},esc=UI.esc;
function me(){return Auth.user()}
/* menu sidebar per role: [judul grup, [[route,label,ikon]]] */
var NAVS={
ADMIN:[['Utama',[['dash','Dashboard','home']]],['Input',[['input/pen','BKB/BTB Distribusi','cart'],['input/sup','BKB/BTB Supplier','truck'],['input/mut','BKB/BTB Mutasi Depo','swap'],['input/saldo','Saldo Per Tanggal KS','db']]],
 ['Update Depo',[['updl','Update Jugrak Set dan Antrian','chat']]],['Dokumen & Checker',[['docs/galon','Dokumen Galon','drop'],['docs/sps','Dokumen SPS','box'],['hist/galon','Aktivitas Checker Galon','check'],['hist/sps','Aktivitas Checker SPS','check']]],
 ['Stock & Rekon',[['stock/galon','Stock Galon','drop'],['stock/sps','Stock SPS','box'],['recon/galon','Rekon Galon','scale'],['recon/sps','Rekon SPS','scale']]],
 ['Laporan & Closing',[['report/stock','Laporan Stock','file'],['report/trx','Laporan Dokumen','file'],['report/diff','Laporan Selisih','file'],['closing','Closing Shift','lock']]],['Master',[['master/produk','Master Data','db']]],['Uji Coba',[['data','Reset Data','refresh']]]],
CHECKER_GALON:[['Utama',[['dash','Dashboard','home']]],['Update Depo',[['upd','Update Jugrak Set dan Antrian','chat']]],['Tugas Galon',[['docs/galon/today','Tugas Hari Ini','list'],['docs/galon/open','Belum Selesai','clock'],['hist/galon','Riwayat Saya','check']]],['Stock & Rekon',[['stock/galon','Stock Galon','drop'],['recon/galon','Rekon Galon','scale']]],['Laporan',[['report/diff','Laporan Selisih','file']]]],
CHECKER_SPS:[['Utama',[['dash','Dashboard','home']]],['Tugas SPS',[['docs/sps/today','Tugas Hari Ini','list'],['docs/sps/open','Belum Selesai','clock'],['hist/sps','Riwayat Saya','check']]],['Stock & Rekon',[['stock/sps','Stock SPS','box'],['recon/sps','Rekon SPS','scale']]],['Laporan',[['report/diff','Laporan Selisih','file']]]],
SUPERVISOR:[['Utama',[['dash','Dashboard','home']]],['Update Depo',[['updl','Update Jugrak Set dan Antrian','chat']]],['Monitoring',[['docs/galon','Dokumen Galon','drop'],['docs/sps','Dokumen SPS','box'],['stock/galon','Stock Galon','drop'],['stock/sps','Stock SPS','box'],['hist/galon','Aktivitas Checker Galon','check'],['hist/sps','Aktivitas Checker SPS','check']]],
 ['Rekonsiliasi',[['recon/galon','Rekon Galon','scale'],['recon/sps','Rekon SPS','scale']]],['Kontrol',[['closing','Closing Shift','lock'],['koreksi','Koreksi Resmi','edit'],['audit','Audit Log','shield']]],['Laporan',[['report/stock','Laporan Stock','file'],['report/trx','Laporan Dokumen','file'],['report/diff','Laporan Selisih','file']]],['Master',[['master/produk','Master Data','db']]],['Uji Coba',[['data','Reset Data','refresh']]]]};
var BNAV={ADMIN:[['dash','Home','home'],['input','Input','plus'],['docs/galon','Dokumen','list'],['stock/galon','Stock','drop'],['recon/galon','Rekon','scale']],
CHECKER_GALON:[['dash','Home','home'],['docs/galon/today','Tugas','list'],['upd','Update','chat'],['stock/galon','Stock','drop'],['recon/galon','Rekon','scale']],
CHECKER_SPS:[['dash','Home','home'],['docs/sps/today','Tugas','list'],['stock/sps','Stock','box'],['recon/sps','Rekon','scale'],['hist/sps','Riwayat','check']],
SUPERVISOR:[['dash','Home','home'],['docs/galon','Dokumen','list'],['recon/galon','Rekon','scale'],['closing','Closing','lock'],['audit','Audit','shield']]};
var TITLE={ADMIN:'Dashboard Admin',CHECKER_GALON:'Dashboard Checker Galon',CHECKER_SPS:'Dashboard Checker SPS',SUPERVISOR:'Dashboard KA Gudang'};
function on(h,r){var a=h.split('/'),b=r.split('/');if(a[0]==='doc'||a[0]==='btb'||a[0]==='out')a=['docs'];if(a[0]==='input'&&b[0]==='input')return b.length<2||a[1]===b[1];
 if(a[0]!==b[0])return false;if(['docs','stock','recon','hist','report','master'].indexOf(a[0])>=0)return b.length<2||a[1]===b[1];return true}
function route(h,u){var p=h.split('/'),r=u.role;
switch(p[0]){
case'dash':{var d={ADMIN:dashboardAdmin,CHECKER_GALON:dashboardCheckerGalon,CHECKER_SPS:dashboardCheckerSPS,SUPERVISOR:dashboardSupervisor}[r]();return{t:'Beranda',s:'Depo Parung · Kartu Stock V3',dt:TITLE[r],html:d.html,after:d.after,dash:1}}
case'input':if(p[1]){if(!Forms.DEF[p[1]])return null;return Pages.formPage(p[1],p[2])}return Pages.input();
case'docs':return Pages.docs(p[1],p[2],p[3]);
case'doc':return Pages.docView(p[1]);
case'btb':return Pages.btbPage(p[1]);
case'out':return Pages.outPage(p[1]);
case'data':return Pages.dataPage();
case'stock':return Pages.stock(p[1]==='sps'?'sps':'galon',p[2]);
case'recon':return Pages.recon(p[1]==='sps'?'sps':'galon',p[2]);
case'hist':return Pages.hist(p[1]==='sps'?'sps':'galon',p[2]);
case'report':return Pages.report(['stock','trx','diff'].indexOf(p[1])>=0?p[1]:'stock',p[2]);
case'closing':return Pages.closing();case'audit':return Pages.audit();case'koreksi':return Pages.koreksi();
case'master':return Pages.master(p[1]);
case'notif':return Pages.notif(p[1]);
case'upd':return DepoUpd.page();case'updl':return DepoUpd.view(p[1]);}return null}
/* ---------- tema: otomatis / terang / gelap ---------- */
var TH_L={auto:'Otomatis',light:'Terang',dark:'Gelap'};
function themeGet(){try{return localStorage.getItem('ks_theme')||'auto'}catch(e){return'auto'}}
function themeSet(t){try{if(t==='auto')localStorage.removeItem('ks_theme');else localStorage.setItem('ks_theme',t)}catch(e){}
 if(t==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',t);themeUI()}
function themeUI(){var t=themeGet(),dark=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
 ['themeBtn','themeBtnL'].forEach(function(id){var b=document.getElementById(id);if(b){b.innerHTML=UI.ic(t==='auto'?'auto':t==='light'?'sun':'moon');b.title='Tema: '+TH_L[t]}});
 document.querySelectorAll('.themeseg button').forEach(function(b){b.classList.toggle('on',b.dataset.th===t)});
 var m=document.querySelectorAll('meta[name=theme-color]');if(m.length){m.forEach(function(x){x.removeAttribute('media');x.setAttribute('content',dark?'#08131f':'#eef3f8')})}}
document.addEventListener('click',function(e){var b=e.target.closest('#themeBtn,#themeBtnL,.themeseg button');if(!b)return;
 if(b.dataset.th)themeSet(b.dataset.th);else{var o=['auto','light','dark'],n=o[(o.indexOf(themeGet())+1)%3];themeSet(n);UI.toast('Tema: '+TH_L[n])}});
if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',themeUI)}catch(e){}
var lastPage='#dash';
/* ---------- bantuan: alur kerja per peran + istilah ---------- */
var HELP={ADMIN:[['Isi Saldo Per Tanggal KS','Sekali sehari: isi stock awal supaya angka stock benar.'],['BKB/BTB Distribusi','Barang keluar ke toko. Pilih Kode Driver, isi Nomor PB, toko tujuan, barang & jumlah, lalu Simpan. Checker langsung dapat notifikasi.'],['BKB/BTB Supplier','Barang dari pabrik: isi isi galon, jugrak, dan tolakan. Checker mencocokkan fisik; jika kurang akan jadi Bon Putih atau diminta revisi.'],['BKB/BTB Mutasi Depo','Pindah barang antar depo. Pilih "Langsung dijual" jika barang langsung dibawa driver ke toko.'],['Update Jugrak Set dan Antrian','Setelah Checker Galon menekan Selesai, Anda dapat notifikasi. Buka menu ini, tekan Salin, lalu tempel di grup WhatsApp.'],['Pantau & Closing','Lihat Dashboard dan lonceng notifikasi. Di akhir shift lakukan Closing Shift.']],
 CHECKER:[['Lihat "Tugas berikutnya"','Di Beranda ada tombol besar untuk pekerjaan yang harus dilakukan sekarang.'],['Barang keluar ke toko','Cek barang dan muat ke mobil, lalu tekan Selesai Muat.'],['Driver pulang','Input BTB: isi sisa galon dan botol kosong yang dibawa pulang.'],['Update Jugrak Set dan Antrian (Checker Galon)','Isi angka JR Botol dan antrian, tekan Simpan, lalu Selesai. Admin dan KA Gudang otomatis mendapat notifikasi dan menyalin pesannya ke WhatsApp. Tanggal, jam, dan shift terisi otomatis.'],['Barang dari pabrik','Cocokkan fisik dengan dokumen Admin. Sesuai: simpan. Tidak sesuai: pilih Bon Putih atau minta Admin revisi. Lalu input barang keluar (kosong, RB, atau pallet).']],
 SUPERVISOR:[['Pantau Beranda','Ringkasan dokumen, selisih, dan status closing hari ini.'],['Update Jugrak Set dan Antrian','Notifikasi dari Checker Galon masuk ke sini. Buka menu Update Jugrak Set dan Antrian, tekan Salin, lalu tempel di grup WhatsApp.'],['Rekon & Koreksi','Cocokkan stock, lakukan koreksi resmi bila perlu.'],['Audit Log','Semua aktivitas tercatat dan bisa ditelusuri.'],['Reset Data','Khusus fase uji coba: bersihkan data dengan aman (ada titik pulih).']]},
 GLOS=[['BKB','Bukti Keluar Barang'],['BTB','Bukti Terima Barang'],['KS','Kartu Stock'],['RB','Galon isi yang airnya menyusut tetapi masih tersegel'],['Bon Putih','Driver membayar kekurangan galon'],['Ritase','Satu kali perjalanan driver ke toko dan kembali'],['Mutasi','Perpindahan barang antar depo'],['SPS','Produk kemasan karton (non-galon)']];
function helpOpen(){var u=me(),r=u.role,k=r==='ADMIN'?'ADMIN':r==='SUPERVISOR'?'SUPERVISOR':'CHECKER';
 UI.sheetHtml('Bantuan — '+({ADMIN:'Admin',CHECKER_GALON:'Checker Galon',CHECKER_SPS:'Checker SPS',SUPERVISOR:'KA Gudang'}[r]),'<ol class="hsteps">'+HELP[k].map(function(s,i){return'<li><span class="hn">'+(i+1)+'</span><div><b>'+s[0]+'</b><small>'+s[1]+'</small></div></li>'}).join('')+'</ol><h4 class="hg">Arti istilah</h4><dl class="gl">'+GLOS.map(function(g){return'<div><dt>'+g[0]+'</dt><dd>'+g[1]+'</dd></div>'}).join('')+'</dl><p class="muted note">Ini versi uji coba — data bisa direset kapan saja oleh Admin / KA Gudang.</p>')}
document.addEventListener('click',function(e){if(e.target.closest('#helpBtn'))helpOpen()});
function bell(){var u=me(),b=$('#bell');if(!b)return;var show=!!u&&Perm.can('notif');b.hidden=!show;if(!show)return;var n=H.unread(u.role).length,i=$('#bn');i.textContent=n>99?'99+':n;i.hidden=!n;b.classList.toggle('has',!!n)}
function render(){var u=me();document.body.classList.toggle('authed',!!u);
if(!u){$('#login').hidden=false;$('#shell').hidden=true;return}
$('#login').hidden=true;$('#shell').hidden=false;
var h=(location.hash||'#dash').slice(1)||'dash';if(h.split('/')[0]!=='notif')lastPage='#'+h;
if(!Perm.routeOk(h)){if(h!=='dash'){UI.toast('Akses ditolak untuk role '+Perm.ROLES[u.role].label,1);try{DB.log('AKSES DITOLAK','route '+h)}catch(e){}location.hash='#dash';return}}
var R=Perm.ROLES[u.role];$('#shell').dataset.role=R.cls;
$('#who').textContent=u.nama;$('#whoRole').textContent=R.short;$('#av').textContent=u.nama.charAt(0);
$('#side').innerHTML='<div class="brand"><img src="logo.svg" width="38" height="38" alt=""><div><b>Kartu Stock Online</b><small>DEPO PARUNG</small></div></div><div class="sbrole"><span class="av avimg"><img src="'+R.img+'" alt=""></span><div><b>'+esc(u.nama)+'</b><small>'+R.short+'</small></div></div>'+
NAVS[u.role].map(function(g){return'<h4>'+g[0]+'</h4>'+g[1].map(function(n){return'<a href="#'+n[0]+'" class="'+(on(h,n[0])?'on':'')+'">'+UI.ic(n[2])+'<span>'+n[1]+'</span></a>'}).join('')}).join('')+'<div class="themelbl">TAMPILAN</div><div class="themeseg" role="group" aria-label="Tema"><button type="button" data-th="auto">'+UI.ic('auto')+'Otomatis</button><button type="button" data-th="light">'+UI.ic('sun')+'Terang</button><button type="button" data-th="dark">'+UI.ic('moon')+'Gelap</button></div><button class="sbout" id="out2">'+UI.ic('out')+'Keluar</button>';themeUI();
$('#bnav').innerHTML=BNAV[u.role].map(function(x){return'<a href="#'+x[0]+'" class="'+(on(h,x[0])?'on':'')+'">'+UI.ic(x[2])+'<span>'+x[1]+'</span></a>'}).join('');
$('#side').classList.remove('open');$('#scrim').hidden=true;bell();
var pg;try{pg=route(h,u)}catch(e){console.error(e);pg={t:'Terjadi kesalahan',s:'',html:'<section class="card"><h3>Halaman gagal dimuat</h3><p class="muted">'+esc(e.message)+'</p></section>'}}
if(!pg){location.hash='#dash';return}
$('#ttl').textContent=pg.t;$('#sub').textContent=pg.s||'';document.title=(pg.dt||pg.t)+' – Kartu Stock Online V3';
$('#view').innerHTML='<div class="page'+(pg.dash?' dashboard d-'+R.cls:'')+'" data-route="'+esc(h.split('/')[0])+'">'+pg.html+'</div>';
try{if(pg.after)pg.after()}catch(e){console.error(e);UI.toast('Sebagian data gagal dimuat: '+e.message,1)}
UI.enhance($('#view'));$('#bell').classList.toggle('on',h.split('/')[0]==='notif');if(npOpen)npFill();var tb=$('#testbar');if(tb){tb.hidden=false;tb.innerHTML='<span class="tb1">'+UI.ic('flask')+'MODE UJI COBA</span><span class="tb2">Data belum final</span>'+(Perm.can('data.reset')?'<a href="#data">Reset data</a>':'')}
window.scrollTo(0,0)}
/* ---------- aksi ---------- */
function again(){var y=window.scrollY;render();window.scrollTo(0,y)}
function ask(title,label,ok,fn){UI.form(title,[{n:'alasan',l:label,t:'textarea',req:1,ph:'Wajib diisi — tercatat di audit log'}],function(v){fn(v.alasan)},ok)}
var ACT={
revise:function(id){var by={};document.querySelectorAll('[data-rv]').forEach(function(i){var p=i.dataset.rv.split('|');(by[p[0]]=by[p[0]]||{k:p[0]})[p[1]]=Number(i.value)||0});Svc.reviseDoc(id,Object.keys(by).map(function(k){return by[k]}));UI.toast('Revisi tersimpan · Checker diberi notifikasi');again()},
refc:function(){if(!confirm('Daftar Driver Galon/SPS dan Kode Pabrik akan diganti dengan data UangRitase v20. Lanjutkan?'))return;DB.applyRefCodes(true);UI.toast('Data kode dimuat ulang');again()},
impc:function(tab){var t=$('#impT'),tg=tab==='driver'?($('#impTgt')||{}).value:tab;var r=Svc.importCodes(tg,t.value);UI.toast('Impor selesai: '+r.add+' baru, '+r.upd+' diperbarui');again()},
dsnap:function(){Svc.takeSnapshot('Manual');UI.toast('Titik pulih dibuat');again()},
dexp:function(){UI.dl('kartu-stock-cadangan-'+Calc.today()+'.json',JSON.stringify(DB.exportAll(),null,1),'application/json');UI.toast('Cadangan diunduh')},
drest:function(k){if(!confirm('Pulihkan data ke titik ini? Data sekarang disimpan dulu sebagai titik pulih baru.'))return;Svc.restoreSnapshot(k);UI.toast('Data dipulihkan');again()},
ddel:function(k){if(!confirm('Hapus titik pulih ini?'))return;Svc.deleteSnapshot(k);again()},
dreset:function(){var c=[].slice.call(document.querySelectorAll('input[name=rs]:checked')).map(function(x){return x.value}),o={confirm:$('#rConf').value,reason:$('#rWhy').value},one=$('#rdMode').value==='one';
 c.forEach(function(k){o[k]=true});if(one&&!o.all)o.date=$('#rdDate').value;var er=$('#rErr');er.textContent='';
 try{var r=Svc.resetData(o);UI.toast('Reset selesai: '+r.summary.join(', ')+' · titik pulih dibuat');location.hash='#data';again()}catch(e){er.textContent=e.message}},
expTbl:function(){var e=Pages.exp();if(e)UI.xls(e.n,e.h,e.r)},
readN:function(d){var r=me().role,ids=null;if(d&&d!=='all')ids=H.unread(r).filter(function(x){return x.date===d}).map(function(x){return x.id});Svc.readNotifs(r,ids);again()},
muat:function(id){var k=$('#mk'),d=Calc.byId(id);Svc.setMuat(id,k?k.value:'');UI.toast('Selesai muat tercatat · Driver '+d.driver+' · Admin diberi notifikasi');again()},
cancel:function(id){Perm.require('doc.cancel');ask('Batalkan dokumen','Alasan pembatalan','Batalkan Dokumen',function(a){Svc.cancelDoc(id,a);UI.toast('Dokumen dibatalkan');again()})},
rstep:function(id,what){Perm.require('doc.reset');ask('Reset '+(what==='btb'?'BTB':what==='out'?'Barang Keluar':'Selesai Muat'),'Alasan koreksi','Reset',function(a){Svc.resetStep(id,what,a);UI.toast('Langkah direset (audit log dibuat)');again()})},
doClose:function(){Svc.doClose($('#cs').value,$('#cp').value);UI.toast('Closing tersimpan');again()},
bk:function(){UI.dl('kartu-stock-backup-'+UI.today()+'.json',Svc.backup(),'application/json')},
bkOld:function(k){Perm.require('backup');UI.dl('ks_'+k+'.json',localStorage.getItem('ks_'+k)||'{}','application/json')},
rst:function(){Perm.require('reset');if(prompt('Semua data akan diganti data demo (salinan otomatis disimpan di browser: ks_backup_pre_reset).\nKetik RESET untuk melanjutkan:')==='RESET'){Svc.reset();UI.toast('Data demo dimuat');again()}},
madd:function(tab){var m=Pages.MS[tab];UI.form('Tambah '+m.l,m.f.map(function(x){return{n:x[0],l:x[1],t:'text',req:1}}),function(v){Svc.masterAdd(m.k,v);again()})},
mtog:function(tab,id){Svc.masterToggle(Pages.MS[tab].k,id);again()}};
document.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;var p=b.dataset.act.split('|'),fn=ACT[p[0]];if(!fn)return;
try{fn.apply(null,p.slice(1))}catch(err){UI.toast(err.message||String(err),1)}});
document.addEventListener('change',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.dp&&t.value)location.hash='#'+t.dataset.dp+'/'+t.value+(t.dataset.sfx||'')});
/* ---------- login ---------- */
var DEMO=[['admin','admin123','Admin'],['checker_galon','checker123','Checker Galon'],['checker_sps','checker123','Checker SPS'],['ka_gudang','spv123','KA Gudang']];
var DDESC={admin:['role-admin.webp','Input BKB/BTB, saldo, master'],checker_galon:['role-galon.webp','Cek & muat galon, Jugrak Set, BTB'],checker_sps:['role-sps.webp','Cek & muat produk SPS'],ka_gudang:['role-kagudang.webp','Pantau, closing, audit']};
function loginUI(){$('#demo').innerHTML=DEMO.map(function(d){var x=DDESC[d[0]]||['user',''];return'<button type="button" class="rcard rc-'+d[0]+'" data-u="'+d[0]+'" data-p="'+d[1]+'" aria-label="Masuk sebagai '+d[2]+'"><span class="rimg"><img src="'+x[0]+'" alt="" width="569" height="464" loading="eager"></span><span class="rct"><b>'+d[2]+'</b><small>'+x[1]+'</small></span><span class="rgo">'+UI.ic('chev')+'</span></button>'}).join('');
document.querySelectorAll('#login [data-ic]').forEach(function(e){e.innerHTML=UI.ic(e.dataset.ic)});var pt=$('#pwt');pt.innerHTML=UI.ic('eye');pt.onclick=function(){var i=$('#lp'),h=i.type==='password';i.type=h?'text':'password';pt.classList.toggle('on',h)};$('#helpBtn').innerHTML=UI.ic('help');
$('#demo').onclick=function(e){var b=e.target.closest('[data-u]');if(b){$('#lu').value=b.dataset.u;$('#lp').value=b.dataset.p;$('#lf').requestSubmit()}}}
$('#lf').addEventListener('submit',function(e){e.preventDefault();var f=Auth.login($('#lu').value.trim(),$('#lp').value);if(!f){UI.toast('Username atau password salah, atau akun nonaktif',1);return}$('#lp').value='';location.hash='#dash';render()});
function logout(){Auth.logout();location.hash='';render()}
$('#out').onclick=logout;document.addEventListener('click',function(e){if(e.target.closest('#out2'))logout()});
$('#burger').onclick=function(){var o=$('#side').classList.toggle('open');$('#scrim').hidden=!o};$('#scrim').onclick=function(){$('#side').classList.remove('open');$('#scrim').hidden=true};
/* ---------- panel notifikasi: ketuk lonceng = buka, ketuk lagi = tutup ---------- */
var npOpen=false;
function npFill(){var u=me(),p=$('#npanel');if(!u||!p||!Perm.can('notif'))return;var t0=Calc.today(),all=H.notifsFor(u.role),td=all.filter(function(x){return x.date===t0}),un=H.unread(u.role),old=un.filter(function(x){return x.date<t0}).length;
 p.innerHTML='<div class="np-h"><div><b>Notifikasi</b><small>'+(un.length?un.length+' belum dibaca':'Semua sudah dibaca')+'</small></div><div class="np-a">'+(un.length?'<button type="button" class="btn s ghost" data-np="read">'+UI.ic('ok')+'Tandai dibaca</button>':'')+'<button type="button" class="np-x" data-np="close" aria-label="Tutup notifikasi">'+UI.ic('x')+'</button></div></div>'+
 (old?'<a class="oldbn" href="#notif/all">'+UI.ic('clock')+'<span><b>'+old+' belum dibaca</b> dari tanggal sebelumnya</span></a>':'')+
 '<div class="np-b">'+(td.length?'<ul class="nfl">'+td.slice(0,12).map(function(x){return H.notifRow(x)}).join('')+'</ul>':'<div class="np-empty">'+UI.ic('bell')+'<span>Belum ada notifikasi hari ini</span></div>')+'</div><a class="np-f" href="#notif/'+t0+'">Buka notifikasi per tanggal '+UI.ic('chev')+'</a>'}
function npShow(on){npOpen=on;var p=$('#npanel'),s=$('#nscrim'),b=$('#bell');if(on){npFill();p.hidden=false;s.hidden=false;requestAnimationFrame(function(){p.classList.add('on');s.classList.add('on')})}else{p.classList.remove('on');s.classList.remove('on');setTimeout(function(){if(!npOpen){p.hidden=true;s.hidden=true}},200)}
 b.classList.toggle('open',on);b.setAttribute('aria-expanded',on?'true':'false')}
function npClose(){if(npOpen)npShow(false)}
$('#bell').addEventListener('click',function(e){e.preventDefault();if(/^#notif/.test(location.hash)){location.hash=lastPage;return}npShow(!npOpen)});
$('#nscrim').addEventListener('click',function(){npShow(false)});
document.addEventListener('keydown',function(e){if(e.key==='Escape')npClose()});
document.addEventListener('click',function(e){var b=e.target.closest('[data-np]');if(b){if(b.dataset.np==='close')npShow(false);else if(b.dataset.np==='read'){Svc.readNotifs(me().role,null);npFill();bell();var r=((location.hash||'#dash').slice(1)||'dash').split('/')[0];if(r==='dash'||r==='notif')render()}return}
 if(npOpen&&e.target.closest('#npanel a'))npShow(false)});
window.addEventListener('hashchange',function(){npClose();render()});
/* Sinkron antar tab di browser yang sama (mis. tab Admin & tab Checker): data berubah → notifikasi muncul & halaman diperbarui.
   Catatan: localStorage tidak tersinkron antar perangkat — untuk multi-perangkat perlu backend (Firebase/Supabase). */
window.addEventListener('storage',function(e){if(!e.key||e.key.indexOf('ks_')!==0||!me())return;
 if(e.key==='ks_notifs'){var u=me(),n=H.unread(u.role).length;bell();if(npOpen)npFill();if(Perm.can('notif')&&n)UI.toast('🔔 Notifikasi baru ('+n+')')}
 if(['ks_docs','ks_notifs','ks_openings'].indexOf(e.key)<0)return;
 var r=((location.hash||'#dash').slice(1)||'dash').split('/')[0],a=document.activeElement;
 if(['dash','docs','doc','notif','stock','recon','hist'].indexOf(r)>=0&&!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))render()});
/* keyboard terbuka (fokus ke isian) → sembunyikan navigasi bawah */
document.addEventListener('focusin',function(e){if(e.target.matches&&e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=date]),textarea'))document.body.classList.add('kb')});
document.addEventListener('focusout',function(){setTimeout(function(){var a=document.activeElement;if(!(a&&a.matches&&a.matches('input:not([type=checkbox]):not([type=radio]):not([type=date]),textarea')))document.body.classList.remove('kb')},120)});
DB.init();loginUI();themeUI();render()})();

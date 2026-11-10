/* Hak akses per role. Dipakai oleh Svc (fungsi tulis data) DAN router — bukan hanya menyembunyikan menu.
   Catatan: login localStorage hanyalah simulasi uji, bukan keamanan produksi.
   V3: Admin input BKB / Supplier / Mutasi / Saldo Awal. Checker hanya: Selesai Muat + input BTB (sesuai bidangnya). */
var Perm=(function(){
var ROLES={ADMIN:{label:'Admin',short:'ADMIN',cls:'admin',img:'role-admin.webp'},CHECKER_GALON:{label:'Checker Galon',short:'CHECKER GALON',cls:'cg',img:'role-galon.webp'},CHECKER_SPS:{label:'Checker SPS',short:'CHECKER SPS',cls:'cs',img:'role-sps.webp'},SUPERVISOR:{label:'KA Gudang',short:'KA GUDANG',cls:'spv',img:'role-kagudang.webp'}};
var A='ADMIN',CG='CHECKER_GALON',CS='CHECKER_SPS',SV='SUPERVISOR',ALL=[A,CG,CS,SV];
/* aksi tulis/ubah data */
var ACTIONS={
 'doc.add':[A],            /* input BKB / Supplier / Mutasi */
 'doc.cancel':[A,SV],      /* Admin hanya selama belum diproses Checker (dicek di Svc) */
 'opening.set':[A,SV],     /* saldo awal harian manual */
 'muat.galon':[CG],'muat.sps':[CS],   /* tombol "Selesai Muat" */
 'btb.galon':[CG],'btb.sps':[CS],     /* input BTB */
 'out.galon':[CG],'out.sps':[CS],     /* input barang keluar ke pabrik (kosong / RB / pallet) */
 'doc.revise':[A,SV],
 'data.reset':[A,SV],      /* menu Reset Data (fase uji coba) */      /* Admin merevisi dokumen setelah Checker menolak fisik */
 'doc.reset':[SV],         /* reset Muat / BTB (koreksi resmi, wajib alasan) */
 'notif':[A,CG,CS,SV],     /* V3.8: KA Gudang ikut menerima notifikasi (Update Jugrak Set & Antrian) */
 'depo.update':[CG],       /* Update Jugrak Set dan Antrian: isi + Simpan + Selesai (Checker Galon) */
 'depo.copy':[A,SV],       /* Admin / KA Gudang menyalin teks update untuk WhatsApp */
 'closing':[A,SV],
 'audit.view':[SV],
 'master.edit':[A,SV],
 'backup':[A,SV],'import':[A,SV],'reset':[A,SV],
 'export':ALL};
/* form input -> aksi */
var FORMS={pen:'doc.add',sup:'doc.add',mut:'doc.add',saldo:'opening.set'};
/* route -> role yang boleh membuka (kunci = routeKey) */
var ROUTES={'dash':ALL,'input':[A,SV],'docs/galon':[A,CG,SV],'docs/sps':[A,CS,SV],'data':[A,SV],'doc':ALL,'btb':[CG,CS],'out':[CG,CS],
 'stock/galon':[A,CG,SV],'stock/sps':[A,CS,SV],'recon/galon':[A,CG,SV],'recon/sps':[A,CS,SV],'hist/galon':[A,CG,SV],'hist/sps':[A,CS,SV],
 'report/stock':[A,SV],'report/trx':[A,SV],'report/diff':ALL,'closing':[A,SV],'audit':[SV],'koreksi':[SV],'master':[A,SV],'notif':[A,CG,CS,SV],'upd':[CG],'updl':[A,SV]};
function role(){var u=window.Auth&&Auth.user();return u?u.role:null}
function can(a){var r=role();return!!r&&!!ACTIONS[a]&&ACTIONS[a].indexOf(r)>=0}
function require(a){if(!can(a)){var u=window.Auth&&Auth.user();try{DB.log('AKSES DITOLAK',a+' / '+(u?u.role:'-'))}catch(e){}throw new Error('Akses ditolak untuk role '+(role()||'-')+' ('+a+')')}return true}
/* Checker Galon hanya boleh menyentuh dokumen GALON, Checker SPS hanya SPS */
function scopeOf(r){return r===CG?'GALON':r===CS?'SPS':null}
function docOk(d){var r=role(),s=scopeOf(r);return!!r&&!!d&&(!s||d.scope===s)}
function routeKey(h){var p=String(h||'dash').split('/');
if(p[0]==='input')return p[1]?'input/'+p[1]:'input';
if(['docs','stock','recon','hist','report'].indexOf(p[0])>=0)return p[0]+'/'+(p[1]||'');return p[0]}
function routeOk(h){var r=role(),k=routeKey(h);if(!r)return false;
if(k.indexOf('input/')===0){var f=FORMS[k.slice(6)];return!!f&&can(f)}
var a=ROUTES[k];return!!a&&a.indexOf(r)>=0}
function formOk(f){return!!FORMS[f]&&can(FORMS[f])}
return{ROLES:ROLES,ACTIONS:ACTIONS,can:can,require:require,routeOk:routeOk,routeKey:routeKey,formOk:formOk,role:role,scopeOf:scopeOf,docOk:docOk}})();

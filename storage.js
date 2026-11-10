/* Penyimpanan modular: 1 key per collection (ks_*) — mudah dimigrasi ke Firestore / Supabase.
   V3: dokumen Admin (BKB / Supplier / Mutasi) disimpan di `docs`; saldo awal harian di `openings`; notifikasi di `notifs`.
   Koleksi lama (admin_transactions, checker_transactions, stock_balances, closings…) TIDAK dihapus — hanya tidak dipakai untuk saldo. */
var DB=(function(){var P='ks_';
var KEYS=['users','products','depos','drivers','sales','admin_transactions','checker_transactions','stock_balances','dms_snapshots','reconciliations','closings','audit_logs','settings','meta','docs','openings','notifs','pabrik','depoupd'];
function get(k,d){try{var v=localStorage.getItem(P+k);return v?JSON.parse(v):(d===undefined?[]:d)}catch(e){return d===undefined?[]:d}}
function set(k,v){localStorage.setItem(P+k,JSON.stringify(v))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function add(k,o){var a=get(k);o.id=o.id||uid();a.push(o);set(k,a);return o}
function upd(k,id,p){var a=get(k),i=a.findIndex(function(x){return x.id===id});if(i>=0){Object.assign(a[i],p);set(k,a)}}
function log(act,det){var u=window.Auth&&Auth.user();add('audit_logs',{ts:new Date().toISOString(),user:u?u.username:'-',act:act,det:det||''})}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}

var DB_VERSION=4;
function V2_USERS(){return[{id:'u1',username:'admin',nama:'Admin Depo',role:'ADMIN',pass:'admin123',aktif:true},{id:'u4',username:'checker_galon',nama:'Checker Gudang Galon',role:'CHECKER_GALON',pass:'checker123',aktif:true},{id:'u5',username:'checker_sps',nama:'Checker Gudang SPS',role:'CHECKER_SPS',pass:'checker123',aktif:true},{id:'u3',username:'ka_gudang',nama:'KA Gudang Depo',role:'SUPERVISOR',pass:'spv123',aktif:true}]}

/* Saldo Admin versi lama (V1/V2) — dipakai HANYA saat migrasi agar angka saldo tidak hilang. */
function legacyBalances(){
 var n=function(x){return Number(x)||0},bals=get('stock_balances'),cl=get('closings'),tx=get('admin_transactions');
 function eff(t){if(t.void)return[];var e=[],m=t.merek;
  if(t.type==='SUP_GLN'&&t.v===2){var inA=n(t.masuk)+n(t.tlkAir),outA=n(t.outIsi);e.push(['GLN_'+m+'_A',inA-outA],['GLN_'+m+'_B',inA+n(t.tlkKosong)-n(t.outKosong)-outA])}
  else if(t.type==='SUP_GLN'){e.push(['GLN_'+m+'_A',n(t.airIn)-n(t.airOut)],['GLN_'+m+'_B',n(t.btlIn)-n(t.btlOut)])}
  else if(t.type==='PENJ_GLN'&&t.v===2){var sold=n(t.keluar)-n(t.sisa);e.push(['GLN_'+m+'_A',-sold],['GLN_'+m+'_B',-(sold-n(t.oksg))])}
  else if(t.type==='PENJ_GLN'){var net=n(t.keluar)-n(t.masuk);e.push(['GLN_'+m+'_A',-net],['GLN_'+m+'_B',-net])}
  else if(t.type==='MUT_GLN'){if(t.status!=='Draft'){var s=t.arah==='Masuk'?1:-1;e.push(['GLN_'+m+'_A',s*n(t.air)],['GLN_'+m+'_B',s*n(t.btl)])}}
  else if(t.type==='SUP_SPS'||t.type==='MUT_SPS'){e.push(['SPS_'+t.idProduk,n(t.qtyIn)-n(t.qtyOut)])}
  else if(t.type==='PENJ_SPS'){e.push(['SPS_'+t.idProduk,-(n(t.qtyBkb)-n(t.qtyBtb))])}
  return e}
 return function(item){var ob=bals.find(function(b){return b.item===item})||{opening:0},b=n(ob.opening),ts='';
  var c=cl.filter(function(x){return x.snap&&x.snap[item]!==undefined}).sort(function(a,b){return a.ts<b.ts?-1:1}).pop();
  if(c){b=n(c.snap[item].admin);ts=c.ts}
  tx.forEach(function(t){if(t.ts>ts)eff(t).forEach(function(d){if(d[0]===item)b+=d[1]})});return b}}

/* Gabungkan master produk dari Excel (KODE DEPO) ke data yang ada: update nama/grup, tambah yang belum ada. Tidak menghapus. */
function mergeProducts(){var ps=get('products'),by={};ps.forEach(function(p){by[String(p.idDms)]=p});
 (window.PRODUCT_SEED||[]).forEach(function(n){var o=by[n.idDms];if(o){o.namaDms=n.namaDms;o.nama=n.nama;o.brand=n.brand;o.scope=n.scope;o.cluster=n.cluster;o.satuan=n.satuan;o.kategori=n.scope==='SPS'?'SPS':n.scope;if(o.aktif===undefined)o.aktif=true}
  else ps.push({id:'p'+n.idDms,idDms:n.idDms,namaDms:n.namaDms,nama:n.nama,merek:n.brand,brand:n.brand,scope:n.scope,cluster:n.cluster,kategori:n.scope,satuan:n.satuan,aktif:true})});
 ps.forEach(function(p){if(!p.scope&&p.kategori==='SPS'){p.scope='SPS';p.brand=p.brand||'AQUA'}});set('products',ps)}
/* Migrasi V2 -> V3 -> V4. Idempotent. Tidak menghapus / mengganti nama key lama. */
function migrateV3(){
 try{
  var meta=get('meta',{}),users=get('users');
  var needUsers=['admin','checker_galon','checker_sps','ka_gudang'].some(function(nm){return!users.some(function(u){return u.username===nm})});
  var needCols=['docs','openings','notifs'].some(function(k){return localStorage.getItem(P+k)===null});
  var needProd=!(get('products').some(function(p){return p.scope==='SPS'&&p.brand==='MIZONE'}));
  if(meta.dbVersion>=DB_VERSION&&!needUsers&&!needCols&&!needProd)return false;
  if(localStorage.getItem(P+'backup_v2')===null){var snap={at:new Date().toISOString(),data:{}};KEYS.forEach(function(k){var v=localStorage.getItem(P+k);if(v!==null)snap.data[k]=v});try{localStorage.setItem(P+'backup_v2',JSON.stringify(snap))}catch(e){}}
  V2_USERS().forEach(function(nu){if(!users.some(function(u){return u.username===nu.username}))users.push(nu)});
  users.forEach(function(u){if(u.role==='CHECKER'&&u.aktif){u.aktif=false;u.legacy=true}});set('users',users);
  ['docs','notifs'].forEach(function(k){if(localStorage.getItem(P+k)===null)set(k,[])});
  var ops=get('openings');
  if(!ops.length&&get('settings',{}).seeded){ /* ada data V1/V2: jadikan saldo hari ini sebagai saldo awal hari ini */
   var lb=legacyBalances(),it={};['AQ','VT'].forEach(function(m){var a=lb('GLN_'+m+'_A'),b=lb('GLN_'+m+'_B');it[m+'_ISI']=a;it[m+'_KSG']=b-a});
   get('products').filter(function(p){return p.kategori==='SPS'&&p.aktif}).forEach(function(p){it['SPS_'+p.idDms]=lb('SPS_'+p.idDms)});
   ops.push({id:uid(),date:todayStr(),items:it,by:'migrasi',ts:new Date().toISOString(),src:'Migrasi dari saldo V2'})}
  set('openings',ops);mergeProducts();
  set('meta',{dbVersion:DB_VERSION,migratedAt:meta.migratedAt||new Date().toISOString(),lastCheck:new Date().toISOString(),from:meta.dbVersion||1});
  var u=window.Auth&&Auth.user&&Auth.user();add('audit_logs',{ts:new Date().toISOString(),user:u?u.username:'-',act:'MIGRASI V3',det:'dbVersion '+(meta.dbVersion||1)+' -> '+DB_VERSION});
  return true}catch(e){console.error('migrateV3',e);return false}}
function seed(){
set('users',V2_USERS());
var sps=[['204579',6026]];
set('products',[{id:'pg1',idDms:'74559',namaDms:'AQ.5GALLON ISI',nama:'AQ.5GLN ISI',merek:'AQUA',cluster:'GLN AQ',kategori:'GALON',satuan:'Galon',aktif:true},{id:'pg2',idDms:'74560',namaDms:'VT.5GALLON ISI',nama:'VT.5GLN ISI',merek:'VIT',cluster:'GLN VT',kategori:'GALON',satuan:'Galon',aktif:true}]);mergeProducts();
set('depos',[['001-','NG1'],['002-','NG2'],['283-','LP SENTUL'],['288-','LP POOL CICU']].map(function(d,i){return{id:'d'+i,idDepo:d[0],nama:d[1],aktif:true}}));
set('drivers',['HERI','YUGA','DESANADI','EDO'].map(function(n,i){return{id:'r'+i,idDriver:'DRV'+(i+1),nama:n,aktif:true}}));
set('sales',['ASEP','DEDI','SUTARJAT'].map(function(n,i){return{id:'s'+i,idSales:'SLS'+(i+1),nama:n,aktif:true}}));
/* Saldo awal hari ini (contoh/demo — ubah lewat menu Input → Saldo Awal). Aqua dari Excel: isi 113.246 / kosong 19.858 */
var it={AQ_ISI:113246,AQ_KSG:19858,VT_ISI:3280,VT_KSG:720};sps.forEach(function(p){it['SPS_'+p[0]]=p[1]});
set('openings',[{id:uid(),date:todayStr(),items:it,by:'seed',ts:new Date().toISOString(),src:'Data contoh'}]);
['docs','notifs','admin_transactions','checker_transactions','stock_balances','dms_snapshots','reconciliations','closings','audit_logs'].forEach(function(k){set(k,[])});
set('settings',{depo:'DEPO PARUNG',seeded:true});set('meta',{dbVersion:DB_VERSION,migratedAt:new Date().toISOString()})}
/* Kode driver Galon / SPS dan kode pabrik (dari referensi UangRitase Depo Parung). Lengkapi via Master Data → Impor. */
/* Kode driver Galon/SPS dan DMS Kode Pabrik: dari refcodes.js (salinan website UangRitase). */
function applyRefCodes(force){var R=window.REFCODES;if(!R)return;var m=get('meta',{});if(!force&&m.codesVer===R.ver)return;
 var dr=get('drivers').filter(function(x){return!(x.kode&&x.src==='ref')&&!/^k\d/.test(x.id)}).map(function(x){if(!x.kode&&/^r\d$/.test(x.id))x.aktif=false;return x});
 [['GALON',R.galon],['SPS',R.sps]].forEach(function(g){g[1].forEach(function(r,i){dr.push({id:'ref'+g[0][0]+i,idDriver:r[1],kode:r[1],nama:r[0],jenis:g[0],aktif:true,src:'ref'})})});set('drivers',dr);
 var sl=get('sales').map(function(x){if(!x.kode&&/^s\d$/.test(x.id))x.aktif=false;return x});set('sales',sl);
 var pb=get('pabrik').filter(function(x){return x.src!=='ref'&&!/^pb\d$/.test(x.id)});R.pabrik.forEach(function(r,i){pb.push({id:'refpb'+i,kode:r[0],nama:r[1],aktif:true,src:'ref'})});set('pabrik',pb);
 m.codesVer=R.ver;set('meta',m)}
function ensureCodes(){if(localStorage.getItem(P+'pabrik')===null)set('pabrik',[]);applyRefCodes(false)}
/* V3.7: peran "Supervisor" diganti nama menjadi "KA Gudang" (kunci internal SUPERVISOR tetap, data lama aman) */
function renameKA(){try{var us=get('users'),ch=false;us.forEach(function(u){if(u.role!=='SUPERVISOR')return;if(u.username==='supervisor'&&!us.some(function(x){return x.username==='ka_gudang'})){u.username='ka_gudang';ch=true}if(/supervisor/i.test(u.nama||'')){u.nama='KA Gudang Depo';ch=true}});if(ch)set('users',us)}catch(e){console.error('renameKA',e)}}
function init(){renameKA();if(!get('settings',{}).seeded)seed();else migrateV3();ensureCodes();if(localStorage.getItem(P+'depoupd')===null)set('depoupd',[])}
function exportAll(){var o={};KEYS.forEach(function(k){o[k]=get(k,k==='settings'||k==='meta'?{}:[])});return o}
function importAll(o){if(!o||typeof o!=='object'||Array.isArray(o))throw new Error('Format backup tidak valid');
var ok=KEYS.filter(function(k){return o[k]!==undefined});if(!ok.length)throw new Error('File tidak berisi data Kartu Stock');
ok.forEach(function(k){var isObj=(k==='settings'||k==='meta');if(isObj?(typeof o[k]!=='object'||Array.isArray(o[k])):!Array.isArray(o[k]))throw new Error('Data \''+k+'\' tidak valid')});
try{localStorage.setItem(P+'backup_pre_import',JSON.stringify({at:new Date().toISOString(),data:exportAll()}))}catch(e){}
ok.forEach(function(k){set(k,o[k])});if(o.meta===undefined&&o.users!==undefined){var m=get('meta',{});delete m.dbVersion;set('meta',m)}migrateV3()}
function reset(){try{localStorage.setItem(P+'backup_pre_reset',JSON.stringify({at:new Date().toISOString(),data:exportAll()}))}catch(e){}KEYS.forEach(function(k){localStorage.removeItem(P+k)});seed()}
return{migrate:migrateV3,version:DB_VERSION,get:get,set:set,add:add,upd:upd,uid:uid,log:log,init:init,applyRefCodes:applyRefCodes,exportAll:exportAll,importAll:importAll,reset:reset}})();
var Auth=(function(){
function user(){try{var u=JSON.parse(sessionStorage.getItem('ks_session'));if(u&&u.role==='SUPERVISOR'&&/supervisor/i.test(u.nama||''))u.nama='KA Gudang Depo';return u&&window.Perm&&!Perm.ROLES[u.role]?null:u}catch(e){return null}}
function login(u,p){if(u==='supervisor')u='ka_gudang';var f=DB.get('users').find(function(x){return x.username===u&&x.pass===p&&x.aktif});if(!f)return null;sessionStorage.setItem('ks_session',JSON.stringify({username:f.username,nama:f.nama,role:f.role}));DB.log('LOGIN');return f}
function logout(){DB.log('LOGOUT');sessionStorage.removeItem('ks_session')}
return{user:user,login:login,logout:logout}})();

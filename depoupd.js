/* Update Jugrak Set dan Antrian.
   - Checker Galon: isi angka → "Simpan" (draf) → "Selesai" (kirim notifikasi ke Admin & KA Gudang). Tidak ada pratinjau, tidak ada tombol WhatsApp.
   - Admin / KA Gudang: buka daftar update yang sudah Selesai, tekan "Salin" lalu tempel sendiri di grup WhatsApp.
   Data disimpan di koleksi `depoupd`: {id,date,time,shift,ts,by,vals,text,status:'draft'|'done',copied}. Data lama tanpa status dianggap selesai. */
var DepoUpd=(function(){
var esc=UI.esc,tick=null,TITLE='Update Jugrak Set dan Antrian';
/* [kunci, label di pesan WhatsApp, label di form] */
var F1=[['pc','JR BOTOL PC','JR Botol PC'],['pet','JR BOTOL PET','JR Botol PET'],['ksg','JR KOSONG','JR Kosong']];
var F2=[['jag','Jugrak. AQ','Jugrak AQ'],['laq','Lasah AQ','Lasah AQ'],['lvt','Lasah VIT','Lasah VIT']];
var ALL=F1.concat(F2);
function num(x){return Math.max(0,Math.min(999999,parseInt(String(x).replace(/\D/g,''),10)||0))}
function pad2(n){return String(n).padStart(2,'0')}
function shiftOf(h){h=Number(h);return h>=7&&h<15?'Shift 1':h>=15&&h<23?'Shift 2':'Shift 3'}
/* waktu WIB: {date:'YYYY-MM-DD', time:'HH.MM', long:'Selasa, 10 Nov 2026', shift:'Shift 1'} */
function wib(){var d=new Date(),p={};
 try{new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).forEach(function(x){p[x.type]=x.value})}
 catch(e){p={year:d.getFullYear(),month:pad2(d.getMonth()+1),day:pad2(d.getDate()),hour:pad2(d.getHours()),minute:pad2(d.getMinutes())}}
 var date=p.year+'-'+p.month+'-'+p.day,hh=pad2(Number(p.hour)%24);
 return{date:date,time:hh+'.'+p.minute,long:UI.longDate(date),shift:shiftOf(hh)}}
function depo(){var s=DB.get('settings',{});return String(s.depo||'DEPO PARUNG').toUpperCase()}
function padR(s,n){s=String(s);while(s.length<n)s+=' ';return s}
/* isi pesan — format sama persis dengan yang dipakai di grup WhatsApp */
function build(v,w){var L=[depo(),w.long+' · '+w.time,''];
 F1.forEach(function(f){L.push(padR(f[1],13)+': '+num(v[f[0]]))});
 L.push('','Update Antrian','');
 F2.forEach(function(f,i){L.push(padR(f[1],11)+': '+num(v[f[0]]));if(i<F2.length-1)L.push('')});
 return L.join('\n')}
function empty(){var o={};ALL.forEach(function(f){o[f[0]]=''});return o}
function isDone(r){return r.status!=='draft'}
function all(){return DB.get('depoupd').slice().sort(function(a,b){return a.ts<b.ts?1:-1})}
function onDate(d){return all().filter(function(r){return r.date===d})}
function today(){return onDate(wib().date)}
function doneToday(){return today().filter(isDone)}
function myDraft(){var u=Auth.user(),t=wib().date;return all().find(function(r){return r.date===t&&r.status==='draft'&&u&&r.by===u.username})||null}
function sumJ(v){return'PC '+num(v.pc)+' · PET '+num(v.pet)+' · Kosong '+num(v.ksg)}
function sumA(v){return'Jugrak AQ '+num(v.jag)+' · Lasah AQ '+num(v.laq)+' · Lasah VIT '+num(v.lvt)}
function copyText(t){
 if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t);
 return new Promise(function(res,rej){var ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(ta);ta.select();try{ta.setSelectionRange(0,t.length)}catch(e){}
  var ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();ok?res():rej(new Error('copy'))})}

/* ---------- penyimpanan + notifikasi ---------- */
function notify(role,text,w,by){DB.add('notifs',{ts:new Date().toISOString(),date:w.date,time:w.time.replace('.',':'),to:role,type:'JUGRAK_UPDATE',text:text,docId:'',link:'updl/'+w.date,read:false,from:by})}
/* simpan draf (finish=false) atau selesai (finish=true) */
function save(v,finish){Perm.require('depo.update');var u=Auth.user(),w=wib(),cur=myDraft(),clean={};ALL.forEach(function(f){clean[f[0]]=num(v[f[0]])});
 var rec={date:w.date,time:w.time,shift:w.shift,ts:new Date().toISOString(),by:u.username,vals:clean,text:build(clean,w),status:finish?'done':'draft'};
 if(cur){DB.upd('depoupd',cur.id,rec);rec.id=cur.id}else rec=DB.add('depoupd',rec);
 if(finish){DB.log('UPDATE JUGRAK SET & ANTRIAN',sumJ(clean)+' | Antrian: '+sumA(clean));
  var msg='Update Jugrak Set dan Antrian dari '+u.nama+' ('+w.shift+', '+w.time+' WIB) — Jugrak Set: '+sumJ(clean)+'. Antrian: '+sumA(clean)+'. Siap disalin ke WhatsApp.';
  notify('ADMIN',msg,w,u.username);notify('SUPERVISOR',msg,w,u.username)}
 return rec}
function markCopied(id){Perm.require('depo.copy');var u=Auth.user(),w=wib();DB.upd('depoupd',id,{copied:{by:u.nama||u.username,time:w.time,date:w.date}});DB.log('SALIN UPDATE JUGRAK SET & ANTRIAN','id '+id)}

/* ---------- kartu di Dashboard ---------- */
function cta(){var d=myDraft(),l=doneToday()[0],st=d?'<span class="ust">Draf tersimpan</span>':l?'<span class="ust ok">✓ Selesai '+esc(l.time)+'</span>':'<span class="ust">Belum diisi</span>';
 return'<a class="updcta" href="#upd"><span class="uci">'+UI.ic('chat')+'</span><span class="uct"><b>'+TITLE+'</b><small>Isi angka · Simpan · Selesai</small></span>'+st+'</a>'}
function ctaView(){var n=doneToday().length,l=doneToday()[0],nc=doneToday().filter(function(r){return!r.copied}).length;
 return'<a class="updcta" href="#updl"><span class="uci">'+UI.ic('chat')+'</span><span class="uct"><b>'+TITLE+'</b><small>'+(n?(nc?nc+' update belum disalin ke WhatsApp':'Semua sudah disalin'):'Menunggu update dari Checker Galon')+'</small></span><span class="ust '+(n&&!nc?'ok':'')+'">'+(l?'Terakhir '+esc(l.time):'Belum ada')+'</span></a>'}

/* ---------- halaman Checker: form ---------- */
function row(f,val){return'<div class="uf" data-k="'+f[0]+'"><label for="u_'+f[0]+'">'+esc(f[2])+'</label><div class="ustep"><button type="button" class="m" data-d="-1" aria-label="Kurangi '+esc(f[2])+'">−</button><input id="u_'+f[0]+'" name="'+f[0]+'" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" enterkeyhint="next" placeholder="0" value="'+esc(val)+'" aria-label="'+esc(f[2])+'"><button type="button" class="p" data-d="1" aria-label="Tambah '+esc(f[2])+'">+</button></div></div>'}
function page(){var w=wib(),dr=myDraft(),v=Object.assign(empty(),dr?dr.vals:{});
 Object.keys(v).forEach(function(k){if(dr&&v[k]===0)v[k]=''; });
 var html='<div class="fpage updpg">'+
 '<div class="ustrip"><span>'+UI.ic('cal')+'<i id="uDate">'+esc(w.long)+'</i></span><span>'+UI.ic('clock')+'<i id="uTime">'+esc(w.time)+'</i> WIB</span><span class="usf">'+UI.ic('flag')+'<i id="uShift">'+esc(w.shift)+'</i></span></div>'+
 '<form id="updF" novalidate autocomplete="off">'+
 '<section class="card ucard"><div class="usec">Jugrak Set</div>'+F1.map(function(f){return row(f,v[f[0]])}).join('')+'</section>'+
 '<section class="card ucard"><div class="usec">Antrian<small>kosong? biarkan 0</small></div>'+F2.map(function(f){return row(f,v[f[0]])}).join('')+'</section>'+
 '<div class="err" id="uErr" role="alert"></div>'+
 '<div class="uact"><button type="button" class="btn ghost big2" id="uSave">'+UI.ic('check')+'<span>Simpan</span></button><button type="button" class="btn big2 wa" id="uDone">'+UI.ic('ok')+'<span>Selesai</span></button></div>'+
 '<p class="unote">Setelah <b>Selesai</b>, Admin dan KA Gudang mendapat notifikasi dan menyalin pesannya ke WhatsApp.</p>'+
 '</form>'+
 '<section class="card ucard" id="uHist"></section></div>';
 return{t:TITLE,s:'',html:html,after:after}}

function histHtml(){var L=all().slice(0,12);
 return'<div class="usec">Riwayat input<small>'+L.length+' terakhir</small></div>'+(L.length?'<ul class="uhl">'+L.map(function(r){var d=isDone(r);
  return'<li><div class="uhm"><b>'+esc(UI.dmy(r.date))+' · '+esc(r.time)+' WIB</b><small>'+esc(r.shift||'')+'</small><small class="uhs">'+esc(sumJ(r.vals))+'<br>'+esc(sumA(r.vals))+'</small></div><span class="ubadge '+(d?'ok':'dr')+'">'+(d?'Selesai':'Draf')+'</span></li>'}).join('')+'</ul>':'<p class="muted note">Belum ada riwayat.</p>')}

function after(){var form=document.getElementById('updF');if(!form)return;
 var inputs=[].slice.call(form.querySelectorAll('.ustep input'));
 function vals(){var o={};inputs.forEach(function(i){o[i.name]=i.value});return o}
 function err(m){document.getElementById('uErr').textContent=m||''}
 function hist(){var h=document.getElementById('uHist');if(h)h.innerHTML=histHtml()}
 function tickNow(){var a=document.getElementById('uTime');if(!a){clearInterval(tick);tick=null;return}var w=wib();a.textContent=w.time;document.getElementById('uDate').textContent=w.long;document.getElementById('uShift').textContent=w.shift}
 function touched(){return inputs.some(function(i){return i.value!==''})}
 function flash(b,txt){var s=b.querySelector('span'),o=s.textContent;s.textContent=txt;b.classList.add('okk');setTimeout(function(){s.textContent=o;b.classList.remove('okk')},1600)}
 form.addEventListener('input',function(e){var t=e.target;if(!t.matches('.ustep input'))return;var c=t.value.replace(/\D/g,'').slice(0,6);if(c!==t.value)t.value=c;err('')});
 form.addEventListener('focusin',function(e){var t=e.target;if(t.matches&&t.matches('.ustep input'))setTimeout(function(){try{t.select()}catch(x){}},0)});
 form.addEventListener('keydown',function(e){if(e.key!=='Enter'||!e.target.matches('.ustep input'))return;e.preventDefault();var i=inputs.indexOf(e.target);if(i<inputs.length-1)inputs[i+1].focus();else e.target.blur()});
 form.addEventListener('submit',function(e){e.preventDefault()});
 form.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;
  if(b.dataset.d){var i=b.parentNode.querySelector('input');i.value=String(Math.max(0,num(i.value)+Number(b.dataset.d)));err('');return}
  if(b.id==='uSave'){if(!touched()){err('Isi angka dulu sebelum menyimpan.');return}try{save(vals(),false);hist();UI.toast('Tersimpan sebagai draf');flash(b,'Tersimpan ✓')}catch(x){err(x.message)}return}
  if(b.id==='uDone'){if(!touched()){err('Isi angka dulu sebelum menekan Selesai.');return}
   try{save(vals(),true);inputs.forEach(function(i){i.value=''});hist();UI.toast('Selesai · Admin dan KA Gudang sudah diberi notifikasi');flash(b,'Terkirim ✓');window.scrollTo({top:0,behavior:'smooth'})}catch(x){err(x.message)}}});
 hist();if(tick)clearInterval(tick);tick=setInterval(tickNow,20000)}

/* ---------- halaman Admin / KA Gudang: daftar + tombol Salin ---------- */
function vrow(f,v){return'<div><span>'+esc(f[2])+'</span><b>'+num(v[f[0]])+'</b></div>'}
function card(r){var cp=r.copied;
 return'<article class="uvc"><div class="uvh"><div><b>'+esc(r.time)+' WIB</b><small>'+esc(r.shift||'')+' · oleh '+esc(r.by)+'</small></div>'+(cp?'<span class="ubadge ok">Sudah disalin · '+esc(cp.time)+'</span>':'<span class="ubadge dr">Belum disalin</span>')+'</div>'+
 '<div class="uvg"><div class="uvs"><h5>Jugrak Set</h5>'+F1.map(function(f){return vrow(f,r.vals)}).join('')+'</div><div class="uvs"><h5>Antrian</h5>'+F2.map(function(f){return vrow(f,r.vals)}).join('')+'</div></div>'+
 '<button type="button" class="btn big2 wa" data-cp="'+r.id+'">'+UI.ic('copy')+'<span>Salin</span></button></article>'}
function view(arg){var d=H.normDate(arg),isT=d===wib().date,L=onDate(d).filter(isDone),drafts=onDate(d).filter(function(r){return!isDone(r)}).length;
 var html='<div class="fpage updpg">'+H.dbar('updl',d,{all:false})+
 '<div class="uvinfo">'+UI.ic('chat')+'<span>Tekan <b>Salin</b>, lalu tempel di grup WhatsApp.'+(drafts?' <em>'+drafts+' draf Checker belum Selesai.</em>':'')+'</span></div>'+
 (L.length?L.map(card).join(''):'<div class="card ucard">'+UI.empty(isT?'Belum ada update dari Checker Galon hari ini.':'Tidak ada update pada '+UI.dmy(d)+'.')+'</div>')+'</div>';
 return{t:TITLE,s:'',html:html,after:function(){
  var pg=document.querySelector('.updpg');if(!pg)return;
  pg.addEventListener('click',function(e){var b=e.target.closest('[data-cp]');if(!b)return;var r=DB.get('depoupd').find(function(x){return x.id===b.dataset.cp});if(!r)return;
   copyText(r.text||build(r.vals,{long:UI.longDate(r.date),time:r.time})).then(function(){try{markCopied(r.id)}catch(x){}UI.toast('Tersalin! Buka WhatsApp, lalu tempel di grup');var s=b.querySelector('span');s.textContent='Tersalin ✓';b.classList.add('okk');var bd=b.closest('.uvc').querySelector('.ubadge');if(bd){bd.className='ubadge ok';bd.textContent='Sudah disalin · '+wib().time}setTimeout(function(){s.textContent='Salin';b.classList.remove('okk')},1800)},function(){UI.toast('Gagal menyalin otomatis',1)})})}}}
return{page:page,view:view,cta:cta,ctaView:ctaView,build:build,wib:wib,today:today,TITLE:TITLE}})();

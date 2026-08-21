(() => {
  'use strict';
  // Real two-device play uses PeerJS/WebRTC. PeerJS Cloud is only the signaling layer;
  // game data is sent directly between the two browsers.
  let mpPeer = null, mpConn = null, mpRole = null, mpOpponent = '', mpCode = '';
  let activeCleanup = null;
  const $ = id => document.getElementById(id);
  const stage = () => $('stage');
  const me = () => localStorage.getItem('birthdayUser') || 'لاعب';
  const otherName = () => me() === 'حمزة' ? 'بيان' : 'حمزة';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyles(){
    if($('mpStyles')) return;
    const s=document.createElement('style');s.id='mpStyles';s.textContent=`
      .mpModal{position:fixed;inset:0;z-index:999;background:#0007;display:grid;place-items:center;padding:18px}
      .mpBox{width:min(520px,100%);background:#fff;border-radius:28px;padding:28px;text-align:center;color:#111;box-shadow:0 25px 80px #0005}
      .mpBox h2{color:#111}.mpChoices{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}.mpChoice{border:2px solid #e4cad6;background:#fff;border-radius:20px;padding:20px;color:#111;font-weight:900;cursor:pointer}.mpChoice:hover{border-color:#b52f64;transform:translateY(-2px)}
      .mpInput{width:100%;padding:14px;border:2px solid #dec7d2;border-radius:14px;text-align:center;font-size:1.4rem;letter-spacing:5px;color:#111}
      .roomCode{font-size:2.3rem;font-weight:950;letter-spacing:8px;color:#b52f64;background:#fff0f6;border-radius:18px;padding:16px;margin:15px 0;user-select:all}
      .mpStatus{padding:14px;border-radius:16px;background:#fff0f6;color:#111;line-height:1.8;margin:14px 0}
      .mpPlayers{display:flex;justify-content:center;gap:18px;align-items:center;margin:14px 0;font-weight:900}.mpPlayer{padding:12px 18px;border-radius:18px;background:#f7edf2;color:#111}.mpVs{color:#b52f64;font-size:1.5rem}
      .mpScore{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.mpScore div{background:#fff0f6;padding:10px 16px;border-radius:15px;color:#111;font-weight:900}
      .mpTargetArena{height:310px;background:#fff0f6;border-radius:22px;position:relative;overflow:hidden}.mpTarget{position:absolute;width:60px;height:60px;border:0;border-radius:50%;background:#b52f64;color:#fff;font-size:1.3rem;cursor:pointer}
      .mpBoard{display:grid;grid-template-columns:repeat(3,80px);gap:7px;justify-content:center}.mpCell{height:80px;border:0;border-radius:12px;background:#b52f64;color:#fff;font-size:2rem;cursor:pointer}.mpCell:disabled{opacity:.9}
      .mpChoicesGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mpAnswer{padding:14px;border:2px solid #e2c5d1;background:#fff;border-radius:15px;color:#111;font-weight:900;cursor:pointer}.mpAnswer:disabled{opacity:.6}
      .mpBig{font-size:3rem;font-weight:950;color:#b52f64}.mpFinish{background:linear-gradient(135deg,#fff0f6,#f0e8ff);border-radius:24px;padding:25px;margin-top:18px;color:#111}.mpFinish h2{color:#b52f64}.mpHeartline{font-size:30px}
      @media(max-width:550px){.mpChoices{grid-template-columns:1fr}.mpChoicesGrid{grid-template-columns:1fr}.mpBoard{grid-template-columns:repeat(3,70px)}.mpCell{height:70px}}
    `;document.head.appendChild(s);
  }

  function modal(html){
    injectStyles();
    const old=$('mpModal');if(old)old.remove();
    const m=document.createElement('div');m.id='mpModal';m.className='mpModal';m.innerHTML=`<div class="mpBox">${html}</div>`;document.body.appendChild(m);return m;
  }
  function closeModal(){const m=$('mpModal');if(m)m.remove();}
  function modeChooser(type){
    const title=({target:'🎯 اضرب الهدف',memory:'🧠 الذاكرة',xo:'❌⭕ XO',reaction:'⚡ ردة الفعل',numbers:'🔢 ذاكرة الأرقام',simon:'🧠 Simon',word:'🔤 خمن الكلمة',quiz:'🏆 Quiz',wheel:'🎡 عجلة التحدي',boxes:'🎁 صناديق المفاجأة',coin:'🪙 عملة الحظ',higher:'🎴 أعلى أم أقل؟'})[type]||'اللعبة';
    modal(`<h2>${title}</h2><p>مع مين بدك تلعب؟</p><div class="mpChoices"><button class="mpChoice" id="mpComputer">🤖<br>مع الكمبيوتر</button><button class="mpChoice" id="mpPerson">❤️<br>مع ${esc(otherName())}</button></div><button class="btn alt" id="mpCancel">رجوع</button>`);
    $('mpComputer').onclick=()=>{closeModal();window.__birthdayOriginalGame(type)};
    $('mpPerson').onclick=()=>startRoom(type);
    $('mpCancel').onclick=closeModal;
  }

  function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=chars[Math.floor(Math.random()*chars.length)];return c;}
  function destroyPeer(){try{if(mpConn)mpConn.close();}catch(e){}try{if(mpPeer)mpPeer.destroy();}catch(e){}mpPeer=null;mpConn=null;mpRole=null;mpOpponent='';mpCode='';}
  function send(data){if(mpConn&&mpConn.open)mpConn.send(data);}

  function startRoom(type){
    closeModal();destroyPeer();
    modal(`<h2>❤️ لعب مع ${esc(otherName())}</h2><p>اختاروا مين ينشئ الغرفة ومين يدخل بالكود.</p><div class="mpChoices"><button class="mpChoice" id="mpCreate">🏠<br>إنشاء غرفة</button><button class="mpChoice" id="mpJoin">🔑<br>دخول بكود</button></div><button class="btn alt" id="mpBack">رجوع</button>`);
    $('mpCreate').onclick=()=>createRoom(type);$('mpJoin').onclick=()=>joinRoom(type);$('mpBack').onclick=()=>modeChooser(type);
  }
  function createRoom(type){
    const code=makeCode();mpRole='host';mpCode=code;
    modal(`<h2>غرفتك جاهزة 🎮</h2><p>ابعث هذا الكود إلى ${esc(otherName())}:</p><div class="roomCode">${code}</div><div class="mpStatus" id="mpWait">جاري إنشاء الغرفة…</div><button class="btn alt" id="mpCancelRoom">إلغاء</button>`);
    $('mpCancelRoom').onclick=()=>{destroyPeer();closeModal();};
    try{mpPeer=new Peer('birthday-'+code,{debug:0});}catch(e){$('mpWait').textContent='تعذر تشغيل الاتصال. جرب مرة ثانية.';return;}
    mpPeer.on('open',()=>{$('mpWait').textContent='بانتظار '+otherName()+'… الكود محفوظ فوق.';});
    mpPeer.on('connection',conn=>{if(mpConn){conn.close();return;}mpConn=conn;setupConn(type);});
    mpPeer.on('error',e=>{$('mpWait').textContent='مشكلة اتصال: '+(e.type||'unknown')+'. جرّب إنشاء غرفة جديدة.';});
  }
  function joinRoom(type){
    modal(`<h2>🔑 دخول الغرفة</h2><p>اكتب الكود الذي أعطاك إياه ${esc(otherName())}.</p><input id="mpCodeInput" class="mpInput" maxlength="6" autocomplete="off" placeholder="ABC123"><div class="mpStatus" id="mpJoinStatus">بعد كتابة الكود اضغط دخول.</div><button class="btn" id="mpConnect">دخول ❤️</button><button class="btn alt" id="mpBackJoin">رجوع</button>`);
    $('mpBackJoin').onclick=()=>startRoom(type);
    $('mpConnect').onclick=()=>{
      const code=$('mpCodeInput').value.trim().toUpperCase();if(code.length!==6){$('mpJoinStatus').textContent='الكود لازم يكون 6 أحرف/أرقام.';return;}
      mpRole='guest';mpCode=code;$('mpJoinStatus').textContent='جاري الاتصال…';
      try{mpPeer=new Peer({debug:0});}catch(e){$('mpJoinStatus').textContent='تعذر تشغيل الاتصال.';return;}
      mpPeer.on('open',()=>{mpConn=mpPeer.connect('birthday-'+code,{reliable:true});setupConn(type);});
      mpPeer.on('error',e=>{$('mpJoinStatus').textContent='تعذر الاتصال بالغرفة. تأكد من الكود وأن '+otherName()+' ما زال فاتح الغرفة.';});
    };
  }
  function setupConn(type){
    mpConn.on('open',()=>{
      if(mpRole==='host'){
        send({t:'hello',name:me(),type});
        closeModal();startMulti(type,true);
      }else{
        send({t:'hello',name:me(),type});
        $('mpJoinStatus')&&($('mpJoinStatus').textContent='تم الاتصال!');
      }
    });
    mpConn.on('data',data=>handleData(type,data));
    mpConn.on('close',()=>{if(stage()&&!stage().classList.contains('hide'))showDisconnect();});
    mpConn.on('error',()=>{});
  }
  function handleData(type,d){
    if(!d||!d.t)return;
    if(d.t==='hello'){
      mpOpponent=d.name||otherName();
      if(mpRole==='guest'){closeModal();startMulti(type,false);send({t:'ready',name:me()});}
      else {send({t:'ready',name:me()});}
    }else if(d.t==='start'){if(window.__mpReceive)window.__mpReceive(d);}
    else if(window.__mpReceive)window.__mpReceive(d);
  }
  function showDisconnect(){
    if(!stage())return;stage().classList.remove('hide');stage().innerHTML='<div class="mpFinish"><div class="mpBig">💔</div><h2>انقطع الاتصال</h2><p>الجولة توقفت لأن اللاعب الثاني خرج من الغرفة.</p><p><b>ولا يهم… بحبك يا بيان ❤️</b></p><button class="btn" id="mpBackDisconnect">العودة للألعاب</button></div>';$('mpBackDisconnect').onclick=()=>{destroyPeer();stage().classList.add('hide');stage().innerHTML='';};
  }
  function finishMulti(result,extra=''){
    if(activeCleanup)activeCleanup();activeCleanup=null;
    stage().innerHTML=`<div class="mpFinish"><div class="finishIcon">💖</div><h2>انتهت المواجهة ❤️</h2><div class="result">${result}</div>${extra}<p>مهما كانت النتيجة، أحلى شيء إنكم لعبتوها سوا.</p><div class="mpBig">بحبك يا بيان ❤️</div><div class="mpHeartline">❤️ 💗 💕 💖 ✨ ❤️</div><button class="btn" id="mpAgain">جولة ثانية</button><button class="btn alt" id="mpExit">العودة للألعاب</button></div>`;
    $('mpAgain').onclick=()=>{destroyPeer();modeChooser(window.__mpType);};
    $('mpExit').onclick=()=>{destroyPeer();stage().classList.add('hide');stage().innerHTML='';};
  }

  function startMulti(type,isHost){
    window.__mpType=type;stage().classList.remove('hide');stage().scrollIntoView({behavior:'smooth',block:'center'});
    const fn={target:multiTarget,memory:multiMemory,xo:multiXO,reaction:multiReaction,numbers:multiNumbers,simon:multiSimon,word:multiWord,quiz:multiQuiz,wheel:sharedActivity,boxes:sharedActivity,coin:multiCoin,higher:multiHigher}[type]||multiTarget;
    fn(isHost);send({t:'start',type,seed:Math.floor(Math.random()*1e9)});
  }
  function statusShell(title,desc){stage().innerHTML=`<h2>${title}</h2><p>${desc}</p><div class="mpPlayers"><div class="mpPlayer">${me()}</div><div class="mpVs">VS</div><div class="mpPlayer">${esc(mpOpponent||otherName())}</div></div><div id="mpStatus" class="mpStatus">جاري تجهيز الجولة…</div><div id="mpGame"></div>`;}
  function multiTarget(isHost){
    statusShell('🎯 اضرب الهدف','20 ثانية. كل واحد يجمع نقاطه على جهازه.');$('mpStatus').textContent='جاهزين! ابدأوا عند ظهور الهدف.';$('mpGame').innerHTML='<div class="mpScore"><div>أنت: <span id="myScore">0</span></div><div>'+esc(mpOpponent||otherName())+': <span id="opScore">0</span></div></div><div id="mpArena" class="mpTargetArena"></div><p>الوقت: <b id="mpTime">20</b></p>';
    let score=0,time=20,ended=false,op=0;const arena=$('mpArena');
    const spawn=()=>{arena.innerHTML='';const b=document.createElement('button');b.className='mpTarget';b.textContent='❤️';b.style.left=(Math.random()*82+3)+'%';b.style.top=(Math.random()*72+5)+'%';b.onclick=()=>{if(ended)return;score++;$('myScore').textContent=score;send({t:'score',score});spawn();};arena.appendChild(b);};
    window.__mpReceive=d=>{if(d.t==='score'){op=d.score;$('opScore').textContent=op;}if(d.t==='finish'){op=d.score;$('opScore').textContent=op;maybeEnd();}};
    function maybeEnd(){if(ended)return;ended=true;finishMulti(score===op?`تعادل <b>${score} - ${op}</b> 🤝❤️`:score>op?`أنت الفائز <b>${score} - ${op}</b> 🏆❤️`:`${esc(mpOpponent||otherName())} فاز <b>${op} - ${score}</b> 🏆❤️`);}
    spawn();gameTimer=setInterval(()=>{time--;$('mpTime').textContent=time;if(time<=0){clearInterval(gameTimer);send({t:'finish',score});$('mpStatus').textContent='انتهت جولتك… ننتظر النتيجة الثانية.';setTimeout(maybeEnd,400);}},1000);activeCleanup=()=>{clearInterval(gameTimer);window.__mpReceive=null;};
  }
  function multiXO(isHost){
    statusShell('❌⭕ XO','مواجهة مباشرة. حمزة وبيان على نفس اللوحة.');$('mpStatus').textContent=isHost?'أنت X — ابدأ أولًا.':'أنت O — انتظر دور X.';$('mpGame').innerHTML='<div id="mpBoard" class="mpBoard"></div>';
    const cells=Array(9).fill(''),board=$('mpBoard');let turn=isHost,over=false;const my=isHost?'X':'O';const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];const won=x=>wins.some(w=>w.every(i=>cells[i]===x));
    function render(){cells.forEach((v,i)=>{board.children[i].textContent=v;board.children[i].disabled=!!v||!turn||over;});$('mpStatus').textContent=over?'انتهت الجولة.':turn?'دورك الآن.':'دور '+esc(mpOpponent||otherName())+'…';}
    function end(result){over=true;render();finishMulti(result);}
    window.__mpReceive=d=>{if(d.t==='move'){if(over)return;cells[d.i]=d.mark;turn=true;render();if(won(d.mark))end(d.mark===my?'فزت!':'خسرت هذه الجولة');else if(cells.every(Boolean))end('تعادل! 🤝❤️');}};
    for(let i=0;i<9;i++){const b=document.createElement('button');b.className='mpCell';b.onclick=()=>{if(over||!turn||cells[i])return;cells[i]=my;turn=false;send({t:'move',i,mark:my});render();if(won(my))end('فزت! 🏆❤️');else if(cells.every(Boolean))end('تعادل! 🤝❤️');};board.appendChild(b);}render();activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiReaction(isHost){
    statusShell('⚡ سباق ردة الفعل','أول واحد يضغط بعد الإشارة يفوز.');$('mpGame').innerHTML='<button id="mpReact" class="reactionBtn">انتظر…</button>';
    const b=$('mpReact');let ready=false,done=false,wonLocal=false;const wait=1300+Math.random()*2500;setTimeout(()=>{ready=true;b.classList.add('go');b.textContent='اضغط الآن!';send({t:'go',at:Date.now()});},wait);
    window.__mpReceive=d=>{if(d.t==='go'&&!ready){ready=true;b.classList.add('go');b.textContent='اضغط الآن!';}};
    b.onclick=()=>{if(done)return;if(!ready){finishMulti('ضغطت قبل الإشارة 😄');done=true;return;}done=true;send({t:'reaction',time:performance.now()});finishMulti('وصلتِ أولًا! ⚡🏆');};
    activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiNumbers(isHost){
    const n=String(Math.floor(10000+Math.random()*90000));statusShell('🔢 ذاكرة الأرقام','نفس الرقم يظهر لكما، وبعدها كل واحد يكتبه.');$('mpGame').innerHTML=`<div class="mpBig" id="mpNumber">${n}</div><p>احفظ الرقم… سيختفي بعد 3 ثوانٍ.</p>`;
    setTimeout(()=>{stage().querySelector('#mpGame').innerHTML='<input id="mpNum" class="input" inputmode="numeric" maxlength="5" placeholder="اكتب الرقم"><br><button class="btn" id="mpNumBtn">تحقق</button>';let done=false;$('mpNumBtn').onclick=()=>{if(done)return;done=true;const ok=$('mpNum').value.trim()===n;send({t:'num',ok});finishMulti(ok?'تذكرت الرقم! 🧠🏆':'ما زبطت هذه المرة 😄');};window.__mpReceive=d=>{if(d.t==='num'&&d.ok){$('mpStatus').textContent=esc(mpOpponent||otherName())+' تذكّر الرقم! 🧠';}};},3000);activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiQuiz(isHost){
    const qs=[['شو التاريخ المميز؟',['5 فبراير','5 مارس','25 فبراير'],0],['مين صاحب عيد الميلاد؟',['حمزة','بيان','الكمبيوتر'],1],['شو أجمل كلمة؟',['سلام','بحبك','موز'],1],['مين كتب الموقع؟',['حمزة','جوجل','سبونج بوب'],0],['شو النتيجة الأهم؟',['النقاط','الفوز','إننا سوا ❤️'],2]];let i=0,score=0,opScore=0,done=false;statusShell('🏆 Quiz ضد '+esc(mpOpponent||otherName()),'نفس الأسئلة لكما. أسرعوا!');const render=()=>{const[q,opts,c]=qs[i];$('mpGame').innerHTML=`<div class="mpScore"><div>أنت: ${score}</div><div>${esc(mpOpponent||otherName())}: ${opScore}</div></div><h3>${q}</h3><div class="mpChoicesGrid" id="mpQ"></div>`;opts.forEach((o,j)=>{const b=document.createElement('button');b.className='mpAnswer';b.textContent=o;b.onclick=()=>{score+=j===c?1:0;i++;send({t:'q',score,index:i});if(i===qs.length)end();else render();};$('mpQ').appendChild(b);});};function end(){if(done)return;done=true;send({t:'qfinish',score});finishMulti(`نتيجتك <b>${score}/${qs.length}</b>`, `<p>نتيجة ${esc(mpOpponent||otherName())}: <b>${opScore}/${qs.length}</b></p>`);}window.__mpReceive=d=>{if(d.t==='q'){opScore=d.score||0;if(i<qs.length)render();}if(d.t==='qfinish'){opScore=d.score||0;}};render();activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiMemory(isHost){
    const symbols=['❤️','🌸','🎂','💎','⭐','🎀','🦋','🍓'];const deck=[...symbols,...symbols].sort(()=>Math.random()-.5);let open=[],moves=0,matched=0,locked=false,done=false;statusShell('🧠 ذاكرة المواجهة','نفس البطاقات لكما. أقل محاولات يفوز.');$('mpGame').innerHTML='<div id="mmBoard" class="memory"></div><div class="mpScore"><div>محاولاتك: <span id="mmMoves">0</span></div><div>'+esc(mpOpponent||otherName())+': <span id="mmOp">—</span></div></div>';const board=$('mmBoard');deck.forEach((v,i)=>{const b=document.createElement('button');b.className='mem';b.textContent='?';b.onclick=()=>{if(locked||b.classList.contains('open'))return;b.textContent=v;b.classList.add('open');open.push(i);if(open.length<2)return;moves++;$('mmMoves').textContent=moves;const[a,c]=open;if(deck[a]===deck[c]){matched++;open=[];if(matched===symbols.length){done=true;send({t:'memfinish',moves});finishMulti(`أكملت الذاكرة في <b>${moves}</b> محاولة 🧠❤️`);}}else{locked=true;setTimeout(()=>{[a,c].forEach(k=>{board.children[k].textContent='?';board.children[k].classList.remove('open');});open=[];locked=false;},600);}};board.appendChild(b);});window.__mpReceive=d=>{if(d.t==='memfinish'){$('mmOp').textContent=d.moves;}};activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiSimon(isHost){
    const colors=['🔴','🟢','🔵','🟡'];let seq=[],round=0,player=0,locked=false,done=false;statusShell('🧠 Simon ضد '+esc(mpOpponent||otherName()),'نفس التسلسل. من يصل للجولة 5 يفوز.');$('mpGame').innerHTML='<div id="msGrid" class="simonGrid"></div><div id="msInfo" class="result">جاري البداية…</div>';const grid=$('msGrid');colors.forEach((c,i)=>{const b=document.createElement('button');b.className='simonBtn';b.textContent=c;b.onclick=()=>press(i);grid.appendChild(b);});function flash(i){grid.children[i].classList.add('flash');setTimeout(()=>grid.children[i].classList.remove('flash'),300);}function next(){round++;seq.push(Math.floor(Math.random()*4));player=0;locked=true;$('msInfo').textContent=`الجولة ${round} من 5`;seq.forEach((v,k)=>setTimeout(()=>flash(v),k*500+250));setTimeout(()=>locked=false,seq.length*500+320);}function press(i){if(locked||done)return;if(i!==seq[player]){done=true;send({t:'simonlose',round});finishMulti(`وصلتِ للجولة <b>${round}</b> ❤️`);return;}player++;if(player===seq.length){if(round===5){done=true;send({t:'simonwin',round});finishMulti('أكملتِ 5 جولات! 🏆🧠');}else{locked=true;setTimeout(next,550);}}}window.__mpReceive=d=>{if(d.t==='simonlose'){done=true;finishMulti(esc(mpOpponent||otherName())+' وصل للجولة '+d.round+' ❤️');}if(d.t==='simonwin'){done=true;finishMulti(esc(mpOpponent||otherName())+' أكمل 5 جولات! 🏆');}};next();activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiWord(isHost){
    const words=['قلب','وردة','حب','فرحة','بيان'];const answer=words[Math.floor(Math.random()*words.length)];let tries=6,done=false;statusShell('🔤 خمن الكلمة ضد '+esc(mpOpponent||otherName()),'نفس الكلمة لكما. عندك 6 محاولات.');$('mpGame').innerHTML='<input id="mwInput" class="input" maxlength="5" placeholder="اكتب تخمينك"><br><button class="btn" id="mwBtn">خمن</button><div id="mwInfo" class="result">المحاولات: 6</div>';function submit(){if(done)return;const g=$('mwInput').value.trim();if(!g)return;tries--;if(g===answer){done=true;send({t:'wordwin'});finishMulti('صح! خمنتِ الكلمة 🎉❤️');return;}if(tries===0){done=true;send({t:'wordlose'});finishMulti('انتهت المحاولات ❤️');return;}$('mwInfo').textContent='المحاولات: '+tries;$('mwInput').value='';} $('mwBtn').onclick=submit;$('mwInput').onkeydown=e=>{if(e.key==='Enter')submit();};window.__mpReceive=d=>{if(d.t==='wordwin'){done=true;finishMulti(esc(mpOpponent||otherName())+' خمن الكلمة أولًا! 🏆');}if(d.t==='wordlose')$('mwInfo').textContent=esc(mpOpponent||otherName())+' انتهت محاولاته.';};activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiCoin(isHost){
    statusShell('🪙 تحدي القرارات','خمس جولات سريعة بدون أي رهان أو نقاط مالية.');let round=0,my=0,op=0,waiting=false;function next(){round++;if(round>5){finishMulti(my===op?'تعادل 5 جولات 🤝❤️':my>op?`فزتِ <b>${my}-${op}</b> 🏆❤️`:`${esc(mpOpponent||otherName())} فاز <b>${op}-${my}</b> 🏆❤️`);return;}$('mpGame').innerHTML=`<h3>الجولة ${round} من 5</h3><div class="mpChoices"><button class="mpChoice" id="heads">🌞 اختيار A</button><button class="mpChoice" id="tails">🌙 اختيار B</button></div><div class="mpStatus" id="coinWait">اختاروا، والنتيجة تظهر لما يختار الطرفان.</div>`;let choice=null,other=null;$('heads').onclick=()=>pick('A');$('tails').onclick=()=>pick('B');function pick(c){if(choice)return;choice=c;$('heads').disabled=$('tails').disabled=true;send({t:'coin',round,choice:c});if(other)resolve();else $('coinWait').textContent='اختيارك وصل… ننتظر '+esc(mpOpponent||otherName());}function resolve(){const result=Math.random()<.5?'A':'B';if(choice===result)my++;if(other===result)op++;$('coinWait').textContent=`النتيجة: ${result==='A'?'🌞':'🌙'}`;setTimeout(next,900);}window.__mpReceive=d=>{if(d.t==='coin'&&d.round===round){other=d.choice;if(choice)resolve();}};next();activeCleanup=()=>{window.__mpReceive=null;};
  }
  function multiHigher(isHost){
    const deck=[1,2,3,4,5,6,7,8,9,10];let current=deck[Math.floor(Math.random()*deck.length)],round=0,my=0,op=0;statusShell('🎴 أعلى أم أقل؟','توقعوا البطاقة التالية، 5 جولات.');function render(){round++;if(round>5){finishMulti(my===op?`تعادل <b>${my}-${op}</b> 🤝❤️`:my>op?`فزتِ <b>${my}-${op}</b> 🏆`:esc(mpOpponent||otherName())+' فاز <b>'+op+'-'+my+'</b> 🏆');return;}const next=deck[Math.floor(Math.random()*deck.length)];$('mpGame').innerHTML=`<div class="mpBig">${current}</div><p>الجولة ${round}/5</p><div class="mpChoices"><button class="mpChoice" id="hi">⬆️ أعلى</button><button class="mpChoice" id="lo">⬇️ أقل</button></div><div class="mpStatus">اختاروا. النتيجة تظهر بعد اختيار الطرفين.</div>`;let a=null,b=null;$('hi').onclick=()=>pick('H');$('lo').onclick=()=>pick('L');function pick(x){if(a)return;a=x;send({t:'high',round,choice:x});if(b)resolve();}window.__mpReceive=d=>{if(d.t==='high'&&d.round===round){b=d.choice;if(a)resolve();}};function resolve(){const actual=next>current?'H':next<current?'L':'E';if(a===actual)my++;if(b===actual)op++;current=next;setTimeout(render,800);} }render();activeCleanup=()=>{window.__mpReceive=null;};
  }
  function sharedActivity(isHost){statusShell('❤️ فعالية مشتركة','هذه الفعالية الآن مع '+esc(mpOpponent||otherName())+'. نفّذوا التحدي سوا ثم اضغطوا جاهز.');$('mpGame').innerHTML='<div class="mpStatus">اختاروا أي حركة/مهمة تحبوا تعملوها معًا.</div><button class="btn" id="readyBtn">أنا جاهز ❤️</button><div id="readyInfo" class="result">ننتظر الطرفين.</div>';let ready=false,other=false;$('readyBtn').onclick=()=>{if(ready)return;ready=true;$('readyBtn').disabled=true;send({t:'readyGame'});check();};window.__mpReceive=d=>{if(d.t==='readyGame'){other=true;check();}};function check(){if(ready&&other)finishMulti('خلصتوا الفعالية سوا! ❤️','<p>وهذا بحد ذاته أحلى فوز.</p>');}activeCleanup=()=>{window.__mpReceive=null;};}

  // Capture game buttons before the original single-player handler. The existing
  // computer games remain untouched; person mode is added on top.
  function boot(){
    injectStyles();
    window.__birthdayOriginalGame = null;
    // Preserve the original handler by temporarily allowing its normal click after
    // our mode dialog. We call it through a synthetic event only after choosing computer.
    document.querySelectorAll('[data-game]').forEach(btn=>{
      btn.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        const type=btn.getAttribute('data-game');
        modeChooser(type);
      },true);
    });
    // Find the original game function indirectly by replaying the button after temporarily
    // disabling our capture listeners is not reliable, so expose a tiny bridge using a second click.
    document.querySelectorAll('[data-game]').forEach(btn=>{
      btn.addEventListener('click',()=>{},false);
    });
  }
  // Patch: when computer is selected, dispatch the original click while the capture
  // listener is disabled for one microtask.
  const originalDispatch=EventTarget.prototype.dispatchEvent;
  window.__birthdayOriginalGame=(type)=>{
    const btn=document.querySelector(`[data-game="${type}"]`);
    if(!btn)return;
    btn.dataset.mpBypass='1';
    const old=btn.dataset.mpBypass;
    btn.removeAttribute('data-game');
    btn.click();
    btn.setAttribute('data-game',type);
    if(old)btn.dataset.mpBypass=old;
  };
  document.addEventListener('DOMContentLoaded',boot);
})();

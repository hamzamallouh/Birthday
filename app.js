(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const choose = $('choose');
  const app = $('app');
  const who = $('who');
  const stage = $('stage');
  let gameTimer = null;
  let cleanup = null;

  function clearGame() {
    if (gameTimer) { clearInterval(gameTimer); clearTimeout(gameTimer); gameTimer = null; }
    if (cleanup) { cleanup(); cleanup = null; }
  }

  function enterUser(name) {
    localStorage.setItem('birthdayUser', name);
    choose.classList.add('hide');
    app.classList.remove('hide');
    who.textContent = name === 'حمزة' ? '👨🏻 حمزة' : '👩🏻 بيان';
  }

  function changeUser() {
    clearGame();
    localStorage.removeItem('birthdayUser');
    app.classList.add('hide');
    choose.classList.remove('hide');
    stage.classList.add('hide');
    stage.innerHTML = '';
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function celebrate() {
    for (let i=0;i<35;i++) {
      const h=document.createElement('span');
      h.className='heart';
      h.textContent=['❤️','💗','💕','💖','✨'][Math.floor(Math.random()*5)];
      h.style.left=(Math.random()*100)+'vw';
      h.style.fontSize=(18+Math.random()*28)+'px';
      document.body.appendChild(h);
      setTimeout(()=>h.remove(),5200);
    }
  }

  function finish(message) {
    clearGame();
    stage.innerHTML = `
      <div class="finishIcon">💖</div>
      <h2>انتهت اللعبة ❤️</h2>
      <div class="result">${message}</div>
      <p>الفوز أو الخسارة ما بغير أهم نتيجة…</p>
      <div class="big">بحبك يا بيان ❤️</div>
      <p>ومن حمزة إلى بيان: كل سنة وإنتِ أجمل شيء بحياتي.</p>
      <div class="heartsLine">❤️ 💗 💕 💖 ✨ ❤️</div>
      <button class="btn" id="celebrateBtn">احتفال 🎉</button>
      <button class="btn alt" id="backBtn">العودة للألعاب</button>`;
    $('celebrateBtn').addEventListener('click',celebrate);
    $('backBtn').addEventListener('click',()=>{stage.classList.add('hide');stage.innerHTML='';window.scrollTo({top:0,behavior:'smooth'});});
    celebrate();
  }

  function openGame(type) {
    clearGame();
    stage.classList.remove('hide');
    stage.scrollIntoView({behavior:'smooth',block:'center'});
    const games={target, memory, xo, reaction, numbers, simon, word, quiz, wheel, boxes, coin, higher};
    (games[type] || target)();
  }

  function target(){
    stage.innerHTML='<h2>🎯 اضرب الهدف</h2><p>عندك 20 ثانية. كل ضربة = نقطة.</p><div class="big" id="tgScore">0</div><div class="arena" id="tgArena"></div><p>الوقت: <b id="tgTime">20</b> ثانية</p><button class="btn alt" id="stopGame">إنهاء</button>';
    let score=0,time=20, ended=false;
    const arena=$('tgArena');
    const spawn=()=>{arena.innerHTML='';const b=document.createElement('button');b.className='target';b.textContent='❤️';b.style.left=(Math.random()*82+3)+'%';b.style.top=(Math.random()*72+5)+'%';b.addEventListener('click',()=>{if(ended)return;score++;$('tgScore').textContent=score;spawn();});arena.appendChild(b);};
    const end=()=>{if(ended)return;ended=true;finish(`جمعتِ <b>${score}</b> نقطة 🎯<br>سرعة رائعة!`);};
    spawn();gameTimer=setInterval(()=>{time--;$('tgTime').textContent=time;if(time<=0)end();},1000);$('stopGame').addEventListener('click',end);
  }

  function memory(){
    const symbols=['❤️','🌸','🎂','💎','⭐','🎀','🦋','🍓'];
    const deck=[...symbols,...symbols].sort(()=>Math.random()-.5);
    stage.innerHTML='<h2>🧠 الذاكرة</h2><p>طابق كل الأزواج بأقل عدد من المحاولات.</p><div id="memBoard" class="memory"></div><div id="memMoves" class="result">المحاولات: 0</div>';
    const board=$('memBoard');let open=[],moves=0,matched=0,locked=false;
    deck.forEach((value,index)=>{const b=document.createElement('button');b.className='mem';b.textContent='?';b.addEventListener('click',()=>{if(locked||b.classList.contains('open'))return;b.textContent=value;b.classList.add('open');open.push(index);if(open.length<2)return;moves++;$('memMoves').textContent=`المحاولات: ${moves}`;const[a,c]=open;if(deck[a]===deck[c]){matched++;open=[];if(matched===symbols.length)setTimeout(()=>finish(`أكملتِ كل الأزواج في <b>${moves}</b> محاولة 🧠🏆`),350);}else{locked=true;setTimeout(()=>{[a,c].forEach(i=>{board.children[i].textContent='?';board.children[i].classList.remove('open');});open=[];locked=false;},650);}});board.appendChild(b);});
  }

  function xo(){
    stage.innerHTML='<h2>❌⭕ XO</h2><p>أنت X والكمبيوتر O.</p><div id="xoBoard" class="board"></div>';
    const board=$('xoBoard'),cells=Array(9).fill('');let turn=true,over=false;
    const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const won=x=>wins.some(w=>w.every(i=>cells[i]===x));
    const check=()=>{if(won('X')){over=true;finish('فزتِ على الكمبيوتر! 🏆❤️');return true;}if(won('O')){over=true;finish('الكمبيوتر فاز هذه الجولة 🤖❤️');return true;}if(cells.every(Boolean)){over=true;finish('تعادل! لعب قوي من الطرفين ❤️');return true;}return false;};
    const render=()=>cells.forEach((v,i)=>board.children[i].textContent=v);
    const computer=()=>{const free=cells.map((v,i)=>v?null:i).filter(i=>i!==null);if(!free.length)return;let move=free.find(i=>{cells[i]='O';const w=won('O');cells[i]='';return w;});if(move===undefined)move=free.find(i=>{cells[i]='X';const w=won('X');cells[i]='';return w;});if(move===undefined&&cells[4]==='')move=4;if(move===undefined)move=free[Math.floor(Math.random()*free.length)];cells[move]='O';render();check();turn=true;};
    for(let i=0;i<9;i++){const b=document.createElement('button');b.className='cell';b.addEventListener('click',()=>{if(over||!turn||cells[i])return;cells[i]='X';render();if(check())return;turn=false;setTimeout(computer,280);});board.appendChild(b);}
  }

  function reaction(){
    stage.innerHTML='<h2>⚡ اختبار ردة الفعل</h2><p>لا تضغط قبل ظهور الإشارة الخضراء.</p><button id="reactionBtn" class="reactionBtn">انتظر…</button>';
    const b=$('reactionBtn');let ready=false,started=0,done=false;const wait=900+Math.random()*2800;
    gameTimer=setTimeout(()=>{ready=true;started=performance.now();b.classList.add('go');b.textContent='اضغط الآن!';},wait);
    b.addEventListener('click',()=>{if(done)return;done=true;if(!ready){finish('ضغطتِ بسرعة زيادة 😄<br>المرة الجاية استني الإشارة ❤️');}else{finish(`زمن ردة فعلك <b>${Math.round(performance.now()-started)} ms</b> ⚡`);}});
  }

  function numbers(){
    const n=String(Math.floor(10000+Math.random()*90000));stage.innerHTML=`<h2>🔢 ذاكرة الأرقام</h2><p>احفظي الرقم. سيختفي بعد 3 ثوانٍ.</p><div class="numberShow">${n}</div>`;
    gameTimer=setTimeout(()=>{stage.innerHTML='<h2>🔢 اكتبي الرقم</h2><input id="numInput" class="input" inputmode="numeric" maxlength="5" placeholder="الرقم هنا"><br><button class="btn" id="numCheck">تحقق</button>';const check=()=>{const value=$('numInput').value.trim();finish(value===n?'صحيح! ذاكرتك ممتازة 🧠🏆':'الرقم الصحيح كان <b>'+n+'</b> 😄<br>بس النتيجة الأهم: بحبك يا بيان ❤️');};$('numCheck').addEventListener('click',check);$('numInput').addEventListener('keydown',e=>{if(e.key==='Enter')check();});$('numInput').focus();},3000);
  }

  function simon(){
    const colors=['🔴','🟢','🔵','🟡'];let sequence=[],player=0,round=0,locked=false;
    stage.innerHTML='<h2>🧠 Simon</h2><p>احفظي التسلسل واضغطي نفس الألوان.</p><div id="simonGrid" class="simonGrid"></div><div id="simonInfo" class="result">الجولة 1</div>';
    const grid=$('simonGrid'),info=$('simonInfo');
    colors.forEach((c,i)=>{const b=document.createElement('button');b.className='simonBtn';b.textContent=c;b.addEventListener('click',()=>press(i));grid.appendChild(b);});
    function flash(i){const b=grid.children[i];b.classList.add('flash');setTimeout(()=>b.classList.remove('flash'),330);}
    function next(){round++;sequence.push(Math.floor(Math.random()*4));player=0;locked=true;info.textContent=`الجولة ${round} من 5`;sequence.forEach((v,k)=>setTimeout(()=>flash(v),k*520+350));setTimeout(()=>locked=false,sequence.length*520+400);}
    function press(i){if(locked)return;if(i!==sequence[player]){finish(`وصلتِ إلى الجولة <b>${round}</b> — محاولة جميلة 🧠❤️`);return;}player++;if(player===sequence.length){if(round===5){finish('أكملتِ 5 جولات كاملة! 🏆🧠');}else{locked=true;setTimeout(next,650);}}}
    next();
  }

  function word(){
    const words=['قلب','وردة','حب','فرحة','بيان'];const answer=words[Math.floor(Math.random()*words.length)];let tries=6;
    stage.innerHTML='<h2>🔤 خمن الكلمة</h2><p>الكلمة من الكلمات المرتبطة بعيد الميلاد والحب. عندك 6 محاولات.</p><input id="wordInput" class="input" maxlength="5" placeholder="اكتب تخمينك"><br><button class="btn" id="wordBtn">خمن</button><div id="wordInfo" class="result">المحاولات المتبقية: 6</div>';
    const submit=()=>{const guess=$('wordInput').value.trim();if(!guess)return;tries--;if(guess===answer){finish(`صح! الكلمة كانت <b>${answer}</b> 🎉`);return;}if(tries===0){finish(`انتهت المحاولات. الكلمة كانت <b>${answer}</b> ❤️`);return;}$('wordInfo').textContent=`المحاولات المتبقية: ${tries}`;$('wordInput').value='';$('wordInput').focus();};$('wordBtn').addEventListener('click',submit);$('wordInput').addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
  }

  function quiz(){
    const qs=[['شو التاريخ المميز؟',['5 فبراير','5 مارس','25 فبراير'],0],['مين صاحب عيد الميلاد؟',['حمزة','بيان','الكمبيوتر'],1],['شو أجمل كلمة؟',['سلام','بحبك','موز'],1],['مين كتب الموقع؟',['حمزة','جوجل','سبونج بوب'],0],['شو لون القلوب؟',['أبيض','❤️','أسود'],1],['شو النتيجة الأهم؟',['النقاط','الفوز','إننا سوا ❤️'],2],['آخر سؤال: مين بتحب بيان؟',['حمزة ❤️','الكمبيوتر','ولا حدا'],0]];let i=0,score=0;
    const render=()=>{const[q,opts,correct]=qs[i];stage.innerHTML=`<h2>🏆 Quiz</h2><p>السؤال ${i+1} من ${qs.length}</p><div class="quizq">${q}</div><div id="quizChoices" class="choice"></div>`;const box=$('quizChoices');opts.forEach((o,j)=>{const b=document.createElement('button');b.textContent=o;b.addEventListener('click',()=>{if(j===correct)score++;i++;if(i===qs.length)finish(`نتيجتك <b>${score}/${qs.length}</b> 🏆❤️`);else render();});box.appendChild(b);});};render();
  }

  function wheel(){
    const items=['قولي جملة حلوة','اختاري صورة مفضلة','جاوبي سؤال حب','اختاري أغنية','ارسلي قلب ❤️','اختاري تحدي سريع'];stage.innerHTML='<h2>🎡 عجلة التحدي</h2><div class="wheel" id="wheel">🎡</div><button class="btn" id="spin">لف العجلة</button><div id="wheelResult" class="result">اضغطي لبدء الجولة.</div>';$('spin').addEventListener('click',()=>{const item=items[Math.floor(Math.random()*items.length)];$('wheel').style.transform='rotate(720deg)';$('wheelResult').textContent='التحدي: '+item;setTimeout(()=>finish('خلصتِ تحدي العجلة: <b>'+item+'</b> 🎡❤️'),1300);});
  }

  function boxes(){stage.innerHTML='<h2>🎁 صناديق المفاجأة</h2><p>اختاري صندوقًا واحدًا فقط.</p><div id="boxes" class="boxes"></div>';const prizes=['💌 رسالة خاصة','💖 مفاجأة حب','🎉 تهنئة سرية'];const box=$('boxes');prizes.forEach((p,i)=>{const b=document.createElement('button');b.className='gift';b.textContent='🎁';b.addEventListener('click',()=>finish(`اخترتِ الصندوق رقم <b>${i+1}</b> وطلع لك: ${p} 🎁❤️`));box.appendChild(b);});}

  function coin(){stage.innerHTML='<h2>🪙 عملة الحظ</h2><p>خمس جولات. اختاري وجه العملة.</p><div id="coinInfo" class="result">الجولة 1 من 5</div><div class="choice"><button id="heads">وجه</button><button id="tails">كتابة</button></div>' ;let round=0,score=0;const play=(guess)=>{if(round>=5)return;round++;const result=Math.random()<.5?'وجه':'كتابة';if(guess===result)score++;$('coinInfo').textContent=`الجولة ${Math.min(round+1,5)} من 5 • الصحيح: ${result}`;if(round===5)setTimeout(()=>finish(`فزتِ في <b>${score}</b> من 5 جولات 🪙❤️`),500);};$('heads').addEventListener('click',()=>play('وجه'));$('tails').addEventListener('click',()=>play('كتابة'));}

  function higher(){let current=Math.floor(Math.random()*13)+1,round=0,score=0;stage.innerHTML='<h2>🎴 أعلى أم أقل؟</h2><p>توقعي البطاقة التالية.</p><div id="cardValue" class="numberShow">'+current+'</div><div class="choice"><button id="higherBtn">أعلى ⬆️</button><button id="lowerBtn">أقل ⬇️</button></div><div id="highInfo" class="result">الجولة 1 من 5</div>';const play=(guess)=>{if(round>=5)return;const next=Math.floor(Math.random()*13)+1;round++;const ok=guess==='up'?next>current:next<current;if(ok)score++;current=next;$('cardValue').textContent=current;$('highInfo').textContent=`الجولة ${Math.min(round+1,5)} من 5`;if(round===5)setTimeout(()=>finish(`توقعتِ صح في <b>${score}</b> من 5 جولات 🎴❤️`),500);};$('higherBtn').addEventListener('click',()=>play('up'));$('lowerBtn').addEventListener('click',()=>play('down'));}


  const loveStage=$('loveStage');
  function showLove(content){loveStage.innerHTML=content+'<div class="miniNav"><button class="btn alt" id="closeLove">رجوع ❤️</button></div>';loveStage.classList.add('open');loveStage.scrollIntoView({behavior:'smooth',block:'center'});$('closeLove').addEventListener('click',()=>{loveStage.classList.remove('open');loveStage.innerHTML='';});}
  function loveLetter(){showLove('<div class="eyebrow">رسالة من حمزة</div><h2>إلى بيان ❤️</h2><div class="letterReveal"><div class="loveText"><div class="secretLine show">في ناس وجودهم بحياتنا بكون إشي عادي…</div><div class="secretLine" id="l2">وفي ناس وجودهم بخلّي الأيام إلها معنى مختلف.</div><div class="secretLine" id="l3">وإنتِ من الناس اللي وجودهم لحاله إله مكان خاص. ❤️</div><button class="btn" id="revealNext">كمّلي الرسالة</button></div></div>');let step=1;$('revealNext').addEventListener('click',()=>{step++;const el=step===2?$('l2'):$('l3');if(el){el.classList.add('show');if(step===3)$('revealNext').textContent='❤️';}});}
  function whyLove(){const lines=['لأن وجودك بخلّي أبسط الأيام إلها طعم ثاني.','لأن ضحكتك من الأشياء اللي بتستاهل تنحفظ بالذاكرة.','لأنك مش مجرد شخص داخل القصة… إنتِ من أجمل فصولها.','ولأن عيد ميلادك بالنسبة هالموقع مش تاريخ وبس… هو سبب لكل هالتفاصيل. ❤️'];showLove('<div class="eyebrow">أشياء صغيرة</div><h2>ليش بيان مميزة؟ 🌷</h2><div id="whyLines" class="loveText"></div><button class="btn" id="whyBtn">كمان وحدة</button>');let i=0;const add=()=>{if(i<lines.length){const p=document.createElement('p');p.className='secretLine';p.textContent=lines[i++];$('whyLines').appendChild(p);requestAnimationFrame(()=>p.classList.add('show'));if(i===lines.length)$('whyBtn').textContent='خلصت الرسائل ❤️';}};$('whyBtn').addEventListener('click',add);add();}
  function messageBox(){const messages=['يا بيان، وجودك بحد ذاته سبب للفرحة. ❤️','كل سنة وإنتِ بخير، وكل سنة وقلبك مرتاح ومبسوط.','أتمنى كل الأشياء الحلوة اللي بتستاهليها تلاقي طريقها إلك.','اليوم إلك… فخلي كل لحظة فيه حلوة. 🎂','في رسالة وحدة أكيدة: بحبك يا بيان. ❤️'];const pick=messages[Math.floor(Math.random()*messages.length)];showLove('<div class="eyebrow">رسالة عشوائية</div><h2>🎁 إلك رسالة</h2><div class="letterReveal softQuote">'+pick+'</div><button class="btn" id="anotherMsg">رسالة ثانية</button>');$('anotherMsg').addEventListener('click',messageBox);}
  function birthdayLove(){const next=new Date();next.setHours(0,0,0,0);next.setMonth(1,5);if(new Date()>next)next.setFullYear(next.getFullYear()+1);const diff=Math.max(0,next-new Date());const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,mins=Math.floor(diff/60000)%60;showLove('<div class="eyebrow">5 FEBRUARY</div><h2>اليوم اللي إله معنى ❤️</h2><p class="loveText">كل سنة وإنتِ بخير يا بيان. اليوم مش بس تاريخ على التقويم… هو اليوم اللي بدأ فيه فصل جميل من الحياة.</p><div class="countdown"><div class="countUnit"><b>'+days+'</b><small>يوم</small></div><div class="countUnit"><b>'+hours+'</b><small>ساعة</small></div><div class="countUnit"><b>'+mins+'</b><small>دقيقة</small></div></div><p class="softQuote">وجودك هو الهدية. 🎂❤️</p>');}
  function loveCounter(){showLove('<div class="eyebrow">مستحيل نوصل للنهاية</div><h2>عداد الحب ❤️</h2><div id="loveNumber" class="loveCounter">0</div><p class="loveText">كل ضغطة بترفع العداد… بس المشكلة إنه ما رح يقدر يلحق.</p><button class="btn" id="loveTap">زودي الحب ❤️</button>');let n=0;$('loveTap').addEventListener('click',()=>{n+=Math.floor(Math.random()*90)+10;$('loveNumber').textContent=n.toLocaleString();celebrate();});}
  function memories(){const key='birthday_romantic_memories',saved=JSON.parse(localStorage.getItem(key)||'[]');showLove('<div class="eyebrow">دفتر خاص</div><h2>دفتر اللحظات 📝</h2><p class="loveText">اكتبي لحظة بتحبي تضل معك. بتنحفظ على نفس الجهاز فقط.</p><div class="memoryForm"><input id="memoryInput" class="input" placeholder="مثلاً: أجمل موقف بتتذكريه"><button class="btn" id="saveMemory">حفظ</button></div><div id="memoryList"></div>');const render=()=>{$('memoryList').innerHTML=saved.length?saved.map((m,i)=>'<div class="savedMemory">❤️ '+m+' <button class="btn alt" data-del="'+i+'">حذف</button></div>').join(''):'<p class="result">لسه الدفتر فاضي… اكتبي أول لحظة. ❤️</p>';};render();$('saveMemory').addEventListener('click',()=>{const v=$('memoryInput').value.trim();if(!v)return;saved.unshift(v);localStorage.setItem(key,JSON.stringify(saved));$('memoryInput').value='';render();});$('memoryList').addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;saved.splice(Number(b.dataset.del),1);localStorage.setItem(key,JSON.stringify(saved));render();});}
  function futureMessage(){const key='birthday_future_message',old=localStorage.getItem(key)||'';showLove('<div class="eyebrow">من بيان المستقبل</div><h2>رسالة للمستقبل 💭</h2><p class="loveText">اكتبي رسالة قصيرة لنفسك، وافتحيها بعد فترة لما ترجعي للموقع.</p><div class="wishBox"><textarea id="futureText" class="input" placeholder="يا بيان المستقبل…">'+old+'</textarea><br><button class="btn" id="saveFuture">احفظي الرسالة</button><div id="futureSaved" class="result">'+(old?'الرسالة محفوظة على هالجهاز ❤️':'')+'</div></div>');$('saveFuture').addEventListener('click',()=>{const v=$('futureText').value.trim();localStorage.setItem(key,v);$('futureSaved').textContent=v?'انحفظت… لا تنسي ترجعي تقرئيها ❤️':'اكتبي الرسالة أولاً ❤️';});}
  function calm(){showLove('<div class="eyebrow">خدي نفس</div><h2>لحظة هدوء ✨</h2><div class="letterReveal"><p class="softQuote">اليوم مش لازم يكون كامل…<br>يكفي يكون فيه لحظة وحدة خلتك تبتسمي. ❤️</p><div class="heartsLine">♡ 💗 ♡ 💕 ♡ ❤️ ♡</div></div>');}
  document.querySelectorAll('[data-love]').forEach(b=>b.addEventListener('click',()=>({letter:loveLetter,why:whyLove,messages:messageBox,birthday:birthdayLove,counter:loveCounter,memories,future:futureMessage,calm}[b.dataset.love]||calm)()));

  document.querySelectorAll('[data-user]').forEach(b=>b.addEventListener('click',()=>enterUser(b.dataset.user)));
  document.querySelector('[data-action="change"]').addEventListener('click',changeUser);
  document.querySelectorAll('[data-game]').forEach(b=>b.addEventListener('click',()=>openGame(b.dataset.game)));
  const saved=localStorage.getItem('birthdayUser'); if(saved==='حمزة'||saved==='بيان') enterUser(saved);
})();
/* ============================================================
   KITE — shared components + Today + Trackers screens
   ============================================================ */

/* ---------- PaceBar ---------- */
function PaceBar(tr, {height, showMarker=true}={}) {
  const p=progressFor(tr);
  const pp=pacePercent(tr);
  const hv = height? 'style="--pb-h:'+height+'px"':'';
  return '<div class="pacebar '+statusClass(tr.paceStatus)+'">'+
    '<div class="pacebar-track" '+hv+'>'+
      '<div class="pacebar-fill" style="--pct:'+p.percent+'%"></div>'+
      ((showMarker&&pp!=null)? '<div class="pacebar-marker" style="--pace-pct:'+pp+'%"></div>':'')+
    '</div></div>';
}

function paceChip(tr){
  return '<span class="pace-label '+statusClass(tr.paceStatus)+'"><span class="dot"></span>'+t(statusKey(tr.paceStatus))+'</span>';
}

/* mini ring (habit success / project) */
function Ring(pct, color, size=40, sw=5){
  const r=(size-sw)/2, c=2*Math.PI*r, off=c*(1-pct/100);
  return '<svg class="ring" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" style="--pace:'+color+'">'+
    '<circle class="ring-bg" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke-width="'+sw+'"/>'+
    '<circle class="ring-fg" cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke-width="'+sw+'" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/>'+
    '</svg>';
}

function tileBg(color){ return 'style="--tile-bg:'+hexA(color,0.14)+';color:'+color+'"'; }
function hexA(hex,a){
  const h=hex.replace('#',''); const n=parseInt(h,16);
  const r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* ---------- TrackerCard ---------- */
function TrackerCard(tr){
  const p=progressFor(tr);
  let sub='';
  if(tr.type==='habit'){
    sub = '<span>'+ICON.flame.replace('<svg','<svg width="14" height="14" style="color:var(--pace-on);vertical-align:-2px"')+' '+tr.streak+' '+t('detail.days')+'</span>'+
          '<span class="faint">·</span><span>'+tr.successRate+'% '+t('detail.success').toLowerCase()+'</span>';
  } else if(tr.type==='average'){
    sub = '<span>'+t('detail.target')+': '+fmtVal(tr,tr.targetValue)+'</span><span class="faint">·</span><span>Ø '+fmtVal(tr,tr.avg)+'</span>';
  } else if(tr.type==='project'){
    const ms=(State.milestones[tr.id]||[]);
    const done=ms.filter(m=>m.progress>=100).length;
    sub = '<span>'+done+'/'+ms.length+' '+t('detail.milestones').toLowerCase()+'</span>';
  } else {
    sub = '<span>'+fmtVal(tr,p.current)+' / '+fmtVal(tr,p.goal)+'</span>';
  }

  const right = tr.type==='habit'
    ? '<div style="position:relative;width:40px;height:40px;flex:0 0 40px" class="'+statusClass('on_track')+'">'+Ring(tr.successRate,'var(--pace-on)')+
      '<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:11px;font-weight:800" class="tnum">'+tr.successRate+'</div></div>'
    : '<span class="chev">'+ICON.chev+'</span>';

  const showBar = tr.type==='target'||tr.type==='average'||tr.type==='project';

  return '<div class="tcard" onclick="push(\'detail\',{id:\''+tr.id+'\'})">'+
    '<div class="tile" '+tileBg(tr.color)+'>'+tr.icon+'</div>'+
    '<div class="tcard-main">'+
      '<div class="tcard-top"><span class="dot '+statusClass(tr.paceStatus)+'"></span>'+
        '<span class="tcard-name">'+tr.name+'</span></div>'+
      (showBar? '<div class="mini-pace">'+PaceBar(tr,{height:7})+'</div>':'')+
      '<div class="tcard-sub">'+sub+'</div>'+
    '</div>'+ right +'</div>';
}

/* ---------- HistoryChart (SVG line) ---------- */
function HistoryChart(tr){
  const data=historyFor(tr);
  const W=320,H=150,pad=8;
  const max=Math.max(...data.map(d=>Math.max(d.actual,d.pace)))*1.1||1;
  const X=i=>pad+(i/(data.length-1))*(W-pad*2);
  const Y=v=>H-pad-(v/max)*(H-pad*2);
  const line=(key)=>data.map((d,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(d[key]).toFixed(1)).join(' ');
  const area=line('actual')+' L'+X(data.length-1).toFixed(1)+' '+(H-pad)+' L'+X(0).toFixed(1)+' '+(H-pad)+' Z';
  const col = tr.paceStatus==='behind'?'var(--pace-behind)':tr.paceStatus==='ahead'?'var(--pace-ahead)':'var(--pace-on)';
  return '<div class="chart-wrap '+statusClass(tr.paceStatus)+'">'+
    '<svg width="100%" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="overflow:visible">'+
      '<defs><linearGradient id="g'+tr.id+'" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0" stop-color="'+col+'" stop-opacity="0.22"/>'+
        '<stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs>'+
      [0.25,0.5,0.75].map(f=>'<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+(H*f)+'" y2="'+(H*f)+'" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"/>').join('')+
      '<path d="'+area+'" fill="url(#g'+tr.id+')"/>'+
      '<path d="'+line('pace')+'" fill="none" stroke="var(--text-3)" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round"/>'+
      '<path d="'+line('actual')+'" fill="none" stroke="'+col+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="'+X(data.length-1)+'" cy="'+Y(data[data.length-1].actual)+'" r="4.5" fill="'+col+'" stroke="var(--surface)" stroke-width="2.5"/>'+
    '</svg>'+
    '<div class="chart-legend"><span><i style="background:'+col+'"></i>'+tr.name+'</span>'+
      '<span><i style="background:var(--text-3)"></i>'+t('detail.shouldBe')+'</span></div>'+
  '</div>';
}

/* ================= TODAY ================= */
function ScreenToday(){
  const trs=State.trackers.filter(x=>x.dueToday);
  const total=trs.length;
  const done=trs.filter(x=>x.done).length;
  const h=new Date().getHours();
  const greet = h<12?'today.greetMorning':h<18?'today.greetAfternoon':'today.greetEvening';
  const dateStr=new Date('2026-06-14').toLocaleDateString(State.lang==='vi'?'vi-VN':'en-US',{weekday:'long',month:'long',day:'numeric'});

  if(State.trackers.length===0) return emptyToday();

  const pending=trs.filter(x=>!x.done);
  const complete=trs.filter(x=>x.done);

  const head='<div class="today-head">'+
    '<div class="today-date">'+dateStr+'</div>'+
    '<h1 class="today-greet">'+t(greet)+'</h1>'+
    '<div class="today-summary">'+
      '<div style="position:relative;width:52px;height:52px" class="'+statusClass('on_track')+'">'+Ring(total?done/total*100:0,'var(--brand)',52,6)+
        '<div style="position:absolute;inset:0;display:grid;place-items:center;font-weight:800;font-size:14px" class="tnum">'+done+'/'+total+'</div></div>'+
      '<div class="sum-text"><div class="sum-big">'+t('today.summaryDone',{done,total})+'</div>'+
        '<div class="sum-cap">'+(done===total?t('today.allClear'):t('today.summaryCap'))+'</div></div>'+
    '</div></div>';

  const list = (done===total && total>0)
    ? '<div class="empty" style="padding-top:48px"><div class="empty-art">🎉</div>'+
      '<div class="empty-title">'+t('today.allClear')+'</div><div class="empty-body">'+t('today.allClearBody')+'</div></div>'
    : '<div class="section-label">'+t('today.dueToday')+'</div>'+
      '<div style="padding:0 var(--s5);display:flex;flex-direction:column;gap:12px">'+pending.map(LogRow).join('')+'</div>';

  const doneSec = complete.length? '<div class="section-label">'+t('today.completed')+'</div>'+
      '<div style="padding:0 var(--s5) var(--s7);display:flex;flex-direction:column;gap:12px">'+complete.map(LogRow).join('')+'</div>'
      : '<div style="height:32px"></div>';

  return head+'<div class="screen-scroll">'+list+doneSec+'</div>';
}

function emptyToday(){
  return '<div class="today-head"><div class="today-date">'+new Date('2026-06-14').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})+'</div>'+
    '<h1 class="today-greet">'+t('today.greetMorning')+'</h1></div>'+
    '<div class="screen-scroll"><div class="empty"><div class="empty-art">🪁</div>'+
    '<div class="empty-title">'+t('today.empty')+'</div><div class="empty-body">'+t('today.emptyBody')+'</div>'+
    '<button class="btn btn-primary" style="margin-top:12px" onclick="push(\'typepicker\')">'+ICON.plus+' '+t('list.create')+'</button></div></div>';
}

/* a single fast-log row */
function LogRow(tr){
  const doneCls=tr.done?'done':'';
  let control='';
  if(tr.type==='habit'){
    control='<div class="check '+(tr.done?'on':'')+'" onclick="event.stopPropagation();toggleHabit(\''+tr.id+'\')">'+ICON.check+'</div>';
  } else if(tr.type==='project'){
    control='<span class="chev">'+ICON.chev+'</span>';
  } else {
    control='<div class="stepper" onclick="event.stopPropagation()">'+
      '<button onclick="bump(\''+tr.id+'\',-1)">−</button>'+
      '<div class="val tnum">'+fmtNum(tr.todayLog||0)+'<small>'+(tr.unit||t('common.done'))+'</small></div>'+
      '<button onclick="bump(\''+tr.id+'\',1)">+</button></div>';
  }
  let sub='';
  if(tr.type==='habit') sub=ICON.flame.replace('<svg','<svg width="12" height="12" style="color:var(--pace-on);vertical-align:-1px"')+' '+tr.streak+' '+t('detail.days');
  else if(tr.type==='average') sub=t('detail.target')+' '+fmtVal(tr,tr.targetValue)+'/'+t('common.today').toLowerCase();
  else if(tr.type==='target') sub=fmtVal(tr,progressFor(tr).current)+' / '+fmtVal(tr,tr.targetValue);
  else sub=progressFor(tr).percent+'%';

  return '<div class="logrow '+doneCls+'" onclick="push(\'detail\',{id:\''+tr.id+'\'})">'+
    '<div class="tile tile-sm" '+tileBg(tr.color)+'>'+tr.icon+'</div>'+
    '<div class="lr-main"><div class="lr-name">'+tr.name+'</div>'+
      '<div class="lr-sub row gap2" style="gap:6px"><span class="dot '+statusClass(tr.paceStatus)+'"></span>'+sub+'</div></div>'+
    control+'</div>';
}

function toggleHabit(id){
  const tr=State.trackers.find(x=>x.id===id);
  tr.done=!tr.done; if(tr.done){tr.streak++;toast(t('toast.logged'));} else tr.streak--;
  render();
}
function bump(id,d){
  const tr=State.trackers.find(x=>x.id===id);
  tr.todayLog=Math.max(0,(tr.todayLog||0)+ (tr.quick||1)*d);
  if(tr.type==='target'){ tr.current=(tr.current||0)+(tr.quick||1)*d; }
  if(tr.todayLog>0 && !tr.done){ tr.done=true; } 
  render();
}

/* ================= TRACKERS LIST ================= */
function ScreenTrackers(){
  if(State.trackers.length===0) return emptyTrackers();
  const cards=State.trackers.map(TrackerCard).join('');
  return '<div class="appbar"><div class="appbar-title">'+t('list.title')+'</div><div class="spacer"></div>'+
      '<div class="faint mono" style="font-size:12px">'+State.trackers.length+'</div></div>'+
    '<div class="screen-scroll"><div style="padding:var(--s5);display:flex;flex-direction:column;gap:12px">'+cards+'</div><div style="height:90px"></div></div>'+
    '<button class="fab" onclick="push(\'typepicker\')">'+ICON.plus+'</button>';
}

function emptyTrackers(){
  return '<div class="appbar"><div class="appbar-title">'+t('list.title')+'</div></div>'+
    '<div class="screen-scroll">'+
    '<div class="empty" style="padding-bottom:8px"><div class="empty-art">🪁</div>'+
      '<div class="empty-title">'+t('list.empty')+'</div><div class="empty-body">'+t('list.emptyBody')+'</div></div>'+
    '<div class="section-label">'+t('list.quickHint')+'</div>'+
    '<div class="quickstart-grid">'+QUICKSTARTS.map(q=>
      '<button class="quickstart" onclick="push(\'form\',{prefill:\''+q.key+'\',type:\''+q.type+'\',icon:\''+q.icon+'\'})">'+
        '<span class="em">'+q.icon+'</span>'+q.key+'</button>').join('')+'</div>'+
    '<div style="padding:var(--s5)"><button class="btn btn-primary btn-block btn-lg" onclick="push(\'typepicker\')">'+ICON.plus+' '+t('list.create')+'</button></div>'+
    '</div>';
}

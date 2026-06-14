/* ============================================================
   KITE — Detail, Form, TypePicker, Settings + screen registry
   ============================================================ */

/* ================= DETAIL ================= */
function ScreenDetail({id}){
  const tr=State.trackers.find(x=>x.id===id);
  if(!tr) return '<div class="appbar"></div>';
  const p=progressFor(tr);
  const pp=pacePercent(tr);
  const remain = tr.deadline? Math.max(0,Math.round((new Date(tr.deadline)-new Date('2026-06-14'))/86400000)):null;

  const bar='<div class="appbar"><div class="back" onclick="pop()">'+ICON.back+'</div>'+
    '<div class="appbar-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+tr.name+'</div><div class="spacer"></div>'+
    '<div class="back" onclick="push(\'form\',{id:\''+tr.id+'\'})">'+ICON.edit+'</div></div>';

  /* hero varies by type */
  let hero='';
  if(tr.type==='habit'){
    hero='<div class="detail-hero" style="text-align:center">'+
      '<div style="position:relative;width:120px;height:120px;margin:4px auto 14px" class="'+statusClass('on_track')+'">'+
        Ring(tr.successRate,'var(--pace-on)',120,11)+
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'+
          '<div class="tnum" style="font-size:34px;font-weight:800;line-height:1">'+tr.successRate+'%</div>'+
          '<div class="faint" style="font-size:12px;font-weight:700">'+t('detail.success')+'</div></div></div>'+
      '<div class="row gap2" style="justify-content:center;font-weight:800;font-size:18px">'+
        ICON.flame.replace('<svg','<svg width="22" height="22" style="color:var(--pace-on)"')+
        ' '+tr.streak+' '+t('detail.days')+'</div></div>';
  } else {
    const big = tr.type==='project'? p.percent+'%' : fmtVal(tr,p.current);
    const of = tr.type==='project'? '' : '<div class="pace-of">'+t('detail.target')+' '+fmtVal(tr,p.goal)+'</div>';
    hero='<div class="detail-hero">'+
      '<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:16px">'+
        '<div><div class="pace-num">'+big+'</div>'+of+'</div>'+ paceChip(tr) +'</div>'+
      PaceBar(tr,{height:16})+
      (pp!=null? '<div class="pacebar-meta" style="margin-top:14px"><span class="faint" style="font-size:12px">'+t('detail.expected')+': <b style="color:var(--text-2)">'+fmtVal(tr, p.goal? (tr.startValue||0)+((p.goal-(tr.startValue||0))*pp/100):0)+'</b></span>'+
        (remain!=null?'<span class="faint" style="font-size:12px">'+remain+' '+t('detail.days')+' '+t('detail.remaining').toLowerCase()+'</span>':'')+'</div>':'')+
    '</div>';
  }

  /* stats */
  let stats='';
  if(tr.type==='habit'){
    stats='<div class="stat-grid">'+
      stat(tr.streak,'detail.streak','var(--pace-on)')+
      stat(tr.successRate+'%','detail.success')+
      stat('18','detail.best')+'</div>';
  } else if(tr.type==='project'){
    const ms=State.milestones[tr.id]||[];
    stats='<div class="stat-grid">'+
      stat(p.percent+'%','common.done')+
      stat(ms.filter(m=>m.progress>=100).length+'/'+ms.length,'detail.milestones')+
      stat(remain!=null?remain:'∞','detail.days')+'</div>';
  } else {
    stats='<div class="stat-grid">'+
      statRaw(fmtVal(tr,p.current),t('common.done'))+
      stat(p.percent+'%','detail.target')+
      stat(remain!=null?remain:'∞','detail.days')+'</div>';
  }

  /* chart or milestones */
  let body='';
  if(tr.type==='project'){
    const ms=State.milestones[tr.id]||[];
    body='<div class="panel"><div class="panel-title">'+t('detail.milestones')+'</div>'+
      ms.map(m=>Milestone(m)).join('')+'</div>';
  } else {
    body='<div class="panel"><div class="panel-title">'+t('detail.history')+'</div>'+HistoryChart(tr)+'</div>';
  }

  const logBtn = tr.type!=='project'? '<div style="padding:0 var(--s5) var(--s7)"><button class="btn btn-primary btn-block btn-lg" onclick="toast(t(\'toast.logged\'))">'+ICON.plus+' '+t('detail.logToday')+'</button></div>':'<div style="height:24px"></div>';

  return bar+'<div class="screen-scroll '+statusClass(tr.paceStatus)+'">'+hero+'<div style="height:16px"></div>'+stats+body+logBtn+'</div>';
}

function stat(num,capKey,col){
  return '<div class="stat"><div class="stat-num" '+(col?'style="color:'+col+'"':'')+'>'+num+'</div>'+
    '<div class="stat-cap">'+(capKey?t(capKey):'')+'</div></div>';
}
function statRaw(num,cap,col){
  return '<div class="stat"><div class="stat-num" '+(col?'style="color:'+col+'"':'')+'>'+num+'</div>'+
    '<div class="stat-cap">'+cap+'</div></div>';
}
function PERIOD_LABEL(p){
  const m={en:{daily:'Daily',weekly:'Weekly',monthly:'Monthly'},vi:{daily:'Hằng ngày',weekly:'Hằng tuần',monthly:'Hằng tháng'}};
  return (m[State.lang]||m.en)[p];
}

function Milestone(m){
  return '<div class="milestone" data-ms="'+m.id+'">'+
    '<div class="ms-top"><span class="ms-title">'+m.title+'</span><span class="ms-pct tnum">'+m.progress+'%</span></div>'+
    '<div class="slider" onclick="setMilestone(event,\''+m.id+'\')">'+
      '<div class="slider-track"><div class="slider-fill" style="width:'+m.progress+'%"></div></div>'+
      '<div class="slider-thumb" style="left:'+m.progress+'%"></div></div></div>';
}
function setMilestone(e,id){
  const wrap=e.currentTarget; const rect=wrap.getBoundingClientRect();
  let pct=Math.round(((e.clientX-rect.left)/rect.width)*100); pct=Math.max(0,Math.min(100,pct));
  pct=Math.round(pct/5)*5;
  for(const k in State.milestones){const m=State.milestones[k].find(x=>x.id===id); if(m){m.progress=pct;}}
  render();
}

/* ================= TYPE PICKER ================= */
function ScreenTypePicker(){
  const types=[
    {k:'habit',ic:'🔁',color:'#8b5cf6'},
    {k:'target',ic:'🎯',color:'#2e7d5b'},
    {k:'average',ic:'📊',color:'#0d9488'},
    {k:'project',ic:'🧩',color:'#e0457a'},
  ];
  const bar='<div class="appbar"><div class="back" onclick="pop()">'+ICON.back+'</div>'+
    '<div class="appbar-title">'+t('list.create')+'</div></div>';
  const head='<div style="padding:var(--s6) var(--s5) var(--s3)">'+
    '<h1 style="font-size:var(--t-title);font-weight:800;letter-spacing:-0.6px;margin:0">'+t('type.title')+'</h1>'+
    '<p class="muted" style="margin:6px 0 0;font-size:var(--t-body)">'+t('type.pick')+'</p></div>';
  const list='<div class="type-list">'+types.map(ty=>
    '<div class="typecard" style="--tc-bg:'+hexA(ty.color,0.14)+'" onclick="push(\'form\',{type:\''+ty.k+'\'})">'+
      '<div class="tc-emoji" style="color:'+ty.color+'">'+ty.ic+'</div>'+
      '<div style="flex:1"><div class="tc-name">'+t('type.'+ty.k)+'</div>'+
        '<div class="tc-desc">'+t('type.'+ty.k+'Desc')+'</div>'+
        '<span class="tc-tag" style="color:'+ty.color+'">'+ICON.spark.replace('<svg','<svg style="vertical-align:-2px" ')+' '+t('type.tag'+cap(ty.k))+'</span></div>'+
      '<span class="chev" style="align-self:center">'+ICON.chev+'</span></div>').join('')+'</div>';
  return bar+'<div class="screen-scroll">'+head+list+'</div>';
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

/* ================= FORM ================= */
function ScreenForm(props){
  const editing = props.id? State.trackers.find(x=>x.id===props.id):null;
  const type = editing? editing.type : (props.type||'target');
  const name = editing? editing.name : (props.prefill||'');
  const icon = editing? editing.icon : (props.icon||defaultIcon(type));
  const color = editing? editing.color : '#2e7d5b';
  const unit = editing? (editing.unit||'') : '';
  const target = editing? (editing.targetValue||'') : '';
  const accum = editing? (editing.accumulation||'sum') : 'sum';
  const dir = editing? (editing.direction||'good') : 'good';
  const period = editing? (editing.period||'daily') : 'daily';

  const bar='<div class="appbar"><div class="back" onclick="pop()">'+ICON.back+'</div>'+
    '<div class="appbar-title">'+(editing?t('form.editTitle'):t('form.newTitle'))+'</div>'+
    '<div class="spacer"></div><span class="chip" style="background:var(--brand-weak);color:var(--brand-ink);border-color:transparent">'+typeEmoji(type)+' '+t('type.'+type)+'</span></div>';

  const icons=ICONSET[type]||ICONSET.target;

  let fields='';
  fields+='<div class="field"><label class="field-label">'+t('form.name')+'</label>'+
    '<input class="input" placeholder="'+t('form.namePh')+'" value="'+esc(name)+'"></div>';

  // icon + color
  fields+='<div class="field"><label class="field-label">'+t('form.icon')+'</label>'+
    '<div class="icon-picker">'+icons.map((ic,i)=>'<div class="icon-opt '+(ic===icon?'sel':'')+'" onclick="pickIcon(this)">'+ic+'</div>').join('')+'</div></div>';
  fields+='<div class="field"><label class="field-label">'+t('form.color')+'</label>'+
    '<div class="swatch-row">'+COLORS.map(c=>'<div class="swatch '+(c===color?'sel':'')+'" style="background:'+c+'" onclick="pickSwatch(this)"></div>').join('')+'</div></div>';

  if(type==='target'){
    fields+='<div class="input-row"><div class="field" style="flex:2"><label class="field-label">'+t('form.target')+'</label>'+
      '<input class="input tnum" type="text" inputmode="decimal" placeholder="2000" value="'+esc(target)+'"></div>'+
      '<div class="field" style="flex:1"><label class="field-label">'+t('form.unit')+'</label>'+
      '<input class="input" placeholder="'+t('form.unitPh')+'" value="'+esc(unit)+'"></div></div>';
    fields+='<div class="field"><label class="field-label">'+t('form.mode')+'</label>'+
      '<div class="seg"><button class="'+(accum==='sum'?'on':'')+'" onclick="segPick(this)">'+t('form.sum')+'</button>'+
      '<button class="'+(accum==='latest'?'on':'')+'" onclick="segPick(this)">'+t('form.latest')+'</button></div></div>';
    fields+='<div class="field"><label class="field-label">'+t('form.direction')+'</label>'+
      '<div class="seg"><button class="'+(dir==='good'?'on':'')+'" onclick="segPick(this)">'+t('form.higher')+'</button>'+
      '<button class="'+(dir==='bad'?'on':'')+'" onclick="segPick(this)">'+t('form.lower')+'</button></div></div>';
    fields+='<div class="field"><label class="field-label">'+t('form.deadline')+'</label>'+
      '<input class="input" type="text" value="2026-12-31" placeholder="YYYY-MM-DD"></div>';
  }
  if(type==='average'){
    fields+='<div class="input-row"><div class="field" style="flex:2"><label class="field-label">'+t('form.target')+' / '+t('form.period').toLowerCase()+'</label>'+
      '<input class="input tnum" placeholder="8" value="'+esc(target)+'"></div>'+
      '<div class="field" style="flex:1"><label class="field-label">'+t('form.unit')+'</label>'+
      '<input class="input" placeholder="'+t('form.unitPh')+'" value="'+esc(unit)+'"></div></div>';
    fields+='<div class="field"><label class="field-label">'+t('form.period')+'</label>'+
      '<div class="seg">'+['daily','weekly','monthly'].map(p=>'<button class="'+(period===p?'on':'')+'" onclick="segPick(this)">'+PERIOD_LABEL(p)+'</button>').join('')+'</div></div>';
  }
  if(type==='habit'){
    fields+='<div class="field"><label class="field-label">'+t('form.period')+'</label>'+
      '<div class="seg"><button class="on" onclick="segPick(this)">'+t('common.today')+'</button>'+
      '<button onclick="segPick(this)">Mon–Fri</button><button onclick="segPick(this)">Custom</button></div>'+
      '<span class="field-hint">'+t('today.summaryCap')+'</span></div>';
  }
  if(type==='project'){
    fields+='<div class="field"><label class="field-label">'+t('form.deadline')+'</label>'+
      '<input class="input" type="text" value="2026-07-31" placeholder="YYYY-MM-DD"></div>'+
      '<span class="field-hint">'+t('type.projectDesc')+'</span>';
  }

  const foot='<div class="form-foot">'+
    (editing? '<button class="btn btn-danger-soft" onclick="deleteTracker(\''+editing.id+'\')">'+ICON.trash+'</button>':'')+
    '<button class="btn btn-secondary grow" onclick="pop()">'+t('form.cancel')+'</button>'+
    '<button class="btn btn-primary grow" onclick="saveTracker()">'+t('form.save')+'</button></div>';

  return bar+'<div class="screen-scroll"><div class="form">'+fields+'<div style="height:8px"></div></div></div>'+foot;
}

function defaultIcon(type){return {habit:'🧘',target:'🎯',average:'💧',project:'🚀'}[type]||'🎯';}
function typeEmoji(type){return {habit:'🔁',target:'🎯',average:'📊',project:'🧩'}[type];}
const ICONSET={
  habit:['🧘','🏋️','📖','🚭','💊','🦷','🛏️','🙏'],
  target:['🎯','📚','💰','⚖️','🏃','✍️','🎸','📈'],
  average:['💧','😴','🚶','🥗','☕','📱','💵','🔥'],
  project:['🚀','🧩','🏗️','🎨','🎬','🏡','💼','🎓'],
};
function pickIcon(el){el.parentElement.querySelectorAll('.icon-opt').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');}
function pickSwatch(el){el.parentElement.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel'));el.classList.add('sel');}
function segPick(el){el.parentElement.querySelectorAll('button').forEach(x=>x.classList.remove('on'));el.classList.add('on');}
function saveTracker(){ toast(t('toast.saved')); State.stack=[]; State.tab='trackers'; render(); }
function deleteTracker(id){ State.trackers=State.trackers.filter(x=>x.id!==id); delete State.milestones[id]; toast(t('toast.deleted')); State.stack=[]; State.tab='trackers'; render(); }
function esc(s){return String(s).replace(/"/g,'&quot;');}

/* ================= SETTINGS ================= */
function ScreenSettings(){
  const bar='<div class="appbar"><div class="appbar-title">'+t('tab.settings')+'</div></div>';
  const appearance='<div><div class="set-section-title">'+t('set.appearance')+'</div>'+
    '<div class="set-group">'+
      '<div class="set-row"><span class="set-ico">'+ICON.moon+'</span><span class="set-label">'+t('set.theme')+'</span>'+
        '<span class="chip" style="opacity:.7;cursor:default">'+t('set.themeSoon')+'</span></div>'+
      '<div class="set-row"><span class="set-ico">'+ICON.globe+'</span><span class="set-label">'+t('set.language')+'</span>'+
        '<div class="lang-seg"><button class="'+(State.lang==='en'?'on':'')+'" onclick="setLang(\'en\')">EN</button>'+
        '<button class="'+(State.lang==='vi'?'on':'')+'" onclick="setLang(\'vi\')">VI</button></div></div>'+
    '</div></div>';
  const data='<div><div class="set-section-title">'+t('set.data')+'</div>'+
    '<div class="set-group">'+
      '<div class="set-row" onclick="toast(t(\'set.export\'))" style="cursor:pointer"><span class="set-ico">'+ICON.download+'</span>'+
        '<span class="set-label">'+t('set.export')+'<div class="faint" style="font-size:12px;font-weight:500">'+t('set.exportSub')+'</div></span>'+
        '<span class="chev">'+ICON.chev+'</span></div>'+
      '<div class="set-row" style="cursor:pointer"><span class="set-ico" style="background:var(--pace-behind-weak);color:var(--pace-behind)">'+ICON.trash+'</span>'+
        '<span class="set-label" style="color:var(--pace-behind)">'+t('set.clear')+'<div class="faint" style="font-size:12px;font-weight:500">'+t('set.clearSub')+'</div></span></div>'+
    '</div></div>';
  const about='<div><div class="set-section-title">'+t('set.about')+'</div>'+
    '<div class="set-group"><div class="set-row"><span class="set-label">'+t('set.version')+'</span><span class="faint mono">1.0.0</span></div>'+
      '<div class="set-row"><span class="set-label">'+t('set.offline')+'</span><span class="dot is-on_track" style="width:10px;height:10px"></span></div></div></div>';
  return bar+'<div class="screen-scroll"><div class="settings">'+
    '<div style="text-align:center;padding:8px 0 4px"><div style="font-size:40px">🪁</div>'+
    '<div style="font-weight:800;font-size:20px;letter-spacing:-0.4px;margin-top:4px">Kite</div>'+
    '<div class="faint" style="font-size:13px">'+t('set.offline')+'</div></div>'+
    appearance+data+about+'<div style="height:24px"></div></div></div>';
}
function setLang(l){State.lang=l;render();}

/* ================= registry ================= */
const SCREENS={
  today:ScreenToday, trackers:ScreenTrackers, settings:ScreenSettings,
  detail:ScreenDetail, form:ScreenForm, typepicker:ScreenTypePicker,
};

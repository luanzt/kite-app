/* ============================================================
   KITE — app engine: state, i18n, pace math, navigation
   ============================================================ */

const State = {
  lang: 'en',
  tab: 'today',
  stack: [],            // pushed screens: {name, props}
  trackers: JSON.parse(JSON.stringify(TRACKERS)),
  milestones: JSON.parse(JSON.stringify(MILESTONES)),
};

/* ---- i18n ---- */
function t(key, vars) {
  let s = (I18N[State.lang] && I18N[State.lang][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace('{'+k+'}', vars[k]);
  return s;
}

/* ---- pace math: mirrors progressFor(tracker, entries, milestones) ---- */
function progressFor(tr) {
  const today = new Date('2026-06-14');
  let current=0, goal=0, percent=0, paceStatus=tr.paceStatus||'none';

  if (tr.type==='habit') {
    return { current:tr.streak||0, goal:0, percent:(tr.successRate||0), paceStatus:'none',
             streak:tr.streak||0, successRate:tr.successRate||0 };
  }
  if (tr.type==='average') {
    current=tr.avg||0; goal=tr.targetValue||0;
    percent=goal? Math.min(100,Math.round(current/goal*100)) : 0;
    return { current, goal, percent, paceStatus, successRate:tr.successRate };
  }
  if (tr.type==='project') {
    const ms=(State.milestones[tr.id]||[]);
    const avg = ms.length? ms.reduce((a,m)=>a+m.progress,0)/ms.length : 0;
    return { current:Math.round(avg), goal:100, percent:Math.round(avg), paceStatus };
  }
  /* target */
  const start = tr.startValue!=null?tr.startValue:0;
  current = tr.current!=null?tr.current:start;
  goal = tr.targetValue;
  if (tr.accumulation==='latest' && tr.direction==='bad') {
    // e.g. weight loss 78 -> 65
    const total = start-goal;
    percent = total>0 ? Math.round((start-current)/total*100) : 0;
  } else {
    percent = goal? Math.round((current-start)/(goal-start)*100) : 0;
  }
  percent=Math.max(0,Math.min(100,percent));
  return { current, goal, percent, paceStatus };
}

/* where the pace marker sits (0-100) given dates */
function pacePercent(tr) {
  if (!tr.deadline) return null;
  const s=new Date(tr.startDate).getTime();
  const e=new Date(tr.deadline).getTime();
  const n=new Date('2026-06-14').getTime();
  return Math.max(0,Math.min(100, Math.round((n-s)/(e-s)*100)));
}

function statusKey(s){ return {on_track:'detail.onTrack',behind:'detail.behind',ahead:'detail.ahead',none:'detail.none'}[s]||'detail.none'; }
function statusClass(s){ return 'is-'+(s||'none'); }

function fmtNum(n){
  if(n==null) return '0';
  if(Number.isInteger(n)) return n.toLocaleString();
  return (Math.round(n*10)/10).toLocaleString();
}
function fmtVal(tr,n){
  const u=tr.unit;
  if(u==='$') return '$'+fmtNum(n);
  return fmtNum(n)+(u?' '+u:'');
}

/* ---- navigation ---- */
function go(tab){ State.tab=tab; State.stack=[]; render(); }
function push(name, props){ State.stack.push({name,props:props||{}}); render(); }
function pop(){ State.stack.pop(); render(); }

function toast(msg){
  let el=document.querySelector('.toast');
  if(!el){ el=document.createElement('div'); el.className='toast'; document.querySelector('.phone').appendChild(el); }
  el.innerHTML = ICON.check + '<span>'+msg+'</span>';
  el.classList.add('show');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1600);
}

/* ---- top-level render ---- */
function render() {
  const vp = document.getElementById('viewport');
  let html='';
  if (State.stack.length) {
    const top=State.stack[State.stack.length-1];
    html = SCREENS[top.name](top.props);
  } else {
    html = SCREENS[State.tab]();
  }
  // preserve scroll only within same screen key
  const key = State.stack.length? State.stack[State.stack.length-1].name : State.tab;
  const anim = State.stack.length? 'enter-stack':'enter-fade';
  vp.innerHTML = '<div class="screen '+anim+'" data-screen-label="'+key+'">'+html+'</div>';
  renderTabbar();
  bindScreen();
  updateClock();
}

function renderTabbar() {
  const showTabs = State.stack.length===0;
  const tb=document.getElementById('tabbar');
  tb.style.display = showTabs? 'grid':'none';
  if(!showTabs) return;
  const tabs=[['today','tab.today',ICON.today],['trackers','tab.trackers',ICON.list],['settings','tab.settings',ICON.settings]];
  tb.innerHTML = tabs.map(([k,lbl,ic])=>
    '<button class="tab '+(State.tab===k?'active':'')+'" onclick="go(\''+k+'\')">'+
      '<span class="tab-ico">'+ic+'</span><span class="tab-label">'+t(lbl)+'</span></button>'
  ).join('');
}

/* status bar clock */
function updateClock(){
  const el=document.getElementById('sb-time');
  if(el) el.textContent='9:41';
}

/* delegated bindings per screen (sliders, inputs handled inline) */
function bindScreen(){
  const sc=document.querySelector('#viewport .screen-scroll');
  if(sc){
    sc.addEventListener('scroll',()=>{
      const bar=document.querySelector('#viewport .appbar');
      if(bar) bar.classList.toggle('scroll-hairline', sc.scrollTop>4);
    });
  }
}

/* ---- boot ---- */
window.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('sb-signal').innerHTML=SB.signal;
  document.getElementById('sb-wifi').innerHTML=SB.wifi;
  document.getElementById('sb-batt').innerHTML=SB.battery;
  render();
});

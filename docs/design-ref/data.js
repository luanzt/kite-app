/* ============================================================
   KITE — mock data, i18n, icons, helpers
   Mirrors the brief's data shapes so the prototype reads true.
   ============================================================ */

/* ---------- inline SVG icons (stroke, currentColor) ---------- */
const ICON = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.3"/><circle cx="3.5" cy="12" r="1.3"/><circle cx="3.5" cy="18" r="1.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V20a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 18.3a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 2.6 13H2.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.3 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 2.6h.1A1.6 1.6 0 0 0 11 1h2a1.6 1.6 0 0 0 1.9 1.6 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21.4 7v.1A1.6 1.6 0 0 0 23 9v2a1.6 1.6 0 0 0-1.6 2Z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 4-2 6s-1 4 1 5c1-1 1-3 1-3 2 1 3 3 3 5a5 5 0 1 1-10 0c0-3 2-5 3-7 1.5-3 3-4 4-6Z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6Z"/></svg>',
};

/* status battery for phone */
const SB = {
  signal: '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="5" y="4.5" width="3" height="7.5" rx="1"/><rect x="10" y="2" width="3" height="10" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  wifi: '<svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.2c2.6 0 5 1 6.8 2.7l1.4-1.5A11.4 11.4 0 0 0 8.5.2 11.4 11.4 0 0 0 .3 3.4l1.4 1.5A9.4 9.4 0 0 1 8.5 2.2Z"/><path d="M8.5 6c1.5 0 2.9.6 3.9 1.6l1.4-1.5A8 8 0 0 0 8.5 4 8 8 0 0 0 3.2 6.1l1.4 1.5A5.5 5.5 0 0 1 8.5 6Z"/><circle cx="8.5" cy="10" r="2"/></svg>',
  battery: '<svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="currentColor" opacity="0.4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><rect x="24" y="4" width="2" height="5" rx="1" fill="currentColor" opacity="0.5"/></svg>',
};

/* ---------- i18n ---------- */
const I18N = {
  en: {
    'tab.today':'Today','tab.trackers':'Trackers','tab.settings':'Settings',
    'today.greetMorning':'Good morning','today.greetAfternoon':'Good afternoon','today.greetEvening':'Good evening',
    'today.summaryDone':'{done} of {total} done','today.summaryCap':'Keep your streaks alive today',
    'today.allClear':"You're all caught up","today.allClearBody":'Nothing left to log today. Beautiful work.',
    'today.dueToday':'Due today','today.completed':'Completed',
    'today.empty':'No goals yet','today.emptyBody':'Create your first tracker to start building momentum.',
    'list.title':'Trackers','list.empty':'Start something today','list.emptyBody':'Pick a quick-start goal, or build your own from scratch.',
    'list.quickHint':'POPULAR GOALS','list.create':'Create tracker','list.all':'All goals',
    'detail.onTrack':'On track','detail.behind':'Behind','detail.ahead':'Ahead of pace','detail.none':'No deadline',
    'detail.shouldBe':'Pace target','detail.streak':'Streak','detail.success':'Success','detail.remaining':'Left',
    'detail.history':'History','detail.milestones':'Milestones','detail.best':'Best','detail.days':'days',
    'detail.target':'Target','detail.expected':'Expected by now','detail.logToday':'Log today',
    'form.newTitle':'New tracker','form.editTitle':'Edit tracker','form.name':'Name','form.namePh':'e.g. Read 24 books',
    'form.icon':'Icon','form.color':'Color','form.target':'Target value','form.unit':'Unit','form.unitPh':'books, kg, $…',
    'form.deadline':'Deadline','form.mode':'Mode','form.sum':'Accumulate','form.latest':'Latest value',
    'form.period':'Period','form.direction':'Direction','form.higher':'Higher is better','form.lower':'Lower is better',
    'form.save':'Save tracker','form.cancel':'Cancel','form.delete':'Delete tracker',
    'type.title':'What do you want to track?','type.pick':'Choose a type to get started',
    'type.habit':'Habit','type.habitDesc':'A yes/no action you repeat. Builds a streak and a success rate.',
    'type.target':'Target','type.targetDesc':'Reach a number by a deadline. Shows the pace line so you always know if you’re on track.',
    'type.average':'Average','type.averageDesc':'Hold an average per day, week or month — like 8 glasses of water a day.',
    'type.project':'Project','type.projectDesc':'Milestones with progress sliders and an overall pace toward done.',
    'type.tagHabit':'Streaks · success rate','type.tagTarget':'Pace line · deadline','type.tagAverage':'Rolling average','type.tagProject':'Milestones · pace',
    'set.appearance':'Appearance','set.theme':'Dark mode','set.themeSoon':'Coming soon','set.language':'Language',
    'set.data':'Data','set.export':'Export data','set.exportSub':'Save a JSON backup','set.clear':'Clear all data','set.clearSub':'Delete every tracker & entry',
    'set.about':'About','set.version':'Version','set.offline':'Works fully offline',
    'common.cancel':'Cancel','common.save':'Save','common.done':'Done','common.today':'Today',
    'toast.saved':'Tracker saved','toast.logged':'Logged','toast.deleted':'Tracker deleted',
  },
  vi: {
    'tab.today':'Hôm nay','tab.trackers':'Mục tiêu','tab.settings':'Cài đặt',
    'today.greetMorning':'Chào buổi sáng','today.greetAfternoon':'Chào buổi chiều','today.greetEvening':'Chào buổi tối',
    'today.summaryDone':'Hoàn thành {done}/{total}','today.summaryCap':'Giữ vững chuỗi ngày của bạn',
    'today.allClear':'Bạn đã hoàn tất','today.allClearBody':'Không còn gì để ghi hôm nay. Tuyệt vời!',
    'today.dueToday':'Cần làm hôm nay','today.completed':'Đã hoàn thành',
    'today.empty':'Chưa có mục tiêu','today.emptyBody':'Tạo mục tiêu đầu tiên để bắt đầu tạo đà.',
    'list.title':'Mục tiêu','list.empty':'Bắt đầu hôm nay','list.emptyBody':'Chọn một mục tiêu gợi ý, hoặc tự tạo từ đầu.',
    'list.quickHint':'MỤC TIÊU PHỔ BIẾN','list.create':'Tạo mục tiêu','list.all':'Tất cả mục tiêu',
    'detail.onTrack':'Đúng tiến độ','detail.behind':'Đang chậm','detail.ahead':'Vượt tiến độ','detail.none':'Không có hạn',
    'detail.shouldBe':'Mốc tiến độ','detail.streak':'Chuỗi ngày','detail.success':'Tỷ lệ','detail.remaining':'Còn lại',
    'detail.history':'Lịch sử','detail.milestones':'Cột mốc','detail.best':'Kỷ lục','detail.days':'ngày',
    'detail.target':'Mục tiêu','detail.expected':'Dự kiến tới giờ','detail.logToday':'Ghi hôm nay',
    'form.newTitle':'Mục tiêu mới','form.editTitle':'Sửa mục tiêu','form.name':'Tên','form.namePh':'vd. Đọc 24 cuốn sách',
    'form.icon':'Biểu tượng','form.color':'Màu sắc','form.target':'Giá trị mục tiêu','form.unit':'Đơn vị','form.unitPh':'cuốn, kg, $…',
    'form.deadline':'Hạn chót','form.mode':'Chế độ','form.sum':'Tích lũy','form.latest':'Giá trị mới nhất',
    'form.period':'Chu kỳ','form.direction':'Hướng','form.higher':'Càng cao càng tốt','form.lower':'Càng thấp càng tốt',
    'form.save':'Lưu mục tiêu','form.cancel':'Hủy','form.delete':'Xóa mục tiêu',
    'type.title':'Bạn muốn theo dõi điều gì?','type.pick':'Chọn một loại để bắt đầu',
    'type.habit':'Thói quen','type.habitDesc':'Hành động có/không lặp lại. Tạo chuỗi ngày và tỷ lệ thành công.',
    'type.target':'Chỉ tiêu','type.targetDesc':'Đạt một con số trước hạn. Hiển thị đường tiến độ để bạn luôn biết mình có đúng tiến độ không.',
    'type.average':'Trung bình','type.averageDesc':'Giữ mức trung bình theo ngày, tuần hay tháng — như 8 ly nước mỗi ngày.',
    'type.project':'Dự án','type.projectDesc':'Các cột mốc với thanh tiến độ và nhịp độ tổng thể đến khi hoàn thành.',
    'type.tagHabit':'Chuỗi ngày · tỷ lệ','type.tagTarget':'Đường tiến độ · hạn chót','type.tagAverage':'Trung bình động','type.tagProject':'Cột mốc · tiến độ',
    'set.appearance':'Giao diện','set.theme':'Chế độ tối','set.themeSoon':'Sắp có','set.language':'Ngôn ngữ',
    'set.data':'Dữ liệu','set.export':'Xuất dữ liệu','set.exportSub':'Lưu bản sao JSON','set.clear':'Xóa toàn bộ','set.clearSub':'Xóa mọi mục tiêu & dữ liệu',
    'set.about':'Giới thiệu','set.version':'Phiên bản','set.offline':'Hoạt động hoàn toàn ngoại tuyến',
    'common.cancel':'Hủy','common.save':'Lưu','common.done':'Xong','common.today':'Hôm nay',
    'toast.saved':'Đã lưu mục tiêu','toast.logged':'Đã ghi','toast.deleted':'Đã xóa mục tiêu',
  }
};

/* tracker accent palette (the per-tracker `color`) */
const COLORS = ['#2e7d5b','#3d7dd8','#e0564e','#d98b2b','#8b5cf6','#0d9488','#e0457a','#6b7280'];

/* ---------- mock trackers ---------- */
const TRACKERS = [
  { id:'t1', name:'Meditate', type:'habit', icon:'🧘', color:'#8b5cf6', unit:null,
    direction:'good', targetValue:null, startValue:null, accumulation:null,
    startDate:'2026-04-01', deadline:null, period:'daily',
    paceStatus:'none', streak:12, successRate:86, dueToday:true, done:false },

  { id:'t2', name:'Read 24 books', type:'target', icon:'📚', color:'#2e7d5b', unit:'books',
    direction:'good', targetValue:24, startValue:0, accumulation:'sum',
    startDate:'2026-01-01', deadline:'2026-12-31', period:null,
    paceStatus:'on_track', current:11, dueToday:true, done:false, quick:1 },

  { id:'t3', name:'Save for trip', type:'target', icon:'💰', color:'#d98b2b', unit:'$',
    direction:'good', targetValue:2000, startValue:0, accumulation:'sum',
    startDate:'2026-02-01', deadline:'2026-08-01', period:null,
    paceStatus:'behind', current:540, dueToday:true, done:false, quick:25 },

  { id:'t4', name:'Lose weight to 65kg', type:'target', icon:'⚖️', color:'#3d7dd8', unit:'kg',
    direction:'bad', targetValue:65, startValue:78, accumulation:'latest',
    startDate:'2026-03-01', deadline:'2026-09-01', period:null,
    paceStatus:'ahead', current:70.5, dueToday:false, done:false, quick:0.1 },

  { id:'t5', name:'Drink water', type:'average', icon:'💧', color:'#0d9488', unit:'glasses',
    direction:'good', targetValue:8, startValue:null, accumulation:null,
    startDate:'2026-05-01', deadline:null, period:'daily',
    paceStatus:'on_track', current:5, avg:7.6, dueToday:true, done:false, quick:1 },

  { id:'t6', name:'Launch side project', type:'project', icon:'🚀', color:'#e0457a', unit:null,
    direction:'good', targetValue:null, startValue:null, accumulation:null,
    startDate:'2026-03-15', deadline:'2026-07-31', period:null,
    paceStatus:'behind', current:42, dueToday:false, done:false },

  { id:'t7', name:'Run weekly', type:'average', icon:'🏃', color:'#e0564e', unit:'km',
    direction:'good', targetValue:15, startValue:null, accumulation:null,
    startDate:'2026-04-10', deadline:null, period:'weekly',
    paceStatus:'ahead', current:0, avg:17.2, dueToday:true, done:true, quick:1 },
];

const MILESTONES = {
  t6: [
    { id:'m1', trackerId:'t6', title:'Validate idea', dueDate:'2026-04-01', progress:100, orderIndex:0 },
    { id:'m2', trackerId:'t6', title:'Design & prototype', dueDate:'2026-05-15', progress:80, orderIndex:1 },
    { id:'m3', trackerId:'t6', title:'Build MVP', dueDate:'2026-06-30', progress:25, orderIndex:2 },
    { id:'m4', trackerId:'t6', title:'Launch on Product Hunt', dueDate:'2026-07-31', progress:0, orderIndex:3 },
  ]
};

/* synthetic history series per tracker (value, pace target) */
function historyFor(t) {
  const pts = 14;
  const goal = t.targetValue || 24;
  const out = [];
  for (let i=0;i<pts;i++){
    const frac=(i+1)/pts;
    const pace = (t.startValue!=null?t.startValue:0) + ((goal-(t.startValue!=null?t.startValue:0))*frac);
    let actual;
    if(t.paceStatus==='behind') actual = pace*(0.55+0.1*Math.sin(i));
    else if(t.paceStatus==='ahead') actual = pace*(1.15+0.05*Math.sin(i));
    else actual = pace*(0.98+0.06*Math.sin(i*1.3));
    out.push({ x:i, actual:Math.max(0,actual), pace });
  }
  return out;
}

const QUICKSTARTS = [
  {icon:'💧',key:'Drink water',type:'average'},{icon:'🏋️',key:'Exercise',type:'habit'},
  {icon:'💰',key:'Save money',type:'target'},{icon:'📚',key:'Read books',type:'target'},
  {icon:'😴',key:'Sleep 8h',type:'average'},{icon:'🧘',key:'Meditate',type:'habit'},
  {icon:'🚶',key:'Walk 10k steps',type:'average'},{icon:'⚖️',key:'Track weight',type:'target'},
];

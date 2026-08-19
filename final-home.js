(function(){
S.fx=S.fx||{};
S.fx.homePeriod=S.fx.homePeriod||'day';
S.fx.homeAnchor=S.fx.homeAnchor||D();

function dateObj(s){
  return new Date((s||D())+'T12:00:00');
}
function dateStr(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function weekRange(anchor){
  const a=dateObj(anchor),wd=(a.getDay()+6)%7;
  const start=new Date(a); start.setDate(a.getDate()-wd);
  const end=new Date(start); end.setDate(start.getDate()+6);
  return {start,end};
}
function inPeriod(date){
  const d=(date||'').slice(0,10), mode=S.fx.homePeriod;
  if(!d)return false;
  if(mode==='day')return d===D();
  if(mode==='date')return d===S.fx.homeAnchor;

  const a=dateObj(d),ref=dateObj(S.fx.homeAnchor);

  if(mode==='year')return a.getFullYear()===ref.getFullYear();
  if(mode==='month')return a.getFullYear()===ref.getFullYear()&&a.getMonth()===ref.getMonth();
  if(mode==='week'){
    const w=weekRange(S.fx.homeAnchor);
    return a>=w.start&&a<=w.end;
  }
  return true;
}
S.fx.shiftPeriod=function(n){
  const d=dateObj(S.fx.homeAnchor),m=S.fx.homePeriod;
  if(m==='week')d.setDate(d.getDate()+7*n);
  if(m==='month')d.setMonth(d.getMonth()+n);
  if(m==='year')d.setFullYear(d.getFullYear()+n);
  S.fx.homeAnchor=dateStr(d);
  app();
};
S.fx.resetToday=function(){
  S.fx.homeAnchor=D();
  S.fx.homePeriod='day';
  app();
};

function periodLabel(){
  const m=S.fx.homePeriod,a=dateObj(S.fx.homeAnchor);
  if(m==='week'){
    const w=weekRange(S.fx.homeAnchor);
    const f=d=>`${d.getMonth()+1}/${d.getDate()}`;
    return `${a.getFullYear()}年 ${f(w.start)}–${f(w.end)}`;
  }
  if(m==='month')return `${a.getFullYear()}年${a.getMonth()+1}月`;
  if(m==='year')return `${a.getFullYear()}年`;
  return '';
}
function periodBar(){
  const m=S.fx.homePeriod;
  const tab=(v,t)=>`<button class="hpTab ${m===v?'on':''}" onclick="S.fx.homePeriod='${v}';${v==='day'?"S.fx.homeAnchor=D();":''}app()">${t}</button>`;

  let picker='';
  if(m==='date'){
    picker=`<div class="hpPick"><input type="date" value="${S.fx.homeAnchor}" onchange="S.fx.homeAnchor=this.value;app()"></div>`;
  }else if(m==='week'||m==='month'||m==='year'){
    picker=`<div class="hpShift">
      <button onclick="S.fx.shiftPeriod(-1)">‹</button>
      <strong>${periodLabel()}</strong>
      <button onclick="S.fx.shiftPeriod(1)">›</button>
    </div>`;
  }

  return `<style>
    .hpWrap{margin-bottom:14px}
    .hpTabs{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;background:#f1f2f4;border-radius:14px;padding:4px}
    .hpTab{border:0;background:transparent;color:#333;border-radius:11px;padding:11px 3px;font-weight:800}
    .hpTab.on{background:#f58220;color:#fff}
    .hpPick{margin-top:9px}
    .hpPick input{width:100%;border:0;background:#f3f4f6;border-radius:12px;padding:11px;text-align:center}
    .hpShift{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-top:9px;background:#f3f4f6;border-radius:12px;padding:4px}
    .hpShift button{border:0;background:transparent;font-size:27px;font-weight:700;padding:3px}
    .hpShift strong{text-align:center;font-size:14px}
  </style>
  <div class="hpWrap">
    <div class="hpTabs">
      ${tab('day','今日')}
      ${tab('date','日期')}
      ${tab('week','週')}
      ${tab('month','月')}
      ${tab('year','年')}
    </div>
    ${picker}
  </div>`;
}

const basePage=window.page;
window.page=function(){
  if(S.pg!=='home')return basePage();

  const repairs=S.r.filter(x=>inPeriod(x.repair_date));
  const quotes=S.q.filter(x=>inPeriod(x.quote_date));
  const revenue=repairs.reduce((n,x)=>n+Number(x.total||0),0);

  return `${periodBar()}
    <div class="g">
      <div class="c">維修<br><b>${repairs.length} 筆</b></div>
      <div class="c">報價<br><b>${quotes.length} 筆</b></div>
      <div class="c">目前庫存<br><b>${S.p.length} 項</b></div>
      <div class="c">營業額<br><b>${N(revenue)}</b></div>
    </div>
    <div class="c"><h3>快速新增</h3><div class="g q">
      <button class="q1" onclick="rf()">🛠<br>新增維修</button>
      <button class="q2" onclick="pf()">📥<br>新增進貨</button>
      <button class="q3" onclick="qf()">🧾<br>新增報價</button>
      <button class="q4" onclick="cf()">👤<br>新增客戶</button>
    </div></div>`;
};

// 修正編輯報價／維修時，原客戶與車輛沒有自動回填
window.cv=function(c='',v=''){
  const customers=S.c.map(x=>
    `<option value="${x.id}" ${x.id===c?'selected':''}>${E(x.name)}</option>`
  ).join('');

  const vehicles=c
    ? S.v.filter(x=>x.customer_id===c).map(x=>
        `<option value="${x.id}" ${x.id===v?'selected':''}>${E(x.plate+' '+(x.brand||'')+' '+(x.model||''))}</option>`
      ).join('')
    : '';

  return `<div class="f">
    <label>客戶 *</label>
    <select id="cu" onchange="vo()">
      <option value="">請選擇</option>${customers}
    </select>
  </div>
  <div class="f">
    <label>車輛 *</label>
    <select id="ve">
      <option value="">${c?'請選擇':'請先選客戶'}</option>${vehicles}
    </select>
  </div>`;
};

const baseApp=window.app;
window.app=function(){
  baseApp();

  document.querySelectorAll('.nav button').forEach(b=>{
    if((b.textContent||'').includes('零件'))
      b.innerHTML=b.innerHTML.replace('零件','材料');
  });

  document.querySelectorAll('h2').forEach(h=>{
    if(h.textContent==='零件／進貨')h.textContent='材料／進貨';
  });
};

if(S.z&&S.m)app();
})();

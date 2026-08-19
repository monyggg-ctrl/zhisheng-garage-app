(function(){
S.fx=S.fx||{};
S.fx.homePeriod=S.fx.homePeriod||'day';
S.fx.homeDate=S.fx.homeDate||D();

function inPeriod(date){
  const d=(date||'').slice(0,10), today=D(), mode=S.fx.homePeriod;
  if(!d)return false;
  if(mode==='date')return d===(S.fx.homeDate||today);
  if(mode==='day')return d===today;
  const a=new Date(d+'T12:00:00'), t=new Date(today+'T12:00:00');
  if(mode==='year')return a.getFullYear()===t.getFullYear();
  if(mode==='month')return a.getFullYear()===t.getFullYear()&&a.getMonth()===t.getMonth();
  if(mode==='week'){
    const wd=(t.getDay()+6)%7;
    const start=new Date(t); start.setDate(t.getDate()-wd);
    const end=new Date(start); end.setDate(start.getDate()+6);
    return a>=start&&a<=end;
  }
  return true;
}

function periodBar(){
  const m=S.fx.homePeriod;
  const btn=(v,t)=>`<button class="b ${m===v?'o':'x'}" onclick="S.fx.homePeriod='${v}';app()">${t}</button>`;
  return `<div class="c">
    <div class="home-period">${btn('day','當日')}${btn('date','日期')}${btn('week','當週')}${btn('month','當月')}${btn('year','當年')}</div>
    ${m==='date'?`<div class="f" style="margin-bottom:0"><input type="date" value="${S.fx.homeDate||D()}" onchange="S.fx.homeDate=this.value;app()"></div>`:''}
  </div>`;
}

// 首頁統計：預設當日；庫存維持即時值
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

// 只改使用者看到的功能名稱，不動資料表 parts 與零件成本欄位
const baseApp=window.app;
window.app=function(){
  baseApp();
  document.querySelectorAll('.nav button').forEach(b=>{
    if((b.textContent||'').includes('零件')) b.innerHTML=b.innerHTML.replace('零件','材料');
  });
  document.querySelectorAll('h2').forEach(h=>{
    if(h.textContent==='零件／進貨') h.textContent='材料／進貨';
  });
};
if(S.z&&S.m)app();
})();

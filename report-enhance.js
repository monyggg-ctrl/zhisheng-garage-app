(function(){
  S.fx=S.fx||{};

  function money(n){
    return 'NT$ '+Number(n||0).toLocaleString('zh-TW');
  }

  function parseDate(v){
    const s=String(v||'').slice(0,10);
    return s ? new Date(s+'T12:00:00') : null;
  }

  function findTitle(){
    return Array.from(document.querySelectorAll('h1,h2,h3'))
      .find(el=>(el.textContent||'').trim().includes('營運報表'));
  }

  function periodSelect(){
    return Array.from(document.querySelectorAll('select'))
      .find(el=>(el.parentElement?.textContent||'').includes('統計週期'));
  }

  function mode(){
    const el=periodSelect();
    const t=(el?.options?.[el.selectedIndex]?.text||el?.value||'每月').trim();

    if(t.includes('日')) return 'day';
    if(t.includes('年')) return 'year';
    return 'month';
  }

  function searchInput(){
    return Array.from(document.querySelectorAll('input'))
      .find(el=>(el.placeholder||'').includes('搜尋日期'));
  }

  function anchor(){
    const raw=(searchInput()?.value||'').trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))
      return new Date(raw+'T12:00:00');

    if(/^\d{4}-\d{2}$/.test(raw))
      return new Date(raw+'-01T12:00:00');

    if(/^\d{4}$/.test(raw))
      return new Date(raw+'-01-01T12:00:00');

    return new Date();
  }

  function inPeriod(v){
    const d=parseDate(v);
    if(!d) return false;

    const a=anchor();
    const m=mode();

    if(m==='day'){
      return d.getFullYear()===a.getFullYear() &&
             d.getMonth()===a.getMonth() &&
             d.getDate()===a.getDate();
    }

    if(m==='year'){
      return d.getFullYear()===a.getFullYear();
    }

    return d.getFullYear()===a.getFullYear() &&
           d.getMonth()===a.getMonth();
  }

  function metrics(){
    const repairs=(S.r||[]).filter(r=>inPeriod(r.repair_date));

    const revenue=repairs.reduce(
      (n,r)=>n+Number(r.total||0),
      0
    );

    const cost=repairs.reduce(
      (n,r)=>n+Number(r.cost_total||0),
      0
    );

    const profit=revenue-cost;
    const margin=revenue ? profit/revenue*100 : 0;

    const ids=new Set(repairs.map(r=>r.id));

    const collected=(S.fx.payments||[])
      .filter(p=>ids.has(p.repair_id))
      .reduce(
        (n,p)=>n+Number(p.amount||0),
        0
      );

    const receivable=Math.max(revenue-collected,0);

    const completedCount=repairs.filter(
      r=>r.status==='completed'
    ).length;

    return {
      revenue,
      cost,
      profit,
      margin,
      collected,
      receivable,
      completedCount
    };
  }

  function addStyle(){
    if(document.getElementById('reportEnhanceStyle')) return;

    const style=document.createElement('style');
    style.id='reportEnhanceStyle';

    style.textContent=`
      #reportEnhanceShell{
        width:100%!important;
        display:block!important;
        grid-column:1/-1!important;
        margin:0 0 14px!important;
      }

      #reportEnhanceTitle{
        width:100%!important;
        display:block!important;
        margin:0 0 18px!important;
        text-align:left!important;
        writing-mode:horizontal-tb!important;
      }

      .reportKpiGrid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        width:100%;
      }

      .reportKpi{
        min-width:0;
        border:1px solid #e3e5e8;
        border-radius:16px;
        padding:14px;
        background:#fff;
      }

      .reportKpi .label{
        font-size:14px;
        color:#555;
        margin-bottom:5px;
      }

      .reportKpi .value{
        font-size:21px;
        font-weight:800;
        line-height:1.2;
      }

      .reportKpi.collected{
        background:#eefaf3;
        border-color:#cbead7;
      }

      .reportKpi.receivable{
        background:#fff7ed;
        border-color:#f3c98e;
      }

      .reportKpi.profit{
        background:#f8f4ff;
        border-color:#ded1f7;
      }

      .reportSummaryBox{
        margin-top:12px;
        border:1px solid #e3e5e8;
        border-radius:16px;
        padding:14px;
        background:#fff;
      }

      .reportSummaryRow{
        display:flex;
        justify-content:space-between;
        gap:12px;
        padding:6px 0;
      }

      .reportSummaryRow strong{
        font-weight:800;
      }

      .reportHint{
        margin-top:9px;
        color:#777;
        font-size:12px;
        line-height:1.55;
      }

      @media(max-width:600px){
        .reportKpi{
          padding:12px;
        }

        .reportKpi .value{
          font-size:19px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function hideOldCards(){
    const labels=['營收','成本','毛利','毛利率'];

    const divs=Array.from(document.querySelectorAll('div'))
      .filter(el=>!el.closest('#reportEnhanceShell'));

    const candidates=divs.filter(el=>{
      const all=Array.from(el.querySelectorAll('*'));

      return labels.every(label=>
        all.some(x=>(x.textContent||'').trim()===label)
      );
    });

    if(!candidates.length) return;

    candidates.sort(
      (a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length
    );

    const old=candidates[0];

    if(old && !old.textContent.includes('期間')){
      old.style.display='none';
    }
  }

  function render(){
    if(S.pg!=='reports') return;

    const title=findTitle();
    if(!title) return;

    addStyle();

    let shell=document.getElementById('reportEnhanceShell');

    if(!shell){
      shell=document.createElement('div');
      shell.id='reportEnhanceShell';

      title.parentElement.insertBefore(shell,title);

      shell.appendChild(title);
      title.id='reportEnhanceTitle';

      const box=document.createElement('div');
      box.id='reportEnhanceBox';

      shell.appendChild(box);
    }

    const m=metrics();

    document.getElementById('reportEnhanceBox').innerHTML=`
      <div class="reportKpiGrid">

        <div class="reportKpi">
          <div class="label">營收</div>
          <div class="value">${money(m.revenue)}</div>
        </div>

        <div class="reportKpi collected">
          <div class="label">實收</div>
          <div class="value">${money(m.collected)}</div>
        </div>

        <div class="reportKpi receivable">
          <div class="label">應收帳款</div>
          <div class="value">${money(m.receivable)}</div>
        </div>

        <div class="reportKpi">
          <div class="label">成本</div>
          <div class="value">${money(m.cost)}</div>
        </div>

        <div class="reportKpi profit">
          <div class="label">毛利</div>
          <div class="value">${money(m.profit)}</div>
        </div>

        <div class="reportKpi">
          <div class="label">毛利率</div>
          <div class="value">${m.margin.toFixed(1)}%</div>
        </div>

      </div>

      <div class="reportSummaryBox">

        <div class="reportSummaryRow">
          <span>已完工維修單</span>
          <strong>${m.completedCount} 筆</strong>
        </div>

        <div class="reportSummaryRow">
          <span>已收比例</span>
          <strong>${
            m.revenue
              ? (m.collected/m.revenue*100).toFixed(1)
              : '0.0'
          }%</strong>
        </div>

        <div class="reportSummaryRow">
          <span>未收比例</span>
          <strong>${
            m.revenue
              ? (m.receivable/m.revenue*100).toFixed(1)
              : '0.0'
          }%</strong>
        </div>

        <div class="reportHint">
          營收＝期間內維修單總額；
          實收＝實際收款紀錄；
          應收帳款＝營收－實收；
          成本＝維修單內部總成本。
        </div>

      </div>
    `;

    hideOldCards();
  }

  function refresh(){
    setTimeout(render,120);
  }

  const originalApp=window.app;

  window.app=function(){
    originalApp();
    refresh();
  };

  document.addEventListener('change',()=>{
    if(S.pg==='reports') refresh();
  });

  document.addEventListener('input',()=>{
    if(S.pg==='reports') refresh();
  });

  refresh();
})();

(function () {
  S.fx = S.fx || {};

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function ymd(v) {
    return String(v || '').slice(0, 10);
  }

  function parseDate(v) {
    const s = ymd(v);
    if (!s) return null;
    return new Date(s + 'T12:00:00');
  }

  function currentPeriodMode() {
    const select = document.querySelector('select');
    if (!select) return 'month';

    const text = (select.value || select.options?.[select.selectedIndex]?.text || '')
      .trim()
      .toLowerCase();

    if (text.includes('日')) return 'day';
    if (text.includes('年')) return 'year';
    if (text.includes('月')) return 'month';

    return 'month';
  }

  function reportAnchor() {
    const input = Array.from(document.querySelectorAll('input')).find(x =>
      (x.placeholder || '').includes('搜尋日期')
    );

    const raw = (input?.value || '').trim();

    if (!raw) return new Date();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(raw + 'T12:00:00');
    }

    if (/^\d{4}-\d{2}$/.test(raw)) {
      return new Date(raw + '-01T12:00:00');
    }

    if (/^\d{4}$/.test(raw)) {
      return new Date(raw + '-01-01T12:00:00');
    }

    return new Date();
  }

  function inReportPeriod(dateValue) {
    const d = parseDate(dateValue);
    if (!d) return false;

    const mode = currentPeriodMode();
    const ref = reportAnchor();

    if (mode === 'day') {
      return (
        d.getFullYear() === ref.getFullYear() &&
        d.getMonth() === ref.getMonth() &&
        d.getDate() === ref.getDate()
      );
    }

    if (mode === 'year') {
      return d.getFullYear() === ref.getFullYear();
    }

    return (
      d.getFullYear() === ref.getFullYear() &&
      d.getMonth() === ref.getMonth()
    );
  }

  function paidTotalForRepair(repairId) {
    return (S.fx.payments || [])
      .filter(x => x.repair_id === repairId)
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }

  function repairCost(r) {
    const itemCost = Number(
      r.internal_parts_cost ??
      r.parts_cost ??
      r.part_cost ??
      r.cost_parts ??
      0
    );

    const laborCost = Number(
      r.internal_labor_cost ??
      r.labor_cost ??
      r.cost_labor ??
      0
    );

    return itemCost + laborCost;
  }

  function metrics() {
    const repairs = (S.r || []).filter(r =>
      r.status === 'completed' &&
      inReportPeriod(r.repair_date)
    );

    const revenue = repairs.reduce(
      (sum, r) => sum + Number(r.total || 0),
      0
    );

    const collected = repairs.reduce(
      (sum, r) => sum + paidTotalForRepair(r.id),
      0
    );

    const receivable = Math.max(revenue - collected, 0);

    const cost = repairs.reduce(
      (sum, r) => sum + repairCost(r),
      0
    );

    const profit = revenue - cost;

    const margin = revenue > 0
      ? (profit / revenue) * 100
      : 0;

    return {
      repairs,
      revenue,
      collected,
      receivable,
      cost,
      profit,
      margin
    };
  }

  function addStyle() {
    if (document.getElementById('reportEnhanceStyle')) return;

    const style = document.createElement('style');
    style.id = 'reportEnhanceStyle';

    style.textContent = `
      .reportKpiGrid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
        margin:12px 0;
      }

      .reportKpi{
        border:1px solid #e3e5e8;
        border-radius:16px;
        padding:14px;
        background:#fff;
      }

      .reportKpi .label{
        font-size:14px;
        color:#555;
        margin-bottom:4px;
      }

      .reportKpi .value{
        font-size:22px;
        font-weight:800;
        line-height:1.2;
      }

      .reportKpi.receivable{
        background:#fff7ed;
        border-color:#f6d2aa;
      }

      .reportKpi.collected{
        background:#eefaf3;
        border-color:#cbead7;
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
        margin-top:8px;
        font-size:12px;
        color:#777;
        line-height:1.5;
      }

      @media(max-width:600px){
        .reportKpiGrid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

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

  function findReportTitle() {
    return Array.from(document.querySelectorAll('h1,h2,h3'))
      .find(el => (el.textContent || '').includes('營運報表'));
  }

  function findOldMetricArea(title) {
    if (!title) return null;

    let node = title.nextElementSibling;

    while (node) {
      const text = (node.textContent || '').trim();

      if (
        text.includes('營收') &&
        text.includes('成本') &&
        text.includes('毛利')
      ) {
        return node;
      }

      node = node.nextElementSibling;
    }

    return null;
  }

  function renderEnhancedReport() {
    if (S.pg !== 'reports') return;

    const title = findReportTitle();
    if (!title) return;

    const m = metrics();

    let box = document.getElementById('reportEnhanceBox');

    if (!box) {
      box = document.createElement('div');
      box.id = 'reportEnhanceBox';

      const oldArea = findOldMetricArea(title);

      if (oldArea) {
        oldArea.style.display = 'none';
        oldArea.insertAdjacentElement('beforebegin', box);
      } else {
        title.insertAdjacentElement('afterend', box);
      }
    }

    box.innerHTML = `
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
          <strong>${m.repairs.length} 筆</strong>
        </div>

        <div class="reportSummaryRow">
          <span>已收比例</span>
          <strong>${
            m.revenue > 0
              ? ((m.collected / m.revenue) * 100).toFixed(1)
              : '0.0'
          }%</strong>
        </div>

        <div class="reportSummaryRow">
          <span>未收比例</span>
          <strong>${
            m.revenue > 0
              ? ((m.receivable / m.revenue) * 100).toFixed(1)
              : '0.0'
          }%</strong>
        </div>

        <div class="reportHint">
          營收＝已完工維修單總額；實收＝實際收款紀錄；應收帳款＝營收－實收。
        </div>
      </div>
    `;
  }

  function refresh() {
    addStyle();

    setTimeout(() => {
      renderEnhancedReport();
    }, 50);
  }

  const originalApp = window.app;

  window.app = function () {
    originalApp();
    refresh();
  };

  document.addEventListener('change', function () {
    if (S.pg === 'reports') {
      setTimeout(renderEnhancedReport, 30);
    }
  });

  document.addEventListener('input', function () {
    if (S.pg === 'reports') {
      setTimeout(renderEnhancedReport, 30);
    }
  });

  refresh();
})();

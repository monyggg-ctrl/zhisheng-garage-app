(function () {
  S.fx = S.fx || {};

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function numberFromText(v) {
    const m = String(v || '')
      .replace(/,/g, '')
      .match(/-?\d+(?:\.\d+)?/);

    return m ? Number(m[0]) : 0;
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
    const select =
      Array.from(document.querySelectorAll('select')).find(el =>
        (el.previousElementSibling?.textContent || '').includes('統計週期') ||
        (el.parentElement?.textContent || '').includes('統計週期')
      ) || document.querySelector('select');

    if (!select) return 'month';

    const text = (
      select.value ||
      select.options?.[select.selectedIndex]?.text ||
      ''
    ).trim().toLowerCase();

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

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw))
      return new Date(raw + 'T12:00:00');

    if (/^\d{4}-\d{2}$/.test(raw))
      return new Date(raw + '-01T12:00:00');

    if (/^\d{4}$/.test(raw))
      return new Date(raw + '-01-01T12:00:00');

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

  function findReportTitle() {
    return Array.from(document.querySelectorAll('h1,h2,h3'))
      .find(el =>
        (el.textContent || '').includes('營運報表')
      );
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

  function extractBaseMetrics(oldArea) {
    const result = {
      revenue: 0,
      cost: 0,
      profit: 0,
      margin: 0
    };

    if (!oldArea) return result;

    const els = Array.from(oldArea.querySelectorAll('*'));

    function valueAfterLabel(label) {
      const labelEl = els.find(
        el => (el.textContent || '').trim() === label
      );

      if (!labelEl) return 0;

      const direct = labelEl.nextElementSibling;

      if (direct) {
        const n = numberFromText(direct.textContent);

        if (n || direct.textContent.includes('0')) {
          return n;
        }
      }

      const parentText =
        labelEl.parentElement?.textContent || '';

      return numberFromText(
        parentText.replace(label, '')
      );
    }

    result.revenue = valueAfterLabel('營收');
    result.cost = valueAfterLabel('成本');
    result.profit = valueAfterLabel('毛利');
    result.margin = valueAfterLabel('毛利率');

    if (
      !result.profit &&
      (result.revenue || result.cost)
    ) {
      result.profit =
        result.revenue - result.cost;
    }

    if (
      !result.margin &&
      result.revenue > 0
    ) {
      result.margin =
        result.profit /
        result.revenue *
        100;
    }

    return result;
  }

  function paymentMetrics() {
    const repairs = (S.r || []).filter(r =>
      inReportPeriod(r.repair_date)
    );

    const ids = new Set(
      repairs.map(r => r.id)
    );

    const collected = (S.fx.payments || [])
      .filter(p => ids.has(p.repair_id))
      .reduce(
        (sum, p) =>
          sum + Number(p.amount || 0),
        0
      );

    const completed = repairs.filter(
      r => r.status === 'completed'
    );

    return {
      collected,
      completedCount: completed.length
    };
  }

  function addStyle() {
    if (
      document.getElementById(
        'reportEnhanceStyle'
      )
    ) return;

    const style =
      document.createElement('style');

    style.id = 'reportEnhanceStyle';

    style.textContent = `
      .reportTitleFixed{
        grid-column:1 / -1 !important;
        width:100% !important;
        display:block !important;
        margin:0 0 12px !important;
        writing-mode:horizontal-tb !important;
      }

      #reportEnhanceBox{
        grid-column:1 / -1 !important;
        width:100% !important;
        min-width:0 !important;
      }

      .reportKpiGrid{
        display:grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
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
          grid-template-columns:
            repeat(2,minmax(0,1fr));
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

  function renderEnhancedReport() {
    if (S.pg !== 'reports') return;

    const title = findReportTitle();
    if (!title) return;

    title.classList.add(
      'reportTitleFixed'
    );

    const oldArea =
      findOldMetricArea(title);

    const base =
      extractBaseMetrics(oldArea);

    const pay =
      paymentMetrics();

    const revenue = base.revenue;
    const cost = base.cost;
    const profit = base.profit;
    const margin = base.margin;

    const collected = pay.collected;

    const receivable = Math.max(
      revenue - collected,
      0
    );

    let box =
      document.getElementById(
        'reportEnhanceBox'
      );

    if (!box) {
      box =
        document.createElement('div');

      box.id = 'reportEnhanceBox';

      if (oldArea) {
        oldArea.insertAdjacentElement(
          'beforebegin',
          box
        );

        oldArea.style.display = 'none';
      } else {
        title.insertAdjacentElement(
          'afterend',
          box
        );
      }
    }

    box.innerHTML = `
      <div class="reportKpiGrid">

        <div class="reportKpi">
          <div class="label">
            營收
          </div>
          <div class="value">
            ${money(revenue)}
          </div>
        </div>

        <div class="reportKpi collected">
          <div class="label">
            實收
          </div>
          <div class="value">
            ${money(collected)}
          </div>
        </div>

        <div class="reportKpi receivable">
          <div class="label">
            應收帳款
          </div>
          <div class="value">
            ${money(receivable)}
          </div>
        </div>

        <div class="reportKpi">
          <div class="label">
            成本
          </div>
          <div class="value">
            ${money(cost)}
          </div>
        </div>

        <div class="reportKpi profit">
          <div class="label">
            毛利
          </div>
          <div class="value">
            ${money(profit)}
          </div>
        </div>

        <div class="reportKpi">
          <div class="label">
            毛利率
          </div>
          <div class="value">
            ${Number(
              margin || 0
            ).toFixed(1)}%
          </div>
        </div>

      </div>

      <div class="reportSummaryBox">

        <div class="reportSummaryRow">
          <span>
            已完工維修單
          </span>
          <strong>
            ${pay.completedCount} 筆
          </strong>
        </div>

        <div class="reportSummaryRow">
          <span>
            已收比例
          </span>
          <strong>
            ${
              revenue > 0
                ? (
                    collected /
                    revenue *
                    100
                  ).toFixed(1)
                : '0.0'
            }%
          </strong>
        </div>

        <div class="reportSummaryRow">
          <span>
            未收比例
          </span>
          <strong>
            ${
              revenue > 0
                ? (
                    receivable /
                    revenue *
                    100
                  ).toFixed(1)
                : '0.0'
            }%
          </strong>
        </div>

        <div class="reportHint">
          營收、成本、毛利沿用原營運報表計算；
          實收＝實際收款紀錄；
          應收帳款＝營收－實收。
        </div>

      </div>
    `;
  }

  function refresh() {
    addStyle();

    setTimeout(
      renderEnhancedReport,
      80
    );
  }

  const originalApp = window.app;

  window.app = function () {
    originalApp();
    refresh();
  };

  document.addEventListener(
    'change',
    function () {
      if (S.pg === 'reports') {
        setTimeout(
          renderEnhancedReport,
          80
        );
      }
    }
  );

  document.addEventListener(
    'input',
    function () {
      if (S.pg === 'reports') {
        setTimeout(
          renderEnhancedReport,
          80
        );
      }
    }
  );

  refresh();
})();

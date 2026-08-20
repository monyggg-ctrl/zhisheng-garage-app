(function () {
  S.fx = S.fx || {};

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function num(text) {
    const m = String(text || '')
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

  function findTitle() {
    return Array.from(
      document.querySelectorAll('h1,h2,h3')
    ).find(el =>
      (el.textContent || '')
        .trim()
        .includes('營運報表')
    );
  }

  function periodSelect() {
    return Array.from(
      document.querySelectorAll('select')
    ).find(el => {
      const parent =
        el.parentElement?.textContent || '';

      return parent.includes('統計週期');
    });
  }

  function currentMode() {
    const el = periodSelect();

    if (!el) return 'month';

    const text = (
      el.options?.[el.selectedIndex]?.text ||
      el.value ||
      ''
    ).trim();

    if (text.includes('日')) return 'day';
    if (text.includes('年')) return 'year';

    return 'month';
  }

  function reportSearchInput() {
    return Array.from(
      document.querySelectorAll('input')
    ).find(el =>
      (el.placeholder || '')
        .includes('搜尋日期')
    );
  }

  function anchorDate() {
    const raw =
      (reportSearchInput()?.value || '')
        .trim();

    if (!raw) return new Date();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(raw + 'T12:00:00');
    }

    if (/^\d{4}-\d{2}$/.test(raw)) {
      return new Date(
        raw + '-01T12:00:00'
      );
    }

    if (/^\d{4}$/.test(raw)) {
      return new Date(
        raw + '-01-01T12:00:00'
      );
    }

    return new Date();
  }

  function inPeriod(value) {
    const d = parseDate(value);

    if (!d) return false;

    const a = anchorDate();
    const mode = currentMode();

    if (mode === 'day') {
      return (
        d.getFullYear() ===
          a.getFullYear() &&
        d.getMonth() ===
          a.getMonth() &&
        d.getDate() ===
          a.getDate()
      );
    }

    if (mode === 'year') {
      return (
        d.getFullYear() ===
        a.getFullYear()
      );
    }

    return (
      d.getFullYear() ===
        a.getFullYear() &&
      d.getMonth() ===
        a.getMonth()
    );
  }

  function hasExactLabel(root, label) {
    return Array.from(
      root.querySelectorAll('*')
    ).some(el =>
      (el.textContent || '')
        .trim() === label
    );
  }

  function findOriginalMetrics(title) {
    const page =
      title.closest('.r') ||
      title.parentElement?.parentElement ||
      document.body;

    const candidates = Array.from(
      page.querySelectorAll('div')
    ).filter(el => {
      if (
        el.id === 'reportEnhanceBox' ||
        el.id === 'reportEnhanceShell' ||
        el.closest('#reportEnhanceBox')
      ) {
        return false;
      }

      return (
        hasExactLabel(el, '營收') &&
        hasExactLabel(el, '成本') &&
        hasExactLabel(el, '毛利') &&
        hasExactLabel(el, '毛利率')
      );
    });

    if (!candidates.length) {
      return null;
    }

    return candidates
      .sort(
        (a, b) =>
          a.querySelectorAll('*').length -
          b.querySelectorAll('*').length
      )[0];
  }

  function valueForLabel(root, label) {
    if (!root) return 0;

    const els = Array.from(
      root.querySelectorAll('*')
    );

    const labelEl = els.find(el =>
      (el.textContent || '')
        .trim() === label
    );

    if (!labelEl) return 0;

    const parent =
      labelEl.parentElement;

    if (parent) {
      const text =
        (parent.textContent || '')
          .replace(label, '');

      const value = num(text);

      if (
        value ||
        text.includes('0')
      ) {
        return value;
      }
    }

    let next =
      labelEl.nextElementSibling;

    while (next) {
      const value =
        num(next.textContent);

      if (
        value ||
        (next.textContent || '')
          .includes('0')
      ) {
        return value;
      }

      next =
        next.nextElementSibling;
    }

    return 0;
  }

  function readBaseMetrics(root) {
    let revenue =
      valueForLabel(root, '營收');

    let cost =
      valueForLabel(root, '成本');

    let profit =
      valueForLabel(root, '毛利');

    let margin =
      valueForLabel(root, '毛利率');

    if (
      !profit &&
      (revenue || cost)
    ) {
      profit = revenue - cost;
    }

    if (
      !margin &&
      revenue > 0
    ) {
      margin =
        profit /
        revenue *
        100;
    }

    return {
      revenue,
      cost,
      profit,
      margin
    };
  }

  function paymentInfo() {
    const repairs =
      (S.r || []).filter(r =>
        inPeriod(r.repair_date)
      );

    const repairIds =
      new Set(
        repairs.map(r => r.id)
      );

    const collected =
      (S.fx.payments || [])
        .filter(p =>
          repairIds.has(
            p.repair_id
          )
        )
        .reduce(
          (sum, p) =>
            sum +
            Number(p.amount || 0),
          0
        );

    const completedCount =
      repairs.filter(r =>
        r.status === 'completed'
      ).length;

    return {
      collected,
      completedCount
    };
  }

  function addStyle() {
    if (
      document.getElementById(
        'reportEnhanceStyle'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'reportEnhanceStyle';

    style.textContent = `
      #reportEnhanceShell{
        width:100%!important;
        display:block!important;
        grid-column:1 / -1!important;
        min-width:0!important;
        margin:0 0 14px!important;
      }

      #reportEnhanceShell > h1,
      #reportEnhanceShell > h2,
      #reportEnhanceShell > h3{
        width:100%!important;
        display:block!important;
        grid-column:1 / -1!important;
        writing-mode:horizontal-tb!important;
        text-orientation:mixed!important;
        margin:0 0 14px!important;
        padding:0!important;
        text-align:left!important;
      }

      #reportEnhanceBox{
        width:100%!important;
        display:block!important;
        min-width:0!important;
      }

      .reportKpiGrid{
        width:100%;
        display:grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
        gap:10px;
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
        word-break:keep-all;
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
        width:100%;
        margin-top:12px;
        border:1px solid #e3e5e8;
        border-radius:16px;
        padding:14px;
        background:#fff;
      }

      .reportSummaryRow{
        display:flex;
        justify-content:space-between;
        align-items:center;
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
        #reportEnhanceShell{
          padding:0!important;
        }

        .reportKpi{
          padding:12px;
        }

        .reportKpi .value{
          font-size:19px;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function buildShell(title) {
    let shell =
      document.getElementById(
        'reportEnhanceShell'
      );

    if (shell) {
      return shell;
    }

    shell =
      document.createElement('div');

    shell.id =
      'reportEnhanceShell';

    const parent =
      title.parentElement;

    parent.insertBefore(
      shell,
      title
    );

    shell.appendChild(title);

    const box =
      document.createElement('div');

    box.id =
      'reportEnhanceBox';

    shell.appendChild(box);

    return shell;
  }

  function render() {
    if (S.pg !== 'reports') {
      return;
    }

    const title = findTitle();

    if (!title) {
      return;
    }

    /*
      先讀原本報表，
      再建立新版區塊。
      這樣不會抓到自己。
    */
    const oldMetrics =
      findOriginalMetrics(title);

    if (!oldMetrics) {
      return;
    }

    const base =
      readBaseMetrics(
        oldMetrics
      );

    const payments =
      paymentInfo();

    const revenue =
      base.revenue;

    const collected =
      payments.collected;

    const receivable =
      Math.max(
        revenue - collected,
        0
      );

    const shell =
      buildShell(title);

    const box =
      shell.querySelector(
        '#reportEnhanceBox'
      );

    box.innerHTML = `
      <div class="reportKpiGrid">

        <div class="reportKpi">
          <div class="label">
            營收
          </div>
          <div class="value">
            ${money(base.revenue)}
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
            ${money(base.cost)}
          </div>
        </div>

        <div class="reportKpi profit">
          <div class="label">
            毛利
          </div>
          <div class="value">
            ${money(base.profit)}
          </div>
        </div>

        <div class="reportKpi">
          <div class="label">
            毛利率
          </div>
          <div class="value">
            ${Number(
              base.margin || 0
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
            ${payments.completedCount} 筆
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
          營收、成本、毛利沿用原營運報表；
          實收為實際收款紀錄；
          應收帳款＝營收－實收。
        </div>

      </div>
    `;

    /*
      原本四格統計仍保留在 DOM，
      只把它隱藏。
      這樣它仍能持續計算，
      新版才能安全讀取數字。
    */
    oldMetrics.style.display =
      'none';
  }

  function refresh() {
    addStyle();

    setTimeout(
      render,
      120
    );
  }

  const originalApp =
    window.app;

  window.app = function () {
    originalApp();
    refresh();
  };

  document.addEventListener(
    'change',
    function () {
      if (S.pg === 'reports') {
        setTimeout(
          render,
          120
        );
      }
    }
  );

  document.addEventListener(
    'input',
    function () {
      if (S.pg === 'reports') {
        setTimeout(
          render,
          120
        );
      }
    }
  );

  refresh();
})();

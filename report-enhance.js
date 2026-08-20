(function () {
  S.fx = S.fx || {};

  // =========================
  // 基本工具
  // =========================

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function parseDate(v) {
    const s = String(v || '').slice(0, 10);

    if (!s) return null;

    return new Date(s + 'T12:00:00');
  }

  // =========================
  // 找報表元件
  // =========================

  function findTitle() {
    return Array.from(
      document.querySelectorAll('h1,h2,h3')
    ).find(el =>
      (el.textContent || '')
        .trim()
        .includes('營運報表')
    );
  }

  function findPeriodSelect() {
    return Array.from(
      document.querySelectorAll('select')
    ).find(el =>
      (el.parentElement?.textContent || '')
        .includes('統計週期')
    );
  }

  function findSearchInput() {
    return Array.from(
      document.querySelectorAll('input')
    ).find(el =>
      (el.placeholder || '')
        .includes('搜尋日期')
    );
  }

  // =========================
  // 統計週期
  // =========================

  function periodMode() {
    const el = findPeriodSelect();

    if (!el) return 'month';

    const text = (
      el.options?.[el.selectedIndex]?.text ||
      el.value ||
      ''
    ).trim();

    if (text.includes('日')) {
      return 'day';
    }

    if (text.includes('年')) {
      return 'year';
    }

    return 'month';
  }

  function anchorDate() {
    const raw = (
      findSearchInput()?.value || ''
    ).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(
        raw + 'T12:00:00'
      );
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
    const mode = periodMode();

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

  // =========================
  // 計算新版報表
  // =========================

  function metrics() {
    const repairs = (S.r || [])
      .filter(r =>
        inPeriod(r.repair_date)
      );

    const revenue = repairs.reduce(
      (sum, r) =>
        sum + Number(r.total || 0),
      0
    );

    const cost = repairs.reduce(
      (sum, r) =>
        sum + Number(r.cost_total || 0),
      0
    );

    const profit =
      revenue - cost;

    const margin =
      revenue > 0
        ? profit / revenue * 100
        : 0;

    const repairIds = new Set(
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

    const receivable =
      Math.max(
        revenue - collected,
        0
      );

    const completedCount =
      repairs.filter(r =>
        r.status === 'completed'
      ).length;

    return {
      revenue,
      collected,
      receivable,
      cost,
      profit,
      margin,
      completedCount
    };
  }

  // =========================
  // 樣式
  // =========================

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
        display:block!important;
        width:100%!important;
        grid-column:1 / -1!important;
        min-width:0!important;
        margin:0 0 14px!important;
      }

      #reportEnhanceTitle{
        display:block!important;
        width:100%!important;
        margin:0 0 18px!important;
        padding:0!important;
        text-align:left!important;
        writing-mode:horizontal-tb!important;
        text-orientation:mixed!important;
      }

      #reportEnhanceBox{
        display:block!important;
        width:100%!important;
        min-width:0!important;
      }

      .reportKpiGrid{
        display:grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
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

  // =========================
  // 建立新版報表區塊
  // =========================

  function ensureShell() {
    const title = findTitle();

    if (!title) return null;

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

    title.parentElement.insertBefore(
      shell,
      title
    );

    shell.appendChild(title);

    title.id =
      'reportEnhanceTitle';

    const box =
      document.createElement('div');

    box.id =
      'reportEnhanceBox';

    shell.appendChild(box);

    return shell;
  }

  // =========================
  // 隱藏舊版四張卡片
  // =========================

  function hideLegacyCards() {
    if (S.pg !== 'reports') {
      return;
    }

    const divs =
      Array.from(
        document.querySelectorAll('div')
      ).filter(el =>
        !el.closest(
          '#reportEnhanceShell'
        )
      );

    const candidates =
      divs.filter(el => {

        const children =
          Array.from(el.children);

        if (
          children.length < 4 ||
          children.length > 6
        ) {
          return false;
        }

        const texts =
          children.map(child =>
            (child.innerText || '')
              .replace(/\s+/g, ' ')
              .trim()
          );

        const hasRevenue =
          texts.some(t =>
            t.startsWith('營收') &&
            t.includes('NT$')
          );

        const hasCost =
          texts.some(t =>
            t.startsWith('成本') &&
            t.includes('NT$')
          );

        const hasProfit =
          texts.some(t =>
            t.startsWith('毛利') &&
            !t.startsWith('毛利率') &&
            t.includes('NT$')
          );

        const hasMargin =
          texts.some(t =>
            t.startsWith('毛利率') &&
            t.includes('%')
          );

        const isTable =
          texts.some(t =>
            t.includes('期間') ||
            t.includes('筆數')
          );

        return (
          hasRevenue &&
          hasCost &&
          hasProfit &&
          hasMargin &&
          !isTable
        );
      });

    candidates.forEach(el => {
      el.style.setProperty(
        'display',
        'none',
        'important'
      );
    });
  }

  // =========================
  // 畫新版報表
  // =========================

  function render() {
    if (S.pg !== 'reports') {
      return;
    }

    addStyle();

    const shell =
      ensureShell();

    if (!shell) {
      return;
    }

    const m =
      metrics();

    const box =
      document.getElementById(
        'reportEnhanceBox'
      );

    if (!box) {
      return;
    }

    const receivedRate =
      m.revenue > 0
        ? (
            m.collected /
            m.revenue *
            100
          ).toFixed(1)
        : '0.0';

    const unpaidRate =
      m.revenue > 0
        ? (
            m.receivable /
            m.revenue *
            100
          ).toFixed(1)
        : '0.0';

    box.innerHTML = `

      <div class="reportKpiGrid">

        <div class="reportKpi">
          <div class="label">
            營收
          </div>

          <div class="value">
            ${money(m.revenue)}
          </div>
        </div>

        <div class="reportKpi collected">
          <div class="label">
            實收
          </div>

          <div class="value">
            ${money(m.collected)}
          </div>
        </div>

        <div class="reportKpi receivable">
          <div class="label">
            應收帳款
          </div>

          <div class="value">
            ${money(m.receivable)}
          </div>
        </div>

        <div class="reportKpi">
          <div class="label">
            成本
          </div>

          <div class="value">
            ${money(m.cost)}
          </div>
        </div>

        <div class="reportKpi profit">
          <div class="label">
            毛利
          </div>

          <div class="value">
            ${money(m.profit)}
          </div>
        </div>

        <div class="reportKpi">
          <div class="label">
            毛利率
          </div>

          <div class="value">
            ${m.margin.toFixed(1)}%
          </div>
        </div>

      </div>

      <div class="reportSummaryBox">

        <div class="reportSummaryRow">
          <span>
            已完工維修單
          </span>

          <strong>
            ${m.completedCount} 筆
          </strong>
        </div>

        <div class="reportSummaryRow">
          <span>
            已收比例
          </span>

          <strong>
            ${receivedRate}%
          </strong>
        </div>

        <div class="reportSummaryRow">
          <span>
            未收比例
          </span>

          <strong>
            ${unpaidRate}%
          </strong>
        </div>

        <div class="reportHint">
          營收＝期間內維修單總額；
          實收＝實際收款紀錄；
          應收帳款＝營收－實收；
          成本＝維修單內部總成本。
        </div>

      </div>

    `;

    /*
      舊報表是在 app() 執行後才建立，
      所以這裡與稍後都再檢查一次。
    */
    hideLegacyCards();

    setTimeout(
      hideLegacyCards,
      150
    );

    setTimeout(
      hideLegacyCards,
      400
    );
  }

  // =========================
  // 更新
  // =========================

  function refreshReport() {
    setTimeout(
      render,
      120
    );
  }

  // 保存原本 app()
  const originalApp =
    window.app;

  window.app = function () {
    originalApp();

    refreshReport();
  };

  // 切換統計週期
  document.addEventListener(
    'change',
    function () {
      if (S.pg === 'reports') {
        refreshReport();
      }
    }
  );

  // 日期／月份／年份搜尋
  document.addEventListener(
    'input',
    function () {
      if (S.pg === 'reports') {
        refreshReport();
      }
    }
  );

  // 首次進入
  refreshReport();

})();

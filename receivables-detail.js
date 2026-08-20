(function () {
  S.fx = S.fx || {};

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function esc(v) {
    if (typeof E === 'function') {
      return E(v == null ? '' : String(v));
    }

    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDate(v) {
    const value = String(v || '').slice(0, 10);

    return value
      ? new Date(value + 'T12:00:00')
      : null;
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

  function periodMode() {
    const el = findPeriodSelect();

    const text = (
      el?.options?.[el.selectedIndex]?.text ||
      el?.value ||
      '每月'
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
    const date = parseDate(value);

    if (!date) {
      return false;
    }

    const anchor = anchorDate();
    const mode = periodMode();

    if (mode === 'day') {
      return (
        date.getFullYear() === anchor.getFullYear() &&
        date.getMonth() === anchor.getMonth() &&
        date.getDate() === anchor.getDate()
      );
    }

    if (mode === 'year') {
      return (
        date.getFullYear() === anchor.getFullYear()
      );
    }

    return (
      date.getFullYear() === anchor.getFullYear() &&
      date.getMonth() === anchor.getMonth()
    );
  }

  async function ensurePayments(forceReload) {
    if (
      !forceReload &&
      S.fx.paymentsLoaded
    ) {
      return S.fx.payments || [];
    }

    const { data, error } = await s
      .from('payments')
      .select('*')
      .eq('shop_id', H)
      .order(
        'paid_at',
        { ascending: false }
      );

    if (error) {
      tt(error.message);
      return S.fx.payments || [];
    }

    S.fx.payments = data || [];
    S.fx.paymentsLoaded = true;

    return S.fx.payments;
  }

  function paidTotal(id) {
    return (S.fx.payments || [])
      .filter(payment =>
        payment.repair_id === id
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount || 0),
        0
      );
  }

  function customer(repair) {
    return (S.c || [])
      .find(item =>
        item.id === repair.customer_id
      ) || {};
  }

  function vehicle(repair) {
    return (S.v || [])
      .find(item =>
        item.id === repair.vehicle_id
      ) || {};
  }

  function statusText(status) {
    const map = {
      draft: '待施工',
      quoted: '待施工',
      approved: '待施工',
      in_progress: '施工中',
      completed: '已完工',
      cancelled: '已取消'
    };

    return map[status] || '待施工';
  }

  function unpaidRepairs() {
    return (S.r || [])
      .filter(repair =>
        inPeriod(repair.repair_date)
      )
      .map(repair => {
        const total =
          Number(repair.total || 0);

        const paid =
          paidTotal(repair.id);

        const due =
          Math.max(total - paid, 0);

        return {
          repair,
          total,
          paid,
          due,
          customer: customer(repair),
          vehicle: vehicle(repair)
        };
      })
      .filter(item =>
        item.due > 0
      )
      .sort((a, b) =>
        String(
          b.repair.repair_date || ''
        ).localeCompare(
          String(
            a.repair.repair_date || ''
          )
        )
      );
  }

  function addStyle() {
    if (
      document.getElementById(
        'receivablesDetailStyle'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'receivablesDetailStyle';

    style.textContent = `
      .reportKpi.receivable{
        cursor:pointer;
        position:relative;
      }

      .reportKpi.receivable:after{
        content:'點擊查看明細 ›';
        display:block;
        margin-top:8px;
        font-size:11px;
        font-weight:800;
        color:#b46a13;
      }

      .arHead{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
      }

      .arList{
        display:grid;
        gap:10px;
        margin-top:12px;
      }

      .arCard{
        border:1px solid #e3e5e8;
        border-radius:14px;
        padding:12px;
        background:#fff;
        cursor:pointer;
      }

      .arCard:active{
        transform:scale(.995);
      }

      .arTop{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
      }

      .arNo{
        font-size:16px;
        font-weight:900;
      }

      .arDue{
        color:#b75b00;
        font-weight:900;
        white-space:nowrap;
        text-align:right;
      }

      .arMeta{
        margin-top:4px;
        color:#777;
        font-size:13px;
        line-height:1.55;
      }

      .arAmounts{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:6px;
        margin-top:10px;
      }

      .arAmt{
        padding:8px;
        border-radius:10px;
        background:#f7f7f8;
        text-align:center;
        font-size:12px;
      }

      .arAmt b{
        display:block;
        margin-top:2px;
        font-size:13px;
      }

      .arEmpty{
        padding:28px 8px;
        color:#777;
        text-align:center;
      }

      .arDetailGrid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin:12px 0;
      }

      .arInfo{
        padding:9px;
        border:1px solid #e7e7e7;
        border-radius:10px;
        font-size:13px;
      }

      .arInfo span{
        display:block;
        margin-bottom:2px;
        color:#777;
        font-size:11px;
      }

      .arItem{
        margin-top:8px;
        padding:10px;
        border:1px solid #e7e7e7;
        border-radius:12px;
      }

      .arItemName{
        font-weight:800;
      }

      .arItemRow{
        display:flex;
        justify-content:space-between;
        gap:8px;
        margin-top:5px;
        color:#666;
        font-size:12px;
      }

      .arTotals{
        margin-top:12px;
        padding-top:8px;
        border-top:1px solid #ddd;
      }

      .arTotals .r{
        padding:4px 0;
      }

      .arDueBox{
        margin-top:10px;
        padding:10px;
        border:1px solid #f3c98e;
        border-radius:12px;
        background:#fff7ed;
      }

      .arActions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:12px;
      }

      .arPayButton{
        background:#f58220!important;
        color:#fff!important;
      }

      .arGoRepair{
        grid-column:1 / -1;
      }

      @media(max-width:390px){
        .arAmounts{
          grid-template-columns:1fr;
        }

        .arDetailGrid{
          grid-template-columns:1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  S.fx.openReceivables =
    async function () {
      await ensurePayments();

      const items =
        unpaidRepairs();

      const totalDue =
        items.reduce(
          (sum, item) =>
            sum + item.due,
          0
        );

      M.innerHTML = `
        <div class="mo">
          <div class="sh">

            <div class="arHead">

              <div>
                <h2 style="margin:0">
                  未收款明細
                </h2>

                <div class="m">
                  共 ${items.length} 張維修單
                  ・應收 ${money(totalDue)}
                </div>
              </div>

              <button
                class="b x"
                onclick="cm()"
              >
                關閉
              </button>

            </div>

            ${
              items.length

                ? `
                  <div class="arList">

                    ${items.map(item => `
                      <div
                        class="arCard"
                        onclick="
                          S.fx.openReceivableRepair(
                            '${item.repair.id}'
                          )
                        "
                      >

                        <div class="arTop">

                          <div>

                            <div class="arNo">
                              ${esc(
                                item.repair.repair_no
                              )}
                            </div>

                            <div class="arMeta">
                              ${esc(
                                item.repair.repair_date
                              )}
                              ·
                              ${esc(
                                item.customer.name ||
                                '未命名客戶'
                              )}
                              <br>

                              🚗
                              ${esc(
                                item.vehicle.plate || ''
                              )}
                              ·
                              ${esc(
                                [
                                  item.vehicle.brand,
                                  item.vehicle.model
                                ]
                                  .filter(Boolean)
                                  .join(' ')
                              )}
                              <br>

                              ${statusText(
                                item.repair.status
                              )}
                            </div>

                          </div>

                          <div class="arDue">
                            尚欠
                            <br>
                            ${money(item.due)}
                          </div>

                        </div>

                        <div class="arAmounts">

                          <div class="arAmt">
                            維修總額
                            <b>
                              ${money(item.total)}
                            </b>
                          </div>

                          <div class="arAmt">
                            已收
                            <b>
                              ${money(item.paid)}
                            </b>
                          </div>

                          <div class="arAmt">
                            未收
                            <b>
                              ${money(item.due)}
                            </b>
                          </div>

                        </div>

                      </div>
                    `).join('')}

                  </div>
                `

                : `
                  <div class="arEmpty">
                    這個期間沒有未收款維修單 🎉
                  </div>
                `
            }

          </div>
        </div>
      `;
    };

  S.fx.openReceivableRepair =
    async function (id) {
      await ensurePayments();

      const repair =
        (S.r || []).find(item =>
          item.id === id
        );

      if (!repair) {
        return tt('找不到這張維修單');
      }

      const {
        data: repairItems,
        error
      } = await s
        .from('repair_items')
        .select('*')
        .eq('repair_id', id);

      if (error) {
        return tt(error.message);
      }

      const customerData =
        customer(repair);

      const vehicleData =
        vehicle(repair);

      const total =
        Number(repair.total || 0);

      const paid =
        paidTotal(id);

      const due =
        Math.max(total - paid, 0);

      const itemHtml =
        (repairItems || [])
          .map((item, index) => {
            const subtotal =
              Number(
                item.subtotal ||
                (
                  Number(item.qty || 0) *
                  Number(item.unit_price || 0) +
                  Number(item.labor_price || 0)
                )
              );

            return `
              <div class="arItem">

                <div class="arItemName">
                  ${index + 1}.
                  ${esc(
                    item.item_name ||
                    '維修項目'
                  )}
                </div>

                <div class="arItemRow">

                  <span>
                    數量
                    ${Number(item.qty || 0)}
                  </span>

                  <span>
                    零件
                    ${money(item.unit_price)}
                  </span>

                  <span>
                    工資
                    ${money(item.labor_price)}
                  </span>

                </div>

                <div class="arItemRow">

                  <span>
                    小計
                  </span>

                  <b>
                    ${money(subtotal)}
                  </b>

                </div>

              </div>
            `;
          })
          .join('');

      M.innerHTML = `
        <div class="mo">
          <div class="sh">

            <div class="arHead">

              <div>
                <h2 style="margin:0">
                  完整維修單
                </h2>

                <div class="m">
                  ${esc(repair.repair_no)}
                </div>
              </div>

              <button
                class="b x"
                onclick="cm()"
              >
                關閉
              </button>

            </div>

            <div class="arDetailGrid">

              <div class="arInfo">
                <span>客戶</span>
                ${esc(customerData.name || '')}
              </div>

              <div class="arInfo">
                <span>電話</span>
                ${esc(customerData.phone || '')}
              </div>

              <div class="arInfo">
                <span>車牌</span>
                ${esc(vehicleData.plate || '')}
              </div>

              <div class="arInfo">
                <span>車輛</span>
                ${esc(
                  [
                    vehicleData.brand,
                    vehicleData.model
                  ]
                    .filter(Boolean)
                    .join(' ')
                )}
              </div>

              <div class="arInfo">
                <span>日期</span>
                ${esc(repair.repair_date || '')}
              </div>

              <div class="arInfo">
                <span>狀態</span>
                ${statusText(repair.status)}
              </div>

              ${
                repair.mileage != null &&
                repair.mileage !== ''

                  ? `
                    <div class="arInfo">
                      <span>里程</span>
                      ${esc(repair.mileage)}
                    </div>
                  `

                  : ''
              }

            </div>

            ${
              repair.complaint

                ? `
                  <div
                    class="arInfo"
                    style="margin-bottom:10px"
                  >
                    <span>
                      維修／客訴
                    </span>

                    ${esc(repair.complaint)}
                  </div>
                `

                : ''
            }

            <h3 style="margin:12px 0 6px">
              維修項目
            </h3>

            ${
              itemHtml ||
              '<div class="m">沒有項目資料</div>'
            }

            <div class="arTotals">

              <div class="r">
                <span>
                  維修總額
                </span>

                <b>
                  ${money(total)}
                </b>
              </div>

              <div class="r">
                <span>
                  已收款
                </span>

                <b>
                  ${money(paid)}
                </b>
              </div>

            </div>

            <div class="arDueBox">

              <div class="r">

                <b>
                  尚未收款
                </b>

                <b>
                  ${money(due)}
                </b>

              </div>

            </div>

            ${
              repair.notes

                ? `
                  <div
                    class="arInfo"
                    style="margin-top:10px"
                  >
                    <span>備註</span>
                    ${esc(repair.notes)}
                  </div>
                `

                : ''
            }

            <div class="arActions">

              <button
                class="b"
                onclick="
                  S.fx.openReceivables()
                "
              >
                ← 回未收款清單
              </button>

              <button
                class="b arPayButton"
                onclick="
                  S.fx.collectFromReceivable(
                    '${id}'
                  )
                "
              >
                💰 確認收款
              </button>

              <button
                class="b o arGoRepair"
                onclick="
                  S.fx.goRepair('${id}')
                "
              >
                前往維修紀錄
              </button>

            </div>

          </div>
        </div>
      `;
    };

  S.fx.collectFromReceivable =
    async function (id) {
      if (
        typeof S.fx.collectRepair !==
        'function'
      ) {
        return tt('目前無法開啟收款功能');
      }

      const repair =
        (S.r || []).find(item =>
          item.id === id
        );

      if (!repair) {
        return tt('找不到這張維修單');
      }

      if (repair.status !== 'completed') {
        return tt(
          '請先將維修單標記為已完工'
        );
      }

      const before =
        paidTotal(id);

      await S.fx.collectRepair(id);

      /*
        收款程式已將新紀錄加入
        S.fx.payments，再讀取最新金額。
      */
      const after =
        paidTotal(id);

      /*
        使用者取消、輸入錯誤，
        或收款沒有成功時，
        保留原畫面。
      */
      if (after <= before) {
        return;
      }

      const remaining =
        Math.max(
          Number(repair.total || 0) -
          after,
          0
        );

      setTimeout(() => {
        if (remaining > 0) {
          /*
            部分收款：
            重新打開完整維修單，
            顯示最新已收與未收金額。
          */
          S.fx.openReceivableRepair(id);
        } else {
          /*
            已全額收清：
            回到未收款清單，
            本單會自動從清單消失。
          */
          S.fx.openReceivables();
        }
      }, 180);
    };

  S.fx.goRepair =
    function (id) {
      cm();

      S.pg = 'repairs';

      app();

      setTimeout(() => {
        const repair =
          (S.r || []).find(item =>
            item.id === id
          );

        if (!repair) {
          return;
        }

        const card =
          Array.from(
            document.querySelectorAll('.it')
          ).find(el =>
            el.querySelector('b')
              ?.textContent
              .trim() ===
            repair.repair_no
          );

        if (!card) {
          return;
        }

        card.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        const oldShadow =
          card.style.boxShadow;

        card.style.boxShadow =
          '0 0 0 3px #f58220';

        setTimeout(() => {
          card.style.boxShadow =
            oldShadow;
        }, 1800);
      }, 120);
    };

  function bindCard() {
    if (S.pg !== 'reports') {
      return;
    }

    const card =
      document.querySelector(
        '.reportKpi.receivable'
      );

    if (
      !card ||
      card.dataset.arBound
    ) {
      return;
    }

    card.dataset.arBound = '1';

    card.setAttribute(
      'role',
      'button'
    );

    card.setAttribute(
      'tabindex',
      '0'
    );

    card.onclick =
      () => S.fx.openReceivables();

    card.onkeydown = event => {
      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        S.fx.openReceivables();
      }
    };
  }

  addStyle();

  const observer =
    new MutationObserver(() => {
      bindCard();
    });

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  setTimeout(
    bindCard,
    200
  );
})();

(function () {
  S.fx = S.fx || {};
  S.fx.payments = [];
  S.fx.paymentsLoaded = false;
  S.fx.paymentsLoading = false;

  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }

  function paidTotal(repairId) {
    return (S.fx.payments || [])
      .filter(x => x.repair_id === repairId)
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }

  function isPaid(r) {
    const total = Number(r.total || 0);
    return total > 0 && paidTotal(r.id) >= total;
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

  function statusClass(status) {
    if (status === 'in_progress') return 'work';
    if (status === 'completed') return 'done';
    if (status === 'cancelled') return 'cancel';
    return 'wait';
  }

  async function loadPayments() {
    if (S.fx.paymentsLoading) return;

    S.fx.paymentsLoading = true;

    const { data, error } = await s
      .from('payments')
      .select('*')
      .eq('shop_id', H)
      .order('paid_at', { ascending: false });

    S.fx.paymentsLoading = false;

    if (error) {
      console.warn('payments load error', error);
      return;
    }

    S.fx.payments = data || [];
    S.fx.paymentsLoaded = true;

    decorate();
  }

  S.fx.setRepairStatus = async function (id, status) {
    const r = S.r.find(x => x.id === id);

    if (!r) {
      return tt('找不到這張維修單');
    }

    const label =
      status === 'in_progress'
        ? '開始施工'
        : status === 'completed'
        ? '標記完工'
        : '更新狀態';

    if (!confirm(`${label}：${r.repair_no}？`)) {
      return;
    }

    const { error } = await s
      .from('repair_orders')
      .update({
        status: status,
        updated_by: S.z.user.id
      })
      .eq('id', id);

    if (error) {
      return tt(error.message);
    }

    r.status = status;

    app();

    tt(
      status === 'completed'
        ? '已標記完工 ✓'
        : status === 'in_progress'
        ? '已開始施工 ✓'
        : '狀態已更新 ✓'
    );
  };

  S.fx.collectRepair = async function (id) {
    const r = S.r.find(x => x.id === id);

    if (!r) {
      return tt('找不到這張維修單');
    }

    if (r.status !== 'completed') {
      return tt('請先將維修單標記為已完工');
    }

    const total = Number(r.total || 0);
    const alreadyPaid = paidTotal(id);
    const remaining = Math.max(total - alreadyPaid, 0);

    if (remaining <= 0) {
      return tt('這張維修單已收款完成 ✓');
    }

    const amountInput = prompt(
      `本單總額：${money(total)}

已收：${money(alreadyPaid)}

未收：${money(remaining)}

請輸入本次收款金額：`,
      remaining
    );

    if (amountInput === null) {
      return;
    }

    const amount = Number(amountInput);

    if (!amount || amount <= 0) {
      return tt('請輸入正確的收款金額');
    }

    if (amount > remaining) {
      return tt('收款金額不可大於未收金額');
    }

    const methodInput = prompt(
      '請輸入收款方式：現金／轉帳／刷卡／其他',
      '現金'
    );

    if (methodInput === null) {
      return;
    }

    const method = methodInput.trim() || '現金';

    const { data, error } = await s
      .from('payments')
      .insert({
        shop_id: H,
        customer_id: r.customer_id,
        repair_id: r.id,
        amount: amount,
        method: method,
        created_by: S.z.user.id
      })
      .select()
      .single();

    if (error) {
      return tt(error.message);
    }

    S.fx.payments.push(data);

    const newPaid = alreadyPaid + amount;

    app();

    if (newPaid >= total) {
      tt('收款完成 ✓');
    } else {
      tt(
        `已收款 ${money(amount)}，尚未收 ${money(
          total - newPaid
        )}`
      );
    }
  };

  function addStyle() {
    if (document.getElementById('repairWorkflowStyle')) {
      return;
    }

    const style = document.createElement('style');

    style.id = 'repairWorkflowStyle';

    style.textContent = `
      .rwState{
        display:flex;
        gap:5px;
        flex-wrap:wrap;
        margin-top:7px;
      }

      .rwBadge{
        display:inline-block;
        padding:4px 8px;
        border-radius:999px;
        font-size:11px;
        font-weight:800;
      }

      .rwBadge.wait{
        background:#f1f2f4;
        color:#666;
      }

      .rwBadge.work{
        background:#eaf1ff;
        color:#245fc2;
      }

      .rwBadge.done{
        background:#e9f8ef;
        color:#168a50;
      }

      .rwBadge.cancel{
        background:#fff0f0;
        color:#a22;
      }

      .rwBadge.unpaid{
        background:#fff4e8;
        color:#b75b00;
      }

      .rwBadge.partial{
        background:#fff7d9;
        color:#8a6500;
      }

      .rwBadge.paid{
        background:#e9f8ef;
        color:#168a50;
      }

      .rwAction{
        font-size:11px !important;
        padding:7px 8px !important;
        white-space:nowrap !important;
      }

      .rwStart{
        background:#245fc2 !important;
        color:white !important;
      }

      .rwFinish{
        background:#168a50 !important;
        color:white !important;
      }

      .rwPay{
        background:#f58220 !important;
        color:white !important;
      }

      .rwPaid{
        background:#e9f8ef !important;
        color:#168a50 !important;
        border:1px solid #bde8ce !important;
      }
    `;

    document.head.appendChild(style);
  }

  function decorateRepairs() {
    if (S.pg !== 'repairs') {
      return;
    }

    document.querySelectorAll('.it').forEach(card => {
      const firstBold = card.querySelector('b');

      if (!firstBold) {
        return;
      }

      const repairNo = firstBold.textContent.trim();

      if (!repairNo.startsWith('R')) {
        return;
      }

      const r = S.r.find(x => x.repair_no === repairNo);

      if (!r) {
        return;
      }

      const mainInfo =
        card.querySelector('.r > div:first-child');

      if (
        mainInfo &&
        !mainInfo.querySelector('.rwState')
      ) {
        const paid = paidTotal(r.id);
        const total = Number(r.total || 0);

        let payBadge = '';

        if (total > 0 && paid >= total) {
          payBadge =
            '<span class="rwBadge paid">💰 已收款</span>';
        } else if (paid > 0) {
          payBadge =
            `<span class="rwBadge partial">已收 ${money(
              paid
            )}</span>`;
        } else {
          payBadge =
            '<span class="rwBadge unpaid">未收款</span>';
        }

        const state = document.createElement('div');

        state.className = 'rwState';

        state.innerHTML =
          `<span class="rwBadge ${statusClass(
            r.status
          )}">${statusText(r.status)}</span>` +
          payBadge;

        mainInfo.appendChild(state);
      }

      const actions = card.querySelector('.ac');

      if (
        !actions ||
        actions.querySelector('.rwAction')
      ) {
        return;
      }

      let button = '';

      if (
        r.status === 'draft' ||
        r.status === 'quoted' ||
        r.status === 'approved' ||
        !r.status
      ) {
        button = `
          <button
            class="b rwAction rwStart"
            onclick="S.fx.setRepairStatus('${r.id}','in_progress')"
          >
            開始施工
          </button>
        `;
      }

      if (r.status === 'in_progress') {
        button = `
          <button
            class="b rwAction rwFinish"
            onclick="S.fx.setRepairStatus('${r.id}','completed')"
          >
            標記完工
          </button>
        `;
      }

      if (
        r.status === 'completed' &&
        !isPaid(r)
      ) {
        button = `
          <button
            class="b rwAction rwPay"
            onclick="S.fx.collectRepair('${r.id}')"
          >
            確認收款
          </button>
        `;
      }

      if (
        r.status === 'completed' &&
        isPaid(r)
      ) {
        button = `
          <button
            class="b rwAction rwPaid"
            disabled
          >
            已收款
          </button>
        `;
      }

      if (button) {
        actions.insertAdjacentHTML(
          'afterbegin',
          button
        );
      }
    });
  }

  function decorate() {
    addStyle();
    decorateRepairs();
  }

  const originalApp = window.app;

  window.app = function () {
    originalApp();

    setTimeout(() => {
      decorate();
    }, 30);

    if (
      !S.fx.paymentsLoaded &&
      !S.fx.paymentsLoading
    ) {
      loadPayments();
    }
  };

  addStyle();

  if (
    typeof S !== 'undefined' &&
    S.z &&
    S.z.user
  ) {
    loadPayments();
  }

  setTimeout(() => {
    decorate();
  }, 300);
})();

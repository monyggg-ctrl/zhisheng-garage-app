(function () {
  function money(n) {
    return 'NT$ ' + Number(n || 0).toLocaleString('zh-TW');
  }
  function repairStatusText(status) {
    const map = {
      draft: '草稿',
      quoted: '已報價',
      approved: '已確認',
      in_progress: '施工中',
      completed: '已完工',
      paid: '已收款'
    };
    return map[status] || status || '未設定';
  }

  function repairPaidTotal(repairId) {
    return (S.payments || [])
      .filter(x => x.repair_id === repairId)
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }

  S.fx = S.fx || {};

  S.fx.setRepairStatus = async function (id, status) {
    const r = S.r.find(x => x.id === id);
    if (!r) return;

    const label =
      status === 'in_progress'
        ? '開始施工'
        : status === 'completed'
        ? '標記完工'
        : '更新狀態';

    if (!confirm(`${label}：${r.repair_no}？`)) return;

    const { error } = await s
      .from('repair_orders')
      .update({
        status: status,
        updated_by: S.z.user.id
      })
      .eq('id', id);

    if (error) return tt(error.message);

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
    if (!r) return;

    if (r.status !== 'completed' && r.status !== 'paid') {
      return tt('請先將維修單標記為完工');
    }

    const total = Number(r.total || 0);
    const paid = repairPaidTotal(id);
    const remaining = Math.max(total - paid, 0);

    if (remaining <= 0) {
      return tt('此維修單已收款完成 ✓');
    }

    const amountInput = prompt(
      `本單總額：${money(total)}\n已收：${money(paid)}\n未收：${money(
        remaining
      )}\n\n請輸入本次收款金額：`,
      remaining
    );

    if (amountInput === null) return;

    const amount = Number(amountInput);

    if (!amount || amount <= 0) {
      return tt('請輸入正確的收款金額');
    }

    if (amount > remaining) {
      return tt('收款金額不可大於未收金額');
    }

    const methodInput = prompt(
      '請輸入收款方式：\n現金／轉帳／刷卡／其他',
      '現金'
    );

    if (methodInput === null) return;

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

    if (error) return tt(error.message);

    S.payments = S.payments || [];
    S.payments.push(data);

    const newPaid = paid + amount;

    app();

    tt(
      newPaid >= total
        ? '收款完成 ✓'
        : `已收款 ${money(amount)}，尚未收 ${money(total - newPaid)}`
    );
  };

  S.fx.repairStatusText = repairStatusText;
  S.fx.repairPaidTotal = repairPaidTotal;
})();

(function () {
  S.fx = S.fx || {};

  function addStyle() {
    if (
      document.getElementById(
        'receivableFinishStyle'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'receivableFinishStyle';

    style.textContent = `
      .arFinishButton{
        background:#168a50!important;
        color:#fff!important;
      }
    `;

    document.head.appendChild(style);
  }

  S.fx.finishFromReceivable =
    async function (id) {
      const repair =
        (S.r || []).find(item =>
          item.id === id
        );

      if (!repair) {
        return tt('找不到這張維修單');
      }

      if (
        typeof S.fx.setRepairStatus !==
        'function'
      ) {
        return tt('目前無法更新維修狀態');
      }

      await S.fx.setRepairStatus(
        id,
        'completed'
      );

      /*
        使用者取消或更新失敗時，
        維持目前畫面。
      */
      if (repair.status !== 'completed') {
        return;
      }

      /*
        標記完工成功後，
        重新開啟同一張維修單。
        原本的按鈕會自動變成確認收款。
      */
      setTimeout(() => {
        S.fx.openReceivableRepair(id);
      }, 180);
    };

  function changeActionButton(id) {
    const repair =
      (S.r || []).find(item =>
        item.id === id
      );

    const button =
      document.querySelector(
        '.arPayButton'
      );

    if (
      !repair ||
      !button
    ) {
      return;
    }

    /*
      已完工：
      保留原本的確認收款按鈕。
    */
    if (repair.status === 'completed') {
      button.classList.remove(
        'arFinishButton'
      );

      button.innerHTML =
        '💰 確認收款';

      button.onclick = function () {
        S.fx.collectFromReceivable(id);
      };

      return;
    }

    /*
      待施工或施工中：
      按鈕改為標記完工。
    */
    if (
      repair.status === 'draft' ||
      repair.status === 'quoted' ||
      repair.status === 'approved' ||
      repair.status === 'in_progress' ||
      !repair.status
    ) {
      button.classList.add(
        'arFinishButton'
      );

      button.innerHTML =
        '✓ 標記完工';

      button.onclick = function () {
        S.fx.finishFromReceivable(id);
      };

      return;
    }

    /*
      已取消的維修單不可完工或收款。
    */
    button.disabled = true;
    button.innerHTML = '已取消';
  }

  function install() {
    if (
      typeof S.fx.openReceivableRepair !==
      'function'
    ) {
      setTimeout(
        install,
        100
      );

      return;
    }

    if (
      S.fx.receivableFinishInstalled
    ) {
      return;
    }

    S.fx.receivableFinishInstalled = true;

    const originalOpen =
      S.fx.openReceivableRepair;

    S.fx.openReceivableRepair =
      async function (id) {
        await originalOpen(id);

        changeActionButton(id);
      };
  }

  addStyle();
  install();
})();

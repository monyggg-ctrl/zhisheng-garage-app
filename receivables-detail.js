(function(){
  S.fx=S.fx||{};

  function money(n){
    return 'NT$ '+Number(n||0).toLocaleString('zh-TW');
  }

  function esc(v){
    if(typeof E==='function') return E(v==null?'':String(v));

    return String(v==null?'':v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function parseDate(v){
    const x=String(v||'').slice(0,10);

    return x
      ? new Date(x+'T12:00:00')
      : null;
  }

  function periodMode(){
    const el=Array.from(
      document.querySelectorAll('select')
    ).find(x=>
      (x.parentElement?.textContent||'')
        .includes('統計週期')
    );

    const t=(
      el?.options?.[el.selectedIndex]?.text ||
      el?.value ||
      '每月'
    ).trim();

    if(t.includes('日')) return 'day';
    if(t.includes('年')) return 'year';

    return 'month';
  }

  function anchorDate(){
    const input=Array.from(
      document.querySelectorAll('input')
    ).find(x=>
      (x.placeholder||'')
        .includes('搜尋日期')
    );

    const raw=(input?.value||'').trim();

    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
      return new Date(raw+'T12:00:00');
    }

    if(/^\d{4}-\d{2}$/.test(raw)){
      return new Date(
        raw+'-01T12:00:00'
      );
    }

    if(/^\d{4}$/.test(raw)){
      return new Date(
        raw+'-01-01T12:00:00'
      );
    }

    return new Date();
  }

  function inPeriod(v){
    const d=parseDate(v);

    if(!d) return false;

    const a=anchorDate();
    const m=periodMode();

    if(m==='day'){
      return (
        d.getFullYear()===a.getFullYear() &&
        d.getMonth()===a.getMonth() &&
        d.getDate()===a.getDate()
      );
    }

    if(m==='year'){
      return (
        d.getFullYear()===
        a.getFullYear()
      );
    }

    return (
      d.getFullYear()===a.getFullYear() &&
      d.getMonth()===a.getMonth()
    );
  }

  async function ensurePayments(){
    if(S.fx.paymentsLoaded){
      return S.fx.payments||[];
    }

    const {data,error}=await s
      .from('payments')
      .select('*')
      .eq('shop_id',H)
      .order(
        'paid_at',
        {ascending:false}
      );

    if(error){
      tt(error.message);
      return [];
    }

    S.fx.payments=data||[];
    S.fx.paymentsLoaded=true;

    return S.fx.payments;
  }

  function paidTotal(id){
    return (S.fx.payments||[])
      .filter(x=>
        x.repair_id===id
      )
      .reduce(
        (n,x)=>
          n+Number(x.amount||0),
        0
      );
  }

  function customer(r){
    return (S.c||[])
      .find(x=>
        x.id===r.customer_id
      ) || {};
  }

  function vehicle(r){
    return (S.v||[])
      .find(x=>
        x.id===r.vehicle_id
      ) || {};
  }

  function statusText(status){
    const map={
      draft:'待施工',
      quoted:'待施工',
      approved:'待施工',
      in_progress:'施工中',
      completed:'已完工',
      cancelled:'已取消'
    };

    return map[status]||'待施工';
  }

  function unpaidRepairs(){
    return (S.r||[])
      .filter(r=>
        inPeriod(r.repair_date)
      )
      .map(r=>{
        const total=
          Number(r.total||0);

        const paid=
          paidTotal(r.id);

        const due=
          Math.max(
            total-paid,
            0
          );

        return {
          r,
          total,
          paid,
          due,
          c:customer(r),
          v:vehicle(r)
        };
      })
      .filter(x=>
        x.due>0
      )
      .sort((a,b)=>
        String(
          b.r.repair_date||''
        ).localeCompare(
          String(
            a.r.repair_date||''
          )
        )
      );
  }

  function addStyle(){
    if(
      document.getElementById(
        'receivablesDetailStyle'
      )
    ){
      return;
    }

    const st=
      document.createElement('style');

    st.id=
      'receivablesDetailStyle';

    st.textContent=`

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
        gap:10px;
        align-items:flex-start;
      }

      .arNo{
        font-weight:900;
        font-size:16px;
      }

      .arDue{
        font-weight:900;
        color:#b75b00;
        white-space:nowrap;
      }

      .arMeta{
        color:#777;
        font-size:13px;
        line-height:1.5;
        margin-top:4px;
      }

      .arAmounts{
        display:grid;
        grid-template-columns:
          repeat(3,1fr);
        gap:6px;
        margin-top:10px;
      }

      .arAmt{
        background:#f7f7f8;
        border-radius:10px;
        padding:8px;
        text-align:center;
        font-size:12px;
      }

      .arAmt b{
        display:block;
        font-size:13px;
        margin-top:2px;
      }

      .arHead{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
      }

      .arEmpty{
        text-align:center;
        color:#777;
        padding:28px 8px;
      }

      .arDetailGrid{
        display:grid;
        grid-template-columns:
          1fr 1fr;
        gap:8px;
        margin:12px 0;
      }

      .arInfo{
        border:1px solid #e7e7e7;
        border-radius:10px;
        padding:9px;
        font-size:13px;
      }

      .arInfo span{
        display:block;
        color:#777;
        font-size:11px;
        margin-bottom:2px;
      }

      .arItem{
        border:1px solid #e7e7e7;
        border-radius:12px;
        padding:10px;
        margin-top:8px;
      }

      .arItemName{
        font-weight:800;
      }

      .arItemRow{
        display:flex;
        justify-content:space-between;
        gap:8px;
        color:#666;
        font-size:12px;
        margin-top:5px;
      }

      .arTotals{
        border-top:1px solid #ddd;
        margin-top:12px;
        padding-top:8px;
      }

      .arTotals .r{
        padding:4px 0;
      }

      .arDueBox{
        background:#fff7ed;
        border:1px solid #f3c98e;
        border-radius:12px;
        padding:10px;
        margin-top:10px;
      }

      .arActions{
        display:grid;
        grid-template-columns:
          1fr 1fr;
        gap:8px;
        margin-top:12px;
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

    document.head.appendChild(st);
  }

  S.fx.openReceivables=
    async function(){

      await ensurePayments();

      const arr=
        unpaidRepairs();

      const totalDue=
        arr.reduce(
          (n,x)=>n+x.due,
          0
        );

      M.innerHTML=`
        <div class="mo">
          <div class="sh">

            <div class="arHead">

              <div>
                <h2 style="margin:0">
                  未收款明細
                </h2>

                <div class="m">
                  共 ${arr.length} 張維修單
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
              arr.length

              ? `
                <div class="arList">

                  ${arr.map(x=>`

                    <div
                      class="arCard"
                      onclick="
                        S.fx.openReceivableRepair(
                          '${x.r.id}'
                        )
                      "
                    >

                      <div class="arTop">

                        <div>

                          <div class="arNo">
                            ${esc(x.r.repair_no)}
                          </div>

                          <div class="arMeta">
                            ${esc(x.r.repair_date)}
                            ·
                            ${esc(
                              x.c.name ||
                              '未命名客戶'
                            )}
                            <br>

                            🚗
                            ${esc(x.v.plate||'')}
                            ·
                            ${esc(
                              [
                                x.v.brand,
                                x.v.model
                              ]
                              .filter(Boolean)
                              .join(' ')
                            )}
                            <br>

                            ${statusText(
                              x.r.status
                            )}
                          </div>

                        </div>

                        <div class="arDue">
                          尚欠
                          <br>
                          ${money(x.due)}
                        </div>

                      </div>

                      <div class="arAmounts">

                        <div class="arAmt">
                          維修總額
                          <b>
                            ${money(x.total)}
                          </b>
                        </div>

                        <div class="arAmt">
                          已收
                          <b>
                            ${money(x.paid)}
                          </b>
                        </div>

                        <div class="arAmt">
                          未收
                          <b>
                            ${money(x.due)}
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

  S.fx.openReceivableRepair=
    async function(id){

      await ensurePayments();

      const r=(S.r||[])
        .find(x=>
          x.id===id
        );

      if(!r){
        return tt(
          '找不到這張維修單'
        );
      }

      const {
        data:items,
        error
      }=await s
        .from('repair_items')
        .select('*')
        .eq('repair_id',id);

      if(error){
        return tt(
          error.message
        );
      }

      const c=customer(r);
      const v=vehicle(r);

      const total=
        Number(r.total||0);

      const paid=
        paidTotal(id);

      const due=
        Math.max(
          total-paid,
          0
        );

      const itemHtml=
        (items||[])
          .map((x,i)=>{

            const subtotal=
              Number(
                x.subtotal ||
                (
                  Number(x.qty||0) *
                  Number(x.unit_price||0) +
                  Number(x.labor_price||0)
                )
              );

            return `
              <div class="arItem">

                <div class="arItemName">
                  ${i+1}.
                  ${esc(
                    x.item_name ||
                    '維修項目'
                  )}
                </div>

                <div class="arItemRow">

                  <span>
                    數量
                    ${Number(x.qty||0)}
                  </span>

                  <span>
                    零件
                    ${money(x.unit_price)}
                  </span>

                  <span>
                    工資
                    ${money(x.labor_price)}
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

      M.innerHTML=`
        <div class="mo">
          <div class="sh">

            <div class="arHead">

              <div>
                <h2 style="margin:0">
                  完整維修單
                </h2>

                <div class="m">
                  ${esc(r.repair_no)}
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
                ${esc(c.name||'')}
              </div>

              <div class="arInfo">
                <span>電話</span>
                ${esc(c.phone||'')}
              </div>

              <div class="arInfo">
                <span>車牌</span>
                ${esc(v.plate||'')}
              </div>

              <div class="arInfo">
                <span>車輛</span>
                ${esc(
                  [
                    v.brand,
                    v.model
                  ]
                  .filter(Boolean)
                  .join(' ')
                )}
              </div>

              <div class="arInfo">
                <span>日期</span>
                ${esc(
                  r.repair_date||''
                )}
              </div>

              <div class="arInfo">
                <span>狀態</span>
                ${statusText(
                  r.status
                )}
              </div>

              ${
                r.mileage!=null &&
                r.mileage!==''

                ? `
                  <div class="arInfo">
                    <span>里程</span>
                    ${esc(r.mileage)}
                  </div>
                `

                : ''
              }

            </div>

            ${
              r.complaint

              ? `
                <div
                  class="arInfo"
                  style="margin-bottom:10px"
                >
                  <span>
                    維修／客訴
                  </span>

                  ${esc(r.complaint)}
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
              r.notes

              ? `
                <div
                  class="arInfo"
                  style="margin-top:10px"
                >
                  <span>備註</span>
                  ${esc(r.notes)}
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
                class="b o"
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

  S.fx.goRepair=
    function(id){

      cm();

      S.pg='repairs';

      app();

      setTimeout(()=>{

        const r=(S.r||[])
          .find(x=>
            x.id===id
          );

        if(!r) return;

        const card=
          Array.from(
            document.querySelectorAll(
              '.it'
            )
          )
          .find(el=>
            el.querySelector('b')
              ?.textContent
              .trim()===
            r.repair_no
          );

        if(card){

          card.scrollIntoView({
            behavior:'smooth',
            block:'center'
          });

          const old=
            card.style.boxShadow;

          card.style.boxShadow=
            '0 0 0 3px #f58220';

          setTimeout(()=>{
            card.style.boxShadow=old;
          },1800);

        }

      },120);
    };

  function bindCard(){

    if(S.pg!=='reports'){
      return;
    }

    const card=
      document.querySelector(
        '.reportKpi.receivable'
      );

    if(
      !card ||
      card.dataset.arBound
    ){
      return;
    }

    card.dataset.arBound='1';

    card.setAttribute(
      'role',
      'button'
    );

    card.setAttribute(
      'tabindex',
      '0'
    );

    card.onclick=
      ()=>S.fx.openReceivables();

    card.onkeydown=e=>{

      if(
        e.key==='Enter' ||
        e.key===' '
      ){
        e.preventDefault();
        S.fx.openReceivables();
      }

    };
  }

  addStyle();

  const observer=
    new MutationObserver(
      ()=>bindCard()
    );

  observer.observe(
    document.body,
    {
      childList:true,
      subtree:true
    }
  );

  setTimeout(
    bindCard,
    200
  );

})();

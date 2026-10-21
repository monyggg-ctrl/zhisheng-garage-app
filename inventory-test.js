/* 致盛汽車：庫存管理測試版（僅讀取，正式扣料待交易函式上線） */
(function(){
  S.fx=S.fx||{};
  S.fx.inventoryTab='stock';
  S.fx.inventoryMoves=[];
  S.fx.inventoryLoading=false;
  const esc=x=>E(String(x==null?'':x));
  const num=x=>Number(x||0);
  function stockPage(){
    const p=S.p||[];
    const low=p.filter(x=>num(x.qty)<=num(x.min_qty)&&num(x.min_qty)>0).length;
    const value=p.reduce((a,x)=>a+num(x.qty)*num(x.cost_price),0);
    const tab=S.fx.inventoryTab;
    return `<div class="r"><h2>材料／庫存管理</h2><button class="b o" onclick="pf()">＋新增材料</button></div>
    <div class="g"><div class="c">材料種類<br><b>${p.length} 項</b></div><div class="c">低庫存<br><b>${low} 項</b></div></div>
    <div class="c">庫存成本估值<br><b>${N(value)}</b></div>
    <div class="tb"><button class="${tab==='stock'?'on':''}" onclick="S.fx.inventoryTab='stock';app()">庫存總覽</button><button class="${tab==='history'?'on':''}" onclick="S.fx.inventoryTab='history';app();S.fx.loadInventoryMoves()">異動紀錄</button></div>
    ${tab==='stock'? `<div class="c"><div class="m">材料名稱　｜　目前剩餘量　｜　成本</div>${p.length?p.map(x=>`<div class="it"><b>${esc(x.name)}</b><div class="m">${esc(x.sku||'未設定料號')} · 剩餘 <b>${num(x.qty)} ${esc(x.unit||'件')}</b> · 單位成本 ${N(x.cost_price)}</div>${num(x.min_qty)>0&&num(x.qty)<=num(x.min_qty)?'<span class="bd" style="color:#a22">低庫存・請補貨</span>':''}</div>`).join(''):'<p class="m">尚無材料。請先建立材料與期初庫存。</p>'}</div>`:
    `<div class="c"><h3>庫存異動紀錄</h3>${S.fx.inventoryLoading?'<p class="m">讀取中…</p>':S.fx.inventoryMoves.length?S.fx.inventoryMoves.map(x=>`<div class="it"><b>${esc(x.part_name||'材料')}</b><div class="m">${esc(x.reference_no||x.reason||'庫存異動')} · ${esc(x.created_at||'')}</div><b>${num(x.quantity_delta)>0?'+':''}${num(x.quantity_delta)}</b></div>`).join(''):'<p class="m">目前沒有可顯示的異動紀錄。尚未啟用自動扣料。</p>'}</div>`}
    <div class="c"><b>維修單串聯</b><p class="m">本頁為測試版庫存總覽；完工扣料尚未啟用。正式版將在維修完成後扣庫存，並保存對應維修單號。</p></div>`;
  }
  S.fx.loadInventoryMoves=async function(){
    if(S.fx.inventoryLoading)return;
    S.fx.inventoryLoading=true;app();
    const res=await s.from('inventory_movements').select('quantity_delta,reason,reference_no,created_at,parts(name)').eq('shop_id',H).order('created_at',{ascending:false}).limit(100);
    S.fx.inventoryLoading=false;
    if(!res.error)S.fx.inventoryMoves=(res.data||[]).map(x=>({...x,part_name:x.parts&&x.parts.name}));
    if(S.pg==='parts')app();
  };
  const original=window.page;
  window.page=function(){return S.pg==='parts'?stockPage():original()};
})();
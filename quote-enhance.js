(function(){
const oldIni=window.ini;
window.ini=function(a=[]){
  L=a.length?a.map(x=>({n:x.item_name||'',q:+x.qty||1,p:+x.unit_price||0,l:+x.labor_price||0,c:+x.cost_price||0,lc:+x.labor_cost||0})):[{n:'',q:1,p:0,l:0,c:0,lc:0}];
};
window.ls=function(k){
  $('ls').innerHTML=L.map((x,i)=>`<div class="ln"><div class="r"><b>項目 ${i+1}</b>${L.length>1?`<button class="b d" onclick="L.splice(${i},1);ls('${k}')">刪除</button>`:''}</div><div class="f"><label>項目名稱</label><input value="${E(x.n)}" oninput="L[${i}].n=this.value"></div><div class="itemRow3"><div class="f"><label>數量</label><input type="number" step=".1" value="${x.q}" oninput="L[${i}].q=+this.value||0;sm()"></div><div class="f"><label>單價</label><input type="number" value="${x.p}" oninput="L[${i}].p=+this.value||0;sm()"></div><div class="f"><label>零件成本</label><input type="number" value="${x.c||0}" oninput="L[${i}].c=+this.value||0;sm()"></div></div><div class="itemRow2"><div class="f"><label>工資</label><input type="number" value="${x.l||0}" oninput="L[${i}].l=+this.value||0;sm()"></div><div class="f"><label>工資成本</label><input type="number" value="${x.lc||0}" oninput="L[${i}].lc=+this.value||0;sm()"></div></div></div>`).join('');
  sm();
};
window.sm=function(){
  const z=sum(),g=z.t-z.c,r=z.t?g/z.t*100:0;
  if($('su'))$('su').innerHTML=`<div class="r"><span>零件售價</span><b>${N(z.a)}</b></div><div class="r"><span>工資</span><b>${N(z.l)}</b></div><div class="r"><b>總計</b><b>${N(z.t)}</b></div><div class="internalCostBox"><div class="r"><span>內部零件成本</span><b>${N(z.pc)}</b></div><div class="r"><span>內部工資成本</span><b>${N(z.lc)}</b></div><div class="r"><b>內部總成本</b><b>${N(z.c)}</b></div><div class="r"><b>預估毛利</b><b>${N(g)}</b></div><div class="r"><span>毛利率</span><b>${r.toFixed(1)}%</b></div></div>`;
};
window.qf=function(c='',v=''){
  ini();sh('新增報價',`${cv(c,v)}<div class="f"><label>日期</label><input id="dt" type="date" value="${D()}"></div><div id="ls"></div><button class="ad" onclick="L.push({n:'',q:1,p:0,l:0,c:0,lc:0});ls('q')">＋新增一筆項目</button><div id="su"></div><div class="f"><label>備註</label><textarea id="nt"></textarea></div>`,'sq()');ls('q');
};
window.sq=async function(){
  if(!cu.value||!ve.value||L.some(x=>!x.n.trim()))return tt('請填完整資料');
  const z=sum(),{data:q,error}=await s.from('quotes').insert({shop_id:H,quote_no:NO('Q'),customer_id:cu.value,vehicle_id:ve.value,quote_date:dt.value,subtotal:z.t,total:z.t,notes:nt.value,created_by:S.z.user.id,updated_by:S.z.user.id}).select().single();
  if(error)return tt(error.message);
  const {error:ie}=await s.from('quote_items').insert(L.map(x=>({shop_id:H,quote_id:q.id,item_type:'service',item_name:x.n,qty:x.q,unit_price:x.p,labor_price:x.l,cost_price:x.c||0,labor_cost:x.lc||0,subtotal:x.q*x.p+x.l})));
  if(ie)return tt(ie.message);cm();await load();tt('報價已新增 ✓');
};
window.eq=async function(id){
  const q=S.q.find(x=>x.id===id),{data:i,error}=await s.from('quote_items').select('*').eq('quote_id',id);if(error)return tt(error.message);
  ini(i);sh('編輯報價',`${cv(q.customer_id,q.vehicle_id)}<div class="f"><label>日期</label><input id="dt" type="date" value="${q.quote_date}"></div><div id="ls"></div><button class="ad" onclick="L.push({n:'',q:1,p:0,l:0,c:0,lc:0});ls('q')">＋新增一筆項目</button><div id="su"></div><div class="f"><label>備註</label><textarea id="nt">${E(q.notes)}</textarea></div>`,`uq('${id}')`);ls('q');
};
window.uq=async function(id){
  if(!cu.value||!ve.value||L.some(x=>!x.n.trim()))return tt('請填完整資料');
  const z=sum(),{error}=await s.from('quotes').update({customer_id:cu.value,vehicle_id:ve.value,quote_date:dt.value,subtotal:z.t,total:z.t,notes:nt.value,updated_by:S.z.user.id}).eq('id',id);if(error)return tt(error.message);
  await s.from('quote_items').delete().eq('quote_id',id);
  const {error:ie}=await s.from('quote_items').insert(L.map(x=>({shop_id:H,quote_id:id,item_type:'service',item_name:x.n,qty:x.q,unit_price:x.p,labor_price:x.l,cost_price:x.c||0,labor_cost:x.lc||0,subtotal:x.q*x.p+x.l})));
  if(ie)return tt(ie.message);cm();await load();tt('報價已更新 ✓');
};
function qTotals(items){
  const sale=(items||[]).reduce((n,x)=>n+(+x.qty||0)*(+x.unit_price||0)+(+x.labor_price||0),0),cost=(items||[]).reduce((n,x)=>n+(+x.qty||0)*(+x.cost_price||0)+(+x.labor_cost||0),0);return{sale,cost,profit:sale-cost,rate:sale?(sale-cost)/sale*100:0};
}
window.vq=async function(id){
  const q=S.q.find(x=>x.id===id),{data:i,error}=await s.from('quote_items').select('*').eq('quote_id',id);if(error)return tt(error.message);const z=qTotals(i);
  M.innerHTML=`<div class="mo"><div class="sh"><div class="r"><h2>報價明細</h2><button class="b x" onclick="cm()">關閉</button></div>${(i||[]).map(x=>`<div class="c"><b>${E(x.item_name)}</b><div class="r"><span>售價 ${N(x.unit_price)} × ${x.qty}</span><span>工資 ${N(x.labor_price)}</span></div></div>`).join('')}<div class="r"><b>總計</b><b>${N(q.total)}</b></div><div class="internalCostBox"><div class="r"><span>內部總成本</span><b>${N(z.cost)}</b></div><div class="r"><b>預估毛利</b><b>${N(z.profit)}</b></div><div class="r"><span>毛利率</span><b>${z.rate.toFixed(1)}%</b></div></div><button class="b o" style="width:100%;margin-top:12px" onclick="qpdf('${id}')">📄 PDF／分享</button></div></div>`;
};
window.qpdf=async function(id){
  const q=S.q.find(x=>x.id===id),{data:i,error}=await s.from('quote_items').select('*').eq('quote_id',id);if(error)return tt(error.message);
  const c=S.c.find(x=>x.id===q.customer_id)||{},v=S.v.find(x=>x.id===q.vehicle_id)||{},rows=(i||[]).map((x,n)=>`<tr><td>${n+1}</td><td>${E(x.item_name)}</td><td>${x.qty}</td><td>${N(x.unit_price)}</td><td>${N(x.labor_price)}</td><td>${N((+x.qty||0)*(+x.unit_price||0)+(+x.labor_price||0))}</td></tr>`).join(''),w=window.open('','_blank');if(!w)return tt('請允許彈出式視窗');
  w.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>報價單${E(q.quote_no)}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:-apple-system,'PingFang TC',sans-serif;font-size:13px;color:#17191d;margin:0;background:#f3f4f6}.np{position:sticky;top:0;background:#fff;padding:12px;z-index:5}.np button{width:100%;padding:14px;border-radius:12px;font-weight:900;font-size:16px}.pdfb{border:0;background:#f58220;color:white}.shareb{margin-top:8px;border:1px solid #ccc;background:#eee}.doc{width:min(794px,100%);margin:auto;background:white;padding:28px}.h{display:flex;justify-content:space-between;border-bottom:4px solid #f58220;padding-bottom:10px}.h img{width:110px;height:auto}.t{font-size:28px;font-weight:900}.i{display:grid;grid-template-columns:1fr 1fr;border:1px solid #bbb;margin-top:12px}.i div{padding:7px;border-bottom:1px solid #ddd}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #aaa;padding:7px}th{background:#f5f5f5}.foot{border-top:2px solid #f58220;margin-top:28px;padding-top:8px;line-height:1.7}@media print{.np{display:none}.doc{padding:0}}</style></head><body><div class="np"><button id="pdf" class="pdfb">📄 下載報價單 PDF</button><button id="share" class="shareb">📤 分享／列印</button></div><div class="doc" id="doc"><div class="h"><img src="${B}"><div><div class="t">報價單</div>${E(q.quote_no)}</div></div><div class="i"><div>客戶：${E(c.name)}</div><div>電話：${E(c.phone)}</div><div>車牌：${E(v.plate)}</div><div>車輛：${E((v.brand||'')+' '+(v.model||''))}</div><div>日期：${E(q.quote_date)}</div><div></div></div><table><tr><th>#</th><th>項目</th><th>數量</th><th>單價</th><th>工資</th><th>小計</th></tr>${rows}</table><h3 style="text-align:right">總計：${N(q.total)}</h3>${q.notes?`<p><b>備註：</b>${E(q.notes)}</p>`:''}<div class="foot"><b>致盛汽車 J'S GARAGE</b><br>電話：(03) 360-1160　手機：0939-836-183<br>地址：330 桃園市桃園區國際路二段247號</div></div><script>const opt={margin:[8,8,8,8],filename:'報價單${E(q.quote_no)}.pdf',image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#fff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};document.getElementById('pdf').onclick=()=>html2pdf().set(opt).from(document.getElementById('doc')).save();document.getElementById('share').onclick=async()=>{try{const blob=await html2pdf().set(opt).from(document.getElementById('doc')).outputPdf('blob'),f=new File([blob],opt.filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]})))await navigator.share({title:opt.filename,files:[f]});else window.print()}catch(e){window.print()}};<\/script></body></html>`);w.document.close();
};
window.q2r=async function(id){
  const q=S.q.find(x=>x.id===id);if(!q)return;if(q.converted_repair_id)return tt('這張報價已轉成維修單');if(!confirm(`將報價單 ${q.quote_no} 轉成維修單？`))return;
  const {data:items,error:e1}=await s.from('quote_items').select('*').eq('quote_id',id);if(e1)return tt(e1.message);const z=qTotals(items);
  const {data:r,error}=await s.from('repair_orders').insert({shop_id:H,repair_no:NO('R'),customer_id:q.customer_id,vehicle_id:q.vehicle_id,repair_date:D(),complaint:`由報價單 ${q.quote_no} 轉入`,subtotal:q.subtotal,total:q.total,cost_total:z.cost,status:'draft',created_by:S.z.user.id,updated_by:S.z.user.id}).select().single();if(error)return tt(error.message);
  if(items?.length){const {error:ie}=await s.from('repair_items').insert(items.map(i=>({shop_id:H,repair_id:r.id,item_type:i.item_type||'service',part_id:i.part_id||null,item_name:i.item_name,qty:i.qty,unit_price:i.unit_price,labor_price:i.labor_price||0,cost_price:i.cost_price||0,labor_cost:i.labor_cost||0,subtotal:(+i.qty||0)*(+i.unit_price||0)+(+i.labor_price||0),notes:i.notes||null})));if(ie)return tt(ie.message)}
  await s.from('quotes').update({converted_repair_id:r.id,status:'accepted',updated_by:S.z.user.id}).eq('id',id);await load();S.pg='repairs';app();tt('已轉成維修單 ✓');
};
window.qs=function(){
  const k=(S.fx?.q||'').trim().toLowerCase(),arr=S.q.filter(x=>{const c=S.c.find(z=>z.id===x.customer_id)||{},v=S.v.find(z=>z.id===x.vehicle_id)||{};return !k||[x.quote_no,x.quote_date,c.name,c.phone,v.plate,v.brand,v.model,x.notes].some(z=>(z||'').toString().toLowerCase().includes(k))});
  return `<div class="r"><h2>報價</h2><button class="b o" onclick="qf()">＋新增</button></div>${typeof srch==='function'?srch('搜尋單號、日期、客戶、車牌、品牌、車型','q'):''}<div class="c">${arr.map(x=>`<div class="it"><div class="r"><div onclick="vq('${x.id}')"><b>${E(x.quote_no)}</b><div class="m">${E(x.quote_date)} · ${custName(x.customer_id)}</div><div class="m">🚗 ${vehText(x.vehicle_id)}</div><b>${N(x.total)}</b>${x.converted_repair_id?'<div class="m">✓ 已轉維修單</div>':''}</div><div class="ac"><button class="b p" onclick="qpdf('${x.id}')">PDF</button>${x.converted_repair_id?'':`<button class="b o" onclick="q2r('${x.id}')">轉維修單</button>`}<button class="b x" onclick="eq('${x.id}')">編輯</button><button class="b d" onclick="dq('${x.id}')">刪除</button></div></div></div>`).join('')||'<div class="m">找不到符合資料</div>'}</div>`;
};
window.sum=function(){const a=L.reduce((n,x)=>n+(+x.q||0)*(+x.p||0),0),l=L.reduce((n,x)=>n+(+x.l||0),0),pc=L.reduce((n,x)=>n+(+x.q||0)*(+x.c||0),0),lc=L.reduce((n,x)=>n+(+x.lc||0),0);return{a,l,pc,lc,c:pc+lc,t:a+l};};
})();

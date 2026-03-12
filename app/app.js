let DB={}
let fuse

async function loadDB(){

const promo=await fetch("../db/promo.json").then(r=>r.json())

const sku=await fetch("../db/sku_index.json").then(r=>r.json())

DB.promo=promo
DB.sku=sku

fuse=new Fuse(promo,{
keys:["article"],
threshold:0.3
})

}

function show(item){

document.getElementById("result").innerHTML=`

<div class="card">

SKU : ${item.sku}<br>

Artikel : ${item.article}<br>

Normal : ${item.normal}<br>

Promo : ${item.promo_price}<br>

Divisi : ${item.divisi}

</div>

`

}

function search(q){

if(DB.sku[q]){

show(DB.promo[DB.sku[q]])

return

}

const r=fuse.search(q)

if(r.length){

show(r[0].item)

}

}

document.getElementById("search")

.addEventListener("input",e=>{

search(e.target.value)

})

loadDB()
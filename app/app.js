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

result.innerHTML = `

<div class="card">

<h3>${item.deskripsi}</h3>

Brand : ${item.brand}<br>

SKU : ${item.sku}<br>

Harga Normal : Rp ${item.harga_normal}<br>

Harga Promo : Rp ${item.harga_promo}<br>

Diskon : ${item.diskon}<br>

Berlaku : ${item.berlaku}<br>

Acara : ${item.acara}<br>

Division : ${item.division}<br>

Sumber File : ${item.file}<br>

Sheet : ${item.sheet}

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
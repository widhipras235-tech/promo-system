let DB = []
let SKU_INDEX = {}
let ARTICLE_INDEX = {}

async function loadDB(){

DB = await fetch("db/promo.json").then(r=>r.json())
SKU_INDEX = await fetch("db/sku_index.json").then(r=>r.json())
ARTICLE_INDEX = await fetch("db/article_index.json").then(r=>r.json())

}

loadDB()

async function search(){

const q = document
.getElementById("search")
.value
.trim()
.toUpperCase()

let resultIndex = []

if(SKU_INDEX[q])
resultIndex = SKU_INDEX[q]

else if(ARTICLE_INDEX[q])
resultIndex = ARTICLE_INDEX[q]

if(resultIndex.length == 0){

result.innerHTML = "Data tidak ditemukan"

return

}

show(DB[resultIndex[0]])

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

File : ${item.file}<br>

Sheet : ${item.sheet}

</div>

`

}
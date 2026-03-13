let DB = []
let SKU_INDEX = {}
let ARTICLE_INDEX = {}

let databaseReady = false

const result = document.getElementById("result")

async function loadDatabase(){

try{

DB = await fetch("../db/promo.json").then(r=>r.json())

SKU_INDEX = await fetch("../db/sku_index.json").then(r=>r.json())

ARTICLE_INDEX = await fetch("../db/article_index.json").then(r=>r.json())

databaseReady = true

console.log("Database loaded:",DB.length)

}catch(e){

console.error("Database gagal dimuat",e)

}

}

window.onload = loadDatabase


function search(){

if(!databaseReady){

result.innerHTML = "Database sedang dimuat..."

return

}

const q = document
.getElementById("search")
.value
.trim()
.toUpperCase()

if(!q) return

let index=[]

if(SKU_INDEX[q]){

index = SKU_INDEX[q]

}

else if(ARTICLE_INDEX[q]){

index = ARTICLE_INDEX[q]

}

if(index.length==0){

result.innerHTML="Data tidak ditemukan"

return

}

show(DB[index[0]])

}


function show(item){

let hargaNormal=item.harga_normal
let hargaPromo=item.harga_promo

if(
hargaPromo.toUpperCase().includes("SPECIAL")
){

hargaNormal=`<s>Rp ${hargaNormal}</s>`

}

result.innerHTML=`

<div class="card">

<h3>${item.deskripsi}</h3>

<b>Brand :</b> ${item.brand}<br>

<b>SKU :</b> ${item.sku}<br>

<b>Harga Normal :</b> ${hargaNormal}<br>

<b>Harga Promo :</b> ${hargaPromo}<br>

<b>Diskon :</b> ${item.diskon}<br>

<b>Berlaku :</b> ${item.berlaku}<br>

<b>Acara :</b> ${item.acara}<br>

<b>Division :</b> ${item.division}<br>

<b>File :</b> ${item.file}<br>

<b>Sheet :</b> ${item.sheet}

</div>

`

}
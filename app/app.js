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

let hargaNormal = item.harga_normal
let hargaPromo = item.harga_promo
let diskon = item.diskon || ""

function number(v){
return Number(String(v).replace(/[^\d]/g,""))
}

function rupiah(v){

let n = number(v)

if(!n) return v

return "Rp. " + n

}

const normalNum = number(hargaNormal)
const promoNum = number(hargaPromo)

let normalDisplay = rupiah(hargaNormal)
let promoDisplay = hargaPromo

// promo angka
if(promoNum){
promoDisplay = rupiah(hargaPromo)
}

// ======================
// HITUNG DISKON
// ======================

// jika diskon = PERCENTAGE
if(String(diskon).toUpperCase().includes("PERCENTAGE")){

if(normalNum && promoNum){

let d = Math.round((normalNum - promoNum) / normalNum * 100)

diskon = d + "%"

}else{
diskon = ""
}

}

// ambil % dari teks promo
if(!diskon){

const text = (item.harga_promo + " " + item.acara).toUpperCase()

const match = text.match(/(\d+)\s*%/)

if(match){
diskon = match[1] + "%"
}

}

// ======================
// LOGIKA HARGA CORET
// ======================

const promoText = (item.harga_promo + " " + item.acara).toUpperCase()

const isB3 = promoText.includes("B3")

if(
!isB3 &&
(
promoText.includes("SPECIAL") ||
diskon
)
){

normalDisplay = `<span style="text-decoration:line-through">${rupiah(hargaNormal)}</span>`

}

// ======================

result.innerHTML = `

<div class="card">

<h3>${item.deskripsi}</h3>

<b>Brand :</b> ${item.brand}<br>

<b>SKU :</b> ${item.sku}<br>

<b>Harga Normal :</b> ${normalDisplay}<br>

<b>Harga Promo :</b> ${promoDisplay}<br>

<b>Diskon :</b> ${diskon}<br>

<b>Berlaku :</b> ${item.berlaku}<br>

<b>Acara :</b> ${item.acara}<br>

<b>Division :</b> ${item.division}<br>

<b>File :</b> ${item.file}<br>

<b>Sheet :</b> ${item.sheet}

</div>

`

}
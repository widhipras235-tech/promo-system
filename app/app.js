let DB = []

const result = document.getElementById("result")

/* ===============================
LOAD DATABASE SPLIT
=============================== */

async function loadDatabase(){

try{

let files = 62
let all = []

for(let i=1;i<=files;i++){

let res = await fetch(`../db/promo_${i}.json`)
let data = await res.json()

all = all.concat(data)

}

DB = all

console.log("Database loaded:",DB.length)

}catch(e){

console.error("Database gagal dimuat",e)

result.innerHTML="Database gagal dimuat"

}

}

window.onload = loadDatabase


/* ===============================
SEARCH ENGINE
=============================== */

function search(){

let q = document
.getElementById("search")
.value
.trim()
.toUpperCase()

if(!q) return

let found = DB.find(item =>{

return (
(item.sku && item.sku.toUpperCase().includes(q)) ||
(item.artikel && item.artikel.toUpperCase().includes(q)) ||
(item.deskripsi && item.deskripsi.toUpperCase().includes(q)) ||
(item.brand && item.brand.toUpperCase().includes(q))
)

})

if(!found){

result.innerHTML="Data tidak ditemukan"
return

}

show(found)

}


/* ===============================
FORMAT RUPIAH
=============================== */

function rupiah(n){

if(!n) return ""

n = Number(n)

return "Rp " + n.toLocaleString("id-ID")

}


/* ===============================
PARSE DATE (AUTO DETECT)
=============================== */

function parseDate(v){

if(!v) return null

if(v instanceof Date) return v

if(typeof v === "number"){

let d = new Date((v-25569)*86400*1000)
return d

}

v = v.toString().trim()

if(v.includes("-")){

let p = v.split("-")

if(p[2]){

return new Date(p[2],p[1]-1,p[0])

}

}

if(v.includes("/")){

let p = v.split("/")

if(p[2]){

return new Date(p[2],p[1]-1,p[0])

}

}

let d = new Date(v)

if(!isNaN(d)) return d

return null

}


/* ===============================
STATUS ENGINE
=============================== */

function getStatus(item){

let start =
item.mulai ||
item.start ||
item.tgl_mulai ||
(item.berlaku ? item.berlaku.split("-")[0] : null)

let end =
item.akhir ||
item.end ||
item.tgl_akhir ||
(item.berlaku ? item.berlaku.split("-")[1] : null)

if(!start || !end) return "AKTIF"

start = parseDate(start)
end = parseDate(end)

if(!start || !end) return "AKTIF"

let today = new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today < start) return "BELUM AKTIF"
if(today > end) return "BERAKHIR"

return "AKTIF"

}


/* ===============================
PROMO ENGINE
=============================== */

function promoLogic(item){

let normal = item.harga_normal
let promo = item.harga_promo
let diskon = item.diskon || ""

let promoText = promo ? promo.toString().toUpperCase() : ""

let normalHTML = rupiah(normal)
let promoHTML = ""
let promoLabel = ""

let hidePromo = false


/* B3D10 B1G1 B2G1 B1G2 dll */

if(
promoText.includes("B3D10") ||
promoText.includes("B1G1") ||
promoText.includes("B2G1") ||
promoText.includes("B1G2") ||
promoText.includes("B1D20") ||
promoText.includes("B2G1")
){

promoHTML = promoText
promoLabel = ""
hidePromo = true

return {normalHTML,promoHTML,promoLabel,hidePromo}

}


/* SHARP PRICE */

if(promoText.includes("SHARP")){

normalHTML = "@"+rupiah(normal)
promoHTML = rupiah(normal)
promoLabel = "SHARP PRICE"

return {normalHTML,promoHTML,promoLabel,hidePromo}

}


/* SPECIAL PRICE */

if(promoText.includes("SPECIAL")){

normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(promo)
promoLabel = ""

return {normalHTML,promoHTML,promoLabel,hidePromo}

}


/* DISKON % */

if(diskon && diskon.toString().includes("%")){

let d = parseFloat(diskon)

if(!isNaN(d)){

let hitung = normal - (normal * d /100)

normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(Math.round(hitung))
promoLabel = diskon

return {normalHTML,promoHTML,promoLabel,hidePromo}

}

}


/* fallback */

promoHTML = promo ? rupiah(promo) : ""

return {normalHTML,promoHTML,promoLabel,hidePromo}

}


/* ===============================
RENDER RESULT
=============================== */

function show(item){

let p = promoLogic(item)

let status = getStatus(item)

let statusClass = "status aktif"

if(status==="BELUM AKTIF") statusClass="status belum"
if(status==="BERAKHIR") statusClass="status habis"

result.innerHTML=`

<div class="card">

<h3>${item.deskripsi}</h3>

<div class="${statusClass}">${status}</div>

<br>

<b>Brand :</b> ${item.brand}<br>
<b>SKU :</b> ${item.sku}<br>

<br>

<div class="harga-normal">${p.normalHTML}</div>

<div class="harga-promo">${p.promoHTML}</div>

${!p.hidePromo ? `<div class="promo">${p.promoLabel}</div>`:""}

<br>

<b>Berlaku :</b> ${item.berlaku}<br>
<b>Divisi :</b> ${item.division}<br>

<br>

<small>
File : ${item.file}<br>
Sheet : ${item.sheet}
</small>

</div>

`

}
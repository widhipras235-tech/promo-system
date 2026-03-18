let DB_CACHE = {}
let SKU_INDEX = {}
let ARTICLE_INDEX = {}

const result = document.getElementById("result")


/* ===============================
LOAD INDEX
=============================== */

async function loadIndex(){

result.innerHTML = "Memuat index..."

try{

let skuRes = await fetch("/db/sku_index.json")
let articleRes = await fetch("/db/article_index.json")

SKU_INDEX = await skuRes.json()
ARTICLE_INDEX = await articleRes.json()

result.innerHTML = "Siap digunakan"
console.log("Index loaded")

}catch(e){

console.error(e)
result.innerHTML = "Gagal load index"

}

}

window.addEventListener("load", loadIndex)



/* ===============================
AMBIL FILE SESUAI INDEX
=============================== */

async function getDataFromFile(file){

if(DB_CACHE[file]) return DB_CACHE[file]

try{

let res = await fetch(`/db/${file}`)

if(!res.ok) return []

let data = await res.json()

DB_CACHE[file] = data

return data

}catch(e){

console.error("Gagal load file:",file)
return []

}

}



/* ===============================
SEARCH ENGINE (FAST)
=============================== */

async function search(){

let q = document
.getElementById("search")
.value
.trim()
.toUpperCase()

if(!q) return


result.innerHTML = "Mencari..."


/* ==== CARI DI INDEX ==== */

let file = null

if(SKU_INDEX[q]){
file = SKU_INDEX[q]
}

else if(ARTICLE_INDEX[q]){
file = ARTICLE_INDEX[q]
}


/* ==== JIKA TIDAK ADA DI INDEX ==== */

if(!file){

result.innerHTML = "Data tidak ditemukan"
return

}


/* ==== LOAD FILE TERKAIT ==== */

let data = await getDataFromFile(file)


/* ==== CARI DI DALAM FILE ==== */

let found = data.find(item =>{

return (

(item.sku && item.sku.toString().toUpperCase() === q) ||
(item.artikel && item.artikel.toString().toUpperCase() === q) ||
(item.deskripsi && item.deskripsi.toUpperCase().includes(q))

)

})


if(!found){

result.innerHTML = "Data tidak ditemukan"
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

if(isNaN(n)) return ""

return "Rp " + n.toLocaleString("id-ID")

}



/* ===============================
PARSE DATE
=============================== */

function parseDate(v){

if(!v) return null

if(typeof v === "number"){
return new Date((v - 25569) * 86400 * 1000)
}

v = v.toString().trim()

if(v.includes("-")){
let p = v.split("-")
if(p.length===3) return new Date(p[2],p[1]-1,p[0])
}

if(v.includes("/")){
let p = v.split("/")
if(p.length===3) return new Date(p[2],p[1]-1,p[0])
}

let d = new Date(v)
return isNaN(d) ? null : d

}



/* ===============================
STATUS ENGINE
=============================== */

function getStatus(item){

let start = item.mulai || item.start || item.tgl_mulai || null
let end = item.akhir || item.end || item.tgl_akhir || null

if(item.berlaku){
let b = item.berlaku.split("-")
if(b.length===2){
start = start || b[0]
end = end || b[1]
}
}

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

let normal = Number(item.harga_normal) || 0
let promo = item.harga_promo
let diskon = item.diskon || ""

let promoText = promo ? promo.toString().toUpperCase() : ""

let normalHTML = rupiah(normal)
let promoHTML = ""
let promoLabel = ""
let hidePromo = false


if(
promoText.includes("B3D10") ||
promoText.includes("B1G1") ||
promoText.includes("B2G1")
){
promoHTML = promoText
hidePromo = true
return {normalHTML,promoHTML,promoLabel,hidePromo}
}


if(promoText.includes("SHARP")){
normalHTML = "@"+rupiah(normal)
promoHTML = rupiah(normal)
promoLabel = "SHARP PRICE"
return {normalHTML,promoHTML,promoLabel,hidePromo}
}


if(promoText.includes("SPECIAL")){
normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(promo)
return {normalHTML,promoHTML,promoLabel,hidePromo}
}


if(diskon){

let d = parseFloat(diskon)

if(!isNaN(d)){
let hitung = normal - (normal * d /100)
normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(Math.round(hitung))
promoLabel = diskon
return {normalHTML,promoHTML,promoLabel,hidePromo}
}

}


promoHTML = promo ? rupiah(promo) : ""

return {normalHTML,promoHTML,promoLabel,hidePromo}

}



/* ===============================
RENDER
=============================== */

function show(item){

let p = promoLogic(item)
let status = getStatus(item)

let statusClass = "status aktif"
if(status==="BELUM AKTIF") statusClass="status belum"
if(status==="BERAKHIR") statusClass="status habis"


result.innerHTML = `

<div class="card">

<h3>${item.deskripsi || ""}</h3>

<div class="${statusClass}">${status}</div>

<br>

<b>Brand :</b> ${item.brand || ""}<br>
<b>SKU :</b> ${item.sku || ""}<br>
<b>Artikel :</b> ${item.artikel || ""}<br>

<br>

<div class="harga-normal">${p.normalHTML}</div>
<div class="harga-promo">${p.promoHTML}</div>

${!p.hidePromo ? `<div class="promo">${p.promoLabel}</div>` : ""}

<br>

<b>Berlaku :</b> ${item.berlaku || ""}<br>
<b>Divisi :</b> ${item.division || ""}<br>

<br>

<small>
File : ${item.file || ""}<br>
Sheet : ${item.sheet || ""}
</small>

</div>

`

}



/* ===============================
TRIGGER SEARCH
=============================== */

document.getElementById("search")
.addEventListener("keyup", function(e){
if(e.key === "Enter") search()
})
let DB_CACHE = {}
let SKU_INDEX = {}
let ARTICLE_INDEX = {}

const result = document.getElementById("result")


/* ===============================
BASE PATH AUTO (ANTI ERROR PATH)
=============================== */

const BASE_PATH = location.pathname.includes("/app/") ? "../db/" : "/db/"


/* ===============================
LOAD INDEX
=============================== */

async function loadIndex(){

result.innerHTML = "Memuat index..."

try{

let skuRes = await fetch(BASE_PATH + "sku_index.json")
let articleRes = await fetch(BASE_PATH + "article_index.json")

if(!skuRes.ok || !articleRes.ok){
throw "Index tidak ditemukan"
}

SKU_INDEX = await skuRes.json()
ARTICLE_INDEX = await articleRes.json()

// NORMALISASI JADI UPPERCASE
SKU_INDEX = normalizeIndex(SKU_INDEX)
ARTICLE_INDEX = normalizeIndex(ARTICLE_INDEX)

result.innerHTML = "Siap digunakan"

console.log("Index OK")

}catch(e){

console.error("Load index error:",e)
result.innerHTML = "Gagal load index"

}

}

window.addEventListener("load", loadIndex)



/* ===============================
NORMALISASI INDEX
=============================== */

function normalizeIndex(obj){

let newObj = {}

for(let key in obj){

let k = key.toString().trim().toUpperCase()
let v = obj[key].replace("db/","").trim()

newObj[k] = v

}

return newObj

}



/* ===============================
LOAD FILE (CACHE)
=============================== */

async function getData(file){

if(DB_CACHE[file]) return DB_CACHE[file]

try{

let res = await fetch(BASE_PATH + file)

if(!res.ok) return []

let data = await res.json()

DB_CACHE[file] = data

return data

}catch(e){

console.error("Load file gagal:",file)
return []

}

}



/* ===============================
SEARCH ENGINE FINAL
=============================== */

async function search(){

let q = document.getElementById("search").value.trim().toUpperCase()

if(!q) return

result.innerHTML = "Mencari..."


// ==== CARI DI INDEX ====

let file = SKU_INDEX[q] || ARTICLE_INDEX[q] || null


// ==== JIKA INDEX TIDAK KETEMU ====

if(!file){

result.innerHTML = "Data tidak ditemukan"
return

}


// ==== LOAD FILE ====

let data = await getData(file)


// ==== CARI DATA ====

let found = data.find(item => {

let sku = (item.sku || item.SKU || "").toString().trim().toUpperCase()
let artikel = (item.artikel || item.ARTIKEL || "").toString().trim().toUpperCase()
let desk = (item.deskripsi || item.DESKRIPSI || "").toString().toUpperCase()
let brand = (item.brand || item.BRAND || "").toString().toUpperCase()

return (
sku === q ||
artikel === q ||
desk.includes(q) ||
brand.includes(q)
)

})


// ==== FALLBACK SEARCH (ANTI GAGAL) ====

if(!found){

found = data.find(item => {
return JSON.stringify(item).toUpperCase().includes(q)
})

}


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
promoText.includes("B2G1") ||
promoText.includes("B1G2")
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

<h3>${item.deskripsi || item.DESKRIPSI || ""}</h3>

<div class="${statusClass}">${status}</div>

<br>

<b>Brand :</b> ${item.brand || item.BRAND || ""}<br>
<b>SKU :</b> ${item.sku || item.SKU || ""}<br>
<b>Artikel :</b> ${item.artikel || item.ARTIKEL || ""}<br>

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
/* ===============================
PROMO ENGINE V13 FINAL
=============================== */

let DB = []
const result = document.getElementById("result")

/* ===============================
LOAD DATABASE SPLIT
=============================== */

async function loadDatabase(){

try{

let files = []

for(let i=1;i<=62;i++){
files.push(`../db/promo_part${i}.json`)
}

let responses = await Promise.all(
files.map(f => fetch(f))
)

let json = await Promise.all(
responses.map(r => r.json())
)

DB = json.flat()

console.log("Database loaded:",DB.length)

}catch(e){

console.error("Database gagal dimuat",e)
document.getElementById("result").innerHTML =
"Database gagal dimuat"

}

}

window.onload = loadDatabase

/* ===============================
AUTO DATE PARSER
=============================== */

function parseDate(v){

if(!v) return null

if(!isNaN(v)){

let epoch = new Date(1899,11,30)
return new Date(epoch.getTime() + v*86400000)

}

let s = String(v).trim()

if(s.includes("/")){

let p = s.split("/")
if(p.length===3){

return new Date(p[2],p[1]-1,p[0])

}

}

if(s.includes("-")){

let p = s.split("-")

if(p[0].length===4){

return new Date(p[0],p[1]-1,p[2])

}

return new Date(p[2],p[1]-1,p[0])

}

let d = new Date(s)

if(!isNaN(d)) return d

return null

}


/* ===============================
STATUS PROMO
=============================== */

function getStatus(range){

if(!range) return ""

let p = range.split("-")

if(p.length<2) return ""

let start = parseDate(p[0].trim())
let end = parseDate(p[1].trim())

if(!start || !end) return ""

let today = new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today < start) return "BELUM AKTIF"
if(today > end) return "BERAKHIR"

return "AKTIF"

}


/* ===============================
FORMAT RUPIAH
=============================== */

function rupiah(n){

if(!n) return ""

return "Rp "+Number(n).toLocaleString("id-ID")

}


/* ===============================
SEARCH ENGINE
=============================== */

function search(){

let q = document.getElementById("search")
.value
.trim()
.toLowerCase()

if(!q) return

let item = DB.find(i =>

String(i.sku).toLowerCase().includes(q) ||
String(i.artikel||"").toLowerCase().includes(q) ||
String(i.deskripsi||"").toLowerCase().includes(q) ||
String(i.brand||"").toLowerCase().includes(q)

)

if(!item){

result.innerHTML = "Data tidak ditemukan"
return

}

show(item)

}


/* ===============================
PROMO PARSER
=============================== */

function parsePromo(item){

let normal = item.harga_normal
let promo = item.harga_promo
let diskon = item.diskon || ""

let normalHTML = ""
let promoHTML = ""
let promoLabel = ""

let txt = (promo+" "+diskon).toUpperCase()

/* ===================
BUNDLE PROMO
=================== */

if(txt.includes("B1G1") ||
txt.includes("B2G1") ||
txt.includes("B3D10") ||
txt.includes("B1G2") ||
txt.includes("B1D20")){

normalHTML = rupiah(normal)
promoHTML = txt.trim()
promoLabel = ""

return {normalHTML,promoHTML,promoLabel}

}

/* ===================
SPECIAL PRICE
=================== */

if(txt.includes("SPECIAL")){

normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(promo)
promoLabel = "SPECIAL PRICE"

return {normalHTML,promoHTML,promoLabel}

}

/* ===================
SHARP PRICE
=================== */

if(txt.includes("SHARP")){

normalHTML = "@"+rupiah(normal)
promoHTML = rupiah(normal)
promoLabel = "SHARP PRICE"

return {normalHTML,promoHTML,promoLabel}

}

/* ===================
DISKON %
=================== */

let percent = txt.match(/(\d+)%/)

if(percent){

let p = Number(percent[1])
let harga = normal - (normal*p/100)

normalHTML = `<s>${rupiah(normal)}</s>`
promoHTML = rupiah(Math.round(harga))
promoLabel = p+"%"

return {normalHTML,promoHTML,promoLabel}

}

/* ===================
DEFAULT
=================== */

normalHTML = rupiah(normal)
promoHTML = rupiah(promo)

return {normalHTML,promoHTML,promoLabel}

}


/* ===============================
SHOW RESULT
=============================== */

function show(item){

let promo = parsePromo(item)

let status = getStatus(item.berlaku)

let badgeClass = ""

if(status==="AKTIF") badgeClass="status aktif"
if(status==="BELUM AKTIF") badgeClass="status belum"
if(status==="BERAKHIR") badgeClass="status habis"

result.innerHTML = `

<div class="card">

<div class="title">${item.deskripsi}</div>

<div class="price-normal">${promo.normalHTML}</div>

<div class="price-promo">${promo.promoHTML}</div>

${promo.promoLabel ? `<div class="promo">${promo.promoLabel}</div>`:""}

<div class="${badgeClass}">${status}</div>

<div class="meta">

Brand : ${item.brand}<br>
SKU : ${item.sku}<br>
Berlaku : ${item.berlaku}<br>
Divisi : ${item.division}<br>
File : ${item.file}<br>
Sheet : ${item.sheet}

</div>

</div>

`

}
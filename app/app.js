/* =========================
INIT
========================= */

let DB = []
let SKU_INDEX = {}
let ARTICLE_INDEX = {}

const result = document.getElementById("result")
const searchInput = document.getElementById("search")


/* =========================
LOAD DATABASE (AUTO LOOP FILE)
========================= */

async function loadDatabase(){

result.innerHTML = "Memuat database..."

try{

let i = 1
let all = []

while(true){

try{
let res = await fetch(`../db/promo_${i}.json`)

if(!res.ok) break

let data = await res.json()

if(Array.isArray(data)){
all = all.concat(data)
}else{
console.warn("Format bukan array di file:", i)
}

console.log("Loaded file:", i, "Jumlah:", data.length)

i++

}catch(err){
console.warn("Stop load di file:", i)
break
}

}

DB = all

/* =========================
BUILD INDEX
========================= */

DB.forEach((item, index)=>{

let sku = String(item.sku || "").toLowerCase().trim()
let art = String(item.article || "").toLowerCase().trim()

if(sku){
if(!SKU_INDEX[sku]) SKU_INDEX[sku] = []
SKU_INDEX[sku].push(index)
}

if(art){
if(!ARTICLE_INDEX[art]) ARTICLE_INDEX[art] = []
ARTICLE_INDEX[art].push(index)
}

})

console.log("TOTAL DATA:", DB.length)

result.innerHTML = "<p>Database siap. Silakan cari.</p>"

}catch(e){

console.error("Gagal load database:", e)
result.innerHTML = "Database gagal dimuat"

}

}

window.onload = loadDatabase


/* =========================
FORMAT RUPIAH
========================= */

function rupiah(n){

if(!n) return ""

let num = Number(String(n).replace(/[^\d]/g,""))

if(!num) return n

return "Rp " + num.toLocaleString("id-ID")

}


/* =========================
PARSE DATE
========================= */

function parseDate(v){

if(!v) return null

let str = String(v).trim()

if(str.includes("/")){
let p = str.split("/")
return new Date(p[2], p[1]-1, p[0])
}

if(str.includes("-")){
let p = str.split("-")

if(p[0].length == 4){
return new Date(p[0], p[1]-1, p[2])
}else{
return new Date(p[2], p[1]-1, p[0])
}
}

let d = new Date(str)
if(!isNaN(d)) return d

return null

}


/* =========================
STATUS PROMO
========================= */

function getStatus(item){

if(!item.berlaku) return ""

let p = item.berlaku.split("-")
if(p.length < 2) return ""

let start = parseDate(p[0])
let end = parseDate(p[1])

if(!start || !end) return ""

let today = new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today < start) return "BELUM AKTIF"
if(today > end) return "BERAKHIR"

return "AKTIF"

}


/* =========================
SEARCH ENGINE (INDEX + FALLBACK)
========================= */

function search(q){

q = String(q).toLowerCase().trim()

if(!q) return []

/* SKU EXACT */
if(SKU_INDEX[q]){
return SKU_INDEX[q].map(i => DB[i])
}

/* ARTICLE EXACT */
if(ARTICLE_INDEX[q]){
return ARTICLE_INDEX[q].map(i => DB[i])
}

/* FALLBACK */
return DB.filter(item =>

String(item.sku || "").toLowerCase().includes(q) ||
String(item.article || "").toLowerCase().includes(q) ||
String(item.deskripsi || "").toLowerCase().includes(q) ||
String(item.brand || "").toLowerCase().includes(q)

)

}


/* =========================
RENDER
========================= */

function render(data){

if(!data || !data.length){
result.innerHTML = "<p>Tidak ditemukan</p>"
return
}

let html = ""

data.forEach(item=>{

let status = getStatus(item)

html += `
<div class="card">
  
  <div style="display:flex;justify-content:space-between">
    <b>${item.deskripsi || "-"}</b>
    <span style="
      background:${status=="AKTIF"?"green":"gray"};
      color:white;
      padding:3px 8px;
      border-radius:10px;
      font-size:11px;
    ">
      ${status}
    </span>
  </div>

  <div style="margin-top:5px">
    ${rupiah(item.price || item.harga || "")}
  </div>

  <div style="color:green">
    ${item.promo || ""}
  </div>

  <div style="font-size:12px;color:#666">
    SKU: ${item.sku || "-"} | ART: ${item.article || "-"}
  </div>

  <div style="font-size:12px;color:#999">
    Berlaku: ${item.berlaku || "-"}
  </div>

</div>
`
})

result.innerHTML = html

}


/* =========================
EVENT SEARCH
========================= */

searchInput.addEventListener("input", function(){

let val = this.value

if(!val){
result.innerHTML = ""
return
}

let data = search(val)

console.log("Hasil:", data.length)

render(data)

})
<<<<<<< HEAD
let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")
=======
let DB = []
let SKU_INDEX = {}
let ARTICLE_INDEX = {}
let READY = false
>>>>>>> 25e80f1372f8fdbfd2d641bdf98e60d5fcb5fb32


/* =========================
<<<<<<< HEAD
LOAD DATABASE SPLIT
========================= */

async function loadDatabase(){

result.innerHTML="Memuat database..."

try{

let promises=[]

for(let i=1;i<=62;i++){

promises.push(
fetch(`../db/promo_${i}.json`)
.then(res=>res.json())
.catch(()=>[])
)

}

let data=await Promise.all(promises)

DB=data.flat()

console.log("TOTAL DATA:",DB.length)

result.innerHTML=""

}catch(e){

console.error(e)

result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase



/* =========================
SEARCH
========================= */

searchInput.addEventListener("input",function(){

let q=this.value.toLowerCase().trim()

if(q.length<2){

result.innerHTML=""
return

}

let filtered=DB.filter(item=>{

return(

String(item.sku||"").toLowerCase().includes(q) ||
String(item.artikel||"").toLowerCase().includes(q) ||
String(item.deskripsi||"").toLowerCase().includes(q) ||
String(item.brand||"").toLowerCase().includes(q)

)

})

render(filtered.slice(0,50))

})



/* =========================
FORMAT RUPIAH
========================= */

function rupiah(n){

if(!n) return ""

let num=Number(String(n).replace(/[^\d]/g,""))

return "Rp "+num.toLocaleString("id-ID")

}



/* =========================
AUTO DATE PARSER (ALL EXCEL FORMAT)
========================= */

function parseDate(value){

if(!value) return null

/* jika angka (Excel Serial Date) */

if(!isNaN(value)){

let excelEpoch = new Date(1899,11,30)
let date = new Date(excelEpoch.getTime() + value * 86400000)

return date

}

let str = String(value).trim()

/* dd/mm/yyyy */

if(str.includes("/")){

let p = str.split("/")

if(p.length===3){

let d=parseInt(p[0])
let m=parseInt(p[1])-1
let y=parseInt(p[2])

return new Date(y,m,d)

=======
LOAD JSON HELPER
========================= */

async function loadJSON(path) {
  try {
    const res = await fetch(path)
    if (res.ok) return await res.json()
  } catch {}
  return null
}

/* =========================
LOAD DATABASE + INDEX
========================= */

async function loadDatabase() {
  result.innerHTML = "Memuat database..."

  let total = 0
  let i = 1
  let gagal = 0

  // 🔹 Load semua promo_*.json
  while (i <= 100) {
    let data = await loadJSON(`db/promo_${i}.json`) ||
               await loadJSON(`./db/promo_${i}.json`) ||
               await loadJSON(`../db/promo_${i}.json`)

    if (!data) {
      gagal++
    } else {
      DB = DB.concat(data)
      total += data.length
      gagal = 0
      console.log(`✅ promo_${i} loaded (${data.length})`)
    }

    if (gagal >= 3) break
    i++
  }

  // 🔹 Load index
  SKU_INDEX =
    await loadJSON("db/sku_index.json") ||
    await loadJSON("./db/sku_index.json") ||
    await loadJSON("../db/sku_index.json") || {}

  ARTICLE_INDEX =
    await loadJSON("db/article_index.json") ||
    await loadJSON("./db/article_index.json") ||
    await loadJSON("../db/article_index.json") || {}

  console.log("INDEX SKU:", Object.keys(SKU_INDEX).length)
  console.log("INDEX ARTICLE:", Object.keys(ARTICLE_INDEX).length)

  if (total === 0) {
    result.innerHTML = "❌ Database tidak terbaca"
  } else {
    result.innerHTML = `✅ Database siap (${total} data)`
  }

  READY = true
>>>>>>> 25e80f1372f8fdbfd2d641bdf98e60d5fcb5fb32
}

}

/* yyyy-mm-dd */

if(str.includes("-")){

let p = str.split("-")

if(p.length===3){

/* yyyy-mm-dd */

if(p[0].length===4){

return new Date(p[0],p[1]-1,p[2])

}

/* dd-mm-yyyy */

return new Date(p[2],p[1]-1,p[0])

}

}

/* fallback javascript */

let d = new Date(str)

if(!isNaN(d)) return d

return null

}


/* =========================
<<<<<<< HEAD
STATUS PROMO
========================= */

function getStatus(item){

let start =
item.mulai ||
item.start ||
item.tgl_mulai ||
null

let end =
item.akhir ||
item.end ||
item.tgl_akhir ||
null


/* jika ada kolom berlaku */

if(item.berlaku){

let parts = String(item.berlaku).split(" - ")

if(parts.length===2){

start = start || parts[0]
end = end || parts[1]

}

}


start = parseDate(start)
end = parseDate(end)

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
RENDER RESULT
========================= */

function render(data){

if(data.length===0){

result.innerHTML="Data tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let status = getStatus(item)

let statusClass="aktif"

if(status==="BELUM AKTIF") statusClass="belum"
if(status==="BERAKHIR") statusClass="berakhir"

html+=`

<div class="card">

<div class="card-header">

<div class="title">
${item.deskripsi || "-"}
</div>

<div class="status ${statusClass}">
${status}
</div>

</div>

<div class="meta">Brand: ${item.brand||"-"}</div>
<div class="meta">SKU: ${item.sku||"-"}</div>

<div class="price-normal">
${rupiah(item.harga_normal)}
</div>

<div class="price-promo">
${item.harga_promo || "-"}
</div>

<div class="meta">Promo: ${item.promo || "-"}</div>

<div class="meta">Berlaku: ${item.berlaku||"-"}</div>

<div class="meta">Divisi: ${item.division||"-"}</div>

<div class="meta">Sheet: ${item.sheet||"-"}</div>

</div>

`

})
=======
FORMAT
========================= */

function formatRupiah(val) {
  if (!val) return "-"
  let num = Number(val.toString().replace(/[^\d]/g, ""))
  if (isNaN(num)) return val
  return "Rp " + num.toLocaleString("id-ID")
}

function hitungDiskon(normal, promo) {
  let n = Number(normal)
  let p = Number(promo)
  if (!n || !p) return "-"
  return Math.round(((n - p) / n) * 100) + "%"
}
>>>>>>> 25e80f1372f8fdbfd2d641bdf98e60d5fcb5fb32

result.innerHTML=html

<<<<<<< HEAD
}
=======
function render(data) {
  if (!data.length) {
    result.innerHTML = "❌ Data tidak ditemukan"
    return
  }

  let html = ""

  data.forEach(item => {
    html += `
    <div class="card">
      <b>${item.deskripsi || "-"}</b><br>
      Brand: ${item.brand || "-"}<br>
      SKU: ${item.sku || "-"}<br>
      Article: ${item.article || "-"}<br>

      <hr>

      Harga Normal: ${formatRupiah(item.harga_normal)}<br>
      Harga Promo: <b style="color:red">${formatRupiah(item.harga_promo)}</b><br>
      Diskon: <b>${hitungDiskon(item.harga_normal, item.harga_promo)}</b><br>

      <hr>

      Berlaku: ${item.mulai || "-"} s/d ${item.akhir || "-"}<br>

      <small>${item.source} | ${item.sheet}</small>
    </div>
    `
  })

  result.innerHTML = html
}

/* =========================
SEARCH SUPER CEPAT (INDEX)
========================= */

function searchData(keyword) {
  if (!READY) {
    result.innerHTML = "⏳ Database belum siap"
    return
  }

  keyword = keyword.toLowerCase().trim()

  if (!keyword) {
    result.innerHTML = "Masukkan kata kunci"
    return
  }

  let results = []

  // 🔥 PRIORITAS 1: SKU
  if (SKU_INDEX[keyword]) {
    results = SKU_INDEX[keyword].map(i => DB[i])
    console.log("⚡ SKU HIT")
  }

  // 🔥 PRIORITAS 2: ARTICLE
  else if (ARTICLE_INDEX[keyword]) {
    results = ARTICLE_INDEX[keyword].map(i => DB[i])
    console.log("⚡ ARTICLE HIT")
  }

  // 🔥 FALLBACK: SEARCH BIASA
  else {
    console.log("🐢 fallback search")

    results = DB.filter(item =>
      (item.sku && item.sku.toLowerCase().includes(keyword)) ||
      (item.article && item.article.toLowerCase().includes(keyword)) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword)) ||
      (item.brand && item.brand.toLowerCase().includes(keyword))
    )
  }

  render(results.slice(0, 200))
}

/* =========================
EVENT
========================= */

searchInput.addEventListener("keyup", function (e) {
  if (e.key === "Enter") {
    searchData(this.value)
  }
})

/* =========================
INIT
========================= */

loadDatabase()
>>>>>>> 25e80f1372f8fdbfd2d641bdf98e60d5fcb5fb32

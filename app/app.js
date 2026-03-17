let DB=[]
let SKU_INDEX={}
let ARTICLE_INDEX={}

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

/* =========================
LOAD DATABASE (AUTO SPLIT DETECT)
========================= */

async function loadDatabase(){

result.innerHTML="Memuat database..."

try{

let i=1
let all=[]

while(true){

try{

let res=await fetch(`../db/promo_${i}.json`)

if(!res.ok) break

let data=await res.json()

all=all.concat(data)

i++

}catch(e){
break
}

}

DB=all

SKU_INDEX=await fetch("../db/sku_index.json").then(r=>r.json()).catch(()=>({}))
ARTICLE_INDEX=await fetch("../db/article_index.json").then(r=>r.json()).catch(()=>({}))

console.log("TOTAL DATA:",DB.length)

result.innerHTML=""

}catch(e){

console.error(e)
result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase


/* =========================
FORMAT RUPIAH
========================= */

function rupiah(n){

if(!n) return ""

let num=Number(String(n).replace(/[^\d]/g,""))

return "Rp "+num.toLocaleString("id-ID")

}


/* =========================
DATE PARSER UNIVERSAL
========================= */

function parseDate(v){

if(!v) return null

if(!isNaN(v)){

let epoch=new Date(1899,11,30)
return new Date(epoch.getTime()+v*86400000)

}

let str=String(v).trim()

if(str.includes("/")){

let p=str.split("/")
return new Date(p[2],p[1]-1,p[0])

}

if(str.includes("-")){

let p=str.split("-")

if(p[0].length==4)
return new Date(p[0],p[1]-1,p[2])

return new Date(p[2],p[1]-1,p[0])

}

let d=new Date(str)

if(!isNaN(d)) return d

return null

}


/* =========================
STATUS ENGINE FINAL (FIX BUG)
========================= */

function getStatus(item){

let start=item.mulai||item.start||item.tgl_mulai||(item.berlaku?item.berlaku.split("-")[0]:null)

let end=item.akhir||item.end||item.tgl_akhir||(item.berlaku?item.berlaku.split("-")[1]:null)

if(!start||!end) return ""

start=parseDate(start)
end=parseDate(end)

if(!start||!end) return ""

let today=new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today<start) return "BELUM AKTIF"
if(today>end) return "BERAKHIR"

return "AKTIF"

}


/* =========================
PROMO ENGINE V15 SEARCH
========================= */

function search(q){

q=String(q).toLowerCase().trim()

if(!q) return []

return DB.filter(item=>

String(item.sku||"").toLowerCase().includes(q) ||

String(item.article||"").toLowerCase().includes(q) ||

String(item.deskripsi||"").toLowerCase().includes(q) ||

String(item.brand||"").toLowerCase().includes(q)

)

}

/* ======================
1. SKU EXACT (SUPER FAST)
====================== */

if(SKU_INDEX[q]){

return SKU_INDEX[q].map(i=>DB[i])

}

/* ======================
2. ARTICLE EXACT
====================== */

if(ARTICLE_INDEX[q]){

return ARTICLE_INDEX[q].map(i=>DB[i])

}

/* ======================
3. SKU PARTIAL
====================== */

let result=DB.filter(item=>
String(item.sku||"").toLowerCase().includes(q)
)

if(result.length>0) return result

/* ======================
4. ARTICLE PARTIAL
====================== */

result=DB.filter(item=>
String(item.article||"").toLowerCase().includes(q)
)

if(result.length>0) return result

/* ======================
5. TEXT SEARCH
====================== */

result=DB.filter(item=>

String(item.deskripsi||"").toLowerCase().includes(q) ||

String(item.brand||"").toLowerCase().includes(q)

)

return result

}


/* =========================
SEARCH INPUT
========================= */

searchInput.addEventListener("input",function(){

let q=this.value

let data=search(q)

/* tampilkan lebih banyak hasil */
render(data.slice(0,100))

})


/* =========================
RENDER RESULT FINAL
========================= */

function render(data){

if(data.length===0){

result.innerHTML="Data tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let status=getStatus(item)

let statusClass="aktif"

if(status==="BELUM AKTIF") statusClass="belum"
if(status==="BERAKHIR") statusClass="berakhir"

html+=`

<div class="card">

<div class="card-header">

<div class="title">
${item.deskripsi||"-"}
</div>

<div class="status ${statusClass}">
${status||""}
</div>

</div>

<div class="meta">Brand: ${item.brand||"-"}</div>
<div class="meta">SKU: ${item.sku||"-"}</div>

<div class="price-normal">
${rupiah(item.harga_normal)}
</div>

<div class="price-promo">
${item.harga_promo||"-"}
</div>

<div class="meta">Promo: ${item.acara||"-"}</div>

<div class="meta">Berlaku: ${item.berlaku||"-"}</div>

<div class="meta">Divisi: ${item.division||"-"}</div>

<div class="meta">Sheet: ${item.sheet||"-"}</div>

</div>

`

})

result.innerHTML=html

}
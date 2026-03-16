let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")


/* =========================
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
PARSE DATE (FIX EXCEL)
========================= */

function parseDate(str){

if(!str) return null

str=str.trim()

if(str.includes("/")){

let p=str.split("/")

return new Date(p[2],p[1]-1,p[0])

}

if(str.includes("-")){

let d=new Date(str)

if(!isNaN(d)) return d

}

return new Date(str)

}



/* =========================
STATUS PROMO
========================= */

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

if(!start || !end) return ""

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

result.innerHTML=html

}
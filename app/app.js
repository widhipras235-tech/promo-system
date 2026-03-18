let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

/* =========================
LOAD DATABASE (AUTO SPLIT)
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

if(!num) return n

return "Rp "+num.toLocaleString("id-ID")

}


/* =========================
PARSE DATE
========================= */

function parseDate(v){

if(!v) return null

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
STATUS PROMO
========================= */

function getStatus(item){

if(!item.berlaku) return ""

let p=item.berlaku.split("-")

if(p.length<2) return ""

let start=parseDate(p[0])
let end=parseDate(p[1])

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
SEARCH V12 (STABIL)
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


/* =========================
EVENT SEARCH
========================= */

searchInput.addEventListener("input",function(){

let data=search(this.value)

render(data.slice(0,50)) // limit 50 biar ringan

})


/* =========================
RENDER UI V12
========================= */

function render(data){

if(data.length===0){

result.innerHTML="Data tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let status=getStatus(item)

/* STATUS COLOR */
let statusClass="aktif"
if(status==="BELUM AKTIF") statusClass="belum"
if(status==="BERAKHIR") statusClass="berakhir"

/* HARGA */
let hargaNormal=""
let hargaPromo=""

/* jika ada promo → coret */
if(item.harga_promo){

hargaNormal=`<div class="harga-normal coret">${rupiah(item.harga_normal)}</div>`
hargaPromo=`<div class="harga-promo">${rupiah(item.harga_promo)}</div>`

}else{

hargaPromo=`<div class="harga-promo">${rupiah(item.harga_normal)}</div>`

}

/* DISKON */
let diskonHTML=""
if(item.diskon){
diskonHTML=`<div class="diskon">Diskon ${item.diskon}</div>`
}

/* CARD */
html+=`

<div class="card">

<div class="header">

<div class="title">
${item.deskripsi||"-"}
</div>

<div class="status ${statusClass}">
${status}
</div>

</div>

<div class="meta">Brand: ${item.brand||"-"}</div>
<div class="meta">SKU: ${item.sku||"-"}</div>

${hargaNormal}
${hargaPromo}

${diskonHTML}

<div class="meta">Promo: ${item.acara||"-"}</div>
<div class="meta">Berlaku: ${item.berlaku||"-"}</div>

<div class="meta small">File: ${item.file||"-"}</div>
<div class="meta small">Sheet: ${item.sheet||"-"}</div>

</div>

`

})

result.innerHTML=html

}
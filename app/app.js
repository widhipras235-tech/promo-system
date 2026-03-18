let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

/* =========================
LOAD DATABASE AUTO
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
STATUS
========================= */

function parseDate(v){

if(!v) return null

let d=new Date(v)

if(!isNaN(d)) return d

if(String(v).includes("-")){

let p=v.split("-")

return new Date(p[2],p[1]-1,p[0])

}

if(String(v).includes("/")){

let p=v.split("/")
return new Date(p[2],p[1]-1,p[0])

}

return null

}

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
SEARCH
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

render(data.slice(0,100))

})


/* =========================
RENDER UI SESUAI GAMBAR
========================= */

function render(data){

if(data.length===0){

result.innerHTML="Data tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let status=getStatus(item)

/* STATUS BADGE */
let statusHTML=""

if(status==="AKTIF"){
statusHTML=`<span class="badge aktif">AKTIF</span>`
}
else if(status==="BELUM AKTIF"){
statusHTML=`<span class="badge belum">BELUM AKTIF</span>`
}
else if(status==="BERAKHIR"){
statusHTML=`<span class="badge berakhir">BERAKHIR</span>`
}

/* LOGIKA HARGA */
let hargaNormal=""
let hargaPromo=""
let diskonHTML=""

/* jika ada harga promo → tampilkan coret */
if(item.harga_promo){

hargaNormal=`<div class="harga-normal coret">${rupiah(item.harga_normal)}</div>`
hargaPromo=`<div class="harga-promo">${rupiah(item.harga_promo)}</div>`

}else{

hargaPromo=`<div class="harga-promo">${rupiah(item.harga_normal)}</div>`

}

/* diskon hanya jika ada */
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

${statusHTML}

</div>

${hargaNormal}
${hargaPromo}

${diskonHTML}

<div class="meta">
Berlaku: ${item.berlaku||"-"}
</div>

<div class="meta">
Promo: ${item.acara||"-"}
</div>

<div class="meta small">
📄 ${item.file||"-"}
</div>

<div class="meta small">
📑 ${item.sheet||"-"}
</div>

</div>

`

})

result.innerHTML=html

}
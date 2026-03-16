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
STATUS PROMO ENGINE
========================= */

function getStatus(range){

if(!range) return ""

let parts = String(range).split("-")

if(parts.length < 2) return ""

let start = parseDate(parts[0].trim())
let end = parseDate(parts[1].trim())

if(!start || !end) return ""

let today = new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

/* STATUS LOGIC */

if(today < start){

return "BELUM AKTIF"

}

if(today > end){

return "BERAKHIR"

}

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

let status=getStatus(item.berlaku)

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
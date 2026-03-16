let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")


/* ================================
LOAD DATABASE SPLIT
================================ */

async function loadDatabase(){

result.innerHTML="Loading database..."

try{

let promises=[]

for(let i=1;i<=62;i++){

promises.push(
fetch(`../db/promo_${i}.json`)
.then(r=>r.json())
.catch(()=>[])
)

}

let data=await Promise.all(promises)

DB=data.flat()

console.log("Database loaded:",DB.length)

result.innerHTML=""

}catch(err){

console.error(err)

result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase



/* ================================
SEARCH
================================ */

searchInput.addEventListener("input",e=>{

let q=e.target.value.toLowerCase().trim()

if(q.length<2){

result.innerHTML=""
return

}

search(q)

})


function search(q){

const divisi=document.getElementById("divisi")?.value || ""

let data=DB.filter(item=>{

return(

String(item.sku).toLowerCase().includes(q) ||
String(item.artikel).toLowerCase().includes(q) ||
String(item.deskripsi).toLowerCase().includes(q) ||
String(item.brand).toLowerCase().includes(q)

)

})

if(divisi){

data=data.filter(x=>x.division===divisi)

}

render(data.slice(0,30))

}



/* ================================
FORMAT RUPIAH
================================ */

function rupiah(n){

n=Number(String(n).replace(/[^\d]/g,""))

if(!n) return ""

return "Rp "+new Intl.NumberFormat("id-ID").format(n)

}



/* ================================
STATUS PROMO
================================ */

function getPromoStatus(range){

if(!range) return ""

let parts=range.split("-")

if(parts.length<2) return ""

let start=new Date(parts[0].trim())
let end=new Date(parts[1].trim())

let today=new Date()

if(today<start) return "BELUM AKTIF"
if(today>end) return "BERAKHIR"

return "AKTIF"

}



/* ================================
PROMO ENGINE V12
================================ */

function promoEngine(item){

let normal=item.harga_normal
let promo=item.harga_promo || ""
let acara=item.acara || ""

let text=(promo+" "+acara).toUpperCase()

let normalNum=Number(String(normal).replace(/[^\d]/g,""))

let result={
normal:rupiah(normalNum),
promo:"",
promoLabel:"",
coret:false,
hideLabel:false
}


/* =====================
PRICE PARSER
===================== */

function parsePrice(str){

let k=str.match(/(\d+)\s*K/)

if(k) return parseInt(k[1])*1000

let dot=str.match(/(\d{2,3})[.,](\d{3})/)

if(dot) return parseInt(dot[1]+dot[2])

let raw=str.match(/\d{5,6}/)

if(raw) return parseInt(raw[0])

return null

}



/* =====================
BXGY CODE
===================== */

let bxgy=text.match(/B\d+(G|D)\d+/g)

if(bxgy){

result.promo=bxgy.join(" ")
result.hideLabel=true

return result
}



/* =====================
BUY X GET Y
===================== */

let buyGet=text.match(/BUY\s*(\d+)\s*(GET|FREE)\s*(\d+)/)

if(buyGet){

result.promo="B"+buyGet[1]+"G"+buyGet[3]
result.hideLabel=true

return result
}



/* =====================
BUY X DISC
===================== */

let buyDisc=text.match(/BUY\s*(\d+).*?(DISC|DISKON)\s*(\d+)/)

if(buyDisc){

result.promo="B"+buyDisc[1]+"D"+buyDisc[3]
result.hideLabel=true

return result
}



/* =====================
SPECIAL PRICE
===================== */

if(text.includes("SPECIAL")){

let sp=parsePrice(text)

if(sp){

result.normal=rupiah(normalNum)
result.promo=rupiah(sp)
result.promoLabel="SPECIAL PRICE"
result.coret=true

return result

}

}



/* =====================
SHARP PRICE
===================== */

if(text.includes("SHARP")){

result.normal="@"+rupiah(normalNum)
result.promo=rupiah(normalNum)
result.promoLabel="SHARP PRICE"

return result

}



/* =====================
DISCOUNT %
===================== */

let percent=text.match(/(\d+)\s*%/)

if(percent){

let p=parseInt(percent[1])

let promoCalc=Math.round(normalNum*(100-p)/100)

result.normal=rupiah(normalNum)
result.promo=rupiah(promoCalc)
result.promoLabel=p+"%"
result.coret=true

return result

}



/* =====================
SPECIAL PRICE WITHOUT LABEL
ex: 129K
===================== */

let price=parsePrice(text)

if(price && price<normalNum){

result.normal=rupiah(normalNum)
result.promo=rupiah(price)
result.promoLabel="SPECIAL PRICE"
result.coret=true

return result

}



/* =====================
PROMO LABEL
===================== */

if(text.includes("CLEARANCE")){

result.promoLabel="CLEARANCE"
return result

}

if(text.includes("NETT")){

result.promoLabel="NETT"
return result

}

if(text.includes("FLASH")){

result.promoLabel="FLASH SALE"
return result

}

if(text.includes("LIMIT")){

result.promoLabel="LIMITED OFFER"
return result

}



return result

}


/* ================================
RENDER
================================ */

function render(data){

if(data.length===0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let p=promoEngine(item)

let status=getPromoStatus(item.berlaku)

let statusClass="aktif"

if(status==="BELUM AKTIF") statusClass="belum"
if(status==="BERAKHIR") statusClass="berakhir"

let normalClass=p.coret ? "price-normal coret" : "price-normal"

let promoText=p.hideLabel ? "" : `
<div class="diskon">
Promo ${p.promoLabel}
</div>
`

html+=`

<div class="card">

<div class="card-header">

<div class="title">
${item.deskripsi}
</div>

<div class="status ${statusClass}">
${status}
</div>

</div>

<div class="meta">Brand: ${item.brand}</div>
<div class="meta">SKU: ${item.sku}</div>

<div class="${normalClass}">
${p.normal}
</div>

<div class="price-promo">
${p.promo}
</div>

${promoText}

<div class="meta">
Berlaku: ${item.berlaku}
</div>

<div class="meta">
Divisi: ${item.division}
</div>

<div class="meta">
File: ${item.file}
</div>

<div class="meta">
Sheet: ${item.sheet}
</div>

</div>

`

})

result.innerHTML=html

}
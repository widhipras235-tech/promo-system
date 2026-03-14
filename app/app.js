let DB=[]
let fuse

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

async function loadDatabase(){

result.innerHTML="Loading database..."

try{

const res = await fetch("/promo-system/db/promo.json")

if(!res.ok){
throw new Error("promo.json tidak ditemukan")
}

DB = await res.json()

console.log("DB loaded:",DB.length)

fuse = new Fuse(DB,{
keys:[
{name:"sku",weight:0.5},
{name:"artikel",weight:0.25},
{name:"deskripsi",weight:0.15},
{name:"brand",weight:0.1}
],
threshold:0.4,
ignoreLocation:true
})

result.innerHTML=""

}catch(err){

console.error("ERROR LOAD DB:",err)

result.innerHTML="Database gagal dimuat"

}

}

search(q)

})


function search(q){

const divisi=document.getElementById("divisi").value

let data=[]

// PRIORITAS SKU
data=DB.filter(x=>String(x.sku).includes(q))

// jika tidak ada gunakan Fuse
if(data.length===0){

data=fuse.search(q).map(x=>x.item)

}

// filter divisi
if(divisi){

data=data.filter(x=>x.division===divisi)

}

// limit hasil
data=data.slice(0,30)

render(data)

}



function number(v){

return Number(String(v).replace(/[^\d]/g,""))

}

function rupiah(v){

let n=number(v)

if(!n) return v

return "Rp "+new Intl.NumberFormat("id-ID").format(n)

}



function render(data){

if(data.length===0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=item.diskon||""

let promoText=(promo+" "+item.acara+" "+diskon).toUpperCase()

let normalDisplay=rupiah(normal)
let promoDisplay=promo

let normalNum=number(normal)
let promoNum=number(promo)

let isB3=promoText.includes("B3")
let isSpecial=promoText.includes("SPECIAL")
let isSharp=promoText.includes("SHARP")

// ===== SHARP PRICE =====

if(isSharp){

normalDisplay="@"+rupiah(normal)
promoDisplay=rupiah(normal)
diskon="SHARP PRICE"

}

// ===== SPECIAL PRICE =====

else if(isSpecial){

normalDisplay=`<s>${rupiah(normal)}</s>`
promoDisplay=rupiah(promo)

}

// ===== B3 DISKON =====

else if(isB3){

let match=promoText.match(/B\s*(\d+).*?(\d+)%/)

if(match){

let qty=match[1]
let disc=match[2]

promoDisplay="B"+qty+"D"+disc
diskon="BXGY"

}

normalDisplay=rupiah(normal)

}

// ===== DISKON NORMAL =====

else{

if(String(diskon).toUpperCase().includes("PERCENTAGE")){

if(normalNum && promoNum){

let d=Math.round((normalNum-promoNum)/normalNum*100)

diskon=d+"%"

}

}

let match=promoText.match(/(\d+)\s*%/)

if(match){
diskon=match[1]+"%"
}

if(diskon){
normalDisplay=`<s>${rupiah(normal)}</s>`
}

if(promoNum){
promoDisplay=rupiah(promo)
}

}



html+=`

<div class="card">

<h3>${item.deskripsi}</h3>

<b>Brand :</b> ${item.brand}<br>
<b>SKU :</b> ${item.sku}<br>

<b>Harga Normal :</b> ${normalDisplay}<br>
<b>Harga Promo :</b> ${promoDisplay}<br>
<b>Diskon :</b> ${diskon}<br>

<b>Berlaku :</b> ${item.berlaku}<br>
<b>Acara :</b> ${item.acara}<br>
<b>Divisi :</b> ${item.division}<br>

<b>Sumber File :</b> ${item.file}<br>
<b>Sheet :</b> ${item.sheet}

</div>

`

})

result.innerHTML=html

}



function scan(){

const scanner=new Html5Qrcode("reader")

scanner.start(
{facingMode:"environment"},
{fps:10,qrbox:250},

barcode=>{

searchInput.value=barcode

search(barcode)

scanner.stop()

}

)

}
let DB=[]
let fuse

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

async function loadDatabase(){

result.innerHTML="Loading database..."

try{

DB = await fetch("../db/promo.json").then(r=>r.json())

fuse = new Fuse(DB,{
keys:[
"sku",
"artikel",
"deskripsi",
"brand"
],
threshold:0.35,
ignoreLocation:true
})

result.innerHTML=""

}catch(e){

result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase


searchInput.addEventListener("input", e=>{

let q=e.target.value.trim()

if(q.length<2){

result.innerHTML=""
return

}

search(q)

})


function search(q){

q=q.toUpperCase()

const divisi=document.getElementById("divisi").value

let data=[]

// SKU search
data=DB.filter(x=>String(x.sku).includes(q))

// artikel / deskripsi / brand search
if(data.length==0){

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

if(data.length==0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=item.diskon || ""

let promoText=(promo+" "+item.acara+" "+diskon).toUpperCase()

let normalDisplay=rupiah(normal)
let promoDisplay=promo

let normalNum=number(normal)
let promoNum=number(promo)

let isB3=promoText.includes("B3")
let isSpecial=promoText.includes("SPECIAL")
let isSharp=promoText.includes("SHARP")

// ================= SHARP PRICE

if(isSharp){

normalDisplay="@"+rupiah(normal)
promoDisplay=rupiah(normal)
diskon="SHARP PRICE"

}

// ================= SPECIAL PRICE

else if(isSpecial){

normalDisplay=`<s>${rupiah(normal)}</s>`
promoDisplay=promo

}

// ================= B3 DISKON

else if(isB3){

let match = promoText.match(/B\s*(\d+).*?(\d+)%/)

if(match){

let qty=match[1]
let disc=match[2]

promoDisplay="B"+qty+"D"+disc
diskon="BXGY"

}

normalDisplay=rupiah(normal)

}

// ================= DISKON NORMAL

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
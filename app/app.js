let DB=[]
let fuse

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

async function loadDatabase(){

DB = await fetch("../db/promo.json").then(r=>r.json())

fuse = new Fuse(DB,{
keys:["artikel","deskripsi"],
threshold:0.3
})

}

window.onload=loadDatabase


searchInput.addEventListener("keyup", e=>{

let q=e.target.value.trim()

if(q.length<3) return

search(q)

})


function search(q){

q=q.toUpperCase()

const divisi=document.getElementById("divisi").value

let data=[]

// SKU exact
data=DB.filter(x=>x.sku==q)

// artikel fuzzy
if(data.length==0){

data=fuse.search(q).map(x=>x.item)

}

// filter divisi
if(divisi){

data=data.filter(x=>x.division===divisi)

}

render(data)

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

function number(v){
return Number(String(v).replace(/[^\d]/g,""))
}

function rupiah(v){
let n=number(v)
if(!n) return v
return "Rp. "+n
}

let normalDisplay=rupiah(normal)
let promoDisplay=promo

let normalNum=number(normal)
let promoNum=number(promo)

let isB3=promoText.includes("B3")
let isSpecial=promoText.includes("SPECIAL")
let isSharp=promoText.includes("SHARP")

// ====================
// SHARP PRICE
// ====================

if(isSharp){

normalDisplay="@"+rupiah(normal)
promoDisplay=rupiah(normal)
diskon="SHARP PRICE"

}

// ====================
// SPECIAL PRICE
// ====================

else if(isSpecial){

normalDisplay=`<s>${rupiah(normal)}</s>`
promoDisplay=promo

}

// ====================
// DISKON PERCENTAGE
// ====================

else{

if(String(diskon).toUpperCase().includes("PERCENTAGE")){

if(normalNum && promoNum){

let d=Math.round((normalNum-promoNum)/normalNum*100)

diskon=d+"%"

}

}

// ambil % dari teks
let match=promoText.match(/(\d+)\s*%/)

if(match){
diskon=match[1]+"%"
}

// coret harga jika diskon
if(!isB3 && diskon){

normalDisplay=`<s>${rupiah(normal)}</s>`
}

// promo angka
if(promoNum){
promoDisplay=rupiah(promo)
}

}

html+=`

<div class="card">

<h3>${item.deskripsi}</h3>

Brand : ${item.brand}<br>
SKU : ${item.sku}<br>

Harga Normal : ${normalDisplay}<br>
Harga Promo : ${promoDisplay}<br>
Diskon : ${diskon}<br>

Berlaku : ${item.berlaku}<br>
Acara : ${item.acara}<br>
Divisi : ${item.division}<br>

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

document.getElementById("search").value=barcode

search(barcode)

scanner.stop()

}

)

}
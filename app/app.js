let DB=[]
let fuse

const result=document.getElementById("result")

async function loadDatabase(){

DB = await fetch("../db/promo.json").then(r=>r.json())

fuse = new Fuse(DB,{
keys:["artikel","deskripsi"],
threshold:0.3
})

loadBrand()

}

window.onload=loadDatabase

function search(){

const q=document.getElementById("search").value.toUpperCase()

let data=[]

// SKU search
data = DB.filter(x=>x.sku==q)

// artikel search
if(data.length==0){

data = fuse.search(q).map(x=>x.item)

}

show(data)

}

function show(data){

if(data.length==0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=""

let promoText=(promo+" "+item.acara).toUpperCase()

let normalDisplay=normal
let promoDisplay=promo

// SHARP PRICE
if(promoText.includes("SHARP")){

normalDisplay="@Rp "+normal
promoDisplay="Rp "+normal
diskon="SHARP PRICE"

}

// SPECIAL PRICE
else if(promoText.includes("SPECIAL")){

normalDisplay=`<span class="old">Rp ${normal}</span>`
promoDisplay=promo

}

// DISKON %
else{

let n=Number(normal)
let p=Number(promo)

if(n && p){

let d=Math.round((n-p)/n*100)

diskon=d+"%"

normalDisplay=`<span class="old">Rp ${normal}</span>`
promoDisplay="Rp "+promo

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
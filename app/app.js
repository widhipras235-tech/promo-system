let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

async function loadDatabase(){

result.innerHTML="Loading database..."

try{

const res=await fetch("/promo-system/db/promo.json")

if(!res.ok) throw new Error("promo.json tidak ditemukan")

DB=await res.json()

console.log("Database loaded:",DB.length)

result.innerHTML=""

}catch(e){

console.error(e)
result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase



searchInput.addEventListener("input",e=>{

let q=e.target.value.trim().toLowerCase()

if(q.length<2){

result.innerHTML=""
return

}

search(q)

})



function search(q){

const divisi=document.getElementById("divisi").value

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



function rupiah(n){

n=Number(String(n).replace(/[^\d]/g,""))

if(!n) return ""

return "Rp "+new Intl.NumberFormat("id-ID").format(n)

}



function promoEngine(item){

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=item.diskon || ""

let text=(promo+" "+item.acara+" "+diskon).toUpperCase()

let normalNum=Number(String(normal).replace(/[^\d]/g,""))
let promoNum=Number(String(promo).replace(/[^\d]/g,""))

let result={

normal:rupiah(normalNum),
promo:"",
diskon:diskon,
coret:false

}



function match(regex){

let m=text.match(regex)
return m ? m[1] : null

}



let b3=match(/B3D(\d+)/)
let b1d=match(/B1D(\d+)/)
let bxgy=text.match(/B(\d+)G(\d+)/)
let percent=match(/(\d+)%/)
let hargaK=match(/(\d+)K/)



// SHARP PRICE

if(text.includes("SHARP")){

result.normal="@"+rupiah(normalNum)
result.promo=rupiah(normalNum)
result.diskon="SHARP PRICE"

return result

}



// SPECIAL PRICE

if(text.includes("SPECIAL")){

result.normal=rupiah(normalNum)
result.promo=rupiah(promoNum)
result.coret=true

return result

}



// B3D10

if(b3){

result.normal=rupiah(normalNum)
result.promo="B3D"+b3
result.diskon="BXGY"

return result

}



// KOMBO B1D20 + B2G1

if(b1d && bxgy){

result.normal=rupiah(normalNum)
result.promo="B1D"+b1d+", B"+bxgy[1]+"G"+bxgy[2]

return result

}



// BXGY (B1G1 / B1G2 / B2G1 dll)

if(bxgy){

result.normal=rupiah(normalNum)
result.promo="B"+bxgy[1]+"G"+bxgy[2]
result.diskon="BXGY"

return result

}



// PROMO NOMINAL (129K)

if(hargaK){

let price=parseInt(hargaK)*1000

result.normal=rupiah(normalNum)
result.promo=rupiah(price)
result.coret=true

return result

}



// DISKON %

if(percent){

result.normal=rupiah(normalNum)
result.diskon=percent+"%"
result.coret=true

}



// PERCENTAGE dari Excel

if(String(diskon).toUpperCase().includes("PERCENTAGE")){

if(normalNum && promoNum){

let d=Math.round((normalNum-promoNum)/normalNum*100)

result.diskon=d+"%"
result.coret=true

}

}



// NOMINAL PROMO

if(promoNum){

result.promo=rupiah(promoNum)

}



return result

}



function render(data){

if(data.length===0){

result.innerHTML="Promo tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let p=promoEngine(item)

let normalDisplay=p.coret ? `<s>${p.normal}</s>` : p.normal

html+=`

<div class="card">

<h3>${item.deskripsi}</h3>

<b>Brand :</b> ${item.brand}<br>
<b>SKU :</b> ${item.sku}<br>

<b>Harga Normal :</b> ${normalDisplay}<br>
<b>Harga Promo :</b> ${p.promo}<br>
<b>Diskon :</b> ${p.diskon}<br>

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
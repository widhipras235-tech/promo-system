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



function getPromoStatus(range){

if(!range) return ""

let parts=range.split("-")

if(parts.length<2) return ""

let start=new Date(parts[0].trim())
let end=new Date(parts[1].trim())

let today=new Date()

start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today<start) return "BELUM AKTIF"
if(today>end) return "BERAKHIR"

return "AKTIF"

}



function statusColor(status){

if(status==="AKTIF") return "green"
if(status==="BELUM AKTIF") return "orange"
if(status==="BERAKHIR") return "red"

return "black"

}



function promoEngine(item){

let normal=item.harga_normal
let promo=item.harga_promo
let diskon=item.diskon||""

let text=(promo+" "+item.acara+" "+diskon).toUpperCase()

let normalNum=Number(String(normal).replace(/[^\d]/g,""))
let promoNum=Number(String(promo).replace(/[^\d]/g,""))

let result={
normal:rupiah(normalNum),
promo:"",
diskon:diskon,
coret:false
}



let sp=text.match(/SP\s*(\d+)\s*K/)
let hargaK=text.match(/(\d+)\s*K/)
let hargaNominal=text.match(/\b(\d{2,3})\.?(\d{3})\b/)
let bxgy=text.match(/B(\d+)G(\d+)/)
let b3=text.match(/B3D(\d+)/)
let b1d=text.match(/B1D(\d+)/)
let percent=text.match(/(\d+)\s*%/)



if(percent){

let p=parseInt(percent[1])

let promoCalc=Math.round(normalNum*(100-p)/100)

result.normal=rupiah(normalNum)
result.promo=rupiah(promoCalc)
result.diskon=p+"%"
result.coret=true

return result

}



if(String(diskon).toUpperCase().includes("PERCENTAGE")){

if(normalNum && promoNum){

let d=Math.round((normalNum-promoNum)/normalNum*100)

result.normal=rupiah(normalNum)
result.promo=rupiah(promoNum)
result.diskon=d+"%"
result.coret=true

return result

}

}



if(text.includes("SHARP")){

result.normal="@"+rupiah(normalNum)
result.promo=rupiah(normalNum)
result.diskon="SHARP PRICE"

return result

}



if(sp){

let price=parseInt(sp[1])*1000

result.normal=rupiah(normalNum)
result.promo=rupiah(price)
result.diskon="SPECIAL PRICE"
result.coret=true

return result

}



if(b3){

result.normal=rupiah(normalNum)
result.promo="B3D"+b3[1]
result.diskon="BXGY"

return result

}



if(b1d && bxgy){

result.normal=rupiah(normalNum)
result.promo="B1D"+b1d[1]+", B"+bxgy[1]+"G"+bxgy[2]

return result

}



if(bxgy){

result.normal=rupiah(normalNum)
result.promo="B"+bxgy[1]+"G"+bxgy[2]
result.diskon="BXGY"

return result

}



if(hargaK){

let price=parseInt(hargaK[1])*1000

result.normal=rupiah(normalNum)
result.promo=rupiah(price)
result.coret=true

return result

}



if(hargaNominal){

let price=parseInt(hargaNominal[0].replace(".",""))

if(price<normalNum){

result.normal=rupiah(normalNum)
result.promo=rupiah(price)
result.coret=true

return result

}

}



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

let status=getPromoStatus(item.berlaku)

let color=statusColor(status)

let normalDisplay=p.coret ? `<s>${p.normal}</s>` : p.normal

html+=`

<div class="card">

<h3>${item.deskripsi}</h3>

<b>Brand :</b> ${item.brand}<br>
<b>SKU :</b> ${item.sku}<br>

<b>Harga Normal :</b> ${normalDisplay}<br>
<b>Harga Promo :</b> ${p.promo}<br>
<b>Diskon :</b> ${p.diskon}<br>

<b>Status :</b> 
<span style="color:${color};font-weight:bold">
${status}
</span><br>

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
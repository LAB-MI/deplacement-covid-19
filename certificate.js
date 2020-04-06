import 'bootstrap/dist/css/bootstrap.min.css'

import { PDFDocument, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

import pdfBase from './certificate.pdf'
import './main.css'

const $ = (...args) => document.querySelector(...args)
const $$ = (...args) => [...document.querySelectorAll(...args)]
var year, month, day

const generateQR = async text => {
  try {
    var opts = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
    }
    return await QRCode.toDataURL(text, opts)
  } catch (err) {
    console.error(err)
  }
}

function pad (str) {
  return String(str).padStart(2, '0')
}

function setDateNow (date) {
  year = date.getFullYear()
  month = pad(date.getMonth() + 1) // Les mois commencent à 0
  day = pad(date.getDate())
}

document.addEventListener('DOMContentLoaded', setReleaseDateTime)

function setReleaseDateTime () {
  const loadedDate = new Date()
  setDateNow(loadedDate)
  const releaseDateInput = document.querySelector('#field-datesortie')
  releaseDateInput.value = `${year}-${month}-${day}`

  const hour = pad(loadedDate.getHours())
  const minute = pad(loadedDate.getMinutes())

  const releaseTimeInput = document.querySelector('#field-heuresortie')
  releaseTimeInput.value = `${hour}:${minute}`
}

function saveProfile () {
  for (const field of $$('#form-profile input')) {
    if (field.id === 'field-datesortie') {
      var dateSortie = field.value.split('-')
      localStorage.setItem(field.id.substring('field-'.length), `${dateSortie[2]}/${dateSortie[1]}/${dateSortie[0]}`)
    } else {
      localStorage.setItem(field.id.substring('field-'.length), field.value)
    }
  }
}

function getProfile () {
  const fields = {}
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i)
    fields[name] = localStorage.getItem(name)
  }
  return fields
}

function idealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return (textWidth > maxWidth) ? null : currentSize
}

async function generatePdf (profile, reasons) {
  const generatedDate = new Date()
  setDateNow(generatedDate)
  const creationDate = `${day}/${month}/${year}`

  const hour = pad(generatedDate.getHours())
  const minute = pad(generatedDate.getMinutes())
  const creationHour = `${hour}h${minute}`

  const { lastname, firstname, birthday, lieunaissance, address, zipcode, town, datesortie, heuresortie } = profile
  const releaseHours = String(heuresortie).substring(0, 2)
  const releaseMinutes = String(heuresortie).substring(3, 5)

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} a ${lieunaissance}`,
    `Adresse: ${address} ${zipcode} ${town}`,
    `Sortie: ${datesortie} a ${releaseHours}h${releaseMinutes}`,
    `Motifs: ${reasons}`,
  ].join('; ')

  const existingPdfBytes = await fetch(pdfBase).then(res => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 123, 686)
  drawText(birthday, 123, 661)
  drawText(lieunaissance, 92, 638)
  drawText(`${address} ${zipcode} ${town}`, 134, 613)

  if (reasons.includes('travail')) {
    drawText('x', 76, 527, 19)
  }
  if (reasons.includes('courses')) {
    drawText('x', 76, 478, 19)
  }
  if (reasons.includes('sante')) {
    drawText('x', 76, 436, 19)
  }
  if (reasons.includes('famille')) {
    drawText('x', 76, 400, 19)
  }
  if (reasons.includes('sport')) {
    drawText('x', 76, 345, 19)
  }
  if (reasons.includes('judiciaire')) {
    drawText('x', 76, 298, 19)
  }
  if (reasons.includes('missions')) {
    drawText('x', 76, 260, 19)
  }
  let locationSize = idealFontSize(font, profile.town, 83, 7, 11)

  if (!locationSize) {
    alert('Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
      'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.')
    locationSize = 7
  }

  drawText(profile.town, 111, 226, locationSize)

  if (reasons !== '') {
    // Date sortie
    drawText(`${profile.datesortie}`, 92, 200)
    drawText(releaseHours, 200, 201)
    drawText(releaseMinutes, 220, 201)
  }

  // Date création
  drawText('Date de création:', 464, 150, 7)
  drawText(`${creationDate} à ${creationHour}`, 455, 144, 7)

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: page1.getWidth() - 170,
    y: 155,
    width: 100,
    height: 100,
  })

  pdfDoc.addPage()
  const page2 = pdfDoc.getPages()[1]
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  })

  const pdfBytes = await pdfDoc.save()

  return new Blob([pdfBytes], { type: 'application/pdf' })
}

function downloadBlob (blob, fileName) {
  const link = document.createElement('a')
  var url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}

function getAndSaveReasons () {
  const values = $$('input[name="field-reason"]:checked')
    .map(x => x.value)
    .join('-')
  localStorage.setItem('reasons', values)
  return values
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser () {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return ua.includes('FBAN') || ua.includes('FBAV')
}

if (isFacebookBrowser()) {
  $('#alert-facebook').classList.remove('d-none')
}

function addSlash () {
  this.value = this.value.replace(/^(\d{2})$/g, '$1/')
  this.value = this.value.replace(/^(\d{2})\/(\d{2})$/g, '$1/$2/')
}

$('#field-birthday').addEventListener('keyup', addSlash)

const snackbar = $('#snackbar')

$('#form-profile').addEventListener('submit', async event => {
  event.preventDefault()

  saveProfile()
  const reasons = getAndSaveReasons()
  const pdfBlob = await generatePdf(getProfile(), reasons)
  downloadBlob(pdfBlob, 'attestation.pdf')

  snackbar.classList.remove('d-none')
  setTimeout(() => snackbar.classList.add('show'), 100)

  setTimeout(function () {
    snackbar.classList.remove('show')
    setTimeout(() => snackbar.classList.add('d-none'), 500)
  }, 6000)
})

$$('input').forEach(input => {
  const exempleElt = input.parentNode.parentNode.querySelector('.exemple')
  if (input.placeholder && exempleElt) {
    input.addEventListener('input', (event) => {
      if (input.value) {
        exempleElt.innerHTML = 'ex.&nbsp;: ' + input.placeholder
      } else {
        exempleElt.innerHTML = ''
      }
    })
  }
})

function addVersion () {
  document.getElementById('version').innerHTML = `${new Date().getFullYear()} - ${process.env.VERSION}`
}
addVersion()

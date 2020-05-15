import 'bootstrap/dist/css/bootstrap.min.css'

import './main.css'

import { PDFDocument, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

import './check-updates'
import './icons'
import { $, $$ } from './dom-utils'
import pdfBase from './certificate.pdf'

const generateQR = async (text) => {
  try {
    const opts = {
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

function getFormattedDate (date) {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1) // Les mois commencent à 0
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}

document.addEventListener('DOMContentLoaded', setReleaseDateTime)

function setReleaseDateTime () {
  const releaseDateInput = $('#field-datesortie')
  const loadedDate = new Date()
  releaseDateInput.value = getFormattedDate(loadedDate)
}

function getProfile () {
  const fields = {}
  for (const field of $$('#form-profile input')) {
    if (field.id === 'field-datesortie') {
      const dateSortie = field.value.split('-')
      fields[field.id.substring('field-'.length)] = `${dateSortie[2]}/${dateSortie[1]}`
    } else {
      fields[field.id.substring('field-'.length)] = field.value
    }
  }
  return fields
}

function idealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}

async function generatePdf (profile, reason) {
  const creationInstant = new Date()
  const creationDate = creationInstant.toLocaleDateString('fr-FR')
  const creationHour = creationInstant
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const {
    lastname,
    firstname,
    birthday,
    lieunaissance,
    address,
    zipcode,
    town,
    datesortie,
  } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} a ${lieunaissance}`,
    `Adresse: ${address} ${zipcode} ${town}`,
    `Sortie: ${datesortie}`,
    `Motifs: ${reason}`,
  ].join(';\n ')

  const existingPdfBytes = await fetch(pdfBase).then((res) => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)

  // set pdf metadata
  pdfDoc.setTitle('COVID-19 - Attestation dérogatoire usage des transports publics collectifs en Ile-de-France de 6h30 à 9h30 et de 16h00 à 19h00')
  pdfDoc.setSubject('Attestation dérogatoire usage des transports publics collectifs en Ile-de-France de 6h30 à 9h30 et de 16h00 à 19h00')
  pdfDoc.setKeywords(['covid19', 'covid-19', 'attestation', 'déclaration', 'déplacement', 'officielle', 'gouvernement'])
  pdfDoc.setProducer('DNUM/SDIT')
  pdfDoc.setCreator('')
  pdfDoc.setAuthor('Préfecture d\'Ile-de-France')

  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${lastname} ${firstname}`, 120, 663)
  drawText(birthday, 109, 649)
  drawText(lieunaissance, 75, 636)
  drawText(address, 120, 622)
  drawText(`${zipcode} ${town}`, 120, 608)

  if (reason === 'travail') {
    drawText('x', 57, 553, 14)
  }
  if (reason === 'ecole') {
    drawText('x', 57, 512, 14)
  }
  if (reason === 'sante') {
    drawText('x', 57, 457, 14)
  }
  if (reason === 'famille') {
    drawText('x', 57, 415, 14)
  }
  if (reason === 'police') {
    drawText('x', 57, 374, 14)
  }
  if (reason === 'judiciaire') {
    drawText('x', 57, 318, 14)
  }
  if (reason === 'missions') {
    drawText('x', 57, 277, 14)
  }
  let locationSize = idealFontSize(font, profile.town, 83, 7, 11)

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  drawText(profile.town, 93, 222, locationSize)

  if (reason !== '') {
    // Date sortie
    drawText(`${profile.datesortie}`, 75, 194, 11)
  }

  // Date création
  drawText('Date de création:', 479, 130, 6)
  drawText(`${creationDate} à ${creationHour}`, 470, 124, 6)

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: page1.getWidth() - 163,
    y: 135,
    width: 98,
    height: 98,
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
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}

function getReason () {
  const val = $('input[name="field-reason"]:checked').value
  return val
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser () {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return ua.includes('FBAN') || ua.includes('FBAV')
}

if (isFacebookBrowser()) {
  const alertFacebookElt = $('#alert-facebook')
  alertFacebookElt.value =
    "ATTENTION !! Vous utilisez actuellement le navigateur Facebook, ce générateur ne fonctionne pas correctement au sein de ce navigateur ! Merci d'ouvrir Chrome sur Android ou bien Safari sur iOS."
  alertFacebookElt.classList.remove('d-none')
}

function addSlash () {
  const birthdayInput = $('#field-birthday')
  birthdayInput.value = birthdayInput.value.replace(/^(\d{2})$/g, '$1/')
    .replace(/^(\d{2})\/(\d{2})$/g, '$1/$2/')
    .replace(/\/\//g, '/')
}

$('#field-birthday').onkeyup = function () {
  const key = event.keyCode || event.charCode
  if (key === 8 || key === 46) {
    return false
  } else {
    addSlash()
    return false
  }
}

const snackbar = $('#snackbar')

$('#generate-btn').addEventListener('click', async (event) => {
  event.preventDefault()
  const invalid = validateAriaFields()
  if (invalid) return

  const reason = getReason()
  const pdfBlob = await generatePdf(getProfile(), reason)

  const creationInstant = new Date()
  const creationDate = creationInstant.toLocaleDateString('fr-CA')
  const creationHour = creationInstant
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '-')
  downloadBlob(pdfBlob, `attestation-${creationDate}_${creationHour}.pdf`)

  snackbar.classList.remove('d-none')
  setTimeout(() => snackbar.classList.add('show'), 100)

  setTimeout(function () {
    snackbar.classList.remove('show')
    setTimeout(() => snackbar.classList.add('d-none'), 500)
  }, 6000)
})

$$('input').forEach((input) => {
  const exempleElt = input.parentNode.parentNode.querySelector('.exemple')
  const validitySpan = input.parentNode.parentNode.querySelector('.validity')
  if (input.placeholder && exempleElt) {
    input.addEventListener('input', (event) => {
      if (input.value) {
        exempleElt.innerHTML = 'ex.&nbsp;: ' + input.placeholder
        validitySpan.removeAttribute('hidden')
      } else {
        exempleElt.innerHTML = ''
      }
    })
  }
})

const conditions = {
  '#field-firstname': {
    condition: 'length',
  },
  '#field-lastname': {
    condition: 'length',
  },
  '#field-birthday': {
    condition: 'pattern',
    pattern: /^([0][1-9]|[1-2][0-9]|30|31)\/([0][1-9]|10|11|12)\/(19[0-9][0-9]|20[0-1][0-9]|2020)/g,
  },
  '#field-lieunaissance': {
    condition: 'length',
  },
  '#field-address': {
    condition: 'length',
  },
  '#field-town': {
    condition: 'length',
  },
  '#field-zipcode': {
    condition: 'pattern',
    pattern: /\d{5}/g,
  },
  '#field-datesortie': {
    condition: 'pattern',
    pattern: /\d{4}-\d{2}-\d{2}/g,
  },
}

function validateAriaFields () {
  return Object.keys(conditions).map(field => {
    if (conditions[field].condition === 'pattern') {
      const pattern = conditions[field].pattern
      if ($(field).value.match(pattern)) {
        $(field).setAttribute('aria-invalid', 'false')
        return 0
      } else {
        $(field).setAttribute('aria-invalid', 'true')
        $(field).focus()
        return 1
      }
    }
    if (conditions[field].condition === 'length') {
      if ($(field).value.length > 0) {
        $(field).setAttribute('aria-invalid', 'false')
        return 0
      } else {
        $(field).setAttribute('aria-invalid', 'true')
        $(field).focus()
        return 1
      }
    }
  }).some(x => x === 1)
}

(function addVersion () {
  document.getElementById(
    'version',
  ).innerHTML = `${new Date().getFullYear()} - ${process.env.VERSION}`
}())

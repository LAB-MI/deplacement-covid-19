import { PDFDocument, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

import './check-updates'
import './icons'
import { $, $$ } from './dom-utils'
import pdfBase from './attestation-deplacement-metropole-vers-om-en.pdf'

$('#radio-language-en').addEventListener('click', async (event) => {
  window.location.href = './index-en.html'
})

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

function saveProfile () {
  for (const field of $$('#form-profile input')) {
    localStorage.setItem(field.id.substring('field-'.length), field.value)
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

  return textWidth > maxWidth ? null : currentSize
}

async function generatePdf (profile, reasons) {
  const creationDate = new Date().toLocaleDateString('fr-FR')
  const creationHour = new Date()
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const {
    lastname,
    firstname,
    birthday,
    nationality,
    address,
    zipcode,
    town,
    country,
  } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} (${nationality})`,
    `Adresse: ${address} ${zipcode} ${town} ${country}`,
    `Motifs: ${reasons.choice}`,
    `Detail: ${reasons.detail}`,
  ].join(';\n ')

  const existingPdfBytes = await fetch(pdfBase).then((res) => res.arrayBuffer())

  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 9) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 130, 640)
  drawText(birthday, 130, 627)
  drawText(nationality, 130, 612)
  drawText(`${address} ${zipcode} ${town}, ${country}`, 130, 600)

  if (reasons.choice.includes('famille')) {
    drawText('x', 72, 540, 19)
    drawText(`${reasons.detail}`, 260, 542)
  }
  if (reasons.choice.includes('sante')) {
    drawText('x', 72, 519, 19)
    drawText(`${reasons.detail}`, 210, 522)
  }
  if (reasons.choice.includes('travail')) {
    drawText('x', 72, 498, 19)
    drawText(`${reasons.detail}`, 300, 498)
  }

  let locationSize = idealFontSize(font, profile.town, 83, 7, 11)

  if (!locationSize) {
    alert(
      'Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. ' +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.',
    )
    locationSize = 7
  }

  // Fait à :
  drawText(profile.town, 360, 455, locationSize)
  // Le
  drawText(
    `${new Date().toLocaleDateString('fr-FR', {
      month: 'numeric',
      day: 'numeric',
    })}`,
    475,
    455,
  )

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: 400,
    y: 50,
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
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
}

function getAndSaveReasons () {
  const reason = {
    choice: [],
    detail: '',
  }
  const values = $$('input[name="field-reason"]:checked')
    .map((x) => x.value)
    .join('-')
  const detail = document.getElementById('field-detail').value
  reason.choice = values
  reason.detail = detail
  localStorage.setItem('reasons', values)
  return reason
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser () {
  const ua = navigator.userAgent || navigator.vendor || window.opera
  return ua.includes('FBAN') || ua.includes('FBAV')
}

const alertFacebook = $('#alert-facebook')
if (isFacebookBrowser()) {
  alertFacebook.value =
    "ATTENTION !! Vous utilisez actuellement le navigateur Facebook, ce générateur ne fonctionne pas correctement au sein de ce navigateur ! Merci d'ouvrir Chrome sur Android ou bien Safari sur iOS."
  alertFacebook.classList.remove('d-none')
}

const birthdayInput = $('#field-birthday')
function addSlash () {
  birthdayInput.value = birthdayInput.value.replace(/^(\d{2})$/g, '$1/')
    .replace(/^(\d{2})\/(\d{2})$/g, '$1/$2/')
    .replace(/\/\//g, '/')
}

birthdayInput.onkeyup = function () {
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

  saveProfile()
  const reason = getAndSaveReasons()

  const pdfBlob = await generatePdf(getProfile(), reason)
  localStorage.clear()
  const creationDate = new Date().toLocaleDateString('fr-CA')
  const creationHour = new Date()
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
  '#field-nationality': {
    condition: 'length',
  },
  '#field-address': {
    condition: 'length',
  },
  '#field-town': {
    condition: 'length',
  },
  '#field-zipcode': {
    condition: 'lenght',
  },
  '#field-country': {
    condition: 'length',
  },
  '#field-detail': {
    condition: 'length',
  },
}

for (const fieldSelector of Object.keys(conditions)) {
  const field = $(fieldSelector)
  field.addEventListener('input', () => {
    const fieldCondition = conditions[fieldSelector].condition
    if (fieldCondition === 'pattern') {
      const pattern = conditions[fieldSelector].pattern
      const isAriaInvalid = field.value.match(pattern)
      field.setAttribute('aria-invalid', String(isAriaInvalid))
      return
    }
    if (fieldCondition === 'length') {
      const isAriaInvalid = field.value.length > 0
      field.setAttribute('aria-invalid', String(isAriaInvalid))
    }
  })
}

(function addVersion () {
  document.getElementById(
    'version',
  ).innerHTML = `${new Date().getFullYear()} - ${process.env.VERSION}`
})()

# Attestation de déplacement international dérogatoire vers la France métropolitaine

## Fichiers pdf des attestations papier :

- version française : 07-04-20-Attestation-etranger-metropole-FR.pdf
- version anglaise : Attestation_deplacement_International_EN-1.pdf

## Analyse de la structure du document 

### Champs ajoutés :

- nationalité
- typologie de nationalités : pays tiers ; eu ou	assimilés ; française

### Champs supprimés :

- lieu de naissance
- date de sortie
- heure de sortie

### Remarques :

- Les motifs sont identiques pour les types tiers et eu.
- Pas de motif pour les français.
- Un seul motif possible défini en fonction du type de nationalité

## Structure des champs du QR Code

- **Cree le:** creationDate a creationHour;\n
- **Nom:** `firstname`;\n
- **Prenom:** `lastname`;\n
- **Naissance:** `birthday` (`nationality`);\n
- **Adresse:** `address`  `zipcode` `town` `country`;\n
- **Sortie:** N/A;\n
- **Motifs:** `national`-`reason` (`reaseon` à vide pour les français)

### Correspondances formulaire/QR Code

Afin de pouvoir être sotckées dans le QR Code, à chaque choix du formulaire est associé un alias.

#### types de nationalités

| libellé formulaire | alias |
|:-----|:-----|
| Ressortissants de pays tiers | tiers |
| Ressortissants de l’Union européenne et assimilés | eu |
| Ressortissants de nationalité française | fr |

#### types de motifs

| libellé formulaire | alias |
|:-----|:-----|
| Personnes ayant leur résidence principale en France | residence |
| Personnes transitant par la France pour rejoindre leur résidence | transit |
| Professionnels de santé aux fins de lutter contre le Covid-19 | prof._sante |
| Transporteurs de marchandises | marchandises |
| Equipages et personnels exploitant des vols | equipage |
| Personnels des missions diplomatiques et consulaires | diplomatique |
| Travailleurs frontaliers | frontalier |
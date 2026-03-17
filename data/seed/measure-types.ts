import type { MeasureType, PropertyQuestion } from "@/types";

export const MEASURE_TYPES: MeasureType[] = [
  {
    id: "garasje_carport",
    name: "Garasje / Carport",
    description: "Frittliggende garasje eller carport",
    icon: "🏠",
  },
  {
    id: "tilbygg",
    name: "Tilbygg",
    description: "Tilbygg til eksisterende byggverk",
    icon: "🏗️",
  },
  {
    id: "paabygg",
    name: "Påbygg",
    description: "Påbygg (utbygging i høyden) av eksisterende byggverk",
    icon: "🏢",
  },
  {
    id: "enebolig",
    name: "Enebolig",
    description: "Ny enebolig",
    icon: "🏡",
  },
  {
    id: "bruksendring",
    name: "Bruksendring",
    description: "Endring av bruk av eksisterende bygning",
    icon: "🔄",
  },
  {
    id: "terrasse_balkong",
    name: "Terrasse / Balkong",
    description: "Terrasse, balkong eller veranda",
    icon: "🌿",
  },
  {
    id: "stoettemur",
    name: "Støttemur",
    description: "Støttemur eller forstøtningsmur",
    icon: "🧱",
  },
  {
    id: "riving",
    name: "Riving",
    description: "Riving av eksisterende byggverk",
    icon: "🔨",
  },
];

export const PROPERTY_QUESTIONS: PropertyQuestion[] = [
  {
    tag: "soeknadspliktig",
    label: "Er tiltaket søknadspliktig?",
    description: "Tiltaket krever byggesøknad jf. plan- og bygningsloven",
  },
  {
    tag: "naer_nabogrense",
    label: "Ligger tiltaket nær nabogrense?",
    description: "Innenfor 4 meter fra nabogrense",
  },
  {
    tag: "inneholder_vaatrom",
    label: "Inneholder tiltaket våtrom?",
    description: "Bad, vaskerom, dusjrom eller lignende",
  },
  {
    tag: "har_brannskille",
    label: "Har tiltaket brannskille?",
    description: "Brannvegg eller annen brannskillekonstruksjon",
  },
  {
    tag: "har_terrengendring",
    label: "Har tiltaket terrengendring?",
    description: "Vesentlig terrenginngrep, fylling eller skjæring",
  },
  {
    tag: "har_elektrisk_arbeid",
    label: "Har tiltaket elektriske installasjoner?",
    description: "Ny eller endret elektrisk installasjon",
  },
  {
    tag: "har_va_overvann",
    label: "Har tiltaket VA / overvann?",
    description: "Tilkobling til vann og avløp, eller overvannshåndtering",
  },
  {
    tag: "krever_tilgjengelighet",
    label: "Krever tiltaket tilgjengelighet?",
    description: "Byggverk med krav til universell utforming",
  },
  {
    tag: "har_ansvarlige_foretak",
    label: "Har tiltaket ansvarlige foretak?",
    description: "Søknad med ansvarsrett – ansvarlig søker, prosjekterende, utførende",
  },
  {
    tag: "har_dispensasjon",
    label: "Er det dispensasjon i saken?",
    description: "Dispensasjon fra plan eller byggesaksbestemmelser",
  },
];

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
    id: "tomannsbolig",
    name: "Tomannsbolig",
    description: "Tomannsbolig, rekkehus eller annen bolig med to boenheter",
    icon: "🏘️",
  },
  {
    id: "leilighetsbygg",
    name: "Leilighetsbygg",
    description: "Boligblokk, flermannsbolig eller annet bygg med tre eller flere boenheter",
    icon: "🏬",
  },
  {
    id: "fritidsbolig",
    name: "Fritidsbolig / Hytte",
    description: "Fritidsbolig, hytte eller sommerhus",
    icon: "🏕️",
  },
  {
    id: "naeringsbygg",
    name: "Næringsbygg / Yrkesbygg",
    description: "Næringsbygg, kontor, butikk, verksted eller annet yrkesbygg",
    icon: "🏭",
  },
  {
    id: "bruksendring",
    name: "Bruksendring",
    description: "Endring av bruk av eksisterende bygning",
    icon: "🔄",
  },
  {
    id: "fasadeendring",
    name: "Fasadeendring",
    description: "Endring av fasade, vinduer, dører eller annen ytre utforming",
    icon: "🪟",
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
    id: "uthus_anneks",
    name: "Uthus / Anneks",
    description: "Uthus, bod, anneks eller annet frittliggende tilleggsbygg",
    icon: "🛖",
  },
  {
    id: "naust",
    name: "Naust / Båthus",
    description: "Naust, båthus eller sjøbod",
    icon: "⛵",
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
  {
    tag: "har_radon_tiltak",
    label: "Krever tiltaket radon-tiltak?",
    description: "Radonsperre og/eller ventilasjonstiltak etter TEK17 § 13-5",
  },
  {
    tag: "krever_lydkrav",
    label: "Stilles det lydkrav mellom boenheter?",
    description: "Lydkrav etter TEK17 kap. 13 – gjelder tomannsbolig, rekkehus og bruksendring til bolig",
  },
  {
    tag: "i_fareomrade",
    label: "Ligger tiltaket i fareområde?",
    description: "Område med risiko for flom, skred (snø, jord, stein), stormflo eller erosjon",
  },
];

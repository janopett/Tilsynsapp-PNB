# Claude Code — prosjektinstruksjoner

## Dokumentasjon

Etter enhver endring som påvirker funksjonalitet, arkitektur eller brukeropplevelse, **oppdater alle fire dokumentasjonsfiler**:

| Fil | Innhold |
|-----|---------|
| `README.md` | Teknisk dokumentasjon (norsk) |
| `README.en.md` | Teknisk dokumentasjon (engelsk) |
| `EXECUTIVE_SUMMARY.md` | Overordnet sammendrag for beslutningstakere (norsk) |
| `EXECUTIVE_SUMMARY.en.md` | Overordnet sammendrag for beslutningstakere (engelsk) |

Hold alle fire filene synkronisert — samme informasjon i norsk og engelsk versjon.

### Hva som typisk krever oppdatering

- Nye eller endrede funksjoner i brukergrensesnittet
- Nye API-endepunkter eller endrede integrasjonsflyter
- Endringer i arkitektur (nye filer, mapper, tjenester)
- Endringer i miljøvariabler eller konfigurasjon
- Endringer i statusradaren (veikart / produksjonsklar-tabellen)

### Hva som ikke trenger oppdatering

- Feilrettinger som ikke endrer synlig funksjonalitet
- Interne refaktoreringer uten brukersynlig effekt
- Testfiler

## Commit-konvensjoner

Commit-meldinger skrives på norsk og beskriver *hvorfor* endringen gjøres, ikke bare *hva*. Bruk imperativ form.

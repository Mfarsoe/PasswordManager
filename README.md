# Password Manager CLI

En simpel kommandolinjeapplikation til sikker opbevaring af adgangskoder til websider.

## Funktionalitet

- **Sikkert lager** i form af en JSON-fil krypteret med master password
- **AES-256-GCM** kryptering for sikker dataopbevaring
- **Entries gemmes** med site, brugernavn og password
- **Password-generering** kan bruges i stedet for manuelt password
- **Dekryptering** af data ved visning
- **Masterpassword-validering** ved hver operation

## Installation

Programmet bruger Node.js indbyggede `crypto` modul, så der kræves ingen ekstra pakker.

```bash
npm install
```

## Brug

### 1. Opret vault (initialisering)

Opret et nyt sikkert lager med et master password:

```bash
node manager.js init <masterPassword>
```

**Eksempel:**
```bash
node manager.js init myMasterPassword
```

Dette opretter filen `vault.json` som indeholder det krypterede lager.

---

### 2. Tilføj entry (gem adgangskode)

Gem en adgangskode til en webside:

```bash
node manager.js add <masterPassword> "<site>" "<brugernavn>" ["<password>"|--generate|--generate=<længde>]
```

**Eksempel:**
```bash
node manager.js add myMasterPassword "Email" "bruger@example.com" "MitPassword123"
```

**Eksempel med genereret password:**
```bash
node manager.js add myMasterPassword "Email" "bruger@example.com" --generate
```

**Eksempel med bestemt længde:**
```bash
node manager.js add myMasterPassword "Email" "bruger@example.com" --generate=24
```

Parametrene skal være i følgende rækkefølge:
1. Master password
2. Site navn (fx "Gmail", "Facebook", "Email")
3. Brugernavn eller email
4. Adgangskode (valgfri: kan erstattes af `--generate` eller `--generate=<længde>`)

Når `--generate` bruges, opretter programmet automatisk et password.

---

### 3. Vis alle entries (dekrypter og vis)

Dekryptér og vis alle gemte adgangskoder:

```bash
node manager.js list <masterPassword>
```

**Eksempel:**
```bash
node manager.js list myMasterPassword
```

Output viser alle gemte entries med:
- Site navn
- Brugernavn
- Adgangskode
- Oprettelsestidspunkt

---

## Komplet eksempel (flow)

```bash
# 1. Opret vault
node manager.js init myMasterPassword
# Output: Vault oprettet i vault.json

# 2. Gem en Gmail-adgangskode
node manager.js add myMasterPassword "Gmail" "min@gmail.com" "SecurePassword123"
# Output: Entry gemt for site: Gmail

# 3. Gem en Facebook-adgangskode
node manager.js add myMasterPassword "Facebook" "min.profil" --generate
# Output: Entry gemt for site: Facebook
# Output: Genereret password: <automatisk genereret>

# 4. Vis alle adgangskoder
node manager.js list myMasterPassword
# Output:
# Fundet 2 entries:
#
# #1
# Site     : Gmail
# Bruger   : min@gmail.com
# Password : SecurePassword123
# Oprettet : 2026-04-13T18:14:19.208Z
#
# #2
# Site     : Facebook
# Bruger   : min.profil
# Password : AnotherPassword456
# Oprettet : 2026-04-13T18:14:26.875Z
```

---

## Sikkerhed

### Kryptering
- **Algoritme:** AES-256-GCM (authenticated encryption)
- **Nøgleherleding:** PBKDF2 med SHA-256
- **Iterationer:** 120.000 (OWASP anbefaling)
- **Tilfældig salt:** 16 bytes for hver vault
- **Tilfældig IV:** 12 bytes for hver entry

### Master Password validering
- Master password valideres ved hver `add` og `list` operation
- Hvis forkert password indtastes, får man fejlen: "Forkert master password."
- Der er ingen måde at gendanne password på hvis det glemmes

### Vault struktur
```json
{
  "version": 1,
  "createdAt": "2026-04-13T18:14:19.208Z",
  "kdf": {
    "algorithm": "pbkdf2",
    "digest": "sha256",
    "iterations": 120000,
    "keyLength": 32,
    "salt": "..."
  },
  "passwordCheck": {
    "iv": "...",
    "tag": "...",
    "data": "..."
  },
  "entries": [
    {
      "iv": "...",
      "tag": "...",
      "data": "..."
    }
  ]
}
```

---

## Fejlfinding

### "Vault findes ikke"
- Du skal først køre `init` for at oprette en vault

### "Forkert master password"
- Kontroller at du bruger det korrekte master password
- Passwords er case-sensitive (stor/små bogstaver betyder noget)

### "Manglende parametre"
- Check at du bruger den rigtige kommando syntax
- Husk anførselstegn omkring site, brugernavn og password hvis de indeholder mellemrum

### "Ugyldig længde"
- Brug kun `--generate=<længde>` med heltal mellem 8 og 128

---

## Kommandoer oversigt

| Kommando | Brug | Output |
|----------|------|--------|
| `init` | Opretter nyt lager | "Vault oprettet i vault.json" |
| `add` | Gemmer ny adgangskode (eller genererer en) | "Entry gemt for site: [site]" |
| `list` | Viser alle adgangskoder | Detaljer for hver entry |

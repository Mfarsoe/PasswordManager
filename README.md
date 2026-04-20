# Password Manager CLI

En kommandolinjeapplikation til sikker opbevaring af adgangskoder til websider.

## Funktionalitet

- **Sikkert lager** med dobbelt lag af kryptering
  - **Lag 1:** AES-256-CBC filkryptering (hele vault-filen)
  - **Lag 2:** AES-256-GCM for individuelle entries med master password
- **Krypteret fillagring** - vault gemmes som `vault.encrypted`. Vault filen selv er krypteret med AES-256-CBC for ekstra sikkerhedslag
- **Autogenereret nøgle** gemmes sikkert i `vault.key` (udelukket fra git)
- **Entries gemmes** med site, brugernavn og password
- **Dekryptering** af data ved visning
- **Masterpassword-validering** ved hver operation
- **Password-generering** kan bruges i stedet for manuelt password

## Ekstraopgaver
- **Password Generering**
- **Fil Kryptering**

## Installation

Programmet kræver ingen ekstra pakker. Der er derfor ikke brug for npm install

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

Dette opretter to filer:
- `vault.encrypted` - Krypteret vault-fil (hele filindholdet er krypteret)
- `vault.key` - Hemmeligt nøgle til fil-dekryptering (skal aldrig committes)

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
# Output: Vault key genereret og gemt i vault.key
# Output: Vault oprettet som krypteret fil (vault.encrypted)

# 2. Gem en Gmail-adgangskode
node manager.js add myMasterPassword "Gmail" "min@gmail.com" "Kodeord123"
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
# Password : Kodeord123
# Oprettet : 2026-04-13T18:14:19.208Z
#
# #2
# Site     : Facebook
# Bruger   : min.profil
# Password : fDkFE4Rl%#545F12sd
# Oprettet : 2026-04-13T18:14:26.875Z
```

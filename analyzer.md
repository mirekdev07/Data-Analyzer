# Data Analyzer — plan budowy od zera (VPS Ubuntu)

Kompletny plan postawienia aplikacji od czystej maszyny: stos technologiczny, architektura, struktura projektu, kolejność prac i wdrożenie na VPS z Ubuntu (zakładam Ubuntu 24.04 LTS).

Założenia, które przyjąłem (możesz je zmienić — w nawiasach alternatywy):
- backend w **Pythonie (FastAPI + pandas)** — bo analiza danych to naturalne zadanie dla pandas (alternatywa: Node.js),
- frontend w **React (Vite)** — można odzyskać logikę z prototypu,
- baza **PostgreSQL** do metadanych i kont (alternatywa na start: SQLite),
- reverse proxy **Nginx** + HTTPS z Let's Encrypt,
- wszystko na jednym VPS-ie.
- Dane do VPS: Serwer: 64.226.68.115, user: root, klucz: ~/.ssh/id_ed25519  - WAŻNE: nie ruszaj portów, które już używam, nie ruszaj plików które także używam! cała aplikacja ma byc pod adresem mirekdev.pl/analyzer
---

## 1. Architektura

```
                    Internet
                       │
                       ▼
              ┌──────────────────┐
              │      NGINX        │  ← reverse proxy + HTTPS (Certbot)
              │  (port 80/443)    │
              └────────┬──────────┘
            ┌──────────┴───────────┐
            ▼                      ▼
   pliki statyczne          /api/* → backend
   (frontend React)              │
                                 ▼
                       ┌──────────────────┐
                       │  FastAPI (uvicorn)│  ← parsowanie, pandas, statystyki
                       │   port 8000       │
                       └────────┬──────────┘
                    ┌───────────┴───────────┐
                    ▼                       ▼
              PostgreSQL              dysk VPS (pliki)
          (użytkownicy,            /srv/analyzer/uploads
           metadane zbiorów)
```

Logika podziału:
- **Frontend** odpowiada tylko za interfejs i wykresy — pliki nie są analizowane w przeglądarce.
- **Backend** przyjmuje plik, parsuje go pandasem, liczy statystyki i zwraca gotowy JSON z wynikami.
- **Nginx** serwuje frontend i przekierowuje zapytania `/api` do backendu.

---

## 2. Stos technologiczny

| Warstwa | Technologia | Po co |
|--------|-------------|-------|
| Frontend | React + Vite, Recharts | interfejs, wykresy |
| Backend | Python 3.12, FastAPI, Uvicorn | API, logika analizy |
| Analiza danych | pandas | parsowanie, typy, statystyki |
| Baza | PostgreSQL | konta, metadane, zapisane analizy |
| Reverse proxy | Nginx | routing, HTTPS, statyki |
| HTTPS | Certbot (Let's Encrypt) | darmowy certyfikat SSL |
| Proces | systemd | utrzymanie backendu jako usługi |
| (opcjonalnie) | Docker + docker-compose | odtwarzalne środowisko |

---

## 3. Struktura projektu

Monorepo z dwoma katalogami:

```
data-analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py            # punkt wejścia FastAPI
│   │   ├── routers/
│   │   │   ├── upload.py      # endpoint przyjmujący plik
│   │   │   └── analysis.py    # endpointy statystyk
│   │   ├── services/
│   │   │   ├── parser.py      # rozpoznawanie formatu + wczytanie do DataFrame
│   │   │   └── stats.py       # wykrywanie typów i statystyki
│   │   ├── models.py          # modele bazy (SQLAlchemy)
│   │   └── config.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/        # Dropzone, ColumnCard, Charts, PreviewTable
│   │   ├── api.js             # wywołania do backendu
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── deploy/
    ├── nginx.conf
    └── analyzer.service       # plik systemd
```

---

## 4. Kontrakt API (co backend wystawia)

Zacznij od minimum — później dołożysz konta i zapisywanie.

| Metoda | Ścieżka | Działanie |
|--------|---------|-----------|
| `POST` | `/api/upload` | przyjmuje plik, zwraca `dataset_id` + podstawowy podgląd |
| `GET` | `/api/datasets/{id}/summary` | przegląd: liczba wierszy/kolumn, braki |
| `GET` | `/api/datasets/{id}/columns` | lista kolumn z wykrytymi typami |
| `GET` | `/api/datasets/{id}/columns/{name}` | statystyki + dane do wykresu dla kolumny |
| `GET` | `/api/datasets/{id}/preview` | pierwsze N wierszy |

Sercem backendu jest jedna funkcja: wczytanie pliku do `pandas.DataFrame`, a potem `df.describe()`, `df.dtypes`, `value_counts()` itd. — pandas robi większość pracy, którą w prototypie pisaliśmy ręcznie w JavaScript.

---

## 5. Kolejność prac (fazy)

### Faza 0 — przygotowanie lokalne
Zanim dotkniesz VPS-a, postaw wszystko na własnym komputerze. Łatwiej się debuguje.
- Zainstaluj Python 3.12, Node.js (LTS), Git.
- Utwórz repozytorium i strukturę katalogów jak wyżej.

### Faza 1 — backend (rdzeń)
- Środowisko: `python -m venv .venv && source .venv/bin/activate`
- Zależności: `pip install fastapi uvicorn pandas python-multipart`
- Endpoint `/api/upload`, który czyta plik:
  - CSV → `pd.read_csv(file)`,
  - JSON → `pd.read_json(file)` lub `pd.json_normalize(...)` dla zagnieżdżonych struktur,
  - Excel → `pd.read_excel(file)` (wymaga `openpyxl`).
- Funkcja statystyk: dla kolumn liczbowych `describe()`, dla tekstowych `value_counts()`, wykrycie dat przez `pd.to_datetime(..., errors="coerce")`.
- Test: `uvicorn app.main:app --reload`, sprawdź pod `http://localhost:8000/docs` (FastAPI generuje interaktywną dokumentację automatycznie).

### Faza 2 — frontend
- `npm create vite@latest frontend -- --template react`
- `npm install recharts`
- Przenieś z prototypu: Dropzone, karty kolumn, wykresy, tabelę podglądu.
- Zamień logikę liczenia statystyk na wywołania do backendu (`fetch('/api/...')`).
- W `vite.config.js` ustaw proxy na backend, żeby w dev `/api` trafiał na `localhost:8000`.

### Faza 3 — baza i trwałość (opcjonalna na start)
- Zainstaluj PostgreSQL, utwórz bazę i użytkownika.
- SQLAlchemy + tabele: `users`, `datasets` (metadane + ścieżka do pliku), `analyses`.
- Na początek możesz pominąć tę fazę — niech aplikacja po prostu analizuje plik „w locie" bez zapisywania.

### Faza 4 — konta użytkowników (opcjonalne)
- Rejestracja/logowanie, tokeny JWT, hashowanie haseł (`passlib[bcrypt]`).
- Powiązanie zbiorów z użytkownikiem.

### Faza 5 — wdrożenie na VPS (patrz sekcja 6).

### Faza 6 — utrzymanie
- Kopie zapasowe bazy, monitoring, logi, automatyczne odnawianie certyfikatu.

---

## 6. Wdrożenie na VPS (krok po kroku)

Zakładam świeży Ubuntu 24.04 i domenę wskazującą na IP serwera.

### 6.1 Podstawowe zabezpieczenia i pakiety
```bash
# aktualizacja systemu
sudo apt update && sudo apt upgrade -y

# zapora — wpuszczamy tylko SSH i ruch web
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# pakiety
sudo apt install -y python3-venv python3-pip nginx postgresql git
# Node.js (LTS) z NodeSource
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

### 6.2 Kod na serwer
```bash
sudo mkdir -p /srv/analyzer && sudo chown $USER:$USER /srv/analyzer
cd /srv/analyzer
git clone <adres-twojego-repo> .
```

### 6.3 Backend jako usługa
```bash
cd /srv/analyzer/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install gunicorn   # produkcyjny serwer
```

Plik `/etc/systemd/system/analyzer.service`:
```ini
[Unit]
Description=Data Analyzer API
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/analyzer/backend
ExecStart=/srv/analyzer/backend/.venv/bin/gunicorn app.main:app \
  -w 4 -k uvicorn.workers.UvicornWorker -b 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now analyzer
sudo systemctl status analyzer   # sprawdzenie
```

### 6.4 Build frontendu
```bash
cd /srv/analyzer/frontend
npm install
npm run build       # tworzy katalog dist/ z plikami statycznymi
```

### 6.5 Nginx
Plik `/etc/nginx/sites-available/analyzer`:
```nginx
server {
    listen 80;
    server_name twoja-domena.pl;

    # frontend (pliki statyczne)
    root /srv/analyzer/frontend/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 100M;   # limit wielkości wgrywanego pliku
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/analyzer /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6.6 HTTPS
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl
# Certbot automatycznie skonfiguruje przekierowanie na HTTPS i odnawianie
```

---

## 7. Lista kontrolna (milestones)

- [ ] Backend lokalnie zwraca statystyki dla wgranego CSV
- [ ] Frontend wyświetla wyniki z backendu
- [ ] Obsługa JSON i Excela
- [ ] (opc.) Zapis zbiorów w bazie
- [ ] (opc.) Logowanie użytkowników
- [ ] Kod na VPS, backend działa jako usługa systemd
- [ ] Nginx serwuje frontend i proxuje API
- [ ] Domena + HTTPS działają
- [ ] Włączona zapora (ufw), zabezpieczony SSH
- [ ] Kopie zapasowe bazy i wgranych plików

---

## 8. Wskazówki i pułapki

- **Polskie CSV** często używają średnika jako separatora i przecinka jako znaku dziesiętnego — w `pd.read_csv` ustaw `sep=";", decimal=","` albo wykrywaj automatycznie.
- **Duże pliki** — ustaw limit w Nginx (`client_max_body_size`) oraz rozważ czytanie pliku porcjami (`chunksize` w pandas).
- **Bezpieczeństwo wgrywania** — waliduj rozszerzenie i rozmiar, zapisuj pliki poza katalogiem dostępnym przez web, nigdy nie ufaj nazwie pliku od użytkownika.
- **Sekrety** (hasło do bazy, klucz JWT) trzymaj w pliku `.env`, nigdy w repozytorium.
- **CORS** — w trybie produkcyjnym backend i frontend są pod jedną domeną (przez Nginx), więc problem CORS znika; w dev używaj proxy Vite.
- **Docker** — jeśli zależy Ci na odtwarzalności, opakuj backend, frontend i bazę w `docker-compose.yml`; wtedy wdrożenie sprowadza się do `docker compose up -d`.

---

*Dokument to plan wykonawczy — możemy zejść do dowolnej fazy i napisać konkretny kod (np. gotowy backend FastAPI albo plik docker-compose).*

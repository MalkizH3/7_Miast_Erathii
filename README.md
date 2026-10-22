# 7 Miast Erathii

Lokalna galeria kart. Uruchom lokalny serwer HTTP w katalogu projektu (np. `python -m http.server 8000`) i otwórz http://localhost:8000. Galeria pobiera wykaz z `cards.json`.

## Pliki

- `index.html` — strona główna i stół gry.
- `gallery.html` — galeria i powiększony podgląd.
- `styles.css` — wygląd galerii i rozmieszczenie warstw.
- `gallery.js` — powiększanie karty i przełącznik marginesów.
- `assets/cards/template/` — wspólne elementy szablonu.
- `assets/cards/artwork/` — ilustracje poszczególnych kart.

## Pierwsza karta

Karta Example ma rozmiar bazowy 1092 × 1627 px. Nagłówek: (0, 0), 1092 × 473 px. Ilustracja: (0, 473), 1092 × 1154 px. Pasek kosztów: (71, 473), 150 × 1012 px, na ilustracji. Pozycja paska jest pierwszym ustawieniem do oceny wizualnej.

Marginesy wynoszą po 46 px u góry i dołu oraz po 47 px z boków. Przełącznik przyciemnia obszar poza marginesami, bez ramki i bez przycinania oryginalnych grafik. Wszystkie warstwy skalują się proporcjonalnie. Pasek nazwy: (146, 81), 800 × 87 px, wyśrodkowany poziomo. Nazwa Example widnieje na pasku oraz w podpisie galerii. Na grafice nie dodano kosztów ani efektów.

## Efekty surowcowe

Obręcz efektu: `assets/cards/template/card-effect-ring.png` (220 × 220 px). Efekty wyświetlają się pod nazwą, 205 px od góry karty. Obręcze mają 220 × 220 px w skali bazowej; brązowy gradient radialny z jaśniejszym środkiem zajmuje 90% ich średnicy. Pole `effect.resources` w `cards.json` wybiera surowce i ich liczbę, np. `{ "wood": 1, "ore": 1 }`. Każdy surowiec ma własną obręcz. Środek obręczy zakrywa pierwotny symbol drewna i pokazuje wybraną ikonę z katalogu resources.

## Wykaz kart

`cards.json` jest źródłem danych galerii. Każdy wpis zawiera `id`, `name`, `color`, `effect`, `connections`, `cost`, `connection_cost`, `players`, `artwork`. Surowce efektu zapisujemy jako `effect.resources`, np. `{ "wood": 1 }`. `connections` i `connection_cost` są listami powiązań, `cost` jest obiektem kosztów, a `players` listą liczb graczy. Puste wartości w karcie Example pozostają do uzupełnienia. Aby dodać kartę, dopisz kolejny obiekt do tablicy.

Efekt resource_choice zawiera options, np. [{"mercury":1},{"sulfur":1}]: rtęć albo siarka. Efekt resources zawiera resources i oznacza wszystkie podane surowce razem. Sprite ukośnika: assets/cards/template/effect-choice-slash.png; do czasu dodania oryginalnego PNG wyświetla się zastępczy symbol.

## Galeria plansz

W powiększonym podglądzie miasta przycisk „Pobierz PNG” zapisuje kompletną planszetkę (ilustrację, nazwę, bazowy surowiec, koszty i bonusy etapów) w rozdzielczości oryginalnej ilustracji. Nazwa pliku odpowiada polu `id` planszy. Podczas generowania przycisk jest nieaktywny, a komunikat pod podglądem informuje o wyniku eksportu. Galerię należy uruchamiać przez serwer HTTP.

Panel bazowego surowca jest nakładany na ilustrację w galerii i powiększeniu. `wood`, `ore`, `mercury` i `sulfur` mają brązowy panel z zaokrąglonym dołem; `gold`, `crystal` i `gems` — szary panel ze ściętymi narożnikami. Panel pojawia się po ustawieniu `base_resource`; `null` go ukrywa. Zamek ma `wood`, zgodnie z referencją.

`boards.json` jest źródłem danych galerii plansz. Każda plansza zawiera `id`, `name`, `base_resource` (np. `"wood"`), `artwork` i uporządkowaną tablicę `stages`. Każdy etap ma `cost` (np. `{ "wood": 2, "ore": 1 }`) oraz `effect` w formacie efektów kart (np. `{ "type": "points", "amount": 3 }`). `null` oznacza wartość jeszcze nieustaloną, a pusty koszt `{}` oznacza etap darmowy. Wstępnie przygotowano po trzy etapy do uzupełnienia; liczbę etapów można zmienić w tablicy. Bazowe surowce, koszty i efekty pozostają nieustalone.

`towns.html` — galeria siedmiu plansz miast: Zamek, Bastion, Forteca, Inferno, Nekropolia, Loch i Twierdza. Na początek plansze pokazują pełne ilustracje z `assets/towns/artworks/`; kliknięcie otwiera powiększony podgląd. Obsługę podglądu zawiera `towns.js`, a wygląd jest wspólny z galerią kart w `styles.css`.

## Atlas kart

`atlas.html` — interaktywny wykaz kart z podziałem na trzy epoki i graf łańcuchów budowy. Najazd lub fokus pokazuje pełną kartę, kliknięcie otwiera powiększenie. Licznik w prawym dolnym rogu kafelka podaje liczbę kopii dla wybranej liczby graczy. Graf łączy symbole `connections` z `connection_cost` w późniejszych epokach. Dane pochodzą z `cards.json`.

## Strona główna i gra

Strona korzysta ze stylu projektu Splendor Might & Magic: ciemne tło, złote akcenty, centralne logo i osobny katalog. Oryginalne warstwy i eksporty kart oraz plansz są zachowane. Tło pochodzi z lokalnego projektu Splendor.

Uruchom `node scripts/preview.mjs` i otwórz http://localhost:8037. Przycisk „Rozegraj partię testową” uruchamia lokalną partię z dwoma prostymi automatami; stan zapisuje się w localStorage. Automaty wybierają pierwszą dostępną kartę, nie stanowią zaawansowanej AI.

### Firebase bez Cloud Functions

Projekt korzysta wyłącznie z Google Authentication i Cloud Firestore. Nie wymaga Cloud Functions ani planu Blaze. Publiczna konfiguracja aplikacji Web projektu `miast-erathii` jest już wpisana do `firebase-config.js`. Analytics nie jest uruchamiane.

1. Włącz Authentication / Google i dodaj domenę strony oraz localhost do autoryzowanych domen.
2. Utwórz Cloud Firestore i opublikuj reguły z `firestore.rules` (przeznaczone do osobnego projektu, nie Splendora).
3. Po zalogowaniu Firebase CLI (`firebase login`) wdróż `firebase deploy --project miast-erathii --only firestore:rules,hosting`. Można też utrzymać stronę na GitHub Pages i wdrożyć tylko reguły Firestore.

Przeglądarka gospodarza losuje karty i rozpatruje ruchy, korzystając ze wspólnego silnika. Pozostali gracze mogą zapisać wyłącznie własny wybór i odczytać własną rękę; pełny stan i kolejność talii są dostępne gospodarzowi. Jest to gra dla zaufanego grona, bez ochrony przed gospodarzem modyfikującym klienta. Gospodarz musi pozostawić stronę otwartą i połączoną; po powrocie do pokoju rozpatrzy oczekujące ruchy. Zmiana gospodarza jest dostępna w poczekalni.

Wybory zapisują się w podkolekcji moves, a gospodarz atomowo aktualizuje stan, ręce i informację o potwierdzonych ruchach. Znacznik tury chroni przed ponownym rozpatrzeniem starego wyboru. Pełny stan w erathiaState jest dostępny tylko gospodarzowi.

Do lokalnych testów: `npm install`, `firebase emulators:start --only auth,firestore --project demo-erathia`, następnie `npm run test:firebase`. Test używa wyłącznie emulatorów. Do ręcznego testu strony ustaw useFirebaseEmulators na true i konfigurację projektu na demo-erathia (nie zapisuj takiego ustawienia jako konfiguracji produkcyjnej).

### Talia i zdolności miast

Talia zawiera 148 wpisów i jest kompletna dla 3–7 graczy. Smocza jaskinia 5+ znajduje się bezpośrednio po wersji 3+, kolejne ID przesunięto o jeden.

Bastion: drugi etap (`discard_free`) daje jednorazową darmową budowę ze stosu odrzuconych po rozpatrzeniu ruchów danej tury. Poświęcone karty etapów są zakopane, nie trafiają do stosu odrzuconych. Na koniec tygodnia dostępne są też ostatnie niewykorzystane karty rąk. Loch: drugi etap (`color_free`) pozwala od następnej tury budować pierwszy budynek każdego nieposiadanego koloru bez kosztu. Zdolności korzystają z ikon `assets/towns/bonuses/free_discard.png` i `free_color.png` w galerii i eksporcie PNG.

Karty todo2 i todo3 mają efekty, ale ich nazwy pozostają robocze.

Testy silnika: `npm test`. Test integracyjny `npm run test:firebase` rozgrywa pełną partię siedmiu klientów, sprawdza dostęp do rąk i stanu, zakaz zapisów nieuprawnionych uczestników, bonus Bastionu i zmianę gospodarza w poczekalni. Nie łączy się z produkcyjnym Firebase.

## Układ stołu

W trakcie partii pełne, warstwowe grafiki kart pojawiają się w górnym rzędzie. Najazd, fokus klawiatury lub dotknięcie karty odsłania akcje: odrzucenie za 3 monety, budowa etapu miasta i budowa budynku. Niedostępne ruchy są nieaktywne. Niżej plansze wszystkich graczy są rozmieszczone w kręgu, z własnym miastem u góry, licznikami monet i oznaczeniami zbudowanych etapów. Rozwinięcie przy planszy pokazuje obrazkowe karty danego miasta. Na małych ekranach rząd kart i krąg plansz można przesuwać poziomo.

Rewersy trzech tygodni: `assets/cards/backs/week1.png`, `week2.png`, `week3.png`. Po wybudowaniu etapu miasta rewers tygodnia budowy wystaje spod odpowiedniego etapu. Tygodnie budowy zapisuje pole `stageWeeks`; dla starszych zapisów bez tej informacji rewers nie jest zgadywany.

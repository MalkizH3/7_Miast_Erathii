# 7 Miast Erathii

Lokalna galeria kart. Uruchom lokalny serwer HTTP w katalogu projektu (np. `python -m http.server 8000`) i otwórz http://localhost:8000. Galeria pobiera wykaz z `cards.json`.

## Pliki

- `index.html` — galeria i powiększony podgląd.
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

Panel bazowego surowca jest nakładany na ilustrację w galerii i powiększeniu. `wood`, `ore`, `mercury` i `sulfur` mają brązowy panel z zaokrąglonym dołem; `gold`, `crystal` i `gems` — szary panel ze ściętymi narożnikami. Panel pojawia się po ustawieniu `base_resource`; `null` go ukrywa. Zamek ma `wood`, zgodnie z referencją.

`boards.json` jest źródłem danych galerii plansz. Każda plansza zawiera `id`, `name`, `base_resource` (np. `"wood"`), `artwork` i uporządkowaną tablicę `stages`. Każdy etap ma `cost` (np. `{ "wood": 2, "ore": 1 }`) oraz `effect` w formacie efektów kart (np. `{ "type": "points", "amount": 3 }`). `null` oznacza wartość jeszcze nieustaloną, a pusty koszt `{}` oznacza etap darmowy. Wstępnie przygotowano po trzy etapy do uzupełnienia; liczbę etapów można zmienić w tablicy. Bazowe surowce, koszty i efekty pozostają nieustalone.

`towns.html` — galeria siedmiu plansz miast: Zamek, Bastion, Forteca, Inferno, Nekropolia, Loch i Twierdza. Na początek plansze pokazują pełne ilustracje z `assets/towns/artworks/`; kliknięcie otwiera powiększony podgląd. Obsługę podglądu zawiera `towns.js`, a wygląd jest wspólny z galerią kart w `styles.css`.

## Atlas kart

`atlas.html` — interaktywny wykaz kart z podziałem na trzy epoki i graf łańcuchów budowy. Najazd lub fokus pokazuje pełną kartę, kliknięcie otwiera powiększenie. Licznik w prawym dolnym rogu kafelka podaje liczbę kopii dla wybranej liczby graczy. Graf łączy symbole `connections` z `connection_cost` w późniejszych epokach. Dane pochodzą z `cards.json`.

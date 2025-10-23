# Projekt-Struktur

Hier finden sich Erklärungen zum allgemeinen Aufbau der Applikationsordner und Dateien.

<details>
<summary>Aufbau der Projektordner</summary>

### Ordnerstruktur von Tauri und React

Um einen Überblick über die wichtigsten Ordner und Dateien zu liefern, wird hier kurz die Struktur des Projekts erklärt:

Die zwei wichtigsten Ordner sind **/src** und **/src-tauri**.

### **/src**

Im **/src** Ordner befindet sich der Code für das Programm.  
Dieser Ordner beinhaltet zwei weitere Ordner namens **/components** und **/lib**. Im Components Ordner befinden sich alle für das Frontend wichtigen reusable components, wie z.B. die einzelnen Tabs für das Hochladen der notwendigen Dateien.  
Im Lib Ordner befinden sich zwei JavaScript Dateien, die die ganze Logik der Datenauslese, Aufarbeitung und des Vergleiches enthalten. Die Datei _pdfCreator.js_ ist außerdem für das Erstellen der PDF für den Bestätigungsprozess durch den Kunden zuständig.

Der src Ordner beinhaltet außerdem eine **main.tsx**, in der alle Routes für das Programm festgelegt sind.  
Soll etwa eine neue Seite dem Programm hinzugefügt werden, muss sie erst hier registriert werden.  
Die Dateien, die mit einem Großbuchstaben starten (_App.tsx_, _Editor.tsx_, ...), stellen die Seiten des Programms dar.

### **/src-tauri**

Im **/src-tauri** Verzeichnis finden sich alle Dateien, die für Tauri (also für die Anwendung an sich) relevant sind.
Dazu zählt vor allem die Datei _tauri.conf.json_, die wichtige Einstellungen für das Fenster unserer Anwenung und Tauri festlegt.
Hier wird auch die Versionsnummer und der Fensternamen festgelegt!
Die Dokumentation zu Tauri findet sich unter: https://v2.tauri.app/start/

Die Datei _Cargo.toml_ beinhaltet außerdem Optimierungseinstellungen für den Build-Prozess. Hier können Einstellungen nach Bedarf angepasst werden. Derzeit liegt der Fokus auf Build und Programm speed. Die Anwendungsgröße ist klein genug (~3.2mb).

### Config Files

Im Projektverzeichnis finden sich auch viele .json und .js Dateien, die folgende Aufgaben haben:  
| Datei | Funktion
| - | -
|_.gitignore_ | Liste aller Dateien und Verzeichnise, welche nicht auf GitHub gepushed werden sollen
|_components.json_| ShadCN Component Settings, siehe https://ui.shadcn.com/docs
| _package.json_ | Beinhaltet alle verfügbaren npm run Befehle und alle installierten NPM Modules
| _package-lock.json_| Darf nicht bearbeitet werden! Speichert Versionen für das Projekt und dessen Module.
|_tailwind.conf.js_| Einstellungen für TaildwindCSS, kann angepasst werden.
| [...]| Dienen dem Konfigurieren oder Dokumentieren. Keine weitere Relevanz.

#

```
📦 rfid-app-v3
│   .gitignore
│   components.json
│   index.html
│   package-lock.json
│   package.json
│   postcss.config.js
│   README.md
│   tailwind.config.js
│   tsconfig.json
│   tsconfig.node.json
│   vite.config.ts
│
├─ .vscode
│   extensions.json
│
├─ documentation
│   │   github.md
│   │   installation.md
│   │   npm-packages.md
│   │   README.md
│   │   structure.md
│   │
│   └─ assets
│       [...]
│
├─ src
│   │   App.tsx
│   │   Editor.tsx
│   │   Finished.tsx
│   │   index.css
│   │   main.tsx
│   │   vite-env.d.ts
│   │
│   ├─ components
│   │   │   barcode_tab.tsx
│   │   │   download_tab.tsx
│   │   │   erp_tab.tsx
│   │   │   instructions_dialog.tsx
│   │   │   master_tab.tsx
│   │   │   rfid_tab.tsx
│   │   │   start_tab.tsx
│   │   │   upload_stepper.tsx
│   │   │
│   │   ├─ tables
│   │   │   artNr_table.tsx
│   │   │   barcode_table.tsx
│   │   │   erp_table.tsx
│   │   │   lotid_table.tsx
│   │   │   rfid_table.tsx
│   │   │   scan_table.tsx
│   │   │
│   │   └─ ui
│   │       button.tsx
│   │       card.tsx
│   │       dialog.tsx
│   │       tabs.tsx
│   │
│   └─ lib
│       compare.js
│       pdfCreator.js
│       utils.ts
│
├─ src-tauri
    │   .gitignore
    │   build.rs
    │   Cargo.lock
    │   Cargo.toml
    │   tauri.conf.json
    │
    ├─ icons
    │   [...]
    │
    └─ src
        main.rs
```

</details>

<details>
<summary>Routing</summary>

### Routing einrichten mit wouter

Routing ermöglich die Navigation zwischen den Unterseiten der Applikation. Außerdem übergibt wouter sogenannte `states`, die Daten für oder vom Abgleich enthalten weiter. So kommunizieren die Seiten miteinander.

## src/main.tsx

Die _main.tsx_ sorgt für das registrieren von Unterseiten die in das Routing aufgenommen werden sollen.

Um eine Seite als Route zu registrieren, muss folgendes getan werden:

1. Im _src_ Ordner muss eine Datei mit dem Namen der Route exisitieren. Routes / Pages werden immer im Pascal-Case geschrieben und exportieren eine Funktion mit dem Namen der Seite (wie Dateibezeichnung).
2. `<Route>...</Route>` zur main.tsx hinzufügen und Component verlinken
3. Link einrichten und mit wouter navigieren

Soll nun Beispielsweise die neue Seite "Test" hinzugefügt werden, kann mit folgenden Zeilen die Seite registriert werden.

```js
// src/main.tsx


// other imports...

// Component import
import Test from "./Test";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Switch>
      <Route path='/' component={App} />
      <Route path='/editor' component={Editor} />
      <Route path='/finished' component={Finished} />

      // Neue registrierte Seite Test
      ---------------------------------------
      <Route path='/test' component={Test} />
      ---------------------------------------

      <Route>404 Error - Das hat nicht funktioniert</Route>
    </Switch>
  </React.StrictMode>
);
```

Soll nun von einer Seite (FromPage) auf diese Seite (Test) navigiert werden können, kann dies durch den path `/test` geschehen.

```js
import { Link } from "wouter";

export default FromPage() {
    return {
        <div>
            <Link
              href='/test'
              title='Zur Seite Test'
            >
              Gehe zu Test
            </Link>
        </div>
    }
}
```

<br/>

> [!IMPORTANT] > **Die Reihenfolge der registrierten Routes spielt eine Rolle!**  
> Routes sind nach absteigender Priorität sortiert, um Fallbacks zu sichern.  
> Die in der _main.tsx_ definierte letze Route ohne path und Component stellt den default fallback dar.
>
> Solche Routes dienen als 404 Page, falls andere Seiten nicht aufrufbar sein sollten.
>
> Dokumentation: [wouter js](https://github.com/molefrog/wouter?tab=readme-ov-file#how-do-i-make-a-default-route)

</details>

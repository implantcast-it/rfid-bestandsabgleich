# Installation und Starten

Für das Programm wurden hauptsächlich [Tauri](https://v2.tauri.app/) und [React](https://react.dev/) verwendet.

Tauri ist ein Rust Framework, was das Erstellen von Applikationen mit Hilfe von Web-Frontend Technologien ermöglicht.
Beim Erstellen des Programms wurde sich für Tauri entschieden, da das Framework einfach zu verstehen und kaum Wartungsarbeiten benötigt.  
React ist eine JavaScript Library für das Erstellen von Webapplikationen.

Im Allgemeinen ist die Applikation nichts Weiteres als eine Webseite, die auf dem Computer von der [nativen Webview](https://v2.tauri.app/security/) gerendert wird.  
Im Projekt-Ordner befindet sich eine package.json, welche unter dem Reiter „dependencies“ alle benötigten externen NPM Packages auflistet.

#### Wichtig sind hier vor allem die folgenden Packages:

| Package                   | Funktion                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| ag-grid-react             | AG Grid sorgt für die Darstellung der Tabellen im Editor.                                            |
| jspdf und jspdf-autotable | Diese zwei Packages ermöglichen das Erstellen der PDF für den Kunden zum Unterzeichnen.              |
| wouter                    | Wouter sorgt für das Routing (also das Navigieren) in der Applikation.                               |
| xlsx                      | XLSX ist das wichtigste Package und sorgt für das Auslesen der Dateien und Anfertigen des Abgleichs. |

Alle weiteren Packages dienen der Gestaltung des Frontends. Hier wurde außerdem mit [TailwindCSS](https://tailwindcss.com/) gearbeitet.

## 1. Schritt: Installation

Das Projekt von GitHub herunterladen (dafür wird Git benötigt)

```shell
  git clone https://github.com/implantcast-it/rfid-app-v3.git
```

In das Projekt-Verzeichnis wechseln

```shell
  cd rfid-app-v3-3
```

#### -> Für den nächsten Schritt wird [NodeJS mit NPM](https://nodejs.org/en) benötigt. Siehe "TIP" unten.

Nun werden die NPM Packages installiert

```shell
  npm install
```

> [!TIP]
> Um herauszufinden, ob Git, NPM und NodeJS erfolgreich installiert sind, können folgende Befehle in der Konsole
> (Eingabeaufforderung) ausgeführt werden:
>
> ```shell
> node -v
> npm -v
> git -v
> ```
>
> Jeder Befehl sollte eine Versionsnummer für das Tool zurückgeben.  
> Wurde das Tool (z.B. NodeJS) gerade erst installiert, kann es hilfreich sein, die Konsole neuzustarten.

## 2. Schritt: Starten (Entwicklungsumgebung)

Um den Emulator (das Programm) für das Weiterentwickeln zu starten, wird folgender Befehl in der Konsole ausgeführt

```shell
  npm run tauri dev
```

Der Befehl startet eine Entwicklungsumgebung mit einem Emulator für das Programm.  
Dieser Emulator unterstützt Hot Reload - wird etwas am Source Code verändert, wird die Änderung direkt angezeigt.

## 3. Schritt: Build

Um das Programm zu kompilieren wird der folgende Befehl ausgeführt

```shell
  npm run tauri build
```

Das kompilierte Programm (.exe) befindet sich unter "\src-tauri\target\release".

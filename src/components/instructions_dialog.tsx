import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

import { HelpCircleIcon } from "lucide-react";

export default function InstructionsDialog({ icon }: { icon?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger className='w-full text-zinc-500 text-xs hover:underline'>
        {icon ? (
          <HelpCircleIcon
            size={18}
            className='text-zinc-500 hover:text-[#006860] cursor-pointer'
          />
        ) : (
          "Etwas funktioniert nicht - Anleitung"
        )}
      </DialogTrigger>
      <DialogContent className='text-sm'>
        <DialogHeader>
          <DialogTitle className='text-2xl'>Bedienungsanleitung</DialogTitle>
          <DialogDescription>
            Hier finden Sie eine Anleitung zur Bedienung des Programms, sowie
            Kontaktdaten bei Problemen und Fragen zum Tool.
          </DialogDescription>
        </DialogHeader>
        <p className='bg-zinc-50 p-2 border'>
          ! Das Programm kann ohne Installation ausgeführt werden. Die Anwendung
          kann somit auch problemlos <b>intern</b> geteilt werden.
        </p>
        <div className='space-y-2'>
          <h2 className='font-medium text-lg'>Vorbereitung</h2>
          <ul className='space-y-2 pl-4 list-decimal'>
            <li>
              <p className='font-medium'>
                Kundenspezifische Inventur-Master Datei{" "}
              </p>
              Die Datei muss im Excel-Format vorliegen und mindestens die
              Blätter "GTIN", "Ax-Bestand", "RFID-Scan", "Barcode-Scan",
              "Vergleich der Scans", "Bestandsabgleich LotId" und
              "Bestandsabgleich Artikelnummer" enthalten. Diese dürfen auch
              nicht anders benannt werden.
            </li>
            <li>
              <p className='font-medium'>ERP-Eigenbestand</p>
              Der Eigenbestand wird als Excel-Datei von der Marketing-Abteilung
              angelegt. Die Datei muss im Vorfeld angefragt werden. Sie enthält
              alle verfügbaren Produkte. Wichtig sind die Felder:
              "Debitorenkonto", "Produktname", "Ablaufdatum", "Artikelnummer",
              "LotId" und "Eigenbestand nach ERP".
            </li>
            <li>
              <p className='font-medium'>Barcode-Scan</p>
              Ein Barcode-Scan erfolgt durch das manuelle Einscannen von
              Produkten mit einem Handscanner. Die Daten werden in einer
              TXT-Datei gespeichert. Das Schema der Daten ist besonders wichtig:
              <br />
              <em>ZAHL;DATUM;--------EAN--------;36-stellige Zahl mit @</em>
            </li>
            <li>
              <p className='font-medium'>RFID-Scan</p>
              Der RFID-Scan erfolgt durch das Einscanner der Produkte mit einem
              RFID-Scanner. Dieser erfasst die Produkte automatisch in der
              Umgebung, ohne das manuelle Einlesen eines Codes. Siehe
              Arbeitsanweisung <em>AXXX</em>.<br />
              Die Datei wird als TXT-Datei gespeichert.
            </li>
          </ul>
          <h2 className='font-medium text-lg'>Bedienung</h2>
          <ul className='space-y-2 pl-4 list-decimal'>
            <li>
              <p className='font-medium'>Hochladen der Dateien</p>
              Beim Starten des Programms werden Sie Schritt für Schritt durch
              die Bedienung geführt. Laden Sie die gefragte Datei hoch. Sie
              können jederzeit Dateien ändern, indem Sie auf den entsprechenden
              Schritt drücken.
            </li>
            <li>
              <p className='font-medium'>Download</p>
              Im Schritt sechs können Sie die Datei direkt herunterladen oder
              den Editor öffnen. Der Editor ermöglicht es Ihnen, die Daten zu
              bearbeiten und zu speichern. Die Datei wird im Excel-Format
              heruntergeladen und ist in Ihrem Download-Verzeichnis zu finden.
              Wenn die zwei Buttons ausgegraut sind, wurden noch nicht alle
              Dateien hochgeladen. Bitte überprüfen Sie die Schritte.
            </li>
            <li>
              <p className='font-medium'>Editor</p>
              Der Editor dient dem Überprüfen und Bearbeiten der Daten. Sie
              können Daten nur im Tabellenblatt "Artikelnummer" bearbeiten. Die
              anderen Tabellen sind gesperrt. Mit dem Button Abschließen lässt
              sich die Datei herunterladen. Das ic-Icon auf der rechten Seite
              schließt den Editor und startet den kompletten Vorgang neu.
            </li>
            <li>
              <p className='font-medium'>Farben</p>
              Die Farben in der Tabelle haben folgende Bedeutung:
              <br />
              <div className='flex gap-x-2'>
                <span className='font-medium text-green-600'>Grün:</span>Die
                Summe der erfassten Produkte beim RFID-Scan gleicht dem Bestand
                laut ERP-System &rarr; i.d.R. kein Handlungsbedarf
              </div>
              <div className='flex gap-x-2'>
                <span className='font-medium text-yellow-600'>Gelb:</span>Laut
                ERP-System sollte/n kein/weniger Produkt/e beim Kunden sein, als
                beim RFID-Scan erfasst &rarr; ggf. Abholung/Rücksendung
                initialisieren
              </div>
              <div className='flex gap-x-2'>
                <span className='font-medium text-red-600'>Rot:</span>Laut
                ERP-System sollten mehr Produkte beim Kunden sein, als beim
                RFID-Scan erfasst &rarr; ggf. Nachlieferung initialisieren
              </div>
            </li>
            <li>
              <p className='font-medium'>Bestandsabgleich Artikelnummer</p>
              Im Editor lassen sich die Daten der Tabelle "Bestandsabgleich
              Artikelnummer" bearbeiten. Die Spalten "Nachliefern" und
              "Abholung" können ausgefüllt werden.
            </li>
          </ul>
        </div>
        <DialogFooter className='mt-2'>
          <DialogClose className='inline-flex justify-center items-center bg-zinc-900 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:hover:bg-zinc-50/90 disabled:opacity-50 p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 ring-offset-white focus-visible:ring-offset-2 dark:ring-offset-zinc-950 w-full font-medium text-zinc-50 dark:text-zinc-900 text-sm whitespace-nowrap transition-colors disabled:pointer-events-none'>
            Schließen
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

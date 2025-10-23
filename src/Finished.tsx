import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

import { Button } from "./components/ui/button";
import { downloadFile } from "./lib/compare";
import { exporToPDF } from "./lib/pdfCreator";
import { useLocation } from "wouter";
import { writeFileXLSX } from "xlsx";

export default function Finished() {
  const data = history.state;
  const [, setLocation] = useLocation();

  if (!data) {
    setLocation("/");
    return null;
  }

  return (
    <div className='place-items-center grid h-screen'>
      <div>
        <Card className='mx-auto max-w-2xl'>
          <CardHeader>
            <CardTitle>Download</CardTitle>
            <CardDescription>
              Der Abgleich wurde erfolgreich abgeschlossen und die Dateien
              gespeichert. Die PDF beinhaltet den LotID Vergleich mit
              hinzugefügten Kommentaren und einem Unterschrift-Feld für den
              Endkunden und den Außendienst.
            </CardDescription>
          </CardHeader>
          <CardContent className='-mt-2'>
            <div className='gap-x-4 gap-y-2 grid grid-cols-3 grid-flow-row'>
              <Button
                className='w-full'
                variant={"outline"}
                onClick={() => setLocation("/editor", { state: data })}
              >
                Zurück zum Editor
              </Button>
              <Button
                className='w-full'
                variant={"outline"}
                onClick={() => exporToPDF(data)}
              >
                PDF herunterladen
              </Button>
              <Button
                onClick={() => {
                  data &&
                    writeFileXLSX(
                      downloadFile(data.master),
                      `[${
                        data.debitor
                      }] Bestandsabgleich ${new Date().toLocaleDateString()}.xlsx`,
                      {
                        bookType: "xlsx",
                        type: "file",
                      }
                    );
                }}
                className='w-full'
              >
                Excel herunterladen
              </Button>
            </div>
          </CardContent>
        </Card>
        <Button
          type='reset'
          variant={"link"}
          onClick={() => {
            setLocation("/");
          }}
          className='mx-auto mt-4 w-full max-w-2xl'
        >
          Abgleich neustarten
        </Button>
      </div>
    </div>
  );
}

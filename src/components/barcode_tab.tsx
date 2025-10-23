import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import { Button } from "./ui/button";
import { FilePlusIcon } from "lucide-react";
import { TabsContent } from "./ui/tabs";

export default function BarcodeTab({
  setPath,
  barcodePath,
  skipPath,
}: {
  setPath: () => void;
  barcodePath: string;
  skipPath: () => void;
}) {
  return (
    <TabsContent value='3'>
      <Card>
        <CardHeader>
          <CardTitle>Manueller Barcode Scan (optional)</CardTitle>
          <CardDescription>
            Bitte laden Sie im dritten Schritt den Barcode-Scan als TXT Datei
            hoch. Diese Datei erhalten Sie durch das manuelle Einlesen der
            Barcodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant='outline'
            className='place-items-center grid py-4 w-full h-fit'
            onClick={setPath}
          >
            <FilePlusIcon className='stroke-[0.75] size-10 text-zinc-600' />
            Datei hochladen
          </Button>
          <p className='mt-2 max-w-xl text-zinc-500 text-xs truncate'>
            {barcodePath || "Keine Datei ausgewählt"}
          </p>
          <div className='flex justify-end w-full'>
            <Button variant='default' onClick={skipPath} className=''>
              Überspringen
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

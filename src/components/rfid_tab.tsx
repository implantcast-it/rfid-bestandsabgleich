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

export default function RfidTab({
  setPath,
  rfidPath,
}: {
  setPath: () => void;
  rfidPath: string;
}) {
  return (
    <TabsContent value='4'>
      <Card>
        <CardHeader>
          <CardTitle>RFID-Handheld-Scan</CardTitle>
          <CardDescription>
            Bitte laden Sie im dritten Schritt den Scan des RFID-Handhelds als
            TXT Datei hoch. Diese Datei erhalten Sie nach abgeschlossener
            Inventur beim Kunden vom Handheld.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant='outline'
            className='place-items-center grid py-4 w-full h-fit'
            onClick={setPath}
          >
            <FilePlusIcon className='text-zinc-600 size-10 stroke-[0.75]' />
            Datei hochladen
          </Button>
          <p className='mt-2 max-w-xl text-xs text-zinc-500 truncate'>
            {rfidPath || "Keine Datei ausgewählt"}
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

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

export default function MasterTab({
  setPath,
  masterPath,
}: {
  setPath: () => void;
  masterPath: string;
}) {
  return (
    <TabsContent value='1'>
      <Card>
        <CardHeader>
          <CardTitle>Inventur-Master Excel</CardTitle>
          <CardDescription>
            Bitte laden Sie im ersten Schritt die Excel Master Datei hoch. Diese
            Datei ist kundenspezifisch und sollte im Vorfeld vorbereitet werden!
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
            {masterPath || "Keine Datei ausgewählt"}
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

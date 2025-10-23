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

export default function ErpTab({
  setPath,
  ErpTab,
}: {
  setPath: () => void;
  ErpTab: string;
}) {
  return (
    <TabsContent value='2'>
      <Card>
        <CardHeader>
          <CardTitle>ERP-Eigenbestand</CardTitle>
          <CardDescription>
            Bitte laden Sie im zweiten Schritt den Eigenbestand als Excel Datei
            hoch. Diese Datei erhalten Sie im vorraus von der
            Marketing-Abteilung.
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
            {ErpTab || "Keine Datei ausgewählt"}
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

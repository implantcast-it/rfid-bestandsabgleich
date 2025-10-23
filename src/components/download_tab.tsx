import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { compareFiles, downloadFile } from "@/lib/compare";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";
import { TabsContent } from "./ui/tabs";
import { exporToPDF } from "@/lib/pdfCreator";
import { useLocation } from "wouter";
import { writeFileXLSX } from "xlsx";

export default function DownloadTab({
  paths,
  active,
}: {
  paths: {
    master: string;
    erp: string;
    barcode?: string;
    rfid: string;
  };
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    compareFiles(paths)
      .then((res) => {
        setResult(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(true);
      });
  }, [paths, paths.barcode]);

  const fileName = (path: string) => {
    return path.substring(path.lastIndexOf("\\") + 1);
  };

  return (
    <TabsContent value='5'>
      <Card>
        <CardHeader>
          <CardTitle>Download</CardTitle>
          <CardDescription>
            Nach erfolgreichem hochladen aller Dateien können Sie den fertigen
            Bestandsabgleich als Excel-Datei herunterladen oder in einer
            Vorschau öffnen.
          </CardDescription>
        </CardHeader>
        <CardContent className='-mt-2'>
          <p className='mb-2 font-semibold'>
            Die folgenden Dateien wurden hochgeladen:{" "}
          </p>
          <ul className='space-y-2 mb-6'>
            <li>
              Inventurmaster-Excel:{" "}
              {paths.master ? (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  {fileName(paths.master)}
                </code>
              ) : (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  Keine Datei hochgeladen
                </code>
              )}
            </li>
            <li>
              Eigenbestand aus dem ERP:{" "}
              {paths.erp ? (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  {fileName(paths.erp)}
                </code>
              ) : (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  Keine Datei hochgeladen
                </code>
              )}
            </li>
            <li>
              Barcode-Scan:{" "}
              {paths.barcode ? (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  {fileName(paths.barcode)}
                </code>
              ) : (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  Keine Datei hochgeladen
                </code>
              )}
            </li>
            <li>
              RFID-Scan:{" "}
              {paths.rfid ? (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  {fileName(paths.rfid)}
                </code>
              ) : (
                <code className='bg-zinc-50 px-1 py-0.5 border border-zinc-200 rounded font-bold text-sm'>
                  Keine Datei hochgeladen
                </code>
              )}
            </li>
          </ul>
          <div className='gap-x-4 grid grid-cols-3 grid-flow-col'>
            <Button
              className='w-full'
              disabled={loading}
              variant={"outline"}
              onClick={() => setLocation("/editor", { state: result })}
            >
              Editor öffnen
            </Button>
            <Button
              className='w-full'
              disabled={loading}
              variant={"outline"}
              onClick={() => exporToPDF(result.data)}
            >
              PDF herunterladen
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                result &&
                  writeFileXLSX(
                    downloadFile(result.data.master),
                    `[${
                      result.data.debitor
                    }] Bestandsabgleich ${new Date().toLocaleDateString()}.xlsx`,
                    {
                      bookType: "xlsx",
                      type: "file",
                    }
                  );
              }}
              className='w-full'
            >
              {loading ? (
                <Loader2 className='animate-spin' />
              ) : (
                "Excel herunterladen"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

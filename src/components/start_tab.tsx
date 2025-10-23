import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

import { Button } from "./ui/button";
import { TabsContent } from "./ui/tabs";
import { loadComparisonFile } from "@/lib/compare";
import { navigate } from "wouter/use-browser-location";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";

export default function StartTab({ startUpload }: { startUpload: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleLoadComparison = async () => {
    const file = await open({
      title: "Abgleich-Datei auswählen",
      multiple: false,
      directory: false,
      filters: [{ name: "Excel", extensions: ["xlsx", "xls"] }],
    });

    if (!file) return;

    setLoading(true);
    try {
      const result = await loadComparisonFile(String(file));
      navigate("/editor", { state: result });
    } catch (error) {
      console.error("Fehler beim Einlesen:", error);
      alert("Ungültige Datei. Bitte wähle eine korrekte Vergleichsdatei aus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TabsContent value='0'>
      <Card>
        <CardHeader>
          <CardTitle>Bestandsabgleich Kundeninventur</CardTitle>
          <CardDescription>
            Dieses Tool dient dem Bestandsabgleich einer durchgeführten Inventur
            beim Kunden mit dem Eigenbestand nach unserem ERP.
          </CardDescription>
        </CardHeader>
        <CardContent className='-mt-2'>
          <p className='mb-2 font-medium'>
            Für einen erfolgreichen Bestandsabgleich benötigen Sie folgende
            Dateien:
          </p>
          <ul className='space-y-2 mb-6'>
            <li>
              Kunden-abhängige{" "}
              <code className='font-bold text-sm'>Inventurmaster-Excel</code>
            </li>
            <li>
              Tagesaktueller{" "}
              <code className='font-bold text-sm'>
                Eigenbestand aus dem ERP
              </code>
            </li>
            <li>
              Durchgeführter{" "}
              <code className='font-bold text-sm'>Barcode-Scan</code>
            </li>
            <li>
              Durchgeführter{" "}
              <code className='font-bold text-sm'>RFID-Scan</code>
            </li>
          </ul>
          <div className='flex items-center gap-4 *:w-full'>
            <Button onClick={startUpload}>Neuer Abgleich starten</Button>
            <Button
              onClick={handleLoadComparison}
              disabled={loading}
              variant='outline'
            >
              {loading ? "Wird geladen..." : "Abgleich einlesen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

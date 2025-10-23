import { Link, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useEffect, useState } from "react";

import ArtNrTable from "./components/tables/artNr_table";
import BarcodeTable from "./components/tables/barcode_table";
import { Button } from "./components/ui/button";
import ErpTable from "./components/tables/erp_table";
import InstructionsDialog from "./components/instructions_dialog";
import LotIdTable from "./components/tables/lotid_table";
import RfidTable from "./components/tables/rfid_table";
import ScanTable from "./components/tables/scan_table";
import { ToastProvider } from "./hooks/ToastProvider";
import { utils } from "xlsx";

export default function Editor() {
  const data = history.state.data ? history.state.data : history.state;
  const [, setLocation] = useLocation();

  if (!data) {
    setLocation("/");
    return null;
  }

  const [artNrData, _] = useState(
    utils.sheet_to_json(data.master.Sheets["Bestandsabgleich Artikelnummer"], {
      header: 0,
    })
  );

  const [lotIdData, setLotIdData] = useState(
    utils.sheet_to_json(data.master.Sheets["Bestandsabgleich LotId"], {
      header: 0,
    })
  );

  useEffect(() => {
    data.master.Sheets["Bestandsabgleich Artikelnummer"] =
      utils.json_to_sheet(artNrData);
  }, [artNrData]);

  useEffect(() => {
    data.master.Sheets["Bestandsabgleich LotId"] =
      utils.json_to_sheet(lotIdData);
  }, [lotIdData]);

  return (
    <ToastProvider>
      <Tabs className='bg-zinc-50' defaultValue='0'>
        <TabsList className='flex justify-between bg-white px-2 py-6 border-b rounded-none w-full'>
          <div className='flex gap-2'>
            <Link
              href='/'
              title='Zurück zur Startseite - Prozess neustarten'
              className='self-center bg-zinc-800 hover:bg-[#006860] p-0.5 size-8 !font-bold text-white text-center'
            >
              ic
            </Link>
            <div className='flex gap-x-6 ml-2 *:font-normal'>
              <div className='flex'>
                <p className='self-center mr-2 !font-bold text-zinc-700'>
                  Bestände:
                </p>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='0'
                >
                  ERP
                </TabsTrigger>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='1'
                >
                  Barcode
                </TabsTrigger>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='2'
                >
                  RFID
                </TabsTrigger>
              </div>
              <div className='flex'>
                <p className='self-center mr-2 !font-bold text-zinc-700'>
                  Vergleiche:
                </p>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='3'
                >
                  Scan
                </TabsTrigger>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='4'
                >
                  LotId
                </TabsTrigger>
                <TabsTrigger
                  className='data-[state=active]:bg-transparent !shadow-none data-[state=active]:font-medium data-[state=active]:text-zinc-800 data-[state=active]:underline underline-offset-2'
                  value='5'
                >
                  ArtNr
                </TabsTrigger>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <InstructionsDialog icon />
            <Button
              className='px-2 py-1 rounded-none font-medium text-zinc-800 text-sm underline text-nowrap hover:scale-105 transition-all'
              variant={"link"}
              onClick={() => setLocation("/finished", { state: data })}
            >
              Zum Download
            </Button>
          </div>
        </TabsList>
        <div className='px-2'>
          <ErpTable data={data.master.Sheets["Ax-Bestand"]} />
          <BarcodeTable data={data.master.Sheets["Barcode-Scan"]} />
          <RfidTable data={data.master.Sheets["RFID-Scan"]} />
          <ScanTable data={data.master.Sheets["Vergleich der Scans"]} />
          <LotIdTable data={lotIdData} onChange={setLotIdData} />
          <ArtNrTable data={artNrData} />
        </div>
      </Tabs>
    </ToastProvider>
  );
}

import { TabsList, TabsTrigger } from "./ui/tabs";

import { CheckIcon } from "lucide-react";

const tabs = [
  "Start",
  "Inventur-Master",
  "ERP-Bestand",
  "Barcode-Scan",
  "RFID-Scan",
  "Download",
];

export default function UploadStepper({
  paths,
}: {
  paths: {
    master: string;
    erp: string;
    barcode: string;
    rfid: string;
  };
}) {
  let isDisabled = paths.erp == "" || paths.master == "" || paths.rfid == "";

  return (
    <TabsList className='relative space-x-6 mb-8 w-full'>
      {tabs.map((tab, index) => (
        <div
          key={index}
          className='place-items-center gap-x-6 grid grid-flow-col'
        >
          <TabsTrigger
            value={index.toString()}
            className='relative bg-zinc-50 border rounded-full w-10 h-10 text-lg hover:scale-105 transition-all'
            title={tab}
            disabled={tab == "Download" && isDisabled}
          >
            {Object.values(paths)[index - 1] ? <CheckIcon /> : index + 1}
            <p className='-bottom-6 absolute text-zinc-500 text-xs'>{tab}</p>
          </TabsTrigger>

          {index !== tabs.length - 1 && (
            <span className='border-zinc-200 border-t w-8' />
          )}
        </div>
      ))}
    </TabsList>
  );
}

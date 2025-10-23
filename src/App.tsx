import BarcodeTab from "./components/barcode_tab";
import DownloadTab from "./components/download_tab";
import ErpTab from "./components/erp_tab";
import InstructionsDialog from "./components/instructions_dialog";
import MasterTab from "./components/master_tab";
import RfidTab from "./components/rfid_tab";
import StartTab from "./components/start_tab";
import { Tabs } from "./components/ui/tabs";
import UploadStepper from "./components/upload_stepper";
import { open } from "@tauri-apps/api/dialog";
import { useState } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState("0");
  const [paths, setPaths] = useState<{
    master: string;
    erp: string;
    barcode: string;
    rfid: string;
  }>({
    master: "",
    erp: "",
    barcode: "",
    rfid: "",
  });

  const selectPath = async (
    type: Array<{ name: string; extensions: Array<string> }>
  ) => {
    return await open({
      title: "Bitte Datei auswählen",
      multiple: false,
      directory: false,
      filters: type,
    }).then((path) => {
      if (path === null) return "";
      return String(path);
    });
  };

  return (
    <div className='place-items-center grid h-screen'>
      <Tabs
        defaultValue='0'
        className='mx-auto max-w-2xl'
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
      >
        <UploadStepper paths={paths} />
        <StartTab startUpload={() => setActiveTab("1")} />
        <MasterTab
          masterPath={paths.master}
          setPath={() =>
            selectPath([{ name: "Excel", extensions: ["xlsx", "xls"] }]).then(
              (path) => {
                if (path) {
                  setPaths({ ...paths, master: path });
                  setActiveTab("2");
                }
              }
            )
          }
        />
        <ErpTab
          ErpTab={paths.erp}
          setPath={() =>
            selectPath([{ name: "Excel", extensions: ["xlsx", "xls"] }]).then(
              (path) => {
                if (path) {
                  setPaths({ ...paths, erp: path });
                  setActiveTab("3");
                }
              }
            )
          }
        />
        <BarcodeTab
          barcodePath={paths.barcode}
          setPath={() =>
            selectPath([{ name: "Text", extensions: ["txt"] }]).then((path) => {
              if (path !== "") {
                setPaths({ ...paths, barcode: path });
              }
              setActiveTab("4"); // Always move to next tab
            })
          }
          skipPath={() => setActiveTab("4")} // optional skip button
        />
        <RfidTab
          rfidPath={paths.rfid}
          setPath={() =>
            selectPath([{ name: "Text", extensions: ["txt"] }]).then((path) => {
              if (path) {
                setPaths({ ...paths, rfid: path });
                setActiveTab("5");
              }
            })
          }
        />
        <DownloadTab paths={paths} active={activeTab == "5"} />
        <div className='mt-4'>
          <InstructionsDialog />
        </div>
      </Tabs>
    </div>
  );
}

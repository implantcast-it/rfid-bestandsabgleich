import * as AlertDialog from "@radix-ui/react-alert-dialog";

import RestartAltIcon from "@mui/icons-material/RestartAlt";

export default function RestartDialog({
  onRestart,
  isCollapsed,
}: {
  onRestart: () => void;
  isCollapsed?: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className='inline-flex justify-center items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 px-[15px] rounded outline-none focus-visible:outline-2 focus-visible:outline-gray-800 outline-offset-1 h-[35px] font-medium text-gray-800 dark:text-gray-200 text-nowrap leading-none select-none'>
          {!isCollapsed ? "Prozess neustarten" : <RestartAltIcon />}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className='z-40 fixed inset-0 bg-black/60 dark:bg-black/80 data-[state=open]:animate-overlayShow' />
        <AlertDialog.Content className='top-1/2 left-1/2 z-50 fixed bg-gray-50 dark:bg-gray-900 shadow-[var(--shadow-6)] p-[25px] rounded-md focus:outline-none w-[90vw] max-w-[500px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-contentShow'>
          <AlertDialog.Title className='m-0 font-bold text-primary dark:text-gray-200 text-lg'>
            Bist du dir sicher, dass du neustarten willst?
          </AlertDialog.Title>
          <AlertDialog.Description className='mt-3 mb-5 dark:text-gray-400 text-sm leading-normal'>
            Diese Aktion wird den aktuellen Prozess abbrechen und alle nicht
            heruntergaldenen Daten löschen. Du verlierst den gesamten
            Fortschritt.
          </AlertDialog.Description>
          <div className='flex justify-end gap-4'>
            <AlertDialog.Cancel asChild>
              <button className='inline-flex justify-center items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-[15px] rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-gray-800 outline-offset-1 h-[35px] font-medium dark:text-gray-300 leading-none select-none'>
                Abbrechen
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={() => onRestart()}
                className='inline-flex justify-center items-center bg-red-100 hover:bg-red-200 dark:bg-red-700/40 dark:hover:bg-red-700/60 px-[15px] rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-red-500 outline-offset-1 h-[35px] font-medium text-red-500 dark:text-red-500/90 leading-none select-none'
              >
                Ja, neustarten
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

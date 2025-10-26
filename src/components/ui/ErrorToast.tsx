import * as Toast from "@radix-ui/react-toast";

import CloseIcon from "@mui/icons-material/Close";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";

/**
 * A styled Radix Toast component for showing errors.
 * @param {object} props
 * @param {boolean} props.open - Whether the toast is open.
 * @param {(open: boolean) => void} props.onOpenChange - Function to call when open state changes.
 * @param {string} props.title - The title of the toast.
 * @param {string} props.description - The body text of the toast.
 */
export default function ErrorToast({
  open,
  onOpenChange,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <Toast.Root
      className="items-center gap-x-4 grid grid-cols-[auto_max-content] bg-white dark:bg-gray-800 shadow-lg p-4 rounded-lg data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-hide data-[state=open]:animate-slideIn data-[swipe=end]:animate-swipeOut [grid-template-areas:_'title_action'_'description_action']"
      open={open}
      onOpenChange={onOpenChange}
      duration={5000}
    >
      <div className='flex items-center gap-3'>
        <ReportProblemOutlinedIcon className='text-red-500' />
        <div>
          <Toast.Title className='mb-1 font-semibold text-gray-900 text-md dark:text-white [grid-area:_title]'>
            {title}
          </Toast.Title>
          <Toast.Description asChild>
            <p className='m-0 text-gray-600 dark:text-gray-300 text-sm [grid-area:_description]'>
              {description}
            </p>
          </Toast.Description>
        </div>
      </div>
      <Toast.Close
        className='self-start hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full text-gray-500 transition-colors [grid-area:_action]'
        aria-label='Schließen'
      >
        <CloseIcon style={{ fontSize: 20 }} />
      </Toast.Close>
    </Toast.Root>
  );
}

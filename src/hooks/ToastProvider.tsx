import * as ToastPrimitive from "@radix-ui/react-toast";

import React, { createContext, useContext, useState } from "react";

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = (msg: string) => {
    setMessage(msg);
    setOpen(true);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastPrimitive.Provider swipeDirection='right'>
        <ToastPrimitive.Root
          open={open}
          onOpenChange={setOpen}
          duration={5000}
          className='bg-black shadow-lg px-4 py-2 rounded-md text-white'
        >
          <ToastPrimitive.Title>{message}</ToastPrimitive.Title>
          <ToastPrimitive.Action
            altText='Close'
            className='font-bold cursor-pointer'
            onClick={() => setOpen(false)}
          >
            OK
          </ToastPrimitive.Action>
        </ToastPrimitive.Root>
        <ToastPrimitive.Viewport className='right-0 bottom-0 z-[1000] fixed flex flex-col gap-2 p-4 w-[320px] max-w-full' />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

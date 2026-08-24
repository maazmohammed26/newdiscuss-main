import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        duration: 3200,
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-black/10 dark:!border-white/10 !bg-white/95 dark:!bg-[#171717]/95 !px-4 !py-3 !text-[13px] !font-semibold !text-neutral-900 dark:!text-white !shadow-[0_14px_45px_rgba(0,0,0,.16)] !backdrop-blur-xl",
          description: "!text-neutral-500 dark:!text-neutral-400 !font-medium",
          actionButton:
            "!rounded-xl !bg-[#0095F6] !text-white !font-bold",
          cancelButton:
            "!rounded-xl !bg-neutral-100 dark:!bg-neutral-800 !text-neutral-700 dark:!text-neutral-200",
        },
      }}
      visibleToasts={3}
      mobileOffset={{ top: 14, left: 12, right: 12 }}
      {...props} />
  );
}

export { Toaster, toast }

import type { PropsWithChildren } from "react";

export function Underline({ children }: PropsWithChildren) {
  return (
    <span className="group transition-all duration-300 ease-in-out">
      <span className="bg-bottom-right bg-linear-to-l bg-size-[0%_2px] from-red-600 to-red-600 bg-no-repeat pb-1 transition-all duration-500 ease-out group-hover:bg-[length:100%_2px]">
        {children}
      </span>
    </span>
  );
}

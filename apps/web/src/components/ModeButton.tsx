import type { ReactNode } from "react";

type ModeButtonProps = {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
};

export default function ModeButton({ active, children, onClick }: ModeButtonProps) {
  return (
    <button
      className={`rounded-md px-3 py-2 font-mono text-sm transition ${
        active ? "bg-[#0e639c] text-white" : "text-[#cccccc]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

import type { ReactNode } from "react";

type TopLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  mobile?: boolean;
};

export default function TopLink({ href, label, icon, mobile }: TopLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm font-medium text-[#cccccc] transition hover:bg-[#37373d] ${
        mobile ? "w-full justify-start" : ""
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

import { BookOpen, Braces, Github, Linkedin, Menu, X } from "lucide-react";
import TopLink from "./TopLink";

type HeaderProps = {
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  setDetailsOpen: (value: boolean) => void;
};

export default function Header({ menuOpen, setMenuOpen, setDetailsOpen }: HeaderProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-[#2d2d30] bg-[#181818]/90 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#3c3c3c] bg-[#252526] text-[#cccccc] md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            type="button"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0e639c] text-white shadow-sm">
              <Braces size={18} />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.28em] text-[#4fc1ff]">
                AuraCode
              </div>
              <div className="text-sm text-[#8c8c8c]">Personal DSA IDE</div>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <TopLink href="https://www.linkedin.com" label="LinkedIn" icon={<Linkedin size={16} />} />
          <TopLink href="https://github.com" label="GitHub" icon={<Github size={16} />} />
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm font-medium text-[#cccccc] transition hover:bg-[#37373d]"
            onClick={() => setDetailsOpen(true)}
            type="button"
          >
            <BookOpen size={16} />
            Details
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-[#2d2d30] bg-[#181818] transition-all duration-300 md:hidden ${
          menuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-2 p-4">
          <TopLink href="https://www.linkedin.com" label="LinkedIn" icon={<Linkedin size={16} />} mobile />
          <TopLink href="https://github.com" label="GitHub" icon={<Github size={16} />} mobile />
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm font-medium text-[#cccccc]"
            onClick={() => {
              setDetailsOpen(true);
              setMenuOpen(false);
            }}
            type="button"
          >
            <BookOpen size={16} />
            Project Details
          </button>
        </div>
      </div>
    </nav>
  );
}

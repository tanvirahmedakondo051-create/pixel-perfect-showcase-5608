import { Link } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-en font-bold ${className}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand shadow-glow">
        <Hexagon className="size-5 text-primary-foreground" strokeWidth={2.5} />
      </span>
      <span className="text-lg tracking-tight">
        Hexa <span className="text-brand">AI</span>
      </span>
    </Link>
  );
}

export function Orbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="orb left-[-80px] top-[-60px] size-72 bg-primary" />
      <div className="orb right-[-60px] top-40 size-64 bg-cyan" style={{ animationDelay: "-4s" }} />
      <div className="orb bottom-[-80px] left-1/3 size-80 bg-primary/70" style={{ animationDelay: "-8s" }} />
    </div>
  );
}

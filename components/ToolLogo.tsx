/* Monochrome tool marks. Official SVGs are recoloured to white (black in the light theme, via --mark-filter) only (see public/logos/SOURCES.md);
   tools without an obtainable official SVG use a plain wordmark tile. Marks indicate compatibility only. */
const FILES: Record<string, { src: string; filter: string }> = {
  Rhino: { src: "/logos/rhino.svg", filter: "brightness(0) invert(1)" },
  Blender: { src: "/logos/blender.svg", filter: "brightness(0) invert(1)" },
  Revit: { src: "/logos/revit.svg", filter: "brightness(0) invert(1)" },
  Grasshopper: { src: "/logos/grasshopper.svg", filter: "brightness(0) invert(1)" },
  "Autodesk Dynamo": { src: "/logos/dynamo.svg", filter: "grayscale(1) brightness(1.9) contrast(1.05)" },
  Dynamo: { src: "/logos/dynamo.svg", filter: "grayscale(1) brightness(1.9) contrast(1.05)" },
};

export function ToolLogo({ name, className = "size-6", dark = false, wordSize = "0.4em" }: { name: string; className?: string; dark?: boolean; wordSize?: string }) {
  const f = FILES[name];
  if (f) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={f.src} alt="" aria-hidden="true" draggable={false} className={`${className} tool-mark shrink-0 object-contain`} style={{ filter: dark ? "brightness(0)" : `var(--mark-filter, ${f.filter})` }} />
    );
  }
  // wordmark tile (no official SVG used)
  const word = name.replace(/ Complete$/, "");
  return (
    <span aria-hidden="true" className={`${className} inline-flex shrink-0 items-center justify-center rounded-[22%] border font-semibold leading-none tracking-tight ${dark ? "border-black/70 text-black" : "border-fg/70 text-fg"}`} style={{ fontSize: wordSize }}>
      {word.slice(0, 2).toUpperCase()}
    </span>
  );
}

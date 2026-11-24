import type { AnchorHTMLAttributes, ReactNode } from "react";

/** next/link na versão estática: um <a>; caminhos "/x" passam a "#/x". */
export default function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  const to = href.startsWith("/") ? `#${href}` : href;
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

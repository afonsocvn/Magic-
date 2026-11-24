/** next/navigation na versão estática: rotas no hash (#/deck?d=…). */
function parts() {
  const h = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = h.split("?");
  return { path: path || "/", query };
}

export function usePathname(): string {
  return parts().path;
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(parts().query);
}

export function useRouter() {
  const go = (url: string) => {
    window.location.hash = url.startsWith("#") ? url : `#${url}`;
  };
  return { replace: go, push: go, refresh: () => {}, back: () => history.back() };
}

export function notFound(): never {
  throw new Error("Página não encontrada");
}

export function redirect(url: string): never {
  window.location.hash = url;
  throw new Error("redirect");
}

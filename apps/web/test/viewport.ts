import { afterEach } from "vitest";

// jsdom doesn't define matchMedia; remember whatever is there so it can be put back
const original = Object.getOwnPropertyDescriptor(window, "matchMedia");

/**
 * Makes `matchMedia` answer width queries as if the window were `width`
 * pixels wide, so components using MUI's useMediaQuery render their phone or
 * desktop layout. jsdom has no layout, so without this every query is false.
 */
export function setViewportWidth(width: number): void {
  window.matchMedia = (query: string): MediaQueryList => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const matches = (!min || width >= Number(min[1])) && (!max || width <= Number(max[1])) && Boolean(min || max);
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    };
  };
}

export const PHONE = 390;
export const DESKTOP = 1280;

afterEach(() => {
  if (original) Object.defineProperty(window, "matchMedia", original);
  else Reflect.deleteProperty(window, "matchMedia");
});

import en from "../locales/en.json";
import uk from "../locales/uk.json";
import pl from "../locales/pl.json";
import de from "../locales/de.json";
import fr from "../locales/fr.json";
import it from "../locales/it.json";
import es from "../locales/es.json";

type Lang = "uk" | "pl" | "en" | "fr" | "de" | "es" | "it";
const translations: Record<Lang, Record<string, string>> = {
  en,
  uk,
  pl,
  fr,
  de,
  es,
  it,
};

// Функція для перекладу
export function t(
  lang: Lang,
  key: string,
  vars: Record<string, string | number> = {}
): string {
  const text = translations[lang][key] || key;
  return Object.keys(vars).reduce(
    (str, v) => str.replace(`{{${v}}}`, String(vars[v])),
    text
  );
}

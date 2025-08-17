export function getSexFromText(text: string, lang: string): string | null {
  // Перетворення тексту на малий регістр для уникнення помилок
  text = text.toLowerCase();


  switch (lang) {
    case "en":
      if (text === "male" || text === "boy") {
        return "1"; // чоловік
      } else if (text === "female" || text === "girl") {
        return "2"; // жінка
      }
      break;

    case "uk":
      if (text === "чоловік" || text === "хлопець") {
        return "1"; // чоловік
      } else if (text === "жінка" || text === "дівчина") {
        return "2"; // жінка
      }
      break;

    case "fr":
      if (text === "homme" || text === "garçon") {
        return "1"; // homme (чоловік)
      } else if (text === "femme" || text === "fille") {
        return "2"; // femme (жінка)
      }
      break;

    case "it":
      if (text === "maschio" || text === "ragazzo") {
        return "1"; // maschio (чоловік)
      } else if (text === "femmina" || text === "ragazza") {
        return "2"; // femmina (жінка)
      }
      break;

    case "de":
      if (text === "männlich" || text === "junge") {
        return "1"; // männlich (чоловік)
      } else if (text === "weiblich" || text === "mädchen") {
        return "2"; // weiblich (жінка)
      }
      break;

    case "es":
      if (text === "hombre" || text === "chico") {
        return "1"; // hombre (чоловік)
      } else if (text === "mujer" || text === "chica") {
        return "2"; // mujer (жінка)
      }
      break;
    case "pl":
      if (text === "Chłopak" || text === "chłopak") {
        return "1"; // hombre (чоловік)
      } else if (text === "Dziewczyna" || text === "dziewczyna") {
        return "2"; // mujer (жінка)
      }
      break;

    default:
      return null; // Якщо мова не підтримується або текст некоректний
  }



  return null; // Якщо введено некоректний текст
}
export function getSexText(sex: string, lang: string): string | null {
  switch (lang) {
    case "en":
      if (sex === "1") {
        return "male"; // чоловік
      } else if (sex === "2") {
        return "female"; // жінка
      }
      break;

    case "uk":
      if (sex === "1") {
        return "Хлопець"; // чоловік
      } else if (sex === "2") {
        return "Дівчина"; // жінка
      }
      break;

    case "fr":
      if (sex === "1") {
        return "homme"; // homme (чоловік)
      } else if (sex === "2") {
        return "femme"; // femme (жінка)
      }
      break;

    case "it":
      if (sex === "1") {
        return "maschio"; // maschio (чоловік)
      } else if (sex === "2") {
        return "femmina"; // femmina (жінка)
      }
      break;

    case "de":
      if (sex === "1") {
        return "männlich"; // männlich (чоловік)
      } else if (sex === "2") {
        return "weiblich"; // weiblich (жінка)
      }
      break;

    case "es":
      if (sex === "1") {
        return "hombre"; // hombre (чоловік)
      } else if (sex === "2") {
        return "mujer"; // mujer (жінка)
      }
      break;

    case "es":
      if (sex === "1") {
        return "chłopak"; // hombre (чоловік)
      } else if (sex === "2") {
        return "dziewczyna"; // mujer (жінка)
      }
      break;

    default:
      return null; // Якщо мова не підтримується або значення некоректне
  }

  return null; // Якщо введено некоректне значення
}

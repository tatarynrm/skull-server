export function getLookingForFromText(
  text: string,
  lang: string
): string | null {
  // Перетворення тексту на малий регістр для уникнення помилок
  text = text;

  switch (lang) {
    case "en":
      if (text === "A boy" || text === "male") {
        return "1"; // хлопець
      } else if (text === "A girl" || text === "female") {
        return "2"; // дівчина
      } else if (text === "Anyone" || text === "anybody") {
        return "3"; // будь-хто
      }
      break;

    case "uk":
      if (text === "Хлопця") {
        return "1"; // хлопець
      } else if (text === "Дівчину") {
        return "2"; // дівчина
      } else if (text === "Будь кого" || text === "Будь кого") {
        return "3"; // будь-хто
      }
      break;

    case "fr":
      if (text === "Garçon" || text === "homme") {
        return "1"; // хлопець (garçon)
      } else if (text === "Fille" || text === "femme") {
        return "2"; // дівчина (fille)
      } else if (text === "N'importe qui") {
        return "3"; // будь-хто (n'importe qui)
      }
      break;

    case "it":
      if (text === "Ragazzo" || text === "maschio") {
        return "1"; // хлопець (ragazzo)
      } else if (text === "Ragazza" || text === "femmina") {
        return "2"; // дівчина (ragazza)
      } else if (text === "Chiunque") {
        return "3"; // будь-хто (chiunque)
      }
      break;

    case "de":
      if (text === "Ein Junge" || text === "männlich") {
        return "1"; // хлопець (junge)
      } else if (text === "Ein Mädchen" || text === "weiblich") {
        return "2"; // дівчина (mädchen)
      } else if (text === "Jemanden" || text === "irgendjemand") {
        return "3"; // будь-хто (jeder, irgendjemand)
      }
      break;

    case "es":
      if (text === "Chico" || text === "hombre") {
        return "1"; // хлопець (chico)
      } else if (text === "Chica" || text === "mujer") {
        return "2"; // дівчина (chica)
      } else if (text === "Cualquiera" || text === "alguien") {
        return "3"; // будь-хто (cualquiera)
      }
      break;

    case "pl":
      if (text === "Chłopaka" || text === "hombre") {
        return "1"; // хлопець (chico)
      } else if (text === "Dziewczynę" || text === "mujer") {
        return "2"; // дівчина (chica)
      } else if (text === "Kogoś" || text === "alguien") {
        return "3"; // будь-хто (cualquiera)
      }
      break;

    default:
      return null; // Якщо мова не підтримується або текст некоректний
  }

  return null; // Якщо введено некоректний текст
}

export function getLookingForText(
  lookingFor: string,
  lang: string
): string | null {
  switch (lang) {
    case "en":
      if (lookingFor === "1") {
        return "A Boy"; // хлопець
      } else if (lookingFor === "2") {
        return "A Girl"; // дівчина
      } else if (lookingFor === "3") {
        return "Anyone"; // будь-хто
      }
      break;

    case "uk":
      if (lookingFor === "1") {
        return "Хлопця"; // хлопець
      } else if (lookingFor === "2") {
        return "Дівчину"; // дівчина
      } else if (lookingFor === "3") {
        return "Будь кого"; // будь-хто
      }
      break;

    case "fr":
      if (lookingFor === "1") {
        return "Garçon"; // хлопець (garçon)
      } else if (lookingFor === "2") {
        return "Fille"; // дівчина (fille)
      } else if (lookingFor === "3") {
        return "N'importe qui"; // будь-хто (n'importe qui)
      }
      break;

    case "it":
      if (lookingFor === "1") {
        return "Ragazzo"; // хлопець (ragazzo)
      } else if (lookingFor === "2") {
        return "Ragazza"; // дівчина (ragazza)
      } else if (lookingFor === "3") {
        return "Chiunque"; // будь-хто (chiunque)
      }
      break;

    case "de":
      if (lookingFor === "1") {
        return "Ein Junge"; // хлопець (junge)
      } else if (lookingFor === "2") {
        return "Ein Mädchen"; // дівчина (mädchen)
      } else if (lookingFor === "3") {
        return "Jemanden"; // будь-хто (jeder)
      }
      break;

    case "es":
      if (lookingFor === "1") {
        return "Chico"; // хлопець (chico)
      } else if (lookingFor === "2") {
        return "Chica"; // дівчина (chica)
      } else if (lookingFor === "3") {
        return "Cualquiera"; // будь-хто (cualquiera)
      }
      break;
    case "pl":
      if (lookingFor === "1") {
        return "Chłopaka"; // хлопець (chico)
      } else if (lookingFor === "2") {
        return "Dziewczynę"; // дівчина (chica)
      } else if (lookingFor === "3") {
        return "Kogoś"; // будь-хто (cualquiera)
      }
      break;

    default:
      return null; // Якщо мова не підтримується або значення некоректне
  }

  return null; // Якщо введено некоректне значення
}

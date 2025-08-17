export function getLikesMessage(lang: string, count: number): string {
  switch (lang) {
    case "en":
      return `You have ${count} new likes! ❤️`;
    case "fr":
      return `Vous avez ${count} nouveaux likes ! ❤️`;
    case "it":
      return `Hai ${count} nuovi like! ❤️`;
    case "de":
      return `Sie haben ${count} neue Likes! ❤️`;
    case "es":
      return `¡Tienes ${count} nuevos likes! ❤️`;
    case "pl":
      return `Masz ${count} nowych polubień! ❤️`;
    case "uk":
    default:
      return `У вас ${count} нових лайків! ❤️`;
  }
}
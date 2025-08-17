import { Context, Scenes } from "telegraf";

export interface MyContext extends Context {

  callbackQuery: Context["callbackQuery"];
  lang: Lang;
  prop: number;
  sessions: string;
  scene: Scenes.SceneContextScene<MyContext, RegisterWizardProp>;
  wizard: Scenes.WizardContextWizard<MyContext>;
}
interface RegisterWizardProp extends Scenes.WizardSessionData {
  registrationData: IRegister;
}

export type Lang = "uk" |"pl"| "en" | "fr" | "de" | "es" | "it";
interface IRegister {
  name?: string;
  age?: number;
  sex?: number;
  city?: string;
  latitude?: number;
  longitude?: number;
  lookingFor?: number;
  photos?: { url: string }[];
  user_id?: number;
  minAge?: number;
  maxAge?: number;
  description?:string;
}

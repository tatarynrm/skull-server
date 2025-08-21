import { Context, Scenes } from "telegraf";

export interface MyContext extends Context {
  callbackQuery: Context["callbackQuery"];
  lang: Lang;
  prop: number;
  sessions: string;
  scene: Scenes.SceneContextScene<MyContext, RegisterWizardProp>;
  wizard: Scenes.WizardContextWizard<MyContext>;
  likesQueue: any;
}
interface RegisterWizardProp extends Scenes.WizardSessionData {
  registrationData: IRegister;
  likesQueue: any;
  currentIndex: any;
  photoTimeout?: any;
}

export type Lang = "uk" | "pl" | "en" | "fr" | "de" | "es" | "it";
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
  description?: string;
  refrerred_by?: number;
  pre_photos?: {file_id:string}[];
}

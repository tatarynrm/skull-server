import { Scenes } from "telegraf";

interface photos {
  url:string
}
// Тип сесії, що зберігає дані реєстрації
export interface MyWizardSession extends Scenes.WizardSessionData {
  registrationData: {
    name?: string;
    age?: number;
    ageCategory?: number;
    sex?: number | string;
    lookingFor?: number | string;
    latitude?: number;
    longitude?: number;
    phoneNumber?: string;
    bio?: string;
    address?:string;
    city?:string;
    photos?:photos[];
    user_id?:string | number;
    
  };
  
}

// Тип контексту для сцени реєстрації
export type MyContext = Scenes.WizardContext<MyWizardSession>;

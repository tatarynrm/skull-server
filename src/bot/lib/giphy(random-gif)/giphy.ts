import axios from "axios";
import { MyContext } from "../../types/bot-context";

export async function getRandomGif(tag: string) {
  const apiKey = process.env.GIPHY_API_KEY!;
  const res = await axios.get("https://api.giphy.com/v1/gifs/random", {
    params: { api_key: apiKey, tag, rating: "pg" },
  });

  return res.data.data.images.original.url;
}


export async function sendRandomGif(ctx:MyContext,userId:number,tag:string) {
        const gifUrl = await getRandomGif(tag);
          await ctx.telegram.sendAnimation(userId, gifUrl);
}
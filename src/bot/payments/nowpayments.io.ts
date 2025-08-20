import axios from "axios";

export async function createPaymentWithNowpaymentsIo(
  amount: number,
  currency: string,
  userId: number
) {
  try {
    const res = await axios.post(
      "https://api.nowpayments.io/v1/invoice",
      {
        price_amount: 5, // 2 USD
        price_currency: "XRP", // показуємо, скільки коштує товар
        pay_currency: "TRX", // або ETH, USDT, BNB – валюта, яку платить користувач
        order_id: `user_${userId}_${Date.now()}`,
        order_description: "Оплата преміум-функцій",
        ipn_callback_url: "https://your-domain.com/nowpayments-webhook",
        success_url: "https://your-domain.com/success",
        cancel_url: "https://your-domain.com/cancel",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        },
      }
    );

    return res.data; // містить payment_url, invoice_id тощо
  } catch (err) {
    console.error("Error creating payment:", err);
    return null;
  }
}

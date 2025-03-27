const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY;

const ksort = (obj) => {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = obj[key];
  }
  return sortedObj;
};

async function validateTelegramData(initDataUnsafe) {
  if (!initDataUnsafe || !initDataUnsafe.hash) {
    return { valid: false, message: "❌ داده ناقص یا دریافت نشد!" };
  }

  const initDataHash = initDataUnsafe.hash;
  let processedData = { ...initDataUnsafe };
  delete processedData.hash;
  processedData = ksort(processedData);

  const initDataString = Object.entries(processedData)
    .map(([key, value]) => {
      value = typeof value === "object" ? JSON.stringify(value, null, 0) : value;
      return `${key}=${value}`;
    })
    .join("\n")
    .replace(/\//g, "\\/");

  console.log("داده‌های پردازش‌شده:\n", initDataString);
  console.log("Hash دریافتی:", initDataHash);

  try {
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(BOT_TOKEN)
      .digest();
    const generatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(initDataString)
      .digest("hex");

    console.log("Hash تولیدشده:", generatedHash);

    return {
      valid: generatedHash === initDataHash,
      message: generatedHash === initDataHash ? "✅ داده‌ها معتبر هستند." : "❌ داده‌ها دستکاری شده‌اند!",
    };
  } catch (error) {
    console.error("خطا در اعتبارسنجی سرور:", error);
    return { valid: false, message: "❌ خطا در اعتبارسنجی!" };
  }
}

async function getFaucetPayBalance() {
  try {
    const response = await fetch("https://faucetpay.io/api/v1/getbalance", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        api_key: FAUCETPAY_API_KEY,
        currency: "TRX",
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("خطا در درخواست به FaucetPay:", error);
    return { status: 500, message: "خطا در ارتباط با FaucetPay" };
  }
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://client-0.pages.dev");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("*", (req, res) => {
  res.status(204).send();
});

app.post("/validate", async (req, res) => {
  console.log("سرور: داده initDataUnsafe دریافت شد:", req.body.initDataUnsafe);
  const result = await validateTelegramData(req.body.initDataUnsafe);
  res.json(result);
});

app.get("/getbalance", async (req, res) => {
  const result = await getFaucetPayBalance();
  res.json(result);
});

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`سرور در پورت ${PORT} اجرا شد`);
});
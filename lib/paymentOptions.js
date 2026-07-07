export const cryptoPaymentOptions = [
    {
      id: "usdt-trc20",
      label: "USDT - TRC20",
      currency: "USDT",
      network: "TRC20",
      walletAddress: "PUT_YOUR_USDT_TRC20_WALLET_ADDRESS_HERE",
      note: "انتقال فقط روی شبکه TRC20 انجام شود.",
    },
    {
      id: "usdt-bep20",
      label: "USDT - BEP20",
      currency: "USDT",
      network: "BEP20",
      walletAddress: "PUT_YOUR_USDT_BEP20_WALLET_ADDRESS_HERE",
      note: "انتقال فقط روی شبکه BEP20 انجام شود.",
    },
  ];
  
  export function getCryptoPaymentOption(id) {
    return cryptoPaymentOptions.find((option) => option.id === id);
  }
export type Route = "fast_pool" | "cctp";

interface PaymentBase {
  id: string;
  nonce: `0x${string}`;
  fromChainId: number;
  toChainId: number;
  payer: `0x${string}`;
  recipient: `0x${string}`;
  amount: string;
  feeAmount: string;
  payoutAmount: string;
  route: Route;
  createdAt: number;
  updatedAt: number;
}

export type PaymentStatus =
  | (PaymentBase & {
      state: "pending_deposit";
    })
  | (PaymentBase & {
      state: "deposit_confirmed";
      sourceTxHash: `0x${string}`;
    })
  | (PaymentBase & {
      state: "released";
      sourceTxHash: `0x${string}`;
      destTxHash: `0x${string}`;
      explanation: string;
    })
  | (PaymentBase & {
      state: "failed";
      sourceTxHash: `0x${string}` | null;
      error: string;
    });

export type PaymentState = PaymentStatus["state"];

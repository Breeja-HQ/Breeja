import { BigInt } from "@graphprotocol/graph-ts";
import { PaymentRequested } from "../generated/SourceVault/SourceVault";
import { ChainStats, Payment } from "../generated/schema";

const CHAIN_ID = BigInt.fromI32(11155111);

export function handlePaymentRequested(event: PaymentRequested): void {
  const payment = new Payment(
    CHAIN_ID.toString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  payment.payer = event.params.payer;
  payment.recipient = event.params.recipient;
  payment.amount = event.params.amount;
  payment.sourceChainId = CHAIN_ID;
  payment.destChainId = event.params.destChainId;
  payment.sourceTxHash = event.transaction.hash;
  payment.requestedAt = event.block.timestamp;
  payment.save();

  let stats = ChainStats.load(CHAIN_ID.toString());
  if (stats == null) {
    stats = new ChainStats(CHAIN_ID.toString());
    stats.totalVolume = BigInt.zero();
    stats.totalFees = BigInt.zero();
    stats.paymentCount = BigInt.zero();
  }
  // Source-chain ChainStats tracks requested volume, not settled volume: this
  // subgraph never observes Released (it fires on the destination chain), so
  // paymentCount/totalVolume here mean "payments initiated from this chain".
  stats.totalVolume = stats.totalVolume.plus(event.params.amount);
  stats.paymentCount = stats.paymentCount.plus(BigInt.fromI32(1));
  stats.save();
}

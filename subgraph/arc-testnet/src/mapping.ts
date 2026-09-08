import { BigInt } from "@graphprotocol/graph-ts";
import { PaymentRequested } from "../generated/SourceVault/SourceVault";
import { Released } from "../generated/DestPool/DestPool";
import { ChainStats, Payment, Release } from "../generated/schema";

const CHAIN_ID = BigInt.fromI64(5042002);

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
  // Source-side activity on this chain: a payment requested here, regardless
  // of where it settles. Released (below) adds destination-side activity for
  // payments that settle on this chain, so ChainStats mixes both directions
  // by design — it reports "everything that happened on this chain".
  stats.totalVolume = stats.totalVolume.plus(event.params.amount);
  stats.paymentCount = stats.paymentCount.plus(BigInt.fromI32(1));
  stats.save();
}

export function handleReleased(event: Released): void {
  const release = new Release(
    CHAIN_ID.toString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  );
  release.recipient = event.params.recipient;
  release.payout = event.params.amount;
  release.fee = event.params.fee;
  release.sourceRef = event.params.sourceRef;
  release.destChainId = CHAIN_ID;
  release.destTxHash = event.transaction.hash;
  release.releasedAt = event.block.timestamp;
  release.save();

  // sourceRef is the source chain's transaction hash, set by the relayer.
  // Released fires on the DESTINATION chain, but the matching Payment was
  // indexed by the SOURCE chain's own subgraph deployment (one subgraph per
  // chain, per PARTNERS.md) — it will not exist in this store unless the
  // same payment happened to round-trip through this chain as both source
  // and destination. This lookup is therefore best-effort only: it resolves
  // same-chain roundtrips and leaves Payment.release null otherwise, which
  // is the correct, honest result. Full cross-chain correlation requires
  // composing this subgraph's Release with the source chain's Payment at
  // query time, not inside a single mapping.
  const sourceRefHash = event.params.sourceRef.toHexString();
  let logIndex = BigInt.zero();
  const maxProbeLogIndex = 20;
  for (let i = 0; i < maxProbeLogIndex; i++) {
    const candidateId = CHAIN_ID.toString() + "-" + sourceRefHash + "-" + logIndex.toString();
    const candidate = Payment.load(candidateId);
    if (candidate != null) {
      candidate.release = release.id;
      candidate.save();
      break;
    }
    logIndex = logIndex.plus(BigInt.fromI32(1));
  }

  let stats = ChainStats.load(CHAIN_ID.toString());
  if (stats == null) {
    stats = new ChainStats(CHAIN_ID.toString());
    stats.totalVolume = BigInt.zero();
    stats.totalFees = BigInt.zero();
    stats.paymentCount = BigInt.zero();
  }
  stats.totalVolume = stats.totalVolume.plus(event.params.amount);
  stats.totalFees = stats.totalFees.plus(event.params.fee);
  stats.save();
}

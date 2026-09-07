import { pad } from "viem";
import { requireEnv } from "../env.js";
import { getCctpDomain } from "../chains/chainIds.js";
import {
  getMessageTransmitterContract,
  getPublicClient,
  getTokenMessengerContract,
  getUsdcContract,
} from "../chains/registry.js";

const STANDARD_TRANSFER_FINALITY_THRESHOLD = 2000;
const ATTESTATION_POLL_INTERVAL_MS = 5_000;
const ATTESTATION_POLL_TIMEOUT_MS = 20 * 60_000;

interface CctpMessage {
  message: `0x${string}`;
  attestation: `0x${string}` | "PENDING" | null;
  status: "complete" | "pending_confirmations";
}

interface AttestationResponse {
  messages: CctpMessage[];
}

export interface CctpFeeQuote {
  finalityThreshold: number;
  minimumFeeBps: number;
}

export async function getCctpFeeQuote(fromChainId: number, toChainId: number): Promise<CctpFeeQuote> {
  const sourceDomain = getCctpDomain(fromChainId);
  const destDomain = getCctpDomain(toChainId);
  const apiUrl = requireEnv("CCTP_ATTESTATION_API_URL");

  const res = await fetch(`${apiUrl}/v2/burn/USDC/fees/${sourceDomain}/${destDomain}`);
  if (!res.ok) throw new Error(`CCTP fee API returned ${res.status}`);

  const fees = (await res.json()) as Array<{ finalityThreshold: number; minimumFee: number }>;
  const standard = fees.find((fee) => fee.finalityThreshold === STANDARD_TRANSFER_FINALITY_THRESHOLD);
  if (!standard) throw new Error("CCTP fee API did not return a standard transfer quote");

  return { finalityThreshold: standard.finalityThreshold, minimumFeeBps: standard.minimumFee };
}

export interface CctpBurnParams {
  fromChainId: number;
  toChainId: number;
  amount: bigint;
  mintRecipient: `0x${string}`;
}

export async function submitCctpBurn(params: CctpBurnParams): Promise<{ txHash: `0x${string}` }> {
  const destDomain = getCctpDomain(params.toChainId);

  const [tokenMessengerContract, usdcContract, publicClient] = await Promise.all([
    getTokenMessengerContract(params.fromChainId),
    getUsdcContract(params.fromChainId),
    getPublicClient(params.fromChainId),
  ]);

  // depositForBurn pulls funds via transferFrom(relayer, minter, amount), so the
  // relayer must approve TokenMessengerV2 first — it holds the USDC after
  // relayerWithdraw, not the vault. The registry's WalletClient<any, any, any>
  // erases the concrete account type, which pushes viem's bool-returning write
  // onto an overload requiring an explicit options arg even though the
  // underlying client already has a local account bound — cast narrowly here
  // rather than loosen the registry's public client typing.
  type ApproveWrite = (args: readonly [`0x${string}`, bigint]) => Promise<`0x${string}`>;
  const approveHash = await (usdcContract.write.approve as unknown as ApproveWrite)([
    tokenMessengerContract.address,
    params.amount,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const hash = await tokenMessengerContract.write.depositForBurn([
    params.amount,
    destDomain,
    pad(params.mintRecipient, { size: 32 }),
    usdcContract.address,
    pad("0x0000000000000000000000000000000000000000", { size: 32 }),
    0n,
    STANDARD_TRANSFER_FINALITY_THRESHOLD,
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

export async function fetchCctpAttestation(
  fromChainId: number,
  burnTxHash: `0x${string}`,
): Promise<CctpMessage | null> {
  const sourceDomain = getCctpDomain(fromChainId);
  const apiUrl = requireEnv("CCTP_ATTESTATION_API_URL");

  const res = await fetch(`${apiUrl}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`CCTP attestation API returned ${res.status}`);

  const body = (await res.json()) as AttestationResponse;
  return body.messages[0] ?? null;
}

export async function pollCctpAttestation(
  fromChainId: number,
  burnTxHash: `0x${string}`,
): Promise<CctpMessage> {
  const deadline = Date.now() + ATTESTATION_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const found = await fetchCctpAttestation(fromChainId, burnTxHash);
    if (found && found.status === "complete" && found.attestation && found.attestation !== "PENDING") {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, ATTESTATION_POLL_INTERVAL_MS));
  }

  throw new Error(`CCTP attestation not available after ${ATTESTATION_POLL_TIMEOUT_MS}ms`);
}

export async function submitCctpMint(
  toChainId: number,
  message: `0x${string}`,
  attestation: `0x${string}`,
): Promise<{ txHash: `0x${string}` }> {
  const [messageTransmitterContract, publicClient] = await Promise.all([
    getMessageTransmitterContract(toChainId),
    getPublicClient(toChainId),
  ]);

  const hash = await messageTransmitterContract.write.receiveMessage([message, attestation]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: receipt.transactionHash };
}

export interface CctpTransferParams {
  fromChainId: number;
  toChainId: number;
  amount: bigint;
  recipient: `0x${string}`;
}

export async function submitCctpTransfer(
  params: CctpTransferParams,
): Promise<{ burnTxHash: `0x${string}`; mintTxHash: `0x${string}` }> {
  const { txHash: burnTxHash } = await submitCctpBurn({
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    amount: params.amount,
    mintRecipient: params.recipient,
  });

  const { message, attestation } = await pollCctpAttestation(params.fromChainId, burnTxHash);
  if (!attestation || attestation === "PENDING") {
    throw new Error("CCTP attestation resolved without a usable signature");
  }

  const { txHash: mintTxHash } = await submitCctpMint(params.toChainId, message, attestation);

  return { burnTxHash, mintTxHash };
}

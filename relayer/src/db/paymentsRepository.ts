import type { Route, PaymentStatus } from "../types/payment.js";
import { getPool } from "./pool.js";
import { publishPaymentUpdate } from "../services/paymentEvents.js";

interface PaymentRow {
  id: string;
  nonce: Buffer;
  from_chain_id: number;
  to_chain_id: number;
  payer: Buffer;
  recipient: Buffer;
  amount: string;
  fee_amount: string;
  payout_amount: string;
  route: string;
  state: string;
  source_tx_hash: Buffer | null;
  dest_tx_hash: Buffer | null;
  error: string | null;
  explanation: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePaymentInput {
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
}

function toBytea(hex: `0x${string}`): Buffer {
  return Buffer.from(hex.slice(2), "hex");
}

function toHex(buffer: Buffer): `0x${string}` {
  return `0x${buffer.toString("hex")}`;
}

function mapRow(row: PaymentRow): PaymentStatus {
  const base = {
    id: row.id,
    nonce: toHex(row.nonce),
    fromChainId: row.from_chain_id,
    toChainId: row.to_chain_id,
    payer: toHex(row.payer),
    recipient: toHex(row.recipient),
    amount: row.amount,
    feeAmount: row.fee_amount,
    payoutAmount: row.payout_amount,
    route: row.route as Route,
    createdAt: row.created_at.getTime(),
    updatedAt: row.updated_at.getTime(),
  };

  switch (row.state) {
    case "pending_deposit":
      return { ...base, state: "pending_deposit" };
    case "deposit_confirmed":
      if (!row.source_tx_hash) {
        throw new Error(`Payment ${row.id} is deposit_confirmed but has no source_tx_hash`);
      }
      return { ...base, state: "deposit_confirmed", sourceTxHash: toHex(row.source_tx_hash) };
    case "released":
      if (!row.source_tx_hash || !row.dest_tx_hash) {
        throw new Error(`Payment ${row.id} is released but is missing a tx hash`);
      }
      return {
        ...base,
        state: "released",
        sourceTxHash: toHex(row.source_tx_hash),
        destTxHash: toHex(row.dest_tx_hash),
        explanation: row.explanation ?? "",
      };
    case "failed":
      return {
        ...base,
        state: "failed",
        sourceTxHash: row.source_tx_hash ? toHex(row.source_tx_hash) : null,
        error: row.error ?? "",
      };
    default:
      throw new Error(`Unknown payment state: ${row.state}`);
  }
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<{ payment: PaymentStatus; isNew: boolean }> {
  const pool = getPool();

  const insertResult = await pool.query<PaymentRow>(
    `insert into payments
       (id, nonce, from_chain_id, to_chain_id, payer, recipient, amount, fee_amount, payout_amount, route, state)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_deposit')
     on conflict (nonce, from_chain_id) do nothing
     returning *`,
    [
      input.id,
      toBytea(input.nonce),
      input.fromChainId,
      input.toChainId,
      toBytea(input.payer),
      toBytea(input.recipient),
      input.amount,
      input.feeAmount,
      input.payoutAmount,
      input.route,
    ],
  );

  if (insertResult.rows.length > 0) {
    return { payment: mapRow(insertResult.rows[0]), isNew: true };
  }

  const existingResult = await pool.query<PaymentRow>(
    "select * from payments where nonce = $1 and from_chain_id = $2",
    [toBytea(input.nonce), input.fromChainId],
  );

  if (existingResult.rows.length === 0) {
    throw new Error(
      `createPayment conflicted on (nonce, from_chain_id) but no existing row was found for nonce=${input.nonce} fromChainId=${input.fromChainId}`,
    );
  }

  return { payment: mapRow(existingResult.rows[0]), isNew: false };
}

export async function getPaymentById(id: string): Promise<PaymentStatus | null> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>("select * from payments where id = $1", [id]);
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function markDepositConfirmed(
  id: string,
  sourceTxHash: `0x${string}`,
): Promise<PaymentStatus> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>(
    `update payments
     set state = 'deposit_confirmed', source_tx_hash = $2, updated_at = now()
     where id = $1 and state = 'pending_deposit'
     returning *`,
    [id, toBytea(sourceTxHash)],
  );

  if (result.rows.length === 0) {
    throw new Error(
      `markDepositConfirmed: payment ${id} was not in pending_deposit state (transition refused)`,
    );
  }

  const payment = mapRow(result.rows[0]);
  publishPaymentUpdate(payment);
  return payment;
}

export async function markReleased(
  id: string,
  destTxHash: `0x${string}`,
  explanation: string,
): Promise<PaymentStatus> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>(
    `update payments
     set state = 'released', dest_tx_hash = $2, explanation = $3, updated_at = now()
     where id = $1 and state = 'deposit_confirmed'
     returning *`,
    [id, toBytea(destTxHash), explanation],
  );

  if (result.rows.length === 0) {
    throw new Error(
      `markReleased: payment ${id} was not in deposit_confirmed state (transition refused)`,
    );
  }

  const payment = mapRow(result.rows[0]);
  publishPaymentUpdate(payment);
  return payment;
}

export async function markFailed(id: string, error: string): Promise<PaymentStatus> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>(
    `update payments
     set state = 'failed', error = $2, updated_at = now()
     where id = $1 and state not in ('released', 'failed')
     returning *`,
    [id, error],
  );

  if (result.rows.length === 0) {
    throw new Error(`markFailed: payment ${id} was already terminal (transition refused)`);
  }

  const payment = mapRow(result.rows[0]);
  publishPaymentUpdate(payment);
  return payment;
}

export async function listStalePendingPayments(
  olderThanMs: number,
  routeOlderThanMs?: Partial<Record<Route, number>>,
): Promise<PaymentStatus[]> {
  const pool = getPool();

  // CCTP's standard-transfer attestation can take on the order of 15-20
  // minutes, far longer than fast-pool's ~10s release — a payment legitimately
  // mid-attestation is not the same as one actually stuck.
  const cctpThresholdMs = routeOlderThanMs?.cctp ?? olderThanMs;

  const result = await pool.query<PaymentRow>(
    `select * from payments
     where state not in ('released', 'failed')
       and (
         (route <> 'cctp' and updated_at < now() - make_interval(secs => $1::double precision))
         or
         (route = 'cctp' and updated_at < now() - make_interval(secs => $2::double precision))
       )`,
    [olderThanMs / 1000, cctpThresholdMs / 1000],
  );

  return result.rows.map(mapRow);
}

export async function listInFlightPaymentsByRecipient(recipient: `0x${string}`): Promise<PaymentStatus[]> {
  const pool = getPool();
  const result = await pool.query<PaymentRow>(
    `select * from payments
     where recipient = $1 and state not in ('released', 'failed')
     order by created_at asc`,
    [toBytea(recipient)],
  );
  return result.rows.map(mapRow);
}

create table payments (
  id              uuid primary key,
  nonce           bytea not null,
  from_chain_id   integer not null,
  to_chain_id     integer not null,
  payer           bytea not null,
  recipient       bytea not null,
  amount          numeric(78,0) not null,
  fee_amount      numeric(78,0) not null,
  payout_amount   numeric(78,0) not null,
  route           text not null,
  state           text not null,
  source_tx_hash  bytea,
  dest_tx_hash    bytea,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index payments_nonce_chain_idx on payments (nonce, from_chain_id);
create index payments_state_idx on payments (state) where state not in ('released', 'failed');
create index payments_recipient_idx on payments (recipient);

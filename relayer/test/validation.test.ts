import { describe, it, expect } from "vitest";
import { validatePayRequest, isPositiveBigint, type PayRequestBody } from "../src/api/validation.js";

const VALID_BODY: PayRequestBody = {
  fromChainId: 11155111,
  toChainId: 84532,
  payer: "0x1111111111111111111111111111111111111111",
  recipient: "0x2222222222222222222222222222222222222222",
  amount: "1000000",
};

describe("isPositiveBigint", () => {
  it("accepts a positive integer string", () => {
    expect(isPositiveBigint("1")).toBe(true);
  });

  it("rejects zero", () => {
    expect(isPositiveBigint("0")).toBe(false);
  });

  it("rejects a negative integer string", () => {
    expect(isPositiveBigint("-5")).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(isPositiveBigint("abc")).toBe(false);
  });

  it("rejects a decimal string", () => {
    expect(isPositiveBigint("1.5")).toBe(false);
  });
});

describe("validatePayRequest", () => {
  it("accepts a fully valid request", () => {
    expect(validatePayRequest(VALID_BODY)).toBeNull();
  });

  it("rejects a missing fromChainId", () => {
    const { fromChainId: _fromChainId, ...rest } = VALID_BODY;
    expect(validatePayRequest(rest)).toMatch(/fromChainId/);
  });

  it("rejects a non-number fromChainId", () => {
    expect(validatePayRequest({ ...VALID_BODY, fromChainId: "11155111" as unknown as number })).toMatch(
      /fromChainId/,
    );
  });

  it("rejects an unsupported fromChainId", () => {
    expect(validatePayRequest({ ...VALID_BODY, fromChainId: 1 })).toMatch(/fromChainId is not a supported source chain/);
  });

  it("rejects a missing toChainId", () => {
    const { toChainId: _toChainId, ...rest } = VALID_BODY;
    expect(validatePayRequest(rest)).toMatch(/toChainId/);
  });

  it("rejects a non-number toChainId", () => {
    expect(validatePayRequest({ ...VALID_BODY, toChainId: "84532" as unknown as number })).toMatch(/toChainId/);
  });

  it("rejects a source-only chain as toChainId", () => {
    expect(validatePayRequest({ ...VALID_BODY, toChainId: 11155111 })).toMatch(
      /toChainId is not a supported destination chain/,
    );
  });

  it("rejects a missing payer", () => {
    const { payer: _payer, ...rest } = VALID_BODY;
    expect(validatePayRequest(rest)).toMatch(/payer/);
  });

  it("rejects an invalid payer address", () => {
    expect(validatePayRequest({ ...VALID_BODY, payer: "not-an-address" })).toMatch(/payer/);
  });

  it("rejects a missing recipient", () => {
    const { recipient: _recipient, ...rest } = VALID_BODY;
    expect(validatePayRequest(rest)).toMatch(/recipient/);
  });

  it("rejects an invalid recipient address", () => {
    expect(validatePayRequest({ ...VALID_BODY, recipient: "0xnope" })).toMatch(/recipient/);
  });

  it("rejects a missing amount", () => {
    const { amount: _amount, ...rest } = VALID_BODY;
    expect(validatePayRequest(rest)).toMatch(/amount/);
  });

  it("rejects a non-positive amount", () => {
    expect(validatePayRequest({ ...VALID_BODY, amount: "0" })).toMatch(/amount/);
  });

  it("rejects a negative amount", () => {
    expect(validatePayRequest({ ...VALID_BODY, amount: "-100" })).toMatch(/amount/);
  });

  it("rejects a non-numeric amount", () => {
    expect(validatePayRequest({ ...VALID_BODY, amount: "abc" })).toMatch(/amount/);
  });

  it("rejects a decimal amount string", () => {
    expect(validatePayRequest({ ...VALID_BODY, amount: "1.5" })).toMatch(/amount/);
  });

  it("accepts a request with a well-formed authorization", () => {
    const body: PayRequestBody = {
      ...VALID_BODY,
      authorization: {
        validAfter: "0",
        validBefore: "9999999999",
        nonce: "0xabc",
        v: 27,
        r: "0xdead",
        s: "0xbeef",
      },
    };
    expect(validatePayRequest(body)).toBeNull();
  });

  it("rejects a malformed authorization missing a required field", () => {
    const body = {
      ...VALID_BODY,
      authorization: {
        validAfter: "0",
        validBefore: "9999999999",
        nonce: "0xabc",
        v: 27,
        r: "0xdead",
      },
    } as unknown as PayRequestBody;
    expect(validatePayRequest(body)).toMatch(/authorization is malformed/);
  });

  it("rejects an authorization with wrong-typed sub-fields", () => {
    const body = {
      ...VALID_BODY,
      authorization: {
        validAfter: 0,
        validBefore: "9999999999",
        nonce: "0xabc",
        v: 27,
        r: "0xdead",
        s: "0xbeef",
      },
    } as unknown as PayRequestBody;
    expect(validatePayRequest(body)).toMatch(/authorization is malformed/);
  });

  it("rejects an authorization with a non-numeric v", () => {
    const body = {
      ...VALID_BODY,
      authorization: {
        validAfter: "0",
        validBefore: "9999999999",
        nonce: "0xabc",
        v: "27",
        r: "0xdead",
        s: "0xbeef",
      },
    } as unknown as PayRequestBody;
    expect(validatePayRequest(body)).toMatch(/authorization is malformed/);
  });
});

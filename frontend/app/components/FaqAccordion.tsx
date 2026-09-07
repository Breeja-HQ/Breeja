"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

const faqItems: FaqItem[] = [
  {
    question: "Is Breeja custodial?",
    answer:
      "On the fast-pool route, yes, and we say this plainly: the relayer controls DestPool liquidity and decides when to release. You're trusting the relayer's key and solvency, not a trustless message protocol, the same tradeoff early Across and Hop made. CCTP is offered as a trust-minimized alternative for the same payment, at the cost of latency.",
  },
  {
    question: "How is this gasless?",
    answer:
      "The payer signs a free, off-chain EIP-3009 permit naming a recipient and amount. No transaction, no gas. The relayer submits the deposit on the source chain and the release on the destination chain, paying gas on both sides, and recoups that cost via a small fee. Neither side ever needs to hold a gas token.",
  },
  {
    question: "Can an agent use Breeja without a human in the loop?",
    answer:
      "Yes. The @breeja/sdk package and the @breeja/mcp server both call the same relayer API the web app uses, no browser needed. Recipient is a separate parameter from payer, so agent-to-agent payments are a first-class case, not a workaround bolted onto a human-first flow.",
  },
  {
    question: "What networks does this support today?",
    answer:
      "Base, Arbitrum, and Optimism Sepolia are live as both source and destination. Ethereum Sepolia is a source-only chain: it can send into the mesh but has no destination pool. Testnet only, for now.",
  },
];

export default function FaqAccordion() {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());

  function toggleQuestion(question: string) {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  }

  return (
    <section id="faq" className="w-full bg-white py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <h2 className="text-center font-sans font-bold tracking-tight text-ink text-5xl md:text-6xl">
          Frequently asked questions
        </h2>

        <div className="mt-12 max-w-3xl mx-auto">
          {faqItems.map((item) => {
            const isOpen = openQuestions.has(item.question);
            return (
              <div key={item.question} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => toggleQuestion(item.question)}
                  aria-expanded={isOpen}
                  className="flex justify-between items-center w-full py-6 text-left text-xl font-medium text-ink"
                >
                  <span>{item.question}</span>
                  <span className="ml-6 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-badge-bg text-accent">
                    {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                {isOpen && (
                  <p className="text-body text-xl leading-relaxed pb-6 pr-8">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

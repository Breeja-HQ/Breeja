"use client";

import { useId, useState } from "react";
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
      "The payer signs a free, off-chain EIP-3009 permit naming a recipient and amount. No transaction, no gas. The relayer submits the deposit on the source chain and the release on the destination chain, paying gas on both sides, and recoups that cost via a small fee. Neither side ever needs to hold a gas token. One honest exception: Hedera's USDC does not implement EIP-3009, so paying from Hedera means approving on-chain and covering that gas yourself.",
  },
  {
    question: "Can an agent use Breeja without a human in the loop?",
    answer:
      "Yes. The @breeja/sdk package and the @breeja/mcp server both call the same relayer API the web app uses, no browser needed. Recipient is a separate parameter from payer, so agent-to-agent payments are a first-class case, not a workaround bolted onto a human-first flow.",
  },
  {
    question: "What networks does this support today?",
    answer:
      "Six chains. Base, Arbitrum, and Optimism Sepolia, plus Circle's Arc Testnet and Hedera Testnet, are all live as both source and destination. Ethereum Sepolia is source-only: it can send into the mesh but has no destination pool. Every one of them has a real deploy and a verified round trip on-chain. Testnet only, for now.",
  },
];

export default function FaqAccordion() {
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(new Set());
  const baseId = useId();

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
          {faqItems.map((item, index) => {
            const isOpen = openQuestions.has(item.question);
            const panelId = `${baseId}-faq-panel-${index}`;
            const buttonId = `${baseId}-faq-button-${index}`;
            return (
              <div key={item.question} className="border-b border-border">
                <button
                  type="button"
                  id={buttonId}
                  onClick={() => toggleQuestion(item.question)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="motion-lift group flex w-full items-center justify-between gap-6 rounded-xl px-3 py-6 text-left text-xl font-medium text-ink outline-none hover:bg-badge-bg focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  <span className="transition-colors duration-200 group-hover:text-accent">
                    {item.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="breeja-icon-swap h-8 w-8 shrink-0 rounded-full bg-badge-bg text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-white"
                  >
                    <Plus
                      className={`h-4 w-4 ${
                        isOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                      }`}
                    />
                    <Minus
                      className={`h-4 w-4 ${
                        isOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
                      }`}
                    />
                  </span>
                </button>

                <div className="breeja-collapse" data-open={isOpen}>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    inert={!isOpen}
                  >
                    <p className="text-body text-xl leading-relaxed px-3 pb-6 pr-8">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

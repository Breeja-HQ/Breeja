import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Matches frontend/app/globals.css — the single live theme, no palette of its own.
INK      = RGBColor(0x0A, 0x0A, 0x0A)   # --foreground
PAPER    = RGBColor(0xFF, 0xFF, 0xFF)   # --background
PANEL    = RGBColor(0xFF, 0xFF, 0xFF)   # --color-surface
WARM     = RGBColor(0xFD, 0xED, 0xE7)   # --color-badge-bg
MUTED    = RGBColor(0x6B, 0x72, 0x80)   # --color-body
BORDER   = RGBColor(0xE5, 0xE7, 0xEB)   # --color-border
ACCENT   = RGBColor(0xF4, 0x62, 0x3A)   # --color-accent

# No hue-coding: category/status distinctions that used to rely on different
# accent colors now use ink (primary/solid) vs muted (secondary) vs the one
# accent, same as the frontend distinguishes emphasis without color-coding.
BLUE = YELLOW = MINT = ORANGE = LAVENDER = PINK = ACCENT

DISPLAY = "Geist"
SANS    = "Geist"
MONO    = "Geist Mono"

W, H = Inches(13.333), Inches(7.5)
M = Inches(0.62)
CW = W - 2 * M

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


def slide(bg=PAPER):
    s = prs.slides.add_slide(BLANK)
    bgs = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    bgs.fill.solid()
    bgs.fill.fore_color.rgb = bg
    bgs.line.fill.background()
    bgs.shadow.inherit = False
    return s


def box(s, x, y, w, h, fill=PANEL, line=INK, lw=2.25, shadow=None, shadow_off=Inches(0.07)):
    """Hard-edged panel. Optional zero-blur offset shadow drawn as a shape behind."""
    if shadow is not None:
        sh = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x + shadow_off, y + shadow_off, w, h)
        sh.fill.solid()
        sh.fill.fore_color.rgb = shadow
        sh.line.fill.background()
        sh.shadow.inherit = False
    sp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    sp.shadow.inherit = False
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = Pt(lw)
    return sp


def text(s, x, y, w, h, runs, size=14, font=SANS, color=INK, bold=False,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=0.0, line_spacing=1.25,
         caps=False):
    tb = s.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    if isinstance(runs, str):
        runs = [runs]
    for i, ln in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        if isinstance(ln, tuple):
            content, opts = ln
        else:
            content, opts = ln, {}
        r = p.add_run()
        r.text = content.upper() if opts.get("caps", caps) else content
        f = r.font
        f.name = opts.get("font", font)
        f.size = Pt(opts.get("size", size))
        f.bold = opts.get("bold", bold)
        f.color.rgb = opts.get("color", color)
        sp = opts.get("spacing", spacing)
        if sp:
            f._rPr.set("spc", str(int(sp * 100)))
    return tb


def eyebrow(s, txt, y=None, color=MUTED):
    text(s, M, y or Inches(0.5), CW, Inches(0.3), txt, size=11, font=MONO,
         color=color, bold=True, spacing=1.6, caps=True)


def heading(s, txt, y, size=38, color=INK, w=None):
    text(s, M, y, w or Inches(9.4), Inches(1.4), txt, size=size, font=DISPLAY,
         color=color, bold=True, line_spacing=0.95)


def lede(s, txt, y, color=MUTED, w=Inches(8.6)):
    text(s, M, y, w, Inches(0.9), txt, size=16, color=color, line_spacing=1.35)


def slidenum(s, n):
    bx = box(s, W - M - Inches(0.62), Inches(0.0), Inches(0.62), Inches(0.42), fill=INK)
    tf = bx.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = f"{n:02d}"
    r.font.name = MONO
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = PAPER


def celltext(shape, runs, size=13, font=SANS, color=INK, bold=False,
             align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.MIDDLE, pad=Inches(0.16),
             line_spacing=1.3, spacing=0.0):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = pad
    tf.margin_top = tf.margin_bottom = Inches(0.08)
    tf.vertical_anchor = anchor
    if isinstance(runs, str):
        runs = [runs]
    for i, ln in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        if isinstance(ln, tuple):
            content, opts = ln
        else:
            content, opts = ln, {}
        r = p.add_run()
        r.text = content
        f = r.font
        f.name = opts.get("font", font)
        f.size = Pt(opts.get("size", size))
        f.bold = opts.get("bold", bold)
        f.color.rgb = opts.get("color", color)
        sp = opts.get("spacing", spacing)
        if sp:
            f._rPr.set("spc", str(int(sp * 100)))


# ------------------------------------------------------------------ 01 title
s = slide(WARM)
slidenum(s, 1)
bm = box(s, M, Inches(0.72), Inches(0.5), Inches(0.5), fill=BLUE, shadow=INK, shadow_off=Inches(0.05))
celltext(bm, "B", size=20, font=DISPLAY, bold=True, align=PP_ALIGN.CENTER, pad=0)
text(s, M + Inches(0.72), Inches(0.83), Inches(4), Inches(0.3), "Breeja",
     size=12, font=MONO, bold=True, spacing=1.8, caps=True)

text(s, M, Inches(1.68), Inches(9.6), Inches(3.2),
     ["Money that", "moves like", "an API call."],
     size=62, font=DISPLAY, bold=True, line_spacing=0.9)

text(s, M, Inches(4.62), Inches(6.9), Inches(1.0),
     "Cross-chain stablecoin settlement for agents and humans. Gasless, multi-route, one call.",
     size=19, bold=True, line_spacing=1.3)

ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, M, Inches(5.72), CW, Pt(2.25))
ln.fill.solid(); ln.fill.fore_color.rgb = INK; ln.line.fill.background(); ln.shadow.inherit = False

chips = ["ETHGlobal Online 2026", "6 chains", "SDK · MCP · x402"]
cx = M
for c in chips:
    cwid = Inches(0.34 + 0.105 * len(c))
    ch = box(s, cx, Inches(6.02), cwid, Inches(0.42), fill=PANEL, shadow=INK, shadow_off=Inches(0.05))
    celltext(ch, c, size=11, font=MONO, bold=True, align=PP_ALIGN.CENTER, pad=Inches(0.1))
    cx += cwid + Inches(0.14)

# ------------------------------------------------------------------ 02 problem
s = slide()
slidenum(s, 2)
eyebrow(s, "The problem")
heading(s, "Agents can think. They can't pay.", Inches(0.95))
lede(s, "An AI agent that owes another agent $5 for an API call has no way to settle it across chains. Neither does a person holding USDC on the wrong network.", Inches(1.95))

pains = [
    ("01", "Gas is a dead end",
     "You need the native token of a chain you've never touched, before you can move the stablecoin you already hold."),
    ("02", "Bridges assume a browser",
     "Connect wallet, approve, sign, wait. There is no programmatic path for software that has no hands."),
    ("03", "Bridges assume you pay yourself",
     "Most move funds between your own addresses. Paying someone else on another chain is a different product."),
]
y = Inches(3.05)
rh = Inches(1.14)
for i, (n, t, d) in enumerate(pains):
    box(s, M, y, CW, rh, fill=PANEL)
    k = box(s, M, y, Inches(0.62), rh, fill=INK)
    celltext(k, n, size=12, font=MONO, bold=True, color=PAPER, align=PP_ALIGN.CENTER, pad=0)
    text(s, M + Inches(0.92), y + Inches(0.22), Inches(11.2), Inches(0.3), t, size=16, bold=True)
    text(s, M + Inches(0.92), y + Inches(0.58), Inches(11.0), Inches(0.4), d, size=13, color=MUTED, line_spacing=1.25)
    y += rh

# ------------------------------------------------------------------ 03 product
s = slide()
slidenum(s, 3)
eyebrow(s, "The product")
heading(s, "A settlement rail with four front doors.", Inches(0.95))
lede(s, "One signature. No gas. Funds land with anyone the payer names, on any supported chain.", Inches(1.95))

steps = [
    ("STEP 01", "Sign", "Payer signs an EIP-3009 permit. A signature, not a transaction."),
    ("STEP 02", "Relay", "Breeja submits the deposit on the source chain and pays the gas."),
    ("STEP 03", "Route", "Router scores live gas, liquidity and preference, then picks a path."),
    ("STEP 04", "Settle", "Funds released to the named recipient on the destination chain."),
]
y = Inches(2.95)
sh_h = Inches(1.85)
cw = CW / 4
box(s, M, y, CW, sh_h, fill=PANEL)
for i, (n, t, d) in enumerate(steps):
    x = M + cw * i
    if i:
        v = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, Pt(2.25), sh_h)
        v.fill.solid(); v.fill.fore_color.rgb = INK; v.line.fill.background(); v.shadow.inherit = False
    text(s, x + Inches(0.24), y + Inches(0.22), cw - Inches(0.48), Inches(0.25), n,
         size=10, font=MONO, bold=True, color=MUTED, spacing=1.4)
    text(s, x + Inches(0.24), y + Inches(0.55), cw - Inches(0.48), Inches(0.3), t,
         size=17, font=DISPLAY, bold=True)
    text(s, x + Inches(0.24), y + Inches(0.95), cw - Inches(0.48), Inches(0.8), d,
         size=12, color=MUTED, line_spacing=1.3)

gn = box(s, M, Inches(5.12), CW, Inches(0.62), fill=WARM, shadow=INK)
celltext(gn, "Neither payer nor recipient ever holds a gas token.",
         size=14, font=MONO, bold=True, align=PP_ALIGN.CENTER, pad=0)

# ------------------------------------------------------------------ 04 four doors
s = slide()
slidenum(s, 4)
eyebrow(s, "Same rail, four callers")
heading(s, "Built for software first.", Inches(0.95))

doors = [
    ("Human · Web app", WARM, "Connect a wallet, pick chains, sign, watch it land live.", None),
    ("Agent · SDK", WARM, "One call, no browser, no gas.", "await breeja.pay({ … })"),
    ("Agent · MCP", WARM, "Claude pays across chains as a tool call, with spend caps enforced.", None),
    ("Agent · x402", WARM, "Hit a paywalled endpoint, settle, retry with proof. Cross-chain.", None),
]
dw = (CW - Inches(0.3)) / 2
dh = Inches(1.62)
for i, (title, col, body, code) in enumerate(doors):
    x = M + (dw + Inches(0.3)) * (i % 2)
    y = Inches(2.15) + (dh + Inches(0.3)) * (i // 2)
    box(s, x, y, dw, dh, fill=PANEL, shadow=INK)
    hd = box(s, x, y, dw, Inches(0.48), fill=col)
    celltext(hd, title, size=11, font=MONO, bold=True, spacing=1.2, color=ACCENT)
    text(s, x + Inches(0.22), y + Inches(0.68), dw - Inches(0.44), Inches(0.5), body,
         size=13, color=MUTED, line_spacing=1.3)
    if code:
        cb = box(s, x + Inches(0.22), y + Inches(1.06), dw - Inches(0.44), Inches(0.36), fill=PAPER)
        celltext(cb, code, size=11, font=MONO, pad=Inches(0.1))

text(s, M, Inches(5.72), Inches(11.5), Inches(0.4),
     "All four consume the same SDK. The SDK is the product — the web app is just one client.",
     size=13, color=MUTED)

# ------------------------------------------------------------------ 05 code
s = slide()
slidenum(s, 5)
eyebrow(s, "Developer experience")
heading(s, "The whole integration.", Inches(0.95))

cbw = Inches(7.4)
box(s, M, Inches(2.02), cbw, Inches(2.85), fill=INK, line=INK, shadow=BLUE)
code_lines = [
    [("import ", {"color": LAVENDER}), ("{ Breeja } ", {"color": PAPER}), ("from ", {"color": LAVENDER}), ('"@breeja/sdk";', {"color": MINT})],
    [("", {})],
    [("const ", {"color": LAVENDER}), ("payment = ", {"color": PAPER}), ("await ", {"color": LAVENDER}), ("breeja.", {"color": PAPER}), ("pay", {"color": YELLOW}), ("({", {"color": PAPER})],
    [("  from:      ", {"color": PAPER}), ('"base-sepolia",', {"color": MINT})],
    [("  to:        ", {"color": PAPER}), ('"arbitrum-sepolia",', {"color": MINT})],
    [("  amount:    ", {"color": PAPER}), ('"10.00",', {"color": MINT})],
    [("  recipient: ", {"color": PAPER}), ('"alice.eth",', {"color": MINT})],
    [("  signer:    account,", {"color": PAPER})],
    [("});", {"color": PAPER})],
    [("", {})],
    [("// → settled in seconds, no gas token held", {"color": RGBColor(0x8F, 0xA3, 0xBF)})],
]
tb = s.shapes.add_textbox(M + Inches(0.28), Inches(2.26), cbw - Inches(0.56), Inches(2.4))
tf = tb.text_frame
tf.word_wrap = False
tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
for i, line in enumerate(code_lines):
    p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
    p.line_spacing = 1.32
    for content, opts in line:
        r = p.add_run()
        r.text = content
        r.font.name = MONO
        r.font.size = Pt(13)
        r.font.bold = True
        r.font.color.rgb = opts.get("color", PAPER)

feats = [
    ("Runtime discovery", "Agents call chains() — never a hardcoded list.", BLUE),
    ("Typed errors", "Stable codes an agent can branch on exhaustively.", MINT),
    ("Idempotent", "Keyed on the permit nonce. Retries never double-spend.", ORANGE),
]
fx = M + cbw + Inches(0.34)
fw = CW - cbw - Inches(0.34)
for i, (t, d, col) in enumerate(feats):
    y = Inches(2.02) + i * Inches(1.0)
    box(s, fx, y, fw, Inches(0.86), fill=PANEL)
    tp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, fx, y, fw, Inches(0.1))
    tp.fill.solid(); tp.fill.fore_color.rgb = col; tp.line.fill.background(); tp.shadow.inherit = False
    text(s, fx + Inches(0.2), y + Inches(0.22), fw - Inches(0.4), Inches(0.25), t, size=14, font=DISPLAY, bold=True)
    text(s, fx + Inches(0.2), y + Inches(0.5), fw - Inches(0.4), Inches(0.4), d, size=11, color=MUTED, line_spacing=1.25)

# ------------------------------------------------------------------ 06 routing
s = slide()
slidenum(s, 6)
eyebrow(s, "Routing")
heading(s, "A real choice, not a single path.", Inches(0.95))
lede(s, "Every payment is quoted across routes and scored on live gas, pool liquidity, and caller preference.", Inches(1.95))

cols = [Inches(2.3), Inches(1.6), Inches(1.6), Inches(2.5), Inches(4.09)]
heads = ["Route", "Latency", "Cost", "Custody", "Best for"]
y = Inches(2.95)
rowh = Inches(0.56)
x = M
for i, hd in enumerate(heads):
    c = box(s, x, y, cols[i], rowh, fill=INK)
    celltext(c, hd, size=11, font=MONO, bold=True, color=PAPER, spacing=1.0)
    x += cols[i]

rows = [
    ("Fast pool", "~10s", "0.5%", ("Custodial", MUTED, PAPER), "Small, latency-sensitive payments"),
    ("CCTP", "~15m", "gas only", ("Trust-minimized", WARM, ACCENT), "Large transfers, canonical guarantees"),
]
for ri, (a, b, c_, tagd, e) in enumerate(rows):
    yy = y + rowh + ri * Inches(0.66)
    x = M
    vals = [a, b, c_, None, e]
    for i, v in enumerate(vals):
        cell = box(s, x, yy, cols[i], Inches(0.66), fill=PANEL)
        if i == 3:
            label, tcol, txtcol = tagd
            tw = Inches(0.24 + 0.088 * len(label))
            tg = box(s, x + Inches(0.16), yy + Inches(0.17), tw, Inches(0.32), fill=tcol)
            celltext(tg, label, size=10, font=MONO, bold=True, align=PP_ALIGN.CENTER, pad=0, color=txtcol)
        else:
            celltext(cell, v, size=13, bold=(i == 0),
                     font=MONO if i in (1, 2) else SANS)
        x += cols[i]

text(s, M, Inches(5.05), Inches(11.8), Inches(0.6),
     'Callers override with preference: "fast" | "cheap" | "trustless". Custody risk scales with amount; latency tolerance doesn\'t.',
     size=13, color=MUTED, line_spacing=1.3)

# ------------------------------------------------------------------ 07 AI layer
s = slide()
slidenum(s, 7)
eyebrow(s, "The AI layer")
heading(s, "Models explain. They never decide.", Inches(0.95))
lede(s, "The boundary is enforced in code, and it's why the system is auditable.", Inches(1.95))

bcols = [
    ("LLM permitted", WARM, INK, ["Parse natural-language intent", "Explain a completed decision"]),
    ("Deterministic", INK, PAPER, ["Validate the request", "Select the route", "Compute the fee"]),
    ("LLM forbidden", MUTED, PAPER, ["Choosing where money goes", "Authorizing a release"]),
]
bw = CW / 3
by = Inches(2.85)
bh = Inches(1.92)
box(s, M, by, CW, bh, fill=PANEL)
for i, (hd, col, txtcol, items) in enumerate(bcols):
    x = M + bw * i
    h = box(s, x, by, bw, Inches(0.48), fill=col)
    celltext(h, hd, size=11, font=MONO, bold=True, spacing=1.2, color=txtcol)
    for j, it in enumerate(items):
        iy = by + Inches(0.48) + j * Inches(0.48)
        c = box(s, x, iy, bw, Inches(0.48), fill=PANEL)
        celltext(c, it, size=12)
    if i:
        v = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, by, Pt(2.25), bh)
        v.fill.solid(); v.fill.fore_color.rgb = INK; v.line.fill.background(); v.shadow.inherit = False

co = box(s, M, Inches(5.15), CW, Inches(0.92), fill=WARM, shadow=INK)
celltext(co, "Every number in a generated explanation is validated against the decision object. Mismatch falls back to a template — a model never states a fee the system didn't compute.",
         size=13.5, bold=True, pad=Inches(0.28), line_spacing=1.3)

# ------------------------------------------------------------------ 08 chains
s = slide()
slidenum(s, 8)
eyebrow(s, "Coverage")
heading(s, "Every chain is both a source and a destination.", Inches(0.95), size=34)

chains = [
    ("Base", "Sepolia · 84532", "Fast pool · CCTP", BLUE),
    ("Arbitrum", "Sepolia · 421614", "Fast pool · CCTP", BLUE),
    ("Optimism", "Sepolia · 11155420", "Fast pool · CCTP", BLUE),
    ("Arc", "Circle's L1 · native USDC", "Fast pool · CCTP", MINT),
    ("Hedera", "Testnet · 296", "Fast pool", LAVENDER),
    ("Ethereum", "Sepolia · 11155111", "Source only", INK),
]
cwd = (CW - Inches(0.44)) / 3
chh = Inches(1.42)
for i, (nm, sub, routes, col) in enumerate(chains):
    x = M + (cwd + Inches(0.22)) * (i % 3)
    y = Inches(2.3) + (chh + Inches(0.28)) * (i // 3)
    box(s, x, y, cwd, chh, fill=PANEL, shadow=col)
    text(s, x + Inches(0.24), y + Inches(0.22), cwd - Inches(0.48), Inches(0.3), nm,
         size=18, font=DISPLAY, bold=True)
    text(s, x + Inches(0.24), y + Inches(0.62), cwd - Inches(0.48), Inches(0.25), sub,
         size=11, font=MONO, color=MUTED)
    text(s, x + Inches(0.24), y + Inches(0.96), cwd - Inches(0.48), Inches(0.25), routes,
         size=11, font=MONO, bold=True, spacing=0.6)

text(s, M, Inches(5.95), Inches(11.8), Inches(0.4),
     "A payment is a directed edge between any two. Not a hub-and-spoke bridge.",
     size=13, color=MUTED)

# ------------------------------------------------------------------ 09 trust
s = slide()
slidenum(s, 9)
eyebrow(s, "Trust model")
heading(s, "Stated plainly, not buried.", Inches(0.95))

tw = CW / 2
ty = Inches(2.15)
th = Inches(2.55)
box(s, M, ty, CW, th, fill=PANEL)
v = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, M + tw, ty, Pt(2.25), th)
v.fill.solid(); v.fill.fore_color.rgb = INK; v.line.fill.background(); v.shadow.inherit = False

mitig = [
    "CCTP offered as a trust-minimized alternative for the same payment",
    "Pool ownership held by a Safe multisig, not a single EOA",
    "Release authority is Ledger-backed, not a hot server key",
    "State is durable and reconciled from chain events",
]
nots = [
    "The fast-pool route is custodial — the relayer controls liquidity and decides when to release",
    "Release is not decentralized. A bonded watcher network is the next real trust reduction, and it is not in this build",
]
text(s, M + Inches(0.3), ty + Inches(0.26), tw - Inches(0.6), Inches(0.3), "What we mitigate",
     size=11, font=MONO, bold=True, spacing=1.2, caps=True)
yy = ty + Inches(0.68)
for it in mitig:
    text(s, M + Inches(0.3), yy, Inches(0.16), Inches(0.3), "—", size=12, color=INK, bold=True)
    text(s, M + Inches(0.56), yy, tw - Inches(0.92), Inches(0.5), it, size=12.5, color=MUTED, line_spacing=1.25)
    yy += Inches(0.46)

text(s, M + tw + Inches(0.34), ty + Inches(0.26), tw - Inches(0.64), Inches(0.3), "What we don't claim",
     size=11, font=MONO, bold=True, spacing=1.2, caps=True)
yy = ty + Inches(0.68)
for it in nots:
    text(s, M + tw + Inches(0.34), yy, Inches(0.16), Inches(0.3), "—", size=12, color=INK, bold=True)
    text(s, M + tw + Inches(0.6), yy, tw - Inches(0.94), Inches(0.8), it, size=12.5, color=MUTED, line_spacing=1.25)
    yy += Inches(0.78)

co = box(s, M, Inches(5.05), CW, Inches(0.72), fill=WARM, shadow=INK)
celltext(co, "Same tradeoff early Across and Hop shipped — and the honest reason the fast route is fast.",
         size=14, bold=True, align=PP_ALIGN.CENTER, pad=Inches(0.2))

# ------------------------------------------------------------------ 10 partners
s = slide()
slidenum(s, 10)
eyebrow(s, "Integrations")
heading(s, "Each one load-bearing.", Inches(0.95))

partners = [
    ("Circle / Arc", "CCTP settlement route + native USDC chain"),
    ("The Graph", "Indexed payment history across every chain"),
    ("Privy", "Embedded wallets and agent server wallets"),
    ("ENS", "Agent identity — pay a name, not a hex string"),
    ("Ledger", "Hardware-backed release authority"),
    ("Hedera", "Source and destination chain"),
    ("Bazantic", "Agent-ready SDK and MCP tooling"),
    ("World", "Verified human authorizes an agent's spend cap"),
]
pw = CW / 4
ph = Inches(1.28)
py = Inches(2.15)
box(s, M, py, CW, ph * 2, fill=PANEL)
for i, (nm, d) in enumerate(partners):
    x = M + pw * (i % 4)
    y = py + ph * (i // 4)
    if i % 4:
        v = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, py, Pt(2.25), ph * 2)
        v.fill.solid(); v.fill.fore_color.rgb = INK; v.line.fill.background(); v.shadow.inherit = False
    if i == 4:
        hln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, M, py + ph, CW, Pt(2.25))
        hln.fill.solid(); hln.fill.fore_color.rgb = INK; hln.line.fill.background(); hln.shadow.inherit = False
    text(s, x + Inches(0.22), y + Inches(0.24), pw - Inches(0.44), Inches(0.3), nm,
         size=15, font=DISPLAY, bold=True)
    text(s, x + Inches(0.22), y + Inches(0.62), pw - Inches(0.44), Inches(0.6), d,
         size=11.5, color=MUTED, line_spacing=1.3)

text(s, M, Inches(5.05), Inches(12), Inches(0.4),
     "Deliberately skipped: AMM and DeFi-position tracks. A swap bolted onto a payment rail is the integration judges see through.",
     size=13, color=MUTED)

# ------------------------------------------------------------------ 11 status
s = slide()
slidenum(s, 11)
eyebrow(s, "Status")
heading(s, "Shipped, in flight, next.", Inches(0.95))

items = [
    ("EIP-3009 gasless permits, live on real testnets", "Shipped", INK),
    ("Contracts covered by tests, deployed and verified", "Shipped", INK),
    ("Agent-to-agent payment, no browser in the loop", "Shipped", INK),
    ("Durable state, idempotency, reconciliation", "In flight", ACCENT),
    ("Multi-chain mesh + CCTP route scoring", "In flight", ACCENT),
    ("SDK, MCP server, x402 demo", "In flight", ACCENT),
    ("Bonded watcher network — decentralized release", "Next", PANEL),
    ("Mainnet with funded liquidity and multisig custody", "Next", PANEL),
]
y0 = Inches(2.1)
rh = Inches(0.56)
box(s, M, y0, CW, rh * len(items), fill=PANEL)
for i, (label, state, col) in enumerate(items):
    y = y0 + rh * i
    if i:
        hl = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, M, y, CW, Pt(2.25))
        hl.fill.solid(); hl.fill.fore_color.rgb = INK; hl.line.fill.background(); hl.shadow.inherit = False
    d = box(s, M + Inches(0.26), y + Inches(0.18), Inches(0.2), Inches(0.2), fill=col, line=BORDER, lw=1.25)
    text(s, M + Inches(0.66), y + Inches(0.15), Inches(8.6), Inches(0.3), label, size=13.5)
    text(s, W - M - Inches(1.7), y + Inches(0.17), Inches(1.5), Inches(0.3), state,
         size=10.5, font=MONO, bold=True, color=MUTED, spacing=1.2, align=PP_ALIGN.RIGHT, caps=True)

# ------------------------------------------------------------------ 12 ask
s = slide(INK)
slidenum(s, 12)
sn = s.shapes[-1]
sn.fill.fore_color.rgb = PAPER
sn.text_frame.paragraphs[0].runs[0].font.color.rgb = INK

eyebrow(s, "The ask", color=BLUE)
text(s, M, Inches(1.15), Inches(10.5), Inches(1.8),
     ["Agents are about to need", "a way to pay each other."],
     size=42, font=DISPLAY, color=PAPER, bold=True, line_spacing=0.98)
text(s, M, Inches(3.15), Inches(8.6), Inches(0.6),
     "Breeja is that rail — and it works for people too, through the same contracts.",
     size=17, color=RGBColor(0xC3, 0xCC, 0xD8), line_spacing=1.35)

asks = [
    ("Try it", "Install the SDK and settle a cross-chain payment in one call."),
    ("Plug in", "Add the MCP server and let your agent pay across chains today."),
    ("Build on it", "Use Breeja as the settlement leg behind your own x402 endpoint."),
]
aw = (CW - Inches(0.5)) / 3
for i, (t, d) in enumerate(asks):
    x = M + (aw + Inches(0.25)) * i
    box(s, x, Inches(4.25), aw, Inches(1.5), fill=None, line=PAPER)
    text(s, x + Inches(0.26), Inches(4.5), aw - Inches(0.52), Inches(0.3), t,
         size=11, font=MONO, bold=True, color=BLUE, spacing=1.2, caps=True)
    text(s, x + Inches(0.26), Inches(4.9), aw - Inches(0.52), Inches(0.7), d,
         size=13, color=PAPER, line_spacing=1.35)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Breeja-Pitch-Deck.pptx")
prs.save(out)
print("saved", out)

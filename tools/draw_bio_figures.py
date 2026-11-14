#!/usr/bin/env python3
"""Original SVG figures for the Biology diagram questions -> assets/figures/<chapter>/<question id>.svg

Every figure is drawn here from the question's content (what the paper's figure must show, see
docs/build-log.md, 14 Nov 2026 Biology entry). None is traced or copied from NCERT or a paper.
Labels are letters, symbols and formulas wherever possible; the few word labels are bilingual
(English · NCERT Hindi term). Re-run after editing:  python3 tools/draw_bio_figures.py
"""
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "figures")

INK = "#22313a"
SOFT = "#5b6b73"
TEAL = "#d9eeeb"
SAND = "#f4e6cf"
LEAF = "#dcebd2"
PINK = "#f6dede"
FONT = "Mukta, 'Noto Sans Devanagari', Arial, sans-serif"

FIGS = {}


def fig(chapter, qid):
    def deco(fn):
        FIGS[(chapter, qid)] = fn
        return fn
    return deco


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def svg(w, h, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" '
            f'font-family="{FONT}">\n<title>{esc(title)}</title>\n'
            f'<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker></defs>\n'
            f'<rect x="0" y="0" width="{w}" height="{h}" rx="12" fill="#ffffff"/>\n{body}\n</svg>\n')


def T(x, y, s, size=16, anchor="middle", weight="normal", fill=INK, raw=False, extra=""):
    s = s if raw else esc(s)
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}" fill="{fill}" {extra}>{s}</text>'


def L(x1, y1, x2, y2, w=2, color=INK, arrow=False, dash=None, extra=""):
    a = ' marker-end="url(#ar)"' if arrow else ""
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{w}"{a}{d} {extra}/>'


def P(d, fill="none", w=2, color=INK, extra="", cap="round"):
    return f'<path d="{d}" fill="{fill}" stroke="{color}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="{cap}" {extra}/>'


def C(x, y, r, fill="none", w=2, color=INK, extra=""):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{color}" stroke-width="{w}" {extra}/>'


def R(x, y, w, h, fill="none", sw=2, color=INK, rx=0, extra=""):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{color}" stroke-width="{sw}" {extra}/>'


def chem(s):
    """'HCO3-' -> tspans: digits after a letter become subscripts, a trailing + or - a superscript."""
    out, i = [], 0
    while i < len(s):
        ch = s[i]
        if ch.isdigit() and i > 0 and s[i - 1].isalpha():
            out.append(f'<tspan baseline-shift="sub" font-size="75%">{ch}</tspan>')
        elif ch in "+-" and i == len(s) - 1:
            out.append(f'<tspan baseline-shift="super" font-size="75%">{"+" if ch == "+" else "−"}</tspan>')
        else:
            out.append(esc(ch))
        i += 1
    return "".join(out)


def label_line(x1, y1, x2, y2, letter, side="right", size=18):
    """Leader line from the part (x1, y1) to a letter at (x2, y2)."""
    dx = 8 if side == "right" else -8
    anchor = "start" if side == "right" else "end"
    return L(x1, y1, x2, y2, 1.5) + C(x1, y1, 2.5, fill=INK, w=0) + T(x2 + dx, y2 + 6, letter, size, anchor, "bold")


# ---------------------------------------------------------------- Class 11 · Ch 5 Morphology
@fig("bio11-05", "bio11-05-neet-2024-q145-esaral-copy")
def flowers_perigynous():
    def flower(cx, base, depth, cupw, ovr):
        b = []
        b.append(L(cx, base + 70, cx, base + 4, 5, "#6f8f5a"))                       # pedicel
        top = base - depth
        cup = (f"M{cx-cupw},{top} C{cx-cupw},{base-depth*0.2} {cx-cupw*0.55},{base+10} {cx},{base+10} "
               f"C{cx+cupw*0.55},{base+10} {cx+cupw},{base-depth*0.2} {cx+cupw},{top}")
        inner = (f"M{cx-cupw+9},{top} C{cx-cupw+9},{base-depth*0.25} {cx-cupw*0.45},{base} {cx},{base} "
                 f"C{cx+cupw*0.45},{base} {cx+cupw-9},{base-depth*0.25} {cx+cupw-9},{top}")
        b.append(P(cup, fill=LEAF, w=2.2))
        b.append(P(inner, fill="#ffffff", w=1.6))
        # ovary sitting free on the floor of the cup, style and stigma
        oy = base - ovr * 1.05
        b.append(f'<ellipse cx="{cx}" cy="{oy:.1f}" rx="{ovr*0.8:.1f}" ry="{ovr:.1f}" fill="{PINK}" stroke="{INK}" stroke-width="2"/>')
        b.append(f'<ellipse cx="{cx}" cy="{oy+2:.1f}" rx="3" ry="5" fill="{INK}"/>')
        b.append(L(cx, oy - ovr, cx, top - 62, 2.2))
        b.append(P(f"M{cx-9},{top-62} Q{cx},{top-74} {cx+9},{top-62}", fill=PINK, w=2))
        for s in (-1, 1):
            rx = cx + s * cupw
            # sepal (short, turned down and out)
            b.append(P(f"M{rx},{top} Q{rx+s*30},{top-6} {rx+s*46},{top+22} Q{rx+s*22},{top+12} {rx},{top+4}", fill=LEAF, w=1.8))
            # petal (large, up and out)
            b.append(P(f"M{rx},{top-2} Q{rx+s*30},{top-30} {rx+s*58},{top-62} Q{rx+s*18},{top-48} {rx-s*2},{top-6}", fill=SAND, w=1.8))
            # stamens
            for k, (dx, dy) in enumerate(((-18, -58), (-4, -64))):
                ax, ay = rx + s * dx, top + dy
                b.append(L(rx - s * 4, top - 2, ax, ay + 8, 1.6))
                b.append(f'<ellipse cx="{ax:.1f}" cy="{ay:.1f}" rx="4" ry="8" fill="#f0c25a" stroke="{INK}" stroke-width="1.4"/>')
        return "".join(b)

    body = flower(140, 200, 34, 52, 22) + flower(390, 200, 52, 60, 26)
    body += T(140, 300, "(a)", 20, weight="bold") + T(390, 300, "(b)", 20, weight="bold")
    return svg(520, 320, "Two flowers (a) and (b) in longitudinal section", body)


@fig("bio11-05", "bio11-05-neet-2024-q147-esaral-copy")
def maize_grain():
    b = []
    # grain outline (fruit wall + seed coat fused) and endosperm
    b.append(P("M150,30 C70,34 48,140 66,230 C80,300 120,336 168,340 C214,336 246,300 252,232 C262,130 232,30 150,30 Z",
               fill=SAND, w=2.5))
    b.append(P("M150,44 C84,48 64,140 78,224 C88,280 112,306 140,316", w=1.2, color=SOFT, extra='stroke-dasharray="3 4"'))
    for x, y in ((110, 90), (95, 140), (120, 160), (100, 200), (130, 115), (150, 70), (115, 250), (140, 210)):
        b.append(C(x, y, 1.8, fill=SOFT, w=0))
    # scutellum (shield) and embryo axis along the right side
    b.append(P("M196,110 C164,140 158,240 186,300 C204,312 222,300 226,280 C232,220 230,150 214,116 Z", fill=LEAF, w=2))
    # coleoptile (outer sheath, top) and plumule (inside)
    b.append(P("M212,132 C196,150 196,186 204,206 L226,206 C232,186 230,150 212,132 Z", fill="#ffffff", w=2))
    b.append(P("M213,150 C205,162 205,184 209,200 L221,200 C224,184 222,162 213,150 Z", fill="#b9dca6", w=1.6))
    # radicle (inside) and coleorhiza (outer sheath, bottom)
    b.append(P("M204,226 L226,226 C230,256 224,286 214,296 C204,286 200,256 204,226 Z", fill="#ffffff", w=2))
    b.append(P("M209,232 L221,232 C223,254 220,272 215,280 C210,272 207,254 209,232 Z", fill="#e9c9a8", w=1.6))
    b.append(L(206, 216, 224, 216, 1.6))   # short embryo axis between the two ends
    b.append(label_line(214, 140, 300, 110, "A"))
    b.append(label_line(214, 176, 300, 168, "B"))
    b.append(label_line(215, 256, 300, 246, "C"))
    b.append(label_line(214, 292, 300, 304, "D"))
    return svg(360, 360, "Longitudinal section of a maize grain, four parts labelled A to D", "".join(b))


def floral_sym_actino(x, y, r=9):
    return C(x, y, r, w=1.8) + L(x - r - 4, y, x + r + 4, y, 1.8) + L(x, y - r - 4, x, y + r + 4, 1.8)


def floral_sym_bisexual(x, y):
    # circle with an arrow (male) and a cross (female) on one body
    return (C(x, y, 7, w=1.8) + L(x + 5, y - 5, x + 13, y - 13, 1.8) + P(f"M{x+7},{y-13} L{x+13},{y-13} L{x+13},{y-7}", w=1.8)
            + L(x, y + 7, x, y + 18, 1.8) + L(x - 5, y + 13, x + 5, y + 13, 1.8))


def part(x, y, letter, n, united, size=20):
    """K(5) / C5 etc. Returns (svg, width)."""
    sub = f"({n})" if united else str(n)
    s = T(x, y, letter, size, "start") + T(x + size * 0.68, y + 6, sub, size * 0.65, "start")
    return s, size * 0.68 + size * 0.65 * (0.62 * len(sub)) + 10


@fig("bio11-05", "bio11-05-neet-2025-code-45-q104")
def floral_symbols():
    b = [floral_sym_actino(150, 80, 22)]
    b.append(T(330, 100, "G", 58, weight="bold"))
    b.append(L(305, 112, 355, 112, 4))
    return svg(480, 150, "Two floral formula symbols: a circle with a plus sign, and the letter G with a line below it",
               "".join(b))


@fig("bio11-05", "bio11-05-neet-2026-q121-esaral-copy")
def solanaceae_formulas():
    b = []
    rows = [(False, False), (True, False), (False, True)]
    opts = [(True, False), (False, False), (True, True), (False, True)]  # (calyx united, epipetalous arc)
    for i, (k_united, arc) in enumerate(opts):
        y = 52 + i * 62
        b.append(T(26, y + 6, f"{i+1})", 18, "start", "bold"))
        b.append(floral_sym_actino(84, y))
        b.append(floral_sym_bisexual(118, y - 2))
        b.append(part(150, y + 7, "K", 5, k_united)[0])
        cx0 = 212
        b.append(part(cx0, y + 7, "C", 5, True)[0])
        b.append(part(270, y + 7, "A", 5, False)[0])
        ax1, x = 284, 316
        if arc:
            b.append(P(f"M{cx0+6},{y-12} Q{(cx0+ax1)/2+4},{y-34} {ax1},{y-12}", w=1.8))
        b.append(T(x, y + 7, "G", 20, "start"))
        b.append(L(x, y + 11, x + 14, y + 11, 1.8))
        b.append(T(x + 14, y + 13, "(2)", 13, "start"))
    return svg(400, 280, "Four floral formulas, numbered 1 to 4", "".join(b))


# ---------------------------------------------------------------- Class 11 · Ch 6 Anatomy
@fig("bio11-06", "bio11-06-neet-2024-q141-esaral-copy")
def stomata():
    b = []
    cx, cy = 230, 160
    # epidermal cells: irregular polygons around the stomatal complex
    b.append(R(20, 20, 420, 280, fill="#f7fbf4", sw=2, rx=6))
    spokes = [(20, 60), (120, 20), (250, 20), (360, 20), (440, 90), (440, 210), (370, 300), (250, 300), (120, 300), (20, 250)]
    ring = []
    for k in range(10):
        a = math.radians(-160 + k * 36)
        ring.append((cx + 96 * math.cos(a), cy + 92 * math.sin(a)))
    ring = sorted(ring, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    spokes = sorted(spokes, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
    for (x1, y1), (x2, y2) in zip(ring, spokes):
        b.append(L(x1, y1, x2, y2, 1.8))
    # subsidiary cells: the ring between the guard cells and the epidermal cells, split in two
    b.append(f'<ellipse cx="{cx}" cy="{cy}" rx="96" ry="92" fill="#ffffff" stroke="{INK}" stroke-width="2"/>')
    b.append(L(cx, cy - 92, cx, cy - 56, 1.8) + L(cx, cy + 56, cx, cy + 92, 1.8))
    # guard cells: bean shaped, thin outer wall, thick inner wall (towards the pore)
    for s in (-1, 1):
        outer = f"M{cx},{cy-56} C{cx+s*60},{cy-58} {cx+s*60},{cy+58} {cx},{cy+56}"
        inner = f"M{cx},{cy+56} C{cx+s*24},{cy+30} {cx+s*24},{cy-30} {cx},{cy-56}"
        b.append(P(outer + " " + inner.replace("M", "L", 1) + " Z", fill="#e3f0d8", w=0))
        b.append(P(outer, w=1.6))
        b.append(P(inner, w=6))
        for k, (dx, dy) in enumerate(((30, -26), (38, 0), (30, 26), (26, -8), (28, 14))):
            b.append(f'<ellipse cx="{cx+s*dx}" cy="{cy+dy}" rx="4.5" ry="3" fill="#6fae58"/>')
    # pore
    b.append(P(f"M{cx},{cy-52} C{cx+19},{cy-26} {cx+19},{cy+26} {cx},{cy+52} C{cx-19},{cy+26} {cx-19},{cy-26} {cx},{cy-52} Z",
               fill="#e9edf0", w=0))
    b.append(label_line(80, 70, 470, 46, "A"))
    b.append(label_line(cx + 70, cy + 34, 470, 250, "B"))
    b.append(label_line(cx + 34, cy - 14, 470, 120, "C"))
    b.append(label_line(cx + 1, cy + 8, 470, 180, "D"))
    return svg(500, 320, "Surface view of a stoma with its surrounding cells, four parts labelled A to D", "".join(b))


# ---------------------------------------------------------------- Class 11 · Ch 9 Biomolecules
@fig("bio11-09", "bio11-09-neet-2016-phase-2-code-aa-q144")
def enzyme_energy():
    b = []
    x0, y0, x1 = 70, 300, 500
    b.append(L(x0, y0, x0, 30, 2, arrow=True) + L(x0, y0, x1, y0, 2, arrow=True))
    b.append(T(30, 170, "Potential energy · विभव ऊर्जा", 14, extra='transform="rotate(-90 30 170)"'))
    ys, yp = 190, 250
    big = f"M{x0+10},{ys} L{x0+90},{ys} C{x0+150},{ys} {x0+170},{60} {x0+220},{60} C{x0+270},{60} {x0+300},{yp} {x0+350},{yp} L{x1-20},{yp}"
    small = f"M{x0+90},{ys} C{x0+150},{ys} {x0+175},{140} {x0+220},{140} C{x0+265},{140} {x0+300},{yp} {x0+350},{yp}"
    b.append(P(big, w=2.6))
    b.append(P(small, w=2.6, extra='stroke-dasharray="8 6"'))
    b.append(L(x0 + 10, ys, x0 + 250, ys, 1, SOFT, dash="3 4"))
    # activation-energy arrows
    b.append(L(x0 + 200, ys, x0 + 200, 64, 1.8, arrow=True) + T(x0 + 186, 120, "B", 20, weight="bold"))
    b.append(L(x0 + 236, ys, x0 + 236, 144, 1.8, arrow=True) + T(x0 + 252, 176, "A", 20, weight="bold"))
    b.append(T(x0 + 14, ys + 24, "Substrate · क्रियाधार", 14, "start"))
    b.append(T(x1 - 20, yp + 24, "Product · उत्पाद", 14, "end"))
    return svg(520, 320, "Energy curve of a reaction with two humps of different height, A and B", "".join(b))


@fig("bio11-09", "bio11-09-neet-2026-q167-esaral-copy")
def lyase_scheme():
    b = []
    # substrate: two carbons in a chain, X on one and Y on the next
    b.append(L(20, 90, 50, 90) + T(68, 97, "C", 22, weight="bold") + L(84, 90, 124, 90, 2.4) + T(140, 97, "C", 22, weight="bold") + L(156, 90, 186, 90))
    b.append(L(68, 76, 68, 52) + T(68, 44, "X", 20, weight="bold"))
    b.append(L(140, 76, 140, 52) + T(140, 44, "Y", 20, weight="bold"))
    b.append(L(206, 90, 300, 90, 2.4, arrow=True) + T(253, 78, "E", 20, weight="bold"))
    # products: X–Y and C=C
    b.append(T(352, 58, "X", 20, weight="bold") + L(364, 51, 392, 51, 2.4) + T(404, 58, "Y", 20, weight="bold"))
    b.append(T(424, 58, "+", 22))
    b.append(L(320, 112, 344, 112) + T(358, 119, "C", 22, weight="bold") + L(374, 108, 410, 108, 2.4) + L(374, 116, 410, 116, 2.4)
             + T(426, 119, "C", 22, weight="bold") + L(442, 112, 466, 112))
    return svg(490, 150, "Reaction scheme: a substrate with groups X and Y on neighbouring carbons is changed by enzyme E", "".join(b))


# ---------------------------------------------------------------- Class 11 · Ch 16 Excretion
@fig("bio11-16", "bio11-16-neet-2025-code-45-q125")
def pct_dct():
    data = [
        (["HCO3-", "NaCl"], ["H+", "H2O"], ["NaCl", "H2O", "HCO3-"], ["K+", "H+"]),
        (["HCO3-", "NaCl", "H2O"], ["H+", "NH3"], ["NaCl", "H2O", "HCO3-"], ["K+", "H+"]),
        (["HCO3-", "NaCl", "H2O"], ["H+", "NH3"], ["H2O", "HCO3-"], ["NaCl", "H+"]),
        (["NaCl", "HCO3-"], ["H+", "H2O"], ["NaCl", "NH3"], ["K+", "H2O"]),
    ]
    b = []
    H = 150
    for i, (pu, pd, du, dd) in enumerate(data):
        y = 20 + i * H
        b.append(T(22, y + 18, f"({i+1})", 18, "start", "bold"))
        for (x0, name, up, down) in ((80, "P", pu, pd), (320, "D", du, dd)):
            wt, wb = y + 62, y + 88       # tubule walls (lumen between)
            b.append(R(x0, wt, 200, wb - wt, fill=TEAL, sw=0))
            b.append(L(x0, wt, x0 + 200, wt, 2.4) + L(x0, wb, x0 + 200, wb, 2.4))
            b.append(T(x0 - 14, y + 81, name, 18, weight="bold"))
            n = len(up)
            for k, s in enumerate(up):            # reabsorbed: out of the lumen, upwards
                xx = x0 + 20 + 60 * k
                b.append(L(xx, wb - 6, xx, y + 34, 1.8, arrow=True))
                b.append(T(xx, y + 30, chem(s), 15, raw=True))
            n = len(down)
            for k, s in enumerate(down):          # secreted: from outside into the lumen, upwards
                xx = x0 + 50 + 60 * k
                b.append(L(xx, y + 118, xx, wt + 6, 1.8, arrow=True))
                b.append(T(xx, y + 138, chem(s), 15, raw=True))
        if i < 3:
            b.append(L(16, y + H - 4, 524, y + H - 4, 1, "#c9d3d6"))
    return svg(550, 20 + 4 * H, "Four diagrams, numbered 1 to 4, of the proximal (P) and distal (D) tubule with arrows for substances moving out of and into each tubule", "".join(b))


# ---------------------------------------------------------------- Class 11 · Ch 17 Locomotion
@fig("bio11-17", "bio11-17-neet-2024-q129-esaral-copy")
def muscles():
    b = []
    # (a) skeletal: long cylindrical striated fibres, many peripheral nuclei
    for k in range(3):
        y = 50 + k * 44
        b.append(R(20, y, 170, 34, fill=PINK, sw=1.8, rx=6))
        for xx in range(28, 186, 7):
            b.append(L(xx, y + 2, xx, y + 32, 1, "#b77b7b"))
        for xx in (50, 112, 160):
            b.append(f'<ellipse cx="{xx}" cy="{y+5}" rx="8" ry="3" fill="#4d5f99"/>')
    b.append(T(105, 225, "(a)", 18, weight="bold"))
    # (b) smooth: spindle-shaped cells, one central nucleus, no striations
    for k, (x, y) in enumerate(((215, 60), (250, 92), (220, 124), (255, 156), (225, 188))):
        b.append(P(f"M{x},{y} Q{x+60},{y-16} {x+120},{y} Q{x+60},{y+16} {x},{y} Z", fill=PINK, w=1.6))
        b.append(f'<ellipse cx="{x+60}" cy="{y}" rx="11" ry="3.5" fill="#4d5f99"/>')
    b.append(T(300, 225, "(b)", 18, weight="bold"))
    # (c) cardiac: branched striated cells joined end to end (intercalated discs), central nuclei
    bands = [(400, 48, 160, 30), (400, 103, 160, 30), (400, 158, 160, 30)]
    links = ["M440,78 L470,78 L500,103 L470,103 Z", "M500,133 L530,133 L500,158 L470,158 Z", "M520,78 L550,78 L530,103 L500,103 Z"]
    shapes = [f"M{x},{y} h{w} v{h} h{-w} Z" for x, y, w, h in bands] + links
    b.insert(0, '<clipPath id="cardiac">' + "".join(f'<path d="{d}"/>' for d in shapes) + '</clipPath>')
    for d in shapes:                      # outline only round the outside: thick dark pass, then fill on top
        b.append(P(d, fill=INK, w=3.6))
    for d in shapes:
        b.append(P(d, fill=PINK, w=0))
    for xx in range(402, 560, 7):
        b.append(L(xx, 44, xx, 192, 0.9, "#b77b7b", extra='clip-path="url(#cardiac)"'))
    for x1, y1 in ((455, 48), (520, 103), (430, 158), (540, 158)):
        b.append(L(x1, y1, x1, y1 + 30, 3.2, "#7a3e3e"))      # intercalated discs
    for xx, yy in ((425, 63), (500, 63), (450, 118), (480, 173), (510, 173)):
        b.append(f'<ellipse cx="{xx}" cy="{yy}" rx="7" ry="3.5" fill="#4d5f99"/>')
    b.append(T(480, 225, "(c)", 18, weight="bold"))
    return svg(580, 245, "Three kinds of muscle tissue labelled (a), (b) and (c)", "".join(b))


# ---------------------------------------------------------------- Class 12 · Ch 1 Sexual reproduction in flowering plants
@fig("bio12-01", "bio12-01-neet-2022-code-t2-q147")
def apple_ts():
    b = []
    cx, cy = 190, 180
    b.append(C(cx, cy, 135, fill="#f3d9c8", w=3, color="#9a3b32"))          # skin
    b.append(C(cx, cy, 128, fill="#fbf1df", w=0))                            # fleshy part
    b.append(C(cx, cy, 64, fill="#f6ead2", w=1.4, color=SOFT, extra='stroke-dasharray="4 4"'))  # boundary of the true fruit wall
    for k in range(10):
        a = math.radians(k * 36)
        b.append(C(cx + 64 * math.cos(a), cy + 64 * math.sin(a), 3, fill="#8aa36e", w=0))  # vascular strands
    # five papery locules with seeds
    for k in range(5):
        a = math.radians(-90 + k * 72)
        px, py = cx + 30 * math.cos(a), cy + 30 * math.sin(a)
        rot = k * 72
        b.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="10" ry="24" transform="rotate({rot} {px:.1f} {py:.1f})" '
                 f'fill="#ffffff" stroke="{INK}" stroke-width="2.2"/>')
        b.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="5" ry="10" transform="rotate({rot} {px:.1f} {py:.1f})" fill="#6b4226"/>')
    a = math.radians(-90 + 72)
    sx, sy = cx + 30 * math.cos(a), cy + 30 * math.sin(a)
    b.append(label_line(cx - 50, cy + 30, 360, 300, "A"))            # true fruit wall (fleshy inner region)
    bx, by = cx + 30 * math.cos(math.radians(-90 - 72)), cy + 30 * math.sin(math.radians(-90 - 72))
    b.append(label_line(bx - 8, by - 6, 360, 60, "B"))            # papery wall lining a locule
    b.append(label_line(cx + 100, cy - 40, 360, 120, "C"))
    b.append(label_line(sx + 2, sy + 2, 360, 200, "D"))
    return svg(400, 360, "Transverse section of an apple, four parts labelled A to D", "".join(b))


@fig("bio12-01", "bio12-01-neet-2024-q196-esaral-copy")
def grass_inflorescence():
    b = []
    b.append(P("M200,390 C198,330 196,260 200,40", w=3, color="#6f8f5a"))
    for k in range(13):
        y = 60 + k * 22
        for s in (-1, 1):
            if (k + (s > 0)) % 2:
                continue
            x = 200 + s * 4
            ex, ey = x + s * 22, y - 8
            b.append(f'<ellipse cx="{ex:.1f}" cy="{ey:.1f}" rx="16" ry="6" transform="rotate({s*-30} {ex:.1f} {ey:.1f})" '
                     f'fill="{LEAF}" stroke="#4f6e3f" stroke-width="1.5"/>')
            # long filament hanging out of the spikelet, anther dangling at its end
            fx, fy = ex + s * 14, ey - 2
            hx, hy = fx + s * (30 + (k % 3) * 8), fy + 38 + (k % 2) * 10
            b.append(P(f"M{fx:.1f},{fy:.1f} Q{fx+s*26:.1f},{fy+2:.1f} {hx:.1f},{hy:.1f}", w=1.2))
            b.append(f'<rect x="{hx-3:.1f}" y="{hy:.1f}" width="6" height="15" rx="3" fill="#e2b13c" stroke="{INK}" stroke-width="1"/>')
            # feathery stigma
            if k % 3 == 0:
                gx, gy = ex + s * 6, ey - 8
                b.append(L(gx, gy, gx + s * 10, gy - 20, 1.2, "#8c6d9e"))
                for t in range(4):
                    px, py = gx + s * 2.5 * t, gy - 5 * t
                    b.append(L(px, py, px - 5, py - 3, 1, "#8c6d9e") + L(px, py, px + 5, py - 3, 1, "#8c6d9e"))
    return svg(400, 400, "A compact feathery inflorescence with many small flowers", "".join(b))


# ---------------------------------------------------------------- Class 12 · Ch 2 Human reproduction
def box(x, y, w, h, label, fill="#ffffff", size=16, raw=False):
    lines = label.split("\n")
    s = R(x, y, w, h, fill=fill, sw=1.8, rx=8)
    for i, ln in enumerate(lines):
        s += T(x + w / 2, y + h / 2 + 6 + (i - (len(lines) - 1) / 2) * (size + 2), ln, size, raw=raw)
    return s


@fig("bio12-02", "bio12-02-neet-2024-q101-esaral-copy")
def gnrh_chart():
    b = []
    b.append(box(16, 104, 76, 44, "GnRH", TEAL))
    rows = [(40, ["LH", "(B)", "Androgens\nएंड्रोजेन", "Formation of spermatids\nशुक्राणुप्रसू का निर्माण"]),
            (168, ["(A)", "(C)", "Factors\nघटक", "(D)"])]
    for y, items in rows:
        b.append(P(f"M92,126 C112,126 106,{y+22} 126,{y+22}", w=1.8, extra='marker-end="url(#ar)"'))
        x = 130
        widths = [64, 64, 110, 200]
        for k, (lab, w) in enumerate(zip(items, widths)):
            b.append(box(x, y, w, 46, lab, SAND if lab.startswith("(") else "#ffffff", 14 if "\n" in lab else 16))
            if k < len(items) - 1:
                b.append(L(x + w + 2, y + 23, x + w + 22, y + 23, 1.8, arrow=True))
            x += w + 24
    return svg(700, 240, "Flow chart of hormones in spermatogenesis with four blanks A to D", "".join(b))


# ---------------------------------------------------------------- Class 12 · Ch 4 Inheritance
def male(x, y, aff=False, s=26, q=False):
    o = R(x - s / 2, y - s / 2, s, s, fill=INK if aff else "#ffffff", sw=2)
    return o + (T(x, y + 6, "?", 17, weight="bold") if q else "")


def female(x, y, aff=False, carrier=False, r=13.5, q=False):
    o = C(x, y, r, fill=INK if aff else "#ffffff", w=2)
    if carrier:
        o += C(x, y, 4.5, fill=INK, w=0)
    return o + (T(x, y + 6, "?", 17, weight="bold") if q else "")


def couple(x1, x2, y, double=False):
    if double:
        return L(x1, y - 3, x2, y - 3, 2) + L(x1, y + 3, x2, y + 3, 2)
    return L(x1, y, x2, y, 2)


def sibship(xm, ytop, xs, ychild):
    """Vertical line from a mating line at (xm, ytop) to a bar over children at xs."""
    ybar = ychild - 26
    s = L(xm, ytop, xm, ybar, 2)
    s += L(min(xs + [xm]), ybar, max(xs + [xm]), ybar, 2)
    for x in xs:
        s += L(x, ybar, x, ychild - 14, 2)
    return s


@fig("bio12-04", "bio12-04-neet-2015-re-exam-code-d-q31")
def pedigree_ar():
    b = []
    g = {1: 50, 2: 140, 3: 230, 4: 320}
    for k, lab in ((1, "I"), (2, "II"), (3, "III"), (4, "IV")):
        b.append(T(24, g[k] + 6, lab, 16, weight="bold", fill=SOFT))
    # I: unaffected couple
    b.append(couple(296, 344, g[1]) + male(282, g[1]) + female(358, g[1]))
    b.append(sibship(320, g[1], [110, 290, 470], g[2]))
    # II: affected daughter x unaffected man; unaffected son x unaffected woman; affected son x unaffected woman
    b.append(couple(110, 160, g[2]) + female(110, g[2], aff=True) + male(170, g[2]))
    b.append(couple(290, 340, g[2]) + male(290, g[2]) + female(350, g[2]))
    b.append(couple(470, 520, g[2]) + male(470, g[2], aff=True) + female(530, g[2]))
    # III
    b.append(sibship(140, g[2], [80, 190], g[3]))
    b.append(couple(80, 112, g[3]) + female(80, g[3]) + male(125, g[3]) + male(190, g[3]))
    b.append(sibship(320, g[2], [295, 345], g[3]) + female(295, g[3]) + male(345, g[3], aff=True))
    b.append(sibship(500, g[2], [478, 522], g[3]) + male(478, g[3]) + male(522, g[3]))
    # IV: two affected sons and an unaffected daughter of the unaffected couple in III
    b.append(sibship(102, g[3], [62, 102, 142], g[4]))
    b.append(male(62, g[4], aff=True) + male(102, g[4], aff=True) + female(142, g[4]))
    return svg(580, 350, "A four-generation human pedigree; filled symbols are affected individuals", "".join(b))


@fig("bio12-04", "bio12-04-neet-2023-topic-wise-copy-q72")
def pedigree_symbols():
    b = []
    w = 140
    for i in range(4):
        x0 = 10 + i * w
        b.append(T(x0 + 10, 30, f"({i+1})", 17, "start", "bold"))
        cx = x0 + w / 2
        if i == 0:
            b.append(male(cx - 40, 80, aff=True, s=22) + female(cx, 80, aff=True, r=11)
                     + P(f"M{cx+40},{68} L{cx+52},{80} L{cx+40},{92} L{cx+28},{80} Z", fill=INK))
        elif i in (1, 2):
            b.append(male(cx - 38, 80) + couple(cx - 25, cx + 24, 80, double=(i == 2)) + female(cx + 38, 80))
        else:
            b.append(male(cx - 38, 70) + couple(cx - 25, cx + 24, 70) + female(cx + 38, 70)
                     + L(cx, 70, cx, 108, 2) + male(cx, 121, aff=True))
        if i < 3:
            b.append(L(x0 + w, 20, x0 + w, 140, 1, "#c9d3d6"))
    return svg(4 * w + 20, 150, "Four pedigree symbols numbered 1 to 4", "".join(b))


@fig("bio12-04", "bio12-04-neet-2025-code-45-q152")
def pedigree_xlinked():
    b = []
    g = {0: 46, 1: 126, 2: 206, 3: 286}
    for k in range(4):
        b.append(T(28, g[k] + 6, "F", 17, weight="bold", fill=SOFT) + T(38, g[k] + 10, str(k), 12, weight="bold", fill=SOFT))
    # F0: unaffected man x affected woman
    b.append(couple(230, 290, g[0]) + male(218, g[0]) + female(302, g[0], aff=True))
    b.append(sibship(260, g[0], [150, 370], g[1]))
    # F1: two carrier daughters, each with an unaffected husband
    b.append(couple(100, 136, g[1]) + male(88, g[1]) + female(150, g[1], carrier=True))
    b.append(couple(384, 420, g[1]) + female(370, g[1], carrier=True) + male(432, g[1]))
    b.append(sibship(118, g[1], [90, 190], g[2]))
    b.append(sibship(402, g[1], [330, 450], g[2]))
    # F2: carrier, carrier (marries her affected cousin: double line), affected male, unaffected female
    b.append(female(90, g[2], carrier=True) + female(190, g[2], carrier=True))
    b.append(couple(204, 317, g[2], double=True) + male(330, g[2], aff=True) + female(450, g[2]))
    b.append(sibship(260, g[2], [170, 230, 290, 350], g[3]))
    b.append(male(170, g[3], q=True) + female(230, g[3], q=True) + female(290, g[3], q=True) + male(350, g[3], q=True))
    # key
    ky = 340
    items = [(lambda x, y: male(x, y, s=20), "Unaffected male", "अप्रभावित नर"),
             (lambda x, y: male(x, y, aff=True, s=20), "Affected male", "प्रभावित नर"),
             (lambda x, y: female(x, y, carrier=True, r=10), "Carrier female", "वाहक मादा"),
             (lambda x, y: female(x, y, r=10), "Unaffected female", "अप्रभावित मादा"),
             (lambda x, y: female(x, y, aff=True, r=10), "Affected female", "प्रभावित मादा")]
    b.append(L(20, ky - 22, 520, ky - 22, 1, "#c9d3d6"))
    for i, (sym, en, hi) in enumerate(items):
        col, row = i % 3, i // 3
        x, y = 40 + col * 170, ky + row * 46
        b.append(sym(x, y) + T(x + 20, y - 2, en, 13, "start") + T(x + 20, y + 14, hi, 13, "start", fill=SOFT))
    return svg(540, 420, "Pedigree over generations F0 to F3 with a key to the symbols; the F3 children are marked with question marks", "".join(b))


# ---------------------------------------------------------------- Class 12 · Ch 5 Molecular basis
@fig("bio12-05", "bio12-05-neet-2021-code-p3-q126")
def central_dogma():
    b = []
    b.append(box(40, 70, 90, 50, "DNA", TEAL, 18))
    b.append(P("M60,70 C40,20 130,20 110,68", w=1.8, extra='marker-end="url(#ar)"'))
    b.append(T(85, 24, "(a)", 16, weight="bold"))
    b.append(L(132, 95, 220, 95, 2, arrow=True) + T(176, 84, "(b)", 16, weight="bold"))
    b.append(box(222, 70, 100, 50, "mRNA", TEAL, 18))
    b.append(L(324, 95, 412, 95, 2, arrow=True) + T(368, 84, "(c)", 16, weight="bold"))
    b.append(box(414, 70, 90, 50, "(d)", SAND, 18))
    return svg(540, 140, "Central dogma flow chart with blanks (a) to (d)", "".join(b))


# ---------------------------------------------------------------- Class 12 · Ch 9 Biotechnology principles
def arc(cx, cy, r, a1, a2, w=10, color="#7fb8ad"):
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    x2, y2 = cx + r * math.cos(math.radians(a2)), cy + r * math.sin(math.radians(a2))
    large = 1 if (a2 - a1) % 360 > 180 else 0
    return P(f"M{x1:.1f},{y1:.1f} A{r},{r} 0 {large} 1 {x2:.1f},{y2:.1f}", w=w, color=color, cap="butt")


def site(cx, cy, r, a, name, size=13, out=34):
    x1, y1 = cx + (r - 6) * math.cos(math.radians(a)), cy + (r - 6) * math.sin(math.radians(a))
    x2, y2 = cx + (r + out - 10) * math.cos(math.radians(a)), cy + (r + out - 10) * math.sin(math.radians(a))
    tx, ty = cx + (r + out) * math.cos(math.radians(a)), cy + (r + out) * math.sin(math.radians(a))
    anchor = "start" if math.cos(math.radians(a)) > 0.25 else "end" if math.cos(math.radians(a)) < -0.25 else "middle"
    return L(x1, y1, x2, y2, 1.4) + T(tx, ty + 5, name, size, anchor, raw=True)


@fig("bio12-09", "bio12-09-neet-2024-q148-esaral-copy")
def pbr322():
    b = []
    cx, cy, r = 260, 200, 110
    b.append(C(cx, cy, r, w=3))
    b.append(arc(cx, cy, r, -60, 40, 12, "#e2b4a6"))      # tetR
    b.append(arc(cx, cy, r, 150, 250, 12, "#a9c9e6"))      # ampR
    b.append(arc(cx, cy, r, 95, 125, 12, "#c9d9a6"))       # X (ori)
    b.append(arc(cx, cy, r, 60, 82, 12, "#d8c3e6"))        # Y (rop)
    b.append(T(cx + 64, cy - 6, "tet<tspan baseline-shift='super' font-size='70%'>R</tspan>", 16, raw=True))
    b.append(T(cx - 66, cy - 6, "amp<tspan baseline-shift='super' font-size='70%'>R</tspan>", 16, raw=True))
    b.append(T(cx, cy + 8, "pBR322", 18, weight="bold"))
    for a, n in ((-90, "<tspan font-style='italic'>Eco</tspan>RI"), (-72, "<tspan font-style='italic'>Cla</tspan>I"),
                 (-56, "<tspan font-style='italic'>Hin</tspan>dIII"), (-18, "<tspan font-style='italic'>Bam</tspan>HI"),
                 (14, "<tspan font-style='italic'>Sal</tspan>I"), (52, "<tspan font-style='italic'>Pvu</tspan>II"),
                 (178, "<tspan font-style='italic'>Pst</tspan>I"), (212, "<tspan font-style='italic'>Pvu</tspan>I")):
        b.append(site(cx, cy, r, a, n))
    for a, n in ((110, "X"), (71, "Y")):
        x, y = cx + (r - 30) * math.cos(math.radians(a)), cy + (r - 30) * math.sin(math.radians(a))
        b.append(T(x, y + 7, n, 20, weight="bold"))
    return svg(520, 380, "Map of the cloning vector pBR322 with restriction sites and two regions marked X and Y", "".join(b))


@fig("bio12-09", "bio12-09-neet-2025-code-45-q115")
def plasmid_lacz():
    b = []
    cx, cy, r = 250, 180, 105
    b.append(C(cx, cy, r, w=3))
    b.append(arc(cx, cy, r, 160, 230, 12, "#a9c9e6"))     # ampR
    b.append(arc(cx, cy, r, -40, 30, 12, "#e2b4a6"))      # tetR
    b.append(arc(cx, cy, r, 70, 115, 12, "#c9d9a6"))      # ori
    b.append(arc(cx, cy, r, -125, -65, 12, "#f0d58a"))    # lacZ
    b.append(T(cx - 62, cy - 2, "amp<tspan baseline-shift='super' font-size='70%'>R</tspan>", 16, raw=True))
    b.append(T(cx + 62, cy + 4, "tet<tspan baseline-shift='super' font-size='70%'>R</tspan>", 16, raw=True))
    b.append(T(cx, cy + r - 26, "ori", 16))
    b.append(T(cx, cy - r + 40, "<tspan font-style='italic'>lacZ</tspan>", 16, raw=True))
    b.append(T(cx, cy - r - 44, "β-galactosidase", 14, fill=SOFT))
    b.append(site(cx, cy, r, -95, "<tspan font-style='italic'>Eco</tspan>RI", 14, out=26))
    return svg(500, 330, "A plasmid with ori, ampicillin and tetracycline resistance genes and a beta-galactosidase gene with an EcoRI site", "".join(b))


@fig("bio12-09", "bio12-09-neet-2025-code-45-q126")
def bioreactor():
    b = []
    # vessel
    b.append(P("M110,100 L110,330 Q110,370 150,370 L290,370 Q330,370 330,330 L330,100", fill="#eef6f8", w=3))
    b.append(L(100, 100, 340, 100, 3))
    b.append(P("M118,160 Q170,150 220,160 Q270,170 322,160", w=1.4, color="#7aaab8"))   # liquid level
    b.append(R(112, 160, 216, 208, fill="#d7ebf0", sw=0, extra='opacity="0.7"'))
    # motor on top and shaft
    b.append(R(196, 40, 48, 40, fill="#d0d6da", sw=2, rx=6) + L(220, 80, 220, 100, 3))
    b.append(L(220, 100, 220, 320, 3))
    # foam breaker: disc with short blades just under the lid
    b.append(R(176, 124, 88, 8, fill="#ffffff", sw=2, rx=3) + L(186, 124, 176, 114, 2) + L(254, 124, 264, 114, 2))
    # flat-bladed impellers lower down
    for y in (230, 300):
        b.append(R(176, y - 4, 88, 8, fill="#ffffff", sw=1.4, rx=2))
        for x in (176, 248):
            b.append(R(x, y - 12, 16, 24, fill="#ffffff", sw=2))
    # sterile air inlet and sparger at the bottom
    b.append(P("M220,380 L220,352 M180,352 L260,352", w=3))
    for x in (186, 202, 238, 254):
        b.append(C(x, 342, 3, w=1.4))
    b.append(L(220, 380, 220, 396, 3) + P("M220,396 L360,396", w=3))
    b.append(label_line(244, 60, 400, 50, "B"))
    b.append(label_line(262, 128, 400, 120, "C"))
    b.append(label_line(262, 300, 400, 260, "A"))
    b.append(label_line(330, 396, 400, 360, "D"))
    return svg(440, 420, "Stirred-tank bioreactor with four parts labelled A to D", "".join(b))


def main():
    for (ch, qid), fn in FIGS.items():
        d = os.path.join(OUT, ch)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, qid + ".svg"), "w", encoding="utf-8") as f:
            f.write(fn())
    print(f"wrote {len(FIGS)} figures to {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()

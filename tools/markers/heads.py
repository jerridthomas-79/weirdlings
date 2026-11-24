import math
INK = "#2B2340"
S = f'stroke="{INK}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"'
S3 = f'stroke="{INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"'
_defs = []
def grad(id, top, bot, x2=0, y2=1):
    _defs.append(f'<linearGradient id="{id}" x1="0" y1="0" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>')
    return f'url(#{id})'
def rgrad(id, inner, outer, cx=.4, cy=.35):
    _defs.append(f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r=".75"><stop offset="0" stop-color="{inner}"/><stop offset="1" stop-color="{outer}"/></radialGradient>')
    return f'url(#{id})'
def eye(x, y, r, iris, pupil=INK, slit=False, irisr=.66, look=(0, .08)):
    ix, iy = x + look[0]*r, y + look[1]*r
    p = (f'<ellipse cx="{ix}" cy="{iy}" rx="{r*.16}" ry="{r*irisr*.85}" fill="{pupil}"/>' if slit
         else f'<circle cx="{ix}" cy="{iy}" r="{r*irisr*.5}" fill="{pupil}"/>')
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fffdf6" {S}/>'
            f'<circle cx="{ix}" cy="{iy}" r="{r*irisr}" fill="{iris}" stroke="{INK}" stroke-width="2"/>' + p +
            f'<circle cx="{ix - r*.25}" cy="{iy - r*.28}" r="{r*.2}" fill="#fff"/>'
            f'<circle cx="{ix + r*.25}" cy="{iy + r*.22}" r="{r*.09}" fill="#fff"/>')
def fuzz(cx, cy, rx, ry, n=22, amp=7, start=0.0):
    pts = []
    for i in range(n):
        a = start + 2*math.pi*i/n; a2 = start + 2*math.pi*(i+.5)/n
        pts.append((cx + rx*math.cos(a), cy + ry*math.sin(a)))
        pts.append((cx + (rx+amp)*math.cos(a2), cy + (ry+amp)*math.sin(a2)))
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f} '
    for i in range(1, len(pts), 2):
        c = pts[i]; e = pts[(i+1) % len(pts)]
        d += f'Q{c[0]:.1f} {c[1]:.1f} {e[0]:.1f} {e[1]:.1f} '
    return d + 'Z'
def spots(lst, fill, op=1):
    return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" opacity="{op}"/>' for x, y, r in lst)
def shine(d):  # soft top-left highlight over a shape
    return f'<path d="{d}" fill="url(#hl)"/>'

H = {}
# ---------------- c04 mushroom toad
def c04():
    cap = "M18 104 C14 52 56 18 100 18 C144 18 186 52 182 104 C160 118 40 118 18 104Z"
    face = "M42 98 C40 150 64 182 100 182 C136 182 160 150 158 98Z"
    return (f'<path d="{face}" fill="{grad("t4","#FFD27A","#E9963E")}" {S}/>' +
        spots([(64,160,4),(140,152,5),(122,170,3.5),(78,174,3),(150,130,3)], "#B8652E") +
        f'<path d="M30 104 C60 92 140 92 170 104 L164 114 C130 104 70 104 36 114Z" fill="#F2B880" {S3}/>' +
        f'<path d="{cap}" fill="{grad("c4","#FF5A4A","#D92A2A")}" {S}/>' + shine(cap) +
        spots([(60,58,13),(104,40,11),(146,62,14),(36,90,8),(166,92,8),(100,78,9)], "#FFF1D6") +
        eye(76, 130, 18, "#FFA51E") + eye(124, 130, 18, "#FFA51E") +
        f'<path d="M92 152 Q100 148 108 152" fill="none" {S3}/>' +
        f'<path d="M72 162 Q100 180 128 162" fill="none" {S}/>')
# ---------------- c12/c13 antler griffin
def griffin(main, dark, gid):
    face = fuzz(100, 118, 54, 52, 20, 6)
    ant = ("M74 70 C66 50 58 40 46 30 M58 42 C50 40 40 46 34 50 M66 54 C58 50 52 40 54 28 "
           "M126 70 C134 50 142 40 154 30 M142 42 C150 40 160 46 166 50 M134 54 C142 50 148 40 146 28")
    return (f'<path d="{ant}" fill="none" stroke="{INK}" stroke-width="13" stroke-linecap="round"/>'
        f'<path d="{ant}" fill="none" stroke="#9C6B3E" stroke-width="7" stroke-linecap="round"/>'
        f'<path d="M44 34 Q46 46 44 52 M150 34 Q152 44 150 50 M58 46 Q60 56 57 60" stroke="#8CC63F" stroke-width="5" stroke-linecap="round" fill="none"/>'
        f'<circle cx="44" cy="57" r="3.5" fill="#BDE7F5" stroke="{INK}" stroke-width="1.5"/><circle cx="150" cy="55" r="3.5" fill="#BDE7F5" stroke="{INK}" stroke-width="1.5"/>'
        f'<path d="M50 88 L34 54 L74 76Z" fill="{main}" {S}/><path d="M150 88 L166 54 L126 76Z" fill="{main}" {S}/>'
        f'<path d="M50 80 L42 64 L62 76Z" fill="#F7B98A"/><path d="M150 80 L158 64 L138 76Z" fill="#F7B98A"/>'
        f'<path d="{face}" fill="{grad(gid,main,dark)}" {S}/>'
        f'<path d="{fuzz(100,124,38,40,16,5)}" fill="#FFF3DC" stroke="none"/>'
        f'<path d="M44 140 Q54 150 52 168 M156 140 Q146 150 148 168 M60 158 Q70 164 70 176 M140 158 Q130 164 130 176" stroke="{dark}" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + shine(face) + eye(80, 112, 16, "#F29A1E") + eye(120, 112, 16, "#F29A1E") +
        f'<path d="M90 128 Q100 124 110 128 L102 150 Q100 154 98 150Z" fill="#F4B860" {S3}/>')
def c12(): return griffin("#2F9C9A", "#1D6F7A", "t12")
def c13(): return griffin("#E23B3B", "#A91F2C", "t13")
# ---------------- c17 bee
def c17():
    head = fuzz(100, 112, 66, 62, 26, 6)
    return (f'<path d="M78 58 C70 36 60 26 46 22 M122 58 C130 36 140 26 154 22" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
        f'<path d="M78 58 C70 36 60 26 46 22 M122 58 C130 36 140 26 154 22" fill="none" stroke="#8A5A2B" stroke-width="4" stroke-linecap="round"/>'
        f'<path d="M44 22 Q38 34 44 40 Q50 34 44 22Z" fill="#FFB020" {S3}/><path d="M156 22 Q150 34 156 40 Q162 34 156 22Z" fill="#FFB020" {S3}/>'
        f'<path d="{head}" fill="{grad("b17","#FFE15A","#F2A81C")}" {S}/>' + shine(head) +
        f'<path d="M44 150 Q100 170 156 150" fill="none" stroke="{INK}" stroke-width="10" stroke-linecap="round" opacity=".85"/>'
        f'<ellipse cx="70" cy="104" rx="26" ry="30" fill="{rgrad("e17","#4A3A6A","#1E1630",.4,.3)}" {S}/>'
        f'<ellipse cx="130" cy="104" rx="26" ry="30" fill="url(#e17)" {S}/>'
        f'<path d="M50 116 Q70 136 92 116" fill="#E09A2A" opacity=".8"/><path d="M110 116 Q130 136 150 116" fill="#E09A2A" opacity=".8"/>'
        f'<circle cx="62" cy="92" r="8" fill="#fff"/><circle cx="122" cy="92" r="8" fill="#fff"/><circle cx="76" cy="112" r="3" fill="#fff"/><circle cx="136" cy="112" r="3" fill="#fff"/>'
        f'<path d="M80 142 Q100 152 120 142" fill="none" {S3}/>'
        f'<path d="M84 144 L88 158 L92 146Z M108 146 L112 158 L116 144Z" fill="#FFF7E6" {S3}/>')
# ---------------- c06 lava-lamp cyclops
def c06():
    head = fuzz(100, 112, 64, 64, 26, 8)
    return (f'<path d="M72 56 Q60 34 54 22 M128 56 Q140 34 146 22" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
        f'<path d="M72 56 Q60 34 54 22 M128 56 Q140 34 146 22" fill="none" stroke="#E9A3B0" stroke-width="4" stroke-linecap="round"/>'
        f'<path d="{fuzz(54,20,11,11,10,4)}" fill="#A45BB5" {S3}/><path d="{fuzz(146,20,11,11,10,4)}" fill="#A45BB5" {S3}/>'
        f'<path d="M40 104 C40 40 160 40 160 104" fill="none" stroke="{INK}" stroke-width="13"/><path d="M40 104 C40 40 160 40 160 104" fill="none" stroke="#8D8F96" stroke-width="7"/>'
        f'<path d="{head}" fill="{grad("f6","#F3DDB5","#D9B583")}" {S}/>' + shine(head) +
        spots([(56,140,8),(148,146,9),(70,166,6),(132,170,7),(150,86,6),(52,82,5)], "#9C4FB0", .85) +
        f'<rect x="24" y="92" width="26" height="40" rx="12" fill="#4A4F58" {S}/><rect x="150" y="92" width="26" height="40" rx="12" fill="#4A4F58" {S}/>'
        f'<rect x="30" y="98" width="14" height="28" rx="7" fill="#C6F03A"/><rect x="156" y="98" width="14" height="28" rx="7" fill="#C6F03A"/>'
        + eye(100, 94, 27, "#F5A015") +
        f'<path d="M100 66 Q82 66 74 80" fill="none" stroke="#B26AC4" stroke-width="5" stroke-linecap="round"/>'
        f'<path d="M62 128 Q100 186 138 128 Z" fill="#5A1E2E" {S}/>'
        f'<path d="M84 154 Q100 182 116 154 Q100 146 84 154Z" fill="#F27C8C" {S3}/>'
        f'<path d="M70 132 L76 144 L82 134Z M94 136 L100 146 L106 136Z M118 134 L124 144 L130 132Z" fill="#FFF3D6" {S3}/>')
# ---------------- c05 goggle chameleon
def c05():
    head = "M34 120 C30 70 62 44 100 44 C146 44 172 76 170 118 C168 160 138 182 100 182 C62 182 36 162 34 120Z"
    return (f'<path d="M64 54 Q60 20 92 30 Q96 10 120 24 Q140 12 146 40" fill="#9B3FD0" {S}/>'
        f'<path d="M70 50 Q78 30 92 36 M110 40 Q120 24 134 34" stroke="#C77BF0" stroke-width="4" fill="none" stroke-linecap="round"/>'
        f'<path d="{head}" fill="{grad("g5","#4ED1C8","#1F9A9C")}" {S}/>' + shine(head) +
        spots([(52,104,4),(150,140,4),(140,90,3.5),(60,150,3.5),(92,62,3)], "#FFB020") +
        f'<rect x="48" y="46" width="104" height="14" rx="7" fill="#7A4B25" {S3}/>'
        f'<circle cx="74" cy="46" r="17" fill="#C8902E" {S}/><circle cx="74" cy="46" r="10" fill="#9C7FD6" {S3}/>'
        f'<circle cx="126" cy="46" r="17" fill="#C8902E" {S}/><circle cx="126" cy="46" r="10" fill="#9C7FD6" {S3}/>'
        + eye(70, 92, 24, "#FFD21E", look=(0,.05)) + eye(130, 92, 24, "#FFD21E", look=(.05,.05)) +
        f'<path d="M48 128 Q100 196 152 128 Q100 140 48 128Z" fill="#6A1E2C" {S}/>'
        f'<path d="M58 132 L64 144 L70 135Z M80 136 L86 148 L92 137Z M108 137 L114 148 L120 136Z M130 135 L136 144 L142 132Z" fill="#FFF3D6" {S3}/>'
        f'<path d="M100 150 Q124 176 156 168 Q176 162 172 146 Q166 134 154 142 Q160 152 150 154 Q130 156 118 146Z" fill="#FF7E93" {S}/>')
# ---------------- c03 fish lizard
def c03():
    head = "M30 112 C26 62 60 34 100 36 C140 38 170 56 176 92 L176 150 C150 176 60 184 36 156 C30 146 30 130 30 112Z"
    return (f'<path d="M48 54 L30 26 L64 44 L66 16 L86 40 L100 14 L110 40 L132 22 L128 50" fill="{grad("fin3","#FFB37A","#E86AA8")}" {S}/>'
        f'<path d="{head}" fill="{grad("h3","#45C6B4","#7A4FC9")}" {S}/>' + shine(head) +
        spots([(48,82,4),(60,64,3),(150,70,4),(44,136,4),(130,58,3)], "#E05BB5") +
        eye(70, 96, 30, "#FFD21E", slit=True, irisr=.72, look=(0,0)) +
        f'<path d="M96 104 C110 92 176 92 178 104 L178 158 C150 176 112 172 98 156 C92 140 92 120 96 104Z" fill="#5A1530" {S}/>'
        f'<path d="M104 106 L112 120 L120 106Z M130 104 L138 118 L146 104Z M156 104 L164 118 L170 104Z M110 160 L118 146 L126 162Z M140 162 L148 148 L156 160Z" fill="#FFF0C8" {S3}/>'
        f'<path d="M114 140 Q150 120 176 140 Q186 160 170 172 L168 190 Q162 196 158 190 L160 172 Q136 166 114 140Z" fill="#FF7E93" {S}/>')
# ---------------- c11 tentacle-tail lizard (face)
def c11():
    head = "M40 112 C38 70 66 50 100 50 C134 50 162 70 160 112 C160 150 132 176 100 176 C68 176 40 150 40 112Z"
    fins = "M44 96 L14 70 L30 66 L10 46 L40 52 L36 28 L64 54 M156 96 L186 70 L170 66 L190 46 L160 52 L164 28 L136 54"
    return (f'<path d="M80 54 Q74 30 52 22 M120 54 Q126 30 148 22" fill="none" stroke="{INK}" stroke-width="9" stroke-linecap="round"/>'
        f'<path d="M80 54 Q74 30 52 22 M120 54 Q126 30 148 22" fill="none" stroke="#F08A3A" stroke-width="4" stroke-linecap="round"/>'
        f'<circle cx="50" cy="22" r="11" fill="{rgrad("bulb","#FFE27A","#F06A1A")}" {S3}/><circle cx="150" cy="22" r="11" fill="url(#bulb)" {S3}/>'
        f'<path d="{fins}" fill="{grad("fn11","#FFB43A","#A64FD0")}" {S}/>'
        f'<path d="{head}" fill="{grad("h11","#FFC46A","#F08A3A")}" {S}/>' + shine(head) +
        spots([(70,66,3.5),(130,66,3.5),(100,60,3),(56,90,3),(144,90,3)], "#2FB5B0") +
        f'<path d="{fuzz(100,156,48,24,16,6)}" fill="#F3DDB5" {S3}/>'
        f'<path d="M88 52 Q100 36 112 52" fill="#8DBE3A" {S3}/>'
        + eye(72, 98, 22, rgrad("ir11","#FFD23A","#B04FD0"), look=(.05,.05)) + eye(128, 98, 22, "url(#ir11)", look=(-.05,.05)) +
        f'<path d="M74 132 Q100 170 126 132 Q100 140 74 132Z" fill="#7A2034" {S}/>'
        f'<path d="M88 148 Q100 170 112 148 Q100 142 88 148Z" fill="#FF8A9A" {S3}/>')
# ---------------- c10 owl octopus
def c10():
    head = fuzz(100, 108, 64, 60, 26, 7)
    return (f'<path d="M26 120 Q10 100 18 84 Q34 96 46 108Z M174 120 Q190 100 182 84 Q166 96 154 108Z" fill="#FF9A3A" {S}/>'
        f'<path d="M30 62 Q34 30 64 28 Q74 40 64 58 Q48 70 30 62Z" fill="{grad("m10","#C28AF0","#FF9A3A")}" {S}/>'
        f'<path d="M126 44 L136 20 M136 30 L148 22 M136 44 L156 30 L166 34 M156 30 L158 18" fill="none" stroke="{INK}" stroke-width="10" stroke-linecap="round"/>'
        f'<path d="M126 44 L136 20 M136 30 L148 22 M136 44 L156 30 L166 34 M156 30 L158 18" fill="none" stroke="#FF7A3A" stroke-width="5" stroke-linecap="round"/>'
        f'<path d="{head}" fill="{grad("h10","#F6E0BE","#E3BD8C")}" {S}/>' + shine(head) +
        f'<path d="M50 58 Q74 44 100 50 Q126 44 150 58 Q130 66 100 60 Q70 66 50 58Z" fill="#3FB0A8" {S3}/>'
        + eye(72, 104, 26, rgrad("ir10","#FFC23A","#E06A10")) + eye(128, 104, 26, "url(#ir10)") +
        f'<path d="M88 132 Q100 126 112 132 L104 156 Q100 162 96 156Z" fill="#FFB43A" {S3}/>'
        f'<path d="M92 140 Q100 152 108 140" fill="#FF8A9A"/>'
        f'<path d="M56 166 Q46 186 64 190 M84 172 Q80 192 96 192 M116 172 Q120 192 104 192 M144 166 Q154 186 136 190" fill="none" stroke="{INK}" stroke-width="13" stroke-linecap="round"/>'
        f'<path d="M56 166 Q46 186 64 190 M84 172 Q80 192 96 192 M116 172 Q120 192 104 192 M144 166 Q154 186 136 190" fill="none" stroke="#C77BD0" stroke-width="7" stroke-linecap="round"/>')
# ---------------- c09 butterfly mushroom turtle
def c09():
    face = "M48 112 C46 150 70 182 100 182 C130 182 154 150 152 112Z"
    cap = "M24 108 C22 64 58 38 100 38 C142 38 178 64 176 108 C150 120 50 120 24 108Z"
    return (f'<path d="M40 100 Q8 60 26 40 Q50 50 56 84Z M160 100 Q192 60 174 40 Q150 50 144 84Z" fill="{grad("w9","#B96AF0","#FF8A3A")}" {S}/>'
        f'<path d="{face}" fill="{grad("f9","#C9E07A","#6FB04A")}" {S}/>'
        + spots([(64,160,4),(136,158,4),(120,174,3),(80,174,3)], "#2E8C6A") +
        f'<path d="M80 30 Q78 10 96 6 Q92 22 84 30" fill="#7CCB4A" {S3}/><path d="M118 32 Q130 14 142 18 Q132 30 120 34" fill="#7CCB4A" {S3}/>'
        f'<path d="{cap}" fill="{grad("c9","#FFA868","#E25A6A")}" {S}/>' + shine(cap) +
        f'<path d="M30 108 C60 122 140 122 170 108 L162 118 C130 128 70 128 38 118Z" fill="#FFCB8A" {S3}/>'
        f'<path d="M40 60 L36 48 M60 46 L58 34 M140 46 L142 34 M160 60 L164 48" stroke="#8DBE3A" stroke-width="6" stroke-linecap="round"/>'
        + eye(76, 132, 18, "#9CB82E") + eye(124, 132, 18, "#9CB82E") +
        f'<path d="M80 156 Q100 182 120 156 Q100 162 80 156Z" fill="#7A2034" {S3}/>'
        f'<path d="M92 166 Q100 186 110 166 Q100 162 92 166Z" fill="#FF8A9A" {S3}/>')
# ---------------- c07 fairy frog
def c07():
    head = "M30 120 C28 84 56 62 100 62 C144 62 172 84 170 120 C168 158 138 180 100 180 C62 180 32 158 30 120Z"
    return (f'<path d="M36 110 C4 90 4 40 34 36 C60 40 64 80 56 104Z M164 110 C196 90 196 40 166 36 C140 40 136 80 144 104Z" fill="{grad("w7","#FF6FB5","#6A6AF0")}" {S}/>'
        f'<path d="M24 60 Q40 72 50 96 M176 60 Q160 72 150 96" stroke="#FFC0E0" stroke-width="3" fill="none"/>'
        f'<path d="{head}" fill="{grad("h7","#A6D84A","#5E9E2E")}" {S}/>' + shine(head) +
        f'<path d="M58 148 Q100 196 142 148 Q100 168 58 148Z" fill="#F3E0B0" {S3}/>'
        f'<path d="M60 70 Q80 54 100 60 Q120 54 140 70" fill="#6CBF3A" {S3}/>'
        f'<path d="M80 60 L78 38 M100 58 L100 30 M120 60 L124 40" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M80 60 L78 38 M100 58 L100 30 M120 60 L124 40" stroke="#6CBF3A" stroke-width="3" stroke-linecap="round"/>'
        f'<ellipse cx="78" cy="34" rx="7" ry="9" fill="#FF5C9A" {S3}/><ellipse cx="100" cy="26" rx="7" ry="9" fill="#FF5C9A" {S3}/><circle cx="124" cy="36" r="8" fill="#FF8AB8" {S3}/>'
        + eye(68, 100, 26, "#FF9A1A") + eye(132, 100, 26, "#FF9A1A") +
        f'<path d="M70 146 Q100 132 130 146" fill="none" {S}/><circle cx="92" cy="128" r="2.5" fill="{INK}"/><circle cx="108" cy="128" r="2.5" fill="{INK}"/>')
# ---------------- c01 sad one-eyed fluff
def c01():
    head = fuzz(100, 124, 56, 54, 24, 7)
    return (f'<path d="M48 104 C20 110 8 150 18 178 C34 170 44 140 56 120Z M152 104 C180 110 192 150 182 178 C166 170 156 140 144 120Z" fill="{grad("e1","#FF9A7A","#C76AD0")}" {S}/>'
        f'<path d="{head}" fill="{grad("h1","#F3C998","#C99A6A")}" {S}/>' + shine(head) +
        f'<path d="M52 146 Q60 160 56 176 M148 146 Q140 160 144 176 M60 96 Q70 90 74 80 M140 96 Q130 90 126 80" stroke="#6A8FD0" stroke-width="6" fill="none" stroke-linecap="round"/>'
        f'<path d="M100 92 L100 60" stroke="{INK}" stroke-width="20" stroke-linecap="round"/><path d="M100 92 L100 60" stroke="#E7B888" stroke-width="12" stroke-linecap="round"/>'
        + eye(100, 48, 30, rgrad("ir1","#7FF0F0","#1AA0C0"), look=(0,0)) +
        f'<path d="M70 40 Q100 8 130 40" fill="#F0A070" {S}/>'
        + eye(128, 124, 15, "#C77A2A", look=(0,.12)) +
        f'<path d="M112 116 Q128 106 144 116" fill="#F0A070" {S3}/>'
        f'<path d="M84 160 Q100 148 116 160" fill="none" {S}/><path d="M92 156 L94 162 L98 154Z" fill="#FFF3D6" {S3}/>'
        f'<path d="M66 126 Q74 120 82 126" fill="none" {S3}/>')
# ---------------- c02 two-headed bird
def c02():
    def head(cx, iris):
        h = fuzz(cx, 100, 40, 40, 18, 5)
        return (f'<path d="M{cx-20} 66 Q{cx-30} 34 {cx-14} 30 M{cx} 62 Q{cx} 26 {cx+10} 24 M{cx+18} 66 Q{cx+34} 40 {cx+30} 30" fill="none" stroke="{INK}" stroke-width="11" stroke-linecap="round"/>'
            f'<path d="M{cx-20} 66 Q{cx-30} 34 {cx-14} 30 M{cx} 62 Q{cx} 26 {cx+10} 24 M{cx+18} 66 Q{cx+34} 40 {cx+30} 30" fill="none" stroke="#3EC6C0" stroke-width="6" stroke-linecap="round"/>'
            f'<path d="{h}" fill="{grad("h2"+str(cx),"#FF9AD0","#E0459A")}" {S}/>' +
            f'<ellipse cx="{cx}" cy="98" rx="28" ry="24" fill="#FFE0E8"/>' +
            eye(cx-12, 92, 13, iris) + eye(cx+13, 92, 13, iris) +
            f'<path d="M{cx-12} 108 Q{cx} 102 {cx+12} 108 L{cx+4} 140 Q{cx} 146 {cx-4} 140Z" fill="#FFB020" {S3}/>')
    body = "M40 200 C30 150 60 120 100 120 C140 120 170 150 160 200Z"
    return (f'<path d="{body}" fill="{grad("b2","#E0459A","#2FB5B0")}" {S}/>'
        f'<path d="M60 160 L70 172 L80 160 M120 160 L130 172 L140 160" stroke="#FF9AD0" stroke-width="4" fill="none"/>'
        + head(58, "#FF9A1A") + head(142, "#B46AF0"))
# ---------------- c14 ice whale
def c14():
    head = "M20 128 C18 80 60 50 116 52 C160 54 186 82 184 116 C182 156 150 182 100 182 C56 182 22 164 20 128Z"
    return (f'<path d="M60 64 L64 26 L80 56 L92 18 L104 54 L120 30 L122 60" fill="{grad("ice","#E6F8FF","#7CC6F0")}" {S}/>'
        f'<path d="{head}" fill="{grad("h14","#5E8FD0","#2E5C9C")}" {S}/>' + shine(head) +
        f'<path d="M28 140 C60 170 150 176 182 128 C176 168 140 184 100 184 C60 184 32 166 28 140Z" fill="#F3F1EA" {S}/>'
        f'<path d="M60 160 Q100 172 150 156 M70 172 Q104 180 140 170" stroke="#C9C3B8" stroke-width="3" fill="none"/>'
        + spots([(150,74,4),(160,86,3.5),(140,66,3),(44,96,3)], "#DDE8F5") +
        f'<path d="M24 90 Q4 70 10 56 Q30 66 34 84Z" fill="#A8DCF8" {S3}/>'
        + eye(84, 112, 20, "#F2B43A") + eye(134, 112, 20, "#F2B43A") +
        f'<path d="M92 142 Q110 154 128 142" fill="none" {S}/>'
        f'<path d="M40 128 L36 146 M160 130 L166 146" stroke="#BDE7F5" stroke-width="5" stroke-linecap="round"/>'
        f'<path d="M36 146 Q32 154 36 158 Q40 154 36 146Z M166 146 Q162 154 166 158 Q170 154 166 146Z" fill="#BDE7F5" {S3}/>')
# ---------------- c23 cosmic whale
def c23():
    head = "M20 128 C18 80 60 52 116 52 C160 54 186 82 184 116 C182 156 150 182 100 182 C56 182 22 164 20 128Z"
    return (f'<path d="M30 92 C0 60 8 22 40 20 C66 30 70 64 58 90Z M170 92 C200 60 192 22 160 20 C134 30 130 64 142 90Z" fill="{grad("w23","#9FF0FF","#B06AF0")}" {S}/>'
        f'<path d="M30 40 Q44 54 48 78 M170 40 Q156 54 152 78" stroke="#FFE9A8" stroke-width="3" fill="none"/>'
        f'<path d="{head}" fill="{grad("h23","#3A5FC0","#1C2C78")}" {S}/>' + shine(head) +
        f'<path d="M50 96 Q64 78 80 92 Q90 104 76 108 Q66 106 70 98 M130 74 Q146 64 156 78" stroke="#FFD24A" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        + spots([(60,74,2.5),(100,66,2),(150,98,2.5),(42,116,2),(120,80,2),(90,84,1.8)], "#FFF6C8") +
        f'<path d="M28 140 C60 170 150 176 182 128 C176 168 140 184 100 184 C60 184 32 166 28 140Z" fill="#F7EEDC" {S}/>'
        f'<path d="M60 160 Q100 172 150 156 M70 172 Q104 180 140 170" stroke="#D8C8A8" stroke-width="3" fill="none"/>'
        + eye(84, 112, 20, rgrad("ir23","#7FE0FF","#2E6AD0")) + eye(134, 112, 20, "url(#ir23)") +
        f'<path d="M92 142 Q110 154 128 142" fill="none" {S}/>')
# ---------------- c24 night-sky whale
def c24():
    head = "M20 132 C18 88 60 62 116 62 C160 64 186 90 184 122 C182 160 150 184 100 184 C56 184 22 168 20 132Z"
    return (f'<circle cx="152" cy="40" r="28" fill="{rgrad("moon","#FFFDF0","#E8E2C8")}" {S}/>'
        + spots([(144,32,5),(162,48,4),(150,54,3)], "#D6CFB0") +
        f'<path d="M26 104 C-2 84 4 50 30 44 C52 52 54 82 46 100Z" fill="{grad("w24","#E6B8FF","#7FD8F0")}" {S}/>'
        f'<path d="{head}" fill="{grad("h24","#4A72B8","#24407C")}" {S}/>' + shine(head) +
        f'<path d="M44 76 C60 58 120 54 160 72 C150 80 60 86 44 76Z" fill="#6FBF3A" {S3}/>'
        f'<path d="M70 66 L70 50 M98 62 L98 44 M126 66 L126 52" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M70 66 L70 50 M98 62 L98 44 M126 66 L126 52" stroke="#F7E2B8" stroke-width="3" stroke-linecap="round"/>'
        f'<path d="M60 52 Q70 38 80 52Z M88 46 Q98 30 108 46Z M116 54 Q126 40 136 54Z" fill="#FFB43A" {S3}/>'
        f'<path d="M28 146 C60 172 150 178 182 132 C176 170 140 186 100 186 C60 186 32 168 28 146Z" fill="#F1EADC" {S}/>'
        f'<path d="M60 164 Q100 176 150 160" stroke="#C9C3B8" stroke-width="3" fill="none"/>'
        f'<path d="M70 116 Q84 124 98 116 M116 116 Q130 124 144 116" fill="none" {S}/>'
        f'<path d="M94 140 Q108 150 122 140" fill="none" {S}/>'
        f'<path d="M150 82 Q154 100 150 112" stroke="#BDF0FF" stroke-width="5" fill="none" stroke-linecap="round"/>')
# ---------------- c18 moss sloth
def c18():
    head = fuzz(100, 112, 68, 66, 30, 9)
    face = "M56 112 C54 80 76 66 100 66 C124 66 146 80 144 112 C142 146 124 164 100 164 C76 164 58 146 56 112Z"
    return (f'<path d="{head}" fill="{grad("h18","#8CC63F","#4E8A2A")}" {S}/>'
        f'<path d="M40 70 L36 54 M56 52 L54 38 M150 56 L154 42" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M40 70 L36 54 M56 52 L54 38 M150 56 L154 42" stroke="#F7E2B8" stroke-width="3" stroke-linecap="round"/>'
        f'<path d="M26 56 Q36 42 46 56Z M44 40 Q54 26 64 40Z M142 44 Q152 30 162 44Z" fill="#F2B07A" {S3}/>'
        f'<path d="{face}" fill="{grad("f18","#E9D7B0","#C9AE80")}" {S}/>' + shine(face) +
        f'<path d="M64 98 Q80 84 96 100 Q80 108 64 98Z M104 100 Q120 84 136 98 Q120 108 104 100Z" fill="#5A4A3A"/>'
        f'<path d="M70 98 Q80 106 90 98 M110 98 Q120 106 130 98" fill="none" {S}/>'
        f'<ellipse cx="100" cy="118" rx="12" ry="8" fill="#5A4030" {S3}/>'
        f'<path d="M82 136 Q100 150 118 136" fill="none" {S}/><path d="M106 141 L108 150 L113 139Z" fill="#FFF3D6" {S3}/>'
        f'<path d="M46 150 Q42 170 50 182 M154 150 Q160 168 152 182 M70 166 Q66 182 72 190" stroke="#3E7A22" stroke-width="5" fill="none" stroke-linecap="round"/>')
# ---------------- c19 lava octopus
def c19():
    head = "M40 108 C38 62 68 38 100 38 C132 38 162 62 160 108 C158 140 132 156 100 156 C68 156 42 140 40 108Z"
    return (f'<path d="M44 92 L8 70 L26 62 L6 40 L38 46 L34 18 L60 50 M156 92 L192 70 L174 62 L194 40 L162 46 L166 18 L140 50" fill="{grad("fin19","#FFC43A","#F0501A")}" {S}/>'
        f'<path d="M54 140 Q36 170 56 186 Q66 176 60 168 M82 150 Q74 182 92 192 M118 150 Q126 182 108 192 M146 140 Q164 170 144 186 Q134 176 140 168" fill="none" stroke="{INK}" stroke-width="18" stroke-linecap="round"/>'
        f'<path d="M54 140 Q36 170 56 186 Q66 176 60 168 M82 150 Q74 182 92 192 M118 150 Q126 182 108 192 M146 140 Q164 170 144 186 Q134 176 140 168" fill="none" stroke="#E8473A" stroke-width="11" stroke-linecap="round"/>'
        + spots([(78,176,3),(120,176,3),(52,170,3),(146,166,3)], "#FFB49A") +
        f'<path d="{head}" fill="{grad("h19","#FF6A4A","#C9282E")}" {S}/>' + shine(head) +
        spots([(70,62,3),(130,62,3),(100,52,3),(56,96,2.5),(144,96,2.5)], "#FF9A7A") +
        f'<path d="M86 40 Q90 18 100 14 Q110 18 114 40" fill="#4A3A34" {S}/><path d="M94 28 Q100 20 106 28" stroke="#FF9A1A" stroke-width="4" fill="none"/>'
        + eye(74, 98, 22, rgrad("ir19","#FFD23A","#E85A10"), slit=True, look=(0,0)) + eye(126, 98, 22, "url(#ir19)", slit=True, look=(0,0)) +
        f'<path d="M80 132 Q100 144 120 132" fill="none" {S}/>'
        f'<path d="M84 134 L87 142 L90 135Z M110 135 L113 142 L116 134Z" fill="#FFF3D6" {S3}/>')
# ---------------- c20 shell heron
def c20():
    head = "M40 118 C38 80 62 58 92 58 C120 58 140 76 142 104 C144 140 120 168 90 168 C60 168 42 148 40 118Z"
    crest = "M58 70 Q30 40 44 22 Q56 40 66 56 Q62 24 82 12 Q86 36 86 54 Q100 22 124 22 Q112 42 104 60"
    return (f'<path d="{crest}" fill="{grad("cr20","#5FD0F0","#2A4FC0")}" {S}/>'
        f'<path d="M30 160 Q40 186 80 192 Q120 194 140 170 Q100 180 60 168Z" fill="#2E5CC0" {S}/>'
        + spots([(70,184,4),(90,188,4),(110,186,4)], "#FFF8EC") +
        f'<path d="{head}" fill="{grad("h20","#3E8CE0","#2A4FA8")}" {S}/>' + shine(head) +
        f'<path d="M58 106 C60 136 80 158 98 160 C120 158 132 132 130 108 C110 120 80 120 58 106Z" fill="#F7EAD0" {S3}/>'
        f'<path d="M128 100 C150 98 176 110 196 132 C170 126 148 122 128 124Z" fill="{grad("bk20","#F7E2B8","#C9A070")}" {S}/>'
        + eye(70, 100, 17, rgrad("ir20","#7FF0F0","#1A90C0")) + eye(110, 100, 17, "url(#ir20)") +
        spots([(52,132,4),(60,146,4),(70,156,4)], "#FFF8EC") +
        f'<path d="M84 136 Q96 142 108 136" fill="none" {S3}/>')

DESIGNS = dict(c01=c01, c02=c02, c03=c03, c04=c04, c05=c05, c06=c06, c07=c07, c09=c09, c10=c10, c11=c11,
               c12=c12, c13=c13, c14=c14, c17=c17, c18=c18, c19=c19, c20=c20, c23=c23, c24=c24)
def svg(name):
    _defs.clear()
    body = DESIGNS[name]()
    defs = ('<radialGradient id="hl" cx=".32" cy=".22" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".55"/>'
            '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' + ''.join(_defs))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 212 212" width="640" height="640"><defs>{defs}</defs>{body}</svg>'
